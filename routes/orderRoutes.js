const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/authMiddleware");


// ------------------------------------------------------------
// PLACE ORDER (USER)
// ------------------------------------------------------------
router.post("/", protect, async (req, res) => {
  try {
    const { shippingAddress, items, totalAmount, stripePaymentId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order items required" });
    }

    const order = await Order.create({
      userId: req.user._id,
      shippingAddress,
      items,
      totalAmount,
      paymentStatus: stripePaymentId ? "paid" : "pending",
      stripePaymentId,
    });

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });

  } catch (error) {
    console.error("Order Create Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------------------------------------------------
// GET ORDERS OF LOGGED-IN USER
// ------------------------------------------------------------
router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------------------------------------------------
// ADMIN GET ALL ORDERS
// ------------------------------------------------------------
router.get("/", protect, authorize("admin", "shopkeeper","deliveryagent"), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Admin Get Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------------------------------------------------
// ADMIN UPDATE ORDER STATUS
// ------------------------------------------------------------
router.put("/:id/status", protect, authorize("admin", "shopkeeper","deliveryagent"), async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (error) {
    console.error("Order Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------------------------------------------------
// GET SINGLE ORDER BY ID (USER OR ADMIN)
// ------------------------------------------------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.role === "admin" ? { $exists: true } : req.user._id,
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
