const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * Temporary OTP Store (Memory)
 * Later DB में डाल देंगे
 */
let otpStore = {};

/**
 * ✅ SEND OTP API
 * POST → /api/otp/send-otp
 */
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number required" });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Save OTP in store
  otpStore[phone] = otp;

  console.log("Generated OTP:", otp);

  try {
    // ✅ Fast2SMS API Call
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",
        variables_values: otp,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Fast2SMS Response:", response.data);

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP Send Failed:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "OTP sending failed",
    });
  }
});

/**
 * ✅ VERIFY OTP API
 * POST → /api/otp/verify-otp
 */
router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: "Phone and OTP required",
    });
  }

  // Check OTP
  if (otpStore[phone] && otpStore[phone] == otp) {
    // OTP Verified → remove from store
    delete otpStore[phone];

    return res.json({
      success: true,
      message: "OTP Verified Successfully ✅",
    });
  }

  return res.status(400).json({
    success: false,
    error: "Invalid OTP ❌",
  });
});

module.exports = router;
