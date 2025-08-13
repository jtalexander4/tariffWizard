const express = require("express");
const router = express.Router();
const SpecialRate = require("../models/SpecialRate");

// GET all special rates
router.get("/", async (req, res) => {
  try {
    const { hsCode, rateType, active = true } = req.query;
    let query = active === "false" ? {} : { isActive: true };

    if (hsCode) query.hsCode = hsCode;
    if (rateType) query.rateType = rateType;

    const specialRates = await SpecialRate.find(query).sort({ hsCode: 1 });
    res.json(specialRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET special rates by HS code
router.get("/hscode/:hsCode", async (req, res) => {
  try {
    const specialRates = await SpecialRate.find({
      hsCode: req.params.hsCode,
      isActive: true,
    });
    res.json(specialRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new special rate
router.post("/", async (req, res) => {
  try {
    const specialRate = new SpecialRate(req.body);
    await specialRate.save();
    res.status(201).json(specialRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update special rate
router.put("/:id", async (req, res) => {
  try {
    const specialRate = await SpecialRate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!specialRate) {
      return res.status(404).json({ error: "Special rate not found" });
    }
    res.json(specialRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE special rate
router.delete("/:id", async (req, res) => {
  try {
    const specialRate = await SpecialRate.findByIdAndDelete(req.params.id);
    if (!specialRate) {
      return res.status(404).json({ error: "Special rate not found" });
    }
    res.json({ message: "Special rate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
