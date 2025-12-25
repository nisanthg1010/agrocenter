const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    composition: { type: String },
    stockQty: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    images: { type: [String], default: [] }, // array of image URLs
    brandName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
