const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Temporary dummy AI response
    res.json({
      reply: "AI working ✅ You asked: " + message
    });

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI failed" });
  }
});

module.exports = router;
