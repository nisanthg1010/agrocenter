const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect, authorize } = require("../middleware/authMiddleware");

// ------------------------------------------------------------
// CREATE PRODUCT (Admin Only)
// ------------------------------------------------------------
router.post("/", protect, authorize("admin","shopkeeper"), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------------
// GET ALL PRODUCTS (Public)
// ------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------------
// GET PRODUCT BY ID (Public)
// ------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------------
// UPDATE PRODUCT (Admin Only)
// ------------------------------------------------------------
router.put("/:id", protect, authorize("admin", "shopkeeper"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product updated", product });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------------
// DELETE PRODUCT (Admin Only)
// ------------------------------------------------------------
router.delete("/:id", protect, authorize("admin", "shopkeeper"), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
