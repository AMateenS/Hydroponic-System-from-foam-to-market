// Run with:  node tests/orders.test.js   (no database, Stripe or npm install needed: they use in-memory fakes)
const Module = require("module");
const path = require("path");
const assert = require("assert");

// ---------- tiny in-memory fake of the parts of Mongoose the controller uses ----------
const db = { Product: [], Order: [], User: [] };
let seq = 1;
const oid = () => String(seq++).padStart(24, "0");
const match = (doc, q) => Object.entries(q).every(([k, v]) => {
  if (k === "$and") return v.every((s) => match(doc, s));
  const val = doc[k];
  if (v && typeof v === "object" && !(v instanceof Date)) {
    return Object.entries(v).every(([op, arg]) => {
      if (op === "$ne") return String(val) !== String(arg);
      if (op === "$gte") return val !== undefined && val >= arg;
      if (op === "$in") return arg.map(String).includes(String(val));
      if (op === "$exists") return (val !== undefined) === arg;
      throw new Error("fake db: unsupported operator " + op);
    });
  }
  return String(val) === String(v);
});
const apply = (d, u) => {
  for (const [k, v] of Object.entries(u.$inc || {})) d[k] = (d[k] || 0) + v;
  for (const [k, v] of Object.entries(u.$set || {})) d[k] = v;
  for (const [k, v] of Object.entries(u)) if (!k.startsWith("$")) d[k] = v;
};
const wrap = (d) => { if (d && !d.save) Object.defineProperty(d, "save", { value: async () => d, enumerable: false }); return d || null; };
const model = (coll) => ({
  find: async (q = {}) => db[coll].filter((d) => match(d, q)).map(wrap),
  findOne: async (q) => wrap(db[coll].find((d) => match(d, q))),
  exists: async (q) => (db[coll].some((d) => match(d, q)) ? { _id: 1 } : null),
  findById: (id) => { const p = Promise.resolve(wrap(db[coll].find((d) => d._id === String(id)))); p.populate = () => p; p.select = () => p; return p; },
  create: async (data) => { const d = { _id: oid(), status: "Pending", paymentStatus: "unpaid", ...JSON.parse(JSON.stringify(data)) }; db[coll].push(d); return wrap(d); },
  updateOne: async (q, u) => { const d = db[coll].find((x) => match(x, q)); if (!d) return { modifiedCount: 0 }; apply(d, u); return { modifiedCount: 1 }; },
  findOneAndUpdate: async (q, u) => { const d = db[coll].find((x) => match(x, q)); if (!d) return null; apply(d, u); return wrap(d); },
});

// ---------- stubs ----------
const sent = [];
let stripeOn = true;
const calls = { expire: [], refund: [], create: 0 };
let sessionPaid = {}; // id -> payment_status
const fakeStripe = {
  checkout: { sessions: {
    create: async () => { calls.create++; const id = "cs_" + calls.create; sessionPaid[id] = "unpaid"; return { id, url: "https://pay.example/" + id }; },
    expire: async (id) => { calls.expire.push(id); },
    retrieve: async (id) => ({ id, status: "open", payment_status: sessionPaid[id], payment_intent: "pi_" + id, metadata: { orderId: sessionOrder[id] } }),
  } },
  refunds: { create: async (a) => { calls.refund.push(a); } },
  webhooks: { constructEvent: (body) => JSON.parse(body) },
};
const sessionOrder = {};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const from = parent && parent.filename ? path.basename(parent.filename) : "";
  if (from === "orderController.js") {
    if (request === "mongoose") return { isValidObjectId: (s) => /^[0-9a-f]{24}$/i.test(String(s)) };
    if (request === "../models/Order") { const m = model("Order"); m.ORDER_STATUSES = ["Pending","Confirmed","Shipped","Delivered","Cancelled"]; return m; }
    if (request === "../models/Product") return model("Product");
    if (request === "../models/User") { const m = model("User"); m.findById = (id) => ({ select: async () => db.User.find((u) => u._id === String(id)) }); return m; }
    if (request === "../utils/stripe") return { getStripe: () => (stripeOn ? fakeStripe : null), currency: () => "pkr", clientUrl: () => "http://localhost:3000" };
    if (request === "../utils/mailer") return { safeSend: async (o) => { sent.push(o.to + " | " + o.subject); } };
  }
  return origLoad.apply(this, arguments);
};
process.env.EMAIL_USER = "shop@example.com";
const c = require(path.join(__dirname, "..", "controllers", "orderController.js"));

const mkRes = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; } });
const call = async (fn, req) => { const res = mkRes(); await fn(req, res); return res; };
const tick = () => new Promise((r) => setTimeout(r, 5));
const stock = (id) => db.Product.find((p) => p._id === id).stock;

let pass = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log("  ok  " + name); } catch (e) { console.log("FAIL  " + name + "\n      " + e.message); process.exitCode = 1; } };

