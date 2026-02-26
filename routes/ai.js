router.post("/", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  let reply = "";

  const text = message.toLowerCase();

  if (text.includes("fever")) {
    reply = "For fever, you can take Paracetamol 500mg every 6 hours. Stay hydrated and rest well. If fever persists more than 3 days, consult a doctor.";
  }
  else if (text.includes("headache")) {
    reply = "For headache, you may take Combiflam or Paracetamol. Also try resting and drinking water. If pain is severe or frequent, consult a doctor.";
  }
  else if (text.includes("diabetes")) {
    reply = "For diabetes, maintain a low-sugar diet and regular exercise. Common medicines include Metformin. Please consult your doctor before taking any medication.";
  }
  else if (text.includes("back pain")) {
    reply = "For back pain, apply a pain relief gel and take mild painkillers like Paracetamol. Do light stretching. If pain is severe, consult a doctor.";
  }
  else {
    reply = "I recommend consulting a pharmacist or doctor for proper guidance regarding this issue.";
  }

  res.json({ reply });
});
