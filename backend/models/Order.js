const mongoose = require("mongoose");

const ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
const PAYMENT_METHODS = ["cod", "card"];
// refund_due = a paid card order was cancelled and the money still has to go back
const PAYMENT_STATUSES = ["unpaid", "paid", "refund_due", "refunded"];

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        price: Number,
        qty: { type: Number, required: true, min: 1 },
        unit: String,
        image: String,
      },
    ],
    totalAmount: { type: Number, required: true },
    customerDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      location: { type: String, required: true },
    },
    status: { type: String, enum: ORDER_STATUSES, default: "Pending" },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cod" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    paidAt: { type: Date },
    stripeSessionId: { type: String },
    stripePaymentIntent: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