(async () => {
  const user = { id: oid(), role: "user", email: "u@x.com", username: "Ali" };
  const other = { id: oid(), role: "user", email: "o@x.com", username: "Bob" };
  const admin = { id: oid(), role: "admin", email: "a@x.com", username: "Boss" };
  db.User.push({ _id: user.id, username: "Ali", email: "u@x.com" }, { _id: other.id, username: "Bob", email: "o@x.com" });
  const A = { _id: oid(), name: "Tomato", price: 900, unit: "kg", image: "a.png", stock: 5 };
  const B = { _id: oid(), name: "Lettuce", price: 400, unit: "kg", image: "b.png", stock: 2 };
  db.Product.push(A, B);
  const body = (items, extra = {}) => ({ user, body: { items, customerDetails: { name: "Ali", phone: "03", location: "Faisalabad" }, ...extra } });
  let cod, card;

  await test("order refused when one product is short; earlier stock is rolled back", async () => {
    const r = await call(c.placeOrder, body([{ _id: A._id, qty: 3 }, { _id: B._id, qty: 3 }]));
    assert.strictEqual(r.code, 400); assert.match(r.body.error, /Not enough stock for Lettuce/);
    assert.strictEqual(stock(A._id), 5); assert.strictEqual(stock(B._id), 2); assert.strictEqual(db.Order.length, 0);
  });
  await test("COD order reduces stock, uses DB prices, emails customer + admin", async () => {
    const r = await call(c.placeOrder, body([{ _id: A._id, qty: 2 }, { _id: B._id, qty: 1, price: 1 }]));
    await tick(); assert.strictEqual(r.code, 201); assert.strictEqual(r.body.totalAmount, 2200);
    assert.strictEqual(stock(A._id), 3); assert.strictEqual(stock(B._id), 1);
    assert.strictEqual(sent.length, 2); cod = db.Order[0];
  });
  await test("customer cancels: stock returns once; second cancel refused, no double restore", async () => {
    const r1 = await call(c.cancelMyOrder, { user, params: { id: cod._id } });
    assert.strictEqual(r1.code, 200); assert.strictEqual(stock(A._id), 5); assert.strictEqual(stock(B._id), 2);
    const r2 = await call(c.cancelMyOrder, { user, params: { id: cod._id } });
    assert.strictEqual(r2.code, 400); assert.strictEqual(stock(A._id), 5);
  });
  await test("another customer cannot cancel or view my order (404), admin can view", async () => {
    const r1 = await call(c.cancelMyOrder, { user: other, params: { id: cod._id } }); assert.strictEqual(r1.code, 404);
    const r2 = await call(c.getOrderById, { user: other, params: { id: cod._id } }); assert.strictEqual(r2.code, 404);
    const r3 = await call(c.getOrderById, { user: admin, params: { id: cod._id } }); assert.strictEqual(r3.code, 200);
    const r4 = await call(c.getOrderById, { user, params: { id: cod._id } }); assert.strictEqual(r4.code, 200);
  });
  await test("card order: stock reserved, checkout URL returned, NO email before payment", async () => {
    sent.length = 0;
    const r = await call(c.placeOrder, body([{ _id: A._id, qty: 1 }], { paymentMethod: "card" }));
    await tick(); assert.strictEqual(r.code, 201); assert.match(r.body.checkoutUrl, /pay\.example/);
    card = db.Order[1]; sessionOrder[card.stripeSessionId] = card._id;
    assert.strictEqual(stock(A._id), 4); assert.strictEqual(sent.length, 0); assert.strictEqual(card.paymentStatus, "unpaid");
  });
  await test("return from Stripe: verify marks paid + Confirmed, emails once, is idempotent", async () => {
    sessionOrder[card.stripeSessionId] = card._id; sessionPaid[card.stripeSessionId] = "paid";
    const r = await call(c.verifyPayment, { user, params: { id: card._id }, body: { sessionId: card.stripeSessionId } });
    await tick(); assert.strictEqual(r.body.paid, true); assert.strictEqual(card.paymentStatus, "paid"); assert.strictEqual(card.status, "Confirmed");
    assert.strictEqual(card.stripePaymentIntent, "pi_" + card.stripeSessionId); assert.strictEqual(sent.length, 2);
    await call(c.verifyPayment, { user, params: { id: card._id }, body: { sessionId: card.stripeSessionId } });
    await tick(); assert.strictEqual(sent.length, 2, "emails must not repeat");
  });
  await test("verify refuses a session that belongs to a different order", async () => {
    const r = await call(c.verifyPayment, { user, params: { id: card._id }, body: { sessionId: "cs_foreign" } });
    assert.strictEqual(r.code, 400);
  });
  await test("customer cannot cancel a PAID order", async () => {
    const r = await call(c.cancelMyOrder, { user, params: { id: card._id } });
    assert.strictEqual(r.code, 400); assert.strictEqual(card.status, "Confirmed");
  });
  await test("refund refused before cancelling; admin cancel flags refund_due + restores stock; refund works", async () => {
    const early = await call(c.refundOrder, { user: admin, params: { id: card._id } }); assert.strictEqual(early.code, 400);
    const r = await call(c.updateOrderStatus, { user: admin, params: { id: card._id }, body: { status: "Cancelled" } });
    assert.strictEqual(r.code, 200); assert.strictEqual(card.paymentStatus, "refund_due"); assert.strictEqual(stock(A._id), 5);
    const f = await call(c.refundOrder, { user: admin, params: { id: card._id } });
    assert.strictEqual(f.code, 200); assert.strictEqual(card.paymentStatus, "refunded");
    assert.deepStrictEqual(calls.refund, [{ payment_intent: "pi_" + card.stripeSessionId }]);
    const again = await call(c.refundOrder, { user: admin, params: { id: card._id } }); assert.strictEqual(again.code, 400);
    const reopen = await call(c.updateOrderStatus, { user: admin, params: { id: card._id }, body: { status: "Pending" } });
    assert.strictEqual(reopen.code, 400, "cancelled orders must stay cancelled");
  });
  await test("expired OLD session does not cancel an order that has a newer session; expired CURRENT does", async () => {
    const r = await call(c.placeOrder, body([{ _id: A._id, qty: 2 }], { paymentMethod: "card" }));
    const o = db.Order[2]; assert.strictEqual(stock(A._id), 3);
    const ev = (id) => ({ headers: {}, body: JSON.stringify({ type: "checkout.session.expired", data: { object: { id, metadata: { orderId: o._id } } } }) });
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    const oldSession = o.stripeSessionId; o.stripeSessionId = "cs_newer";
    await call(c.stripeWebhook, ev(oldSession)); assert.strictEqual(o.status, "Pending");
    await call(c.stripeWebhook, ev("cs_newer")); assert.strictEqual(o.status, "Cancelled"); assert.strictEqual(stock(A._id), 5);
  });
  await test("payment arriving for an already-cancelled order is flagged refund_due", async () => {
    const r = await call(c.placeOrder, body([{ _id: A._id, qty: 1 }], { paymentMethod: "card" }));
    const o = db.Order[3]; sessionOrder[o.stripeSessionId] = o._id;
    const x = await call(c.cancelMyOrder, { user, params: { id: o._id } }); assert.strictEqual(x.code, 200);
    assert.ok(calls.expire.includes(o.stripeSessionId), "open payment page must be closed on cancel");
    sessionPaid[o.stripeSessionId] = "paid";
    const ev = { headers: {}, body: JSON.stringify({ type: "checkout.session.completed", data: { object: { id: o.stripeSessionId, payment_status: "paid", payment_intent: "pi_late", metadata: { orderId: o._id } } } }) };
    await call(c.stripeWebhook, ev);
    assert.strictEqual(o.paymentStatus, "refund_due"); assert.strictEqual(o.stripePaymentIntent, "pi_late");
  });
  await test("card option refused (before touching stock) when Stripe is not configured", async () => {
    stripeOn = false; const before = stock(A._id);
    const r = await call(c.placeOrder, body([{ _id: A._id, qty: 1 }], { paymentMethod: "card" }));
    assert.strictEqual(r.code, 400); assert.strictEqual(stock(A._id), before); stripeOn = true;
  });
  await test("bad input: empty cart, fractional qty, fake product id, missing address", async () => {
    assert.strictEqual((await call(c.placeOrder, body([]))).code, 400);
    assert.strictEqual((await call(c.placeOrder, body([{ _id: A._id, qty: 1.5 }]))).code, 400);
    assert.strictEqual((await call(c.placeOrder, body([{ _id: "nope", qty: 1 }]))).code, 400);
    const r = await call(c.placeOrder, { user, body: { items: [{ _id: A._id, qty: 1 }], customerDetails: { name: "x" } } });
    assert.strictEqual(r.code, 400);
  });
  await test("admin marks a COD order paid; card payments cannot be set by hand", async () => {
    const r = await call(c.placeOrder, body([{ _id: B._id, qty: 1 }])); const o = db.Order[db.Order.length - 1];
    const p = await call(c.updatePayment, { params: { id: o._id }, body: { paymentStatus: "paid" } });
    assert.strictEqual(p.code, 200); assert.strictEqual(o.paymentStatus, "paid");
    const q = await call(c.updatePayment, { params: { id: card._id }, body: { paymentStatus: "paid" } });
    assert.strictEqual(q.code, 400);
  });
  console.log(`\n${pass} tests passed` + (process.exitCode ? " (with failures)" : ""));
})();
