const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },

  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },   // ✅ YEH COMMA IMPORTANT HAI

  price: { type: Number, required: true },
  discount_price: { type: Number, default: 0 },
  stock: { type: Number, required: true },
  image: { type: String, default: null },
  description: { type: String, default: "" },
  brand: { type: String, default: "" },
  unit: { type: String, default: "piece" },
  is_active: { type: Boolean, default: true }

}, { timestamps: true });

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);
