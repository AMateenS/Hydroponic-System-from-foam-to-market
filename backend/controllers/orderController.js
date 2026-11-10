const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { ORDER_STATUSES } = require("../models/Order");
const { getStripe, currency, clientUrl } = require("../utils/stripe");
const { safeSend } = require("../utils/mailer");
const tpl = require("../utils/emailTemplates");

const bad = (res, message, status = 400) => res.status(status).json({ error: message });
const fail = (res, error) => {
  console.error(error);
  res.status(500).json({ error: "Internal Server Error" });
};

/* =====================  STOCK  ===================== */

// Takes stock for every item, one atomic update each. If an item is short,
// whatever was already taken is put back and the order is refused.
const reserveStock = async (orderItems) => {
  const taken = [];
  for (const item of orderItems) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } }
    );
    if (result.modifiedCount !== 1) {
      await restoreStock(taken);
      return { ok: false, name: item.name };
    }
    taken.push(item);
  }
  return { ok: true };
};

const restoreStock = (items) =>
  Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));

/* =====================  EMAIL  ===================== */

const notifyNewOrder = async (order) => {
  const user = await User.findById(order.userId).select("username email");
  if (user) safeSend({ to: user.email, ...tpl.orderConfirmationEmail(order, user) });
  if (process.env.EMAIL_USER) {
    safeSend({ to: process.env.EMAIL_USER, ...tpl.adminNewOrderEmail(order, user) });
  }
};

const notifyStatus = async (order) => {
  if (!["Confirmed", "Shipped", "Delivered", "Cancelled"].includes(order.status)) return;
  const user = await User.findById(order.userId).select("username email");
  if (user) safeSend({ to: user.email, ...tpl.orderStatusEmail(order, user) });
};

/* =====================  STRIPE  ===================== */

const createCheckoutSession = async (order, user) => {
  const stripe = getStripe();
  const base = clientUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: order.items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: currency(),
        unit_amount: Math.round(i.price * 100), // smallest currency unit
        product_data: { name: i.unit ? `${i.name} (per ${i.unit})` : i.name },
      },
    })),
    customer_email: user.email,
    client_reference_id: String(order._id),
    metadata: { orderId: String(order._id) },
    success_url: `${base}/orders/${order._id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/orders/${order._id}?payment=cancelled`,
  });
  order.stripeSessionId = session.id;
  await order.save();
  return session.url;
};

// Marks an order paid exactly once (safe to call from both the return page and the webhook)
const markPaid = async (orderId, session) => {
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const paid = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "unpaid", status: { $ne: "Cancelled" } },
    {
      $set: {
        paymentStatus: "paid",
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntent: paymentIntent,
      },
    },
    { new: true }
  );

  if (paid) {
    if (paid.status === "Pending") {
      paid.status = "Confirmed";
      await paid.save();
    }
    notifyNewOrder(paid).catch(() => {});
    return paid;
  }

  // Money arrived for an order that was cancelled meanwhile: flag it so it gets refunded
  return Order.findOneAndUpdate(
    { _id: orderId, status: "Cancelled", paymentStatus: "unpaid" },
    {
      $set: {
        paymentStatus: "refund_due",
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntent: paymentIntent,
      },
    },
    { new: true }
  );
};

/* =====================  CANCEL  ===================== */

// Moves an order to Cancelled exactly once, puts the stock back and closes any open payment page
const cancelOrder = async (filter, extraSet = {}) => {
  const order = await Order.findOneAndUpdate(
    { $and: [filter, { status: { $ne: "Cancelled" } }] },
    { $set: { status: "Cancelled", ...extraSet } },
    { new: true }
  );
  if (!order) return null;

  await restoreStock(order.items);

  const stripe = getStripe();
  if (stripe && order.paymentMethod === "card" && order.paymentStatus === "unpaid" && order.stripeSessionId) {
    stripe.checkout.sessions.expire(order.stripeSessionId).catch(() => {});
  }
  return order;
};

/* =====================  CUSTOMER ENDPOINTS  ===================== */

// GET /order/config : tells the checkout which payment options exist
const getConfig = (req, res) => res.json({ cardEnabled: !!getStripe(), currency: currency() });

