const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE ORDER
router.post("/create-order", async (req, res) => {
  try {

    console.log("BODY RECEIVED:", req.body);

    const amount = Number(req.body.amount);

    if (!amount) {
      return res.status(400).json({ error: "Amount missing" });
    }

    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);

  } catch (error) {
    console.error("RAZORPAY ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// VERIFY PAYMENT
router.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

module.exports = router;
