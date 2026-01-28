const express = require("express");
const router = express.Router();

let otpStore = {}; // Temporary OTP store

// ===========================
// SEND OTP API
// ===========================
router.post("/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number required" });
  }

  // Generate OTP (4 digit)
  const otp = Math.floor(1000 + Math.random() * 9000);

  // Save OTP in memory
  otpStore[phone] = otp;

  console.log("✅ OTP Generated:", otp);

  res.json({
    message: "OTP Sent Successfully",
    otp: otp, // अभी testing के लिए दिखा रहे
  });
});

// ===========================
// VERIFY OTP API
// ===========================
router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP required" });
  }

  if (otpStore[phone] == otp) {
    delete otpStore[phone];

    return res.json({
      success: true,
      message: "Login Successful ✅",
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid OTP ❌",
  });
});

module.exports = router;