// POST /order/place-order
// The client only sends product ids + quantities. Prices and the total are
// calculated here from the database, so they cannot be tampered with.
const placeOrder = async (req, res) => {
  try {
    const { items, customerDetails, paymentMethod = "cod" } = req.body || {};

    if (!["cod", "card"].includes(paymentMethod)) return bad(res, "Invalid payment method");
    if (paymentMethod === "card" && !getStripe()) {
      return bad(res, "Online payment is not available right now. Please choose cash on delivery.");
    }
    if (!Array.isArray(items) || items.length === 0) return bad(res, "Your cart is empty");

    const { name, phone, location } = customerDetails || {};
    if (![name, phone, location].every((v) => typeof v === "string" && v.trim())) {
      return bad(res, "Name, phone and delivery location are required");
    }

    // Merge duplicate products and validate quantities
    const qtyById = new Map();
    for (const item of items) {
      const id = String(item._id || item.product || "");
      const qty = Number(item.qty);
      if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid product in cart");
      if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
        return bad(res, "Quantity must be a whole number from 1 to 1000");
      }
      qtyById.set(id, (qtyById.get(id) || 0) + qty);
    }

    const products = await Product.find({ _id: { $in: [...qtyById.keys()] } });
    if (products.length !== qtyById.size) {
      return bad(res, "Some products in your cart are no longer available. Please refresh your cart.");
    }

    const orderItems = products.map((p) => ({
      product: p._id,
      name: p.name,
      price: p.price,
      qty: qtyById.get(p._id.toString()),
      unit: p.unit,
      image: p.image,
    }));
    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    const reserved = await reserveStock(orderItems);
    if (!reserved.ok) return bad(res, `Not enough stock for ${reserved.name}. Please reduce the quantity.`);

    let order;
    try {
      order = await Order.create({
        userId: req.user.id,
        items: orderItems,
        totalAmount,
        paymentMethod,
        customerDetails: { name: name.trim(), phone: phone.trim(), location: location.trim() },
      });
    } catch (err) {
      await restoreStock(orderItems);
      throw err;
    }

    if (paymentMethod === "card") {
      try {
        const checkoutUrl = await createCheckoutSession(order, req.user);
        return res.status(201).json({
          message: "Order created. Redirecting to payment...",
          orderId: order._id,
          totalAmount,
          checkoutUrl,
        });
      } catch (err) {
        console.error("Stripe error:", err.message);
        await cancelOrder({ _id: order._id });
        return bad(res, "Could not start the online payment. Please try again or choose cash on delivery.", 502);
      }
    }

    // Cash on delivery: confirmation emails go out now
    notifyNewOrder(order).catch(() => {});
    res.status(201).json({ message: "Order placed successfully!", orderId: order._id, totalAmount });
  } catch (error) {
    fail(res, error);
  }
};

// GET /order/my-orders
const getMyOrders = async (req, res) => {
  try {
    res.json(await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }));
  } catch (error) {
    fail(res, error);
  }
};

// GET /order/:id : the owner, or any admin
const getOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid order id");
    const order = await Order.findById(req.params.id).populate("userId", "username email");
    if (!order) return bad(res, "Order not found", 404);

    const ownerId = String(order.userId?._id || order.userId);
    if (req.user.role !== "admin" && ownerId !== req.user.id) return bad(res, "Order not found", 404);

    res.json(order);
  } catch (error) {
    fail(res, error);
  }
};

// PATCH /order/:id/cancel : owner, only while Pending and not yet paid
const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid order id");

    const order = await cancelOrder({
      _id: id,
      userId: req.user.id,
      status: "Pending",
      paymentStatus: { $ne: "paid" },
    });

    if (!order) {
      const exists = await Order.exists({ _id: id, userId: req.user.id });
      return exists
        ? bad(res, "This order can no longer be cancelled online. Please contact us for help.")
        : bad(res, "Order not found", 404);
    }

    notifyStatus(order).catch(() => {});
    res.json({ message: "Order cancelled", order });
  } catch (error) {
    fail(res, error);
  }
};

// POST /order/:id/pay : start (or restart) the card payment for an unpaid card order
const payOrder = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return bad(res, "Online payment is not available right now.");
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid order id");

    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return bad(res, "Order not found", 404);
    if (order.paymentMethod !== "card") return bad(res, "This order is cash on delivery");
    if (order.status === "Cancelled") return bad(res, "This order was cancelled");
    if (order.paymentStatus !== "unpaid") return bad(res, "This order is already paid");

    // The old payment page might have been paid already (e.g. webhook missed)
    if (order.stripeSessionId) {
      const old = await stripe.checkout.sessions.retrieve(order.stripeSessionId).catch(() => null);
      if (old && old.payment_status === "paid") {
        const paid = await markPaid(order._id, old);
        return res.json({ alreadyPaid: true, order: paid || order });
      }
      if (old && old.status === "open") await stripe.checkout.sessions.expire(old.id).catch(() => {});
    }

    const checkoutUrl = await createCheckoutSession(order, req.user);
    res.json({ checkoutUrl });
  } catch (error) {
    console.error("Stripe error:", error.message);
    bad(res, "Could not start the online payment. Please try again.", 502);
  }
};

