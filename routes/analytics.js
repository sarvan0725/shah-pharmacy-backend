const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");



router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    const products = await Product.find();

    // total revenue
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // low stock
    const lowStock = products.filter(p => p.stock < 30).length;

    // best selling product
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.qty;
      });
    });

    let bestProduct = "No data";
    let max = 0;
    for (let p in productSales) {
      if (productSales[p] > max) {
        max = productSales[p];
        bestProduct = p;
      }
    }

    res.json({
      totalOrders: orders.length,
      totalRevenue,
      lowStock,
      bestProduct
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analytics error" });
  }
});

module.exports = router;
