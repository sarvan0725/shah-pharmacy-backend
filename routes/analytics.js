const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// GET analytics data
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();

    const totalOrders = orders.length;

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    const totalCustomers = new Set(
      orders.map(o => o.phone)
    ).size;

    const avgOrderValue =
      totalOrders > 0
        ? Math.round(totalRevenue / totalOrders)
        : 0;

    res.json({
      totalOrders,
      totalRevenue,
      totalCustomers,
      avgOrderValue,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Analytics failed" });
  }
});

module.exports = router;
