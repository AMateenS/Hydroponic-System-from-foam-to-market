const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const { adminOnly } = require("../middlewares/admin");
const c = require("../controllers/orderController");

// Fixed paths first, so they are not mistaken for an :id
router.get("/config", protect, c.getConfig);
router.post("/place-order", protect, c.placeOrder);
router.get("/my-orders", protect, c.getMyOrders);
router.get("/all", protect, adminOnly, c.getAllOrders);

// One order (owner or admin)
router.get("/:id", protect, c.getOrderById);

// Customer actions
router.patch("/:id/cancel", protect, c.cancelMyOrder);
router.post("/:id/pay", protect, c.payOrder);
router.post("/:id/verify-payment", protect, c.verifyPayment);

// Admin actions
router.patch("/:id/status", protect, adminOnly, c.updateOrderStatus);
router.patch("/:id/payment", protect, adminOnly, c.updatePayment);
router.post("/:id/refund", protect, adminOnly, c.refundOrder);

module.exports = router;
