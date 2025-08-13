const express = require("express");
const router = express.Router();
const Exemption = require("../models/Exemption");

// GET all exemptions
router.get("/", async (req, res) => {
  try {
    const { hsCode, exemptionType, country, active = true } = req.query;
    let query = active === "false" ? {} : { isActive: true };

    if (hsCode) query.hsCode = hsCode;
    if (exemptionType) query.exemptionType = exemptionType;
    if (country) query.eligibleCountries = { $in: [country] };

    const exemptions = await Exemption.find(query).sort({ hsCode: 1 });
    res.json(exemptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET exemptions by HS code
router.get("/hscode/:hsCode", async (req, res) => {
  try {
    const exemptions = await Exemption.find({
      hsCode: req.params.hsCode,
      isActive: true,
    });
    res.json(exemptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET exemptions by country
router.get("/country/:country", async (req, res) => {
  try {
    const exemptions = await Exemption.find({
      eligibleCountries: { $in: [req.params.country] },
      isActive: true,
    });
    res.json(exemptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new exemption
router.post("/", async (req, res) => {
  try {
    const exemption = new Exemption(req.body);
    await exemption.save();
    res.status(201).json(exemption);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update exemption
router.put("/:id", async (req, res) => {
  try {
    const exemption = await Exemption.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!exemption) {
      return res.status(404).json({ error: "Exemption not found" });
    }
    res.json(exemption);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE exemption
router.delete("/:id", async (req, res) => {
  try {
    const exemption = await Exemption.findByIdAndDelete(req.params.id);
    if (!exemption) {
      return res.status(404).json({ error: "Exemption not found" });
    }
    res.json({ message: "Exemption deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
