const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");

// GET analytics data
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    const products = await Product.find();

    const totalOrders = orders.length;

    const totalRevenue = orders.reduce((sum, o) => {
      return sum + (o.totalAmount || 0);
    }, 0);

    const lowStock = products.filter(p => p.stock < 10).length;

    res.json({
      totalOrders,
      totalRevenue,
      lowStock
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analytics error" });
  }
});

module.exports = router;
