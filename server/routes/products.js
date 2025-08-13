const express = require("express");
const router = express.Router();
const ProductRate = require("../models/ProductRate");

// GET all product rates
router.get("/", async (req, res) => {
  try {
    const { hsCode, rateType, active = true } = req.query;
    let query = active === "false" ? {} : { isActive: true };

    if (hsCode) query.hsCode = hsCode;
    if (rateType) query.rateType = rateType;

    const productRates = await ProductRate.find(query).sort({ hsCode: 1 });
    res.json(productRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET product rates by HS code
router.get("/hscode/:hsCode", async (req, res) => {
  try {
    const productRates = await ProductRate.find({
      hsCode: req.params.hsCode,
      isActive: true,
    });
    res.json(productRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new product rate
router.post("/", async (req, res) => {
  try {
    const productRate = new ProductRate(req.body);
    await productRate.save();
    res.status(201).json(productRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update product rate
router.put("/:id", async (req, res) => {
  try {
    const productRate = await ProductRate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!productRate) {
      return res.status(404).json({ error: "Product rate not found" });
    }
    res.json(productRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE product rate
router.delete("/:id", async (req, res) => {
  try {
    const productRate = await ProductRate.findByIdAndDelete(req.params.id);
    if (!productRate) {
      return res.status(404).json({ error: "Product rate not found" });
    }
    res.json({ message: "Product rate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
