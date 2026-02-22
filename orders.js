const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/* =========================
   ORDER SCHEMA
========================= */
const orderSchema = new mongoose.Schema({
  userId: Number,
  customerName: String,
  phone: String,
  orderNumber: String,
  items: [
    {
      productId: String,
      name: String,
      quantity: Number,
      price: Number,
      total: Number,
      image: String
    }
  ],
  totalAmount: Number,
  deliveryCharge: Number,
  coinsUsed: Number,
  coinsEarned: Number,
  deliveryAddress: String,
  deliveryDistance: Number,
  paymentMethod: String,
  notes: String,
  status: {
    type: String,
    default: 'pending'
  }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

/* =========================
   CREATE ORDER
========================= */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      customerName,
      phone,
      items,
      totalAmount,
      deliveryCharge,
      coinsUsed,
      deliveryAddress,
      deliveryDistance,
      paymentMethod,
      notes
    } = req.body;

    const orderNumber = 'SP' + Date.now();
    const coinsEarned = Math.floor(totalAmount / 100);

    const newOrder = await Order.create({
      userId,
      orderNumber,
      customerName,
      phone,
      items,
      totalAmount,
      deliveryCharge,
      coinsUsed,
      coinsEarned,
      deliveryAddress,
      deliveryDistance,
      paymentMethod,
      notes
    });

    res.json({
      success: true,
      orderId: newOrder._id,
      orderNumber,
      coinsEarned
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/* =========================
   GET USER ORDERS
========================= */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: Number(userId) })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

/* =========================
   GET ORDER BY ID
========================= */
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

/* =========================
   UPDATE ORDER STATUS
========================= */
router.put('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await Order.findByIdAndUpdate(req.params.orderId, { status });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/* =========================
   DELETE ORDER
========================= */
router.delete('/:orderId', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.orderId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

/* =========================
   GET ALL ORDERS (ADMIN)
========================= */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});



// GET ORDERS BY USER PHONE
router.get("/user/:phone", async (req, res) => {
  try {
    const orders = await Order.find({ phone: req.params.phone });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Error fetching user orders" });
  }
});





module.exports = router;