// POST /order/:id/verify-payment : called when the customer returns from Stripe
const verifyPayment = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return bad(res, "Online payment is not available right now.");
    const { sessionId } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id) || typeof sessionId !== "string") {
      return bad(res, "Invalid request");
    }

    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return bad(res, "Order not found", 404);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.orderId !== String(order._id)) {
      return bad(res, "This payment does not belong to this order");
    }

    const paid = session.payment_status === "paid";
    if (paid) await markPaid(order._id, session);

    res.json({ paid, order: await Order.findById(order._id) });
  } catch (error) {
    console.error("verify-payment error:", error.message);
    bad(res, "Could not verify the payment", 400);
  }
};

/* =====================  ADMIN ENDPOINTS  ===================== */

// GET /order/all
const getAllOrders = async (req, res) => {
  try {
    res.json(await Order.find().populate("userId", "username email").sort({ createdAt: -1 }));
  } catch (error) {
    fail(res, error);
  }
};

// PATCH /order/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) {
      return bad(res, `Status must be one of: ${ORDER_STATUSES.join(", ")}`);
    }
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid order id");

    const order = await Order.findById(req.params.id);
    if (!order) return bad(res, "Order not found", 404);
    if (order.status === "Cancelled") return bad(res, "A cancelled order cannot be changed");
    if (order.status === status) return res.json({ message: "No change", order });

    let updated;
    if (status === "Cancelled") {
      const refundNeeded = order.paymentMethod === "card" && order.paymentStatus === "paid";
      updated = await cancelOrder({ _id: order._id }, refundNeeded ? { paymentStatus: "refund_due" } : {});
    } else {
      updated = await Order.findOneAndUpdate(
        { _id: order._id, status: { $ne: "Cancelled" } },
        { status },
        { new: true, runValidators: true }
      );
    }
    if (!updated) return bad(res, "The order was changed by someone else. Refresh and try again.");

    notifyStatus(updated).catch(() => {});
    res.json({ message: "Status updated", order: updated });
  } catch (error) {
    fail(res, error);
  }
};

// PATCH /order/:id/payment : mark a cash-on-delivery order as paid / unpaid
const updatePayment = async (req, res) => {
  try {
    const { paymentStatus } = req.body || {};
    if (!["paid", "unpaid"].includes(paymentStatus)) return bad(res, "paymentStatus must be paid or unpaid");
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid order id");

    const order = await Order.findById(req.params.id);
    if (!order) return bad(res, "Order not found", 404);
    if (order.paymentMethod !== "cod") return bad(res, "Card payments are updated automatically");
    if (order.status === "Cancelled") return bad(res, "A cancelled order cannot be changed");

    order.paymentStatus = paymentStatus;
    order.paidAt = paymentStatus === "paid" ? new Date() : undefined;
    await order.save();
    res.json({ message: "Payment updated", order });
  } catch (error) {
    fail(res, error);
  }
};

// POST /order/:id/refund : refund a cancelled, paid card order through Stripe
const refundOrder = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return bad(res, "Stripe is not configured");
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Invalid order id");

    const order = await Order.findById(req.params.id);
    if (!order) return bad(res, "Order not found", 404);
    if (order.status !== "Cancelled" || order.paymentStatus !== "refund_due") {
      return bad(res, "Only a cancelled order that was paid by card can be refunded. Cancel the order first.");
    }
    if (!order.stripePaymentIntent) return bad(res, "No Stripe payment is recorded for this order");

    await stripe.refunds.create({ payment_intent: order.stripePaymentIntent });
    order.paymentStatus = "refunded";
    await order.save();
    res.json({ message: "Refund issued", order });
  } catch (error) {
    console.error("Refund error:", error.message);
    bad(res, `Stripe could not refund this payment: ${error.message}`, 502);
  }
};

/* =====================  STRIPE WEBHOOK  ===================== */
// Mounted in index.js with express.raw(), because Stripe signs the raw body.
const stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(503).send("Webhook is not configured");

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId && mongoose.isValidObjectId(orderId)) {
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        if (session.payment_status === "paid") await markPaid(orderId, session);
      } else if (event.type === "checkout.session.expired") {
        // Only cancel if THIS session is still the order's current one
        await cancelOrder({ _id: orderId, status: "Pending", paymentStatus: "unpaid", stripeSessionId: session.id });
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).send("Webhook handler failed");
  }
};

module.exports = {
  getConfig,
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  payOrder,
  verifyPayment,
  getAllOrders,
  updateOrderStatus,
  updatePayment,
  refundOrder,
  stripeWebhook,
};
