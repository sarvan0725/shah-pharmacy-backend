const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../database");
// ✅ SEND OTP
router.post("/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone required" });
  }

  // ✅ Random OTP generate
  const otp = Math.floor(100000 + Math.random() * 900000);

  // ✅ Save OTP in DB
  db.run(
    "INSERT INTO otp_codes (phone, otp) VALUES (?, ?)",
    [phone, otp],
    async (err) => {
      if (err) {
        return res.status(500).json({ error: "DB Error" });
      }

      // ✅ Send OTP via Fast2SMS
      try {
        await axios.post(
          "https://www.fast2sms.com/dev/bulkV2",
          {
            route: "q",
            message: `Your OTP for Shah Pharmacy is ${otp}`,
            numbers: phone,
          },
          {
            headers: {
              authorization: process.env.FAST2SMS_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        res.json({ message: "OTP Sent Successfully" });
      } catch (error) {
        console.log("SMS Error:", error.response?.data);
        res.status(500).json({ error: "SMS Failed" });
      }
    }
  );
});

// ✅ VERIFY OTP
router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  db.get(
    "SELECT * FROM otp_codes WHERE phone=? AND otp=? ORDER BY id DESC LIMIT 1",
    [phone, otp],
    (err, row) => {
      if (row) {
        res.json({ success: true, message: "Login Successful" });
      } else {
        res.json({ success: false, message: "Invalid OTP" });
      }
    }
  );
});

module.exports = router;
