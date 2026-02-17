const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: String,
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("Category", CategorySchema);
