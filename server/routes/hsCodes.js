const express = require("express");
const router = express.Router();
const HsCode = require("../models/HsCode");

// GET all HS codes
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query = search ? { $text: { $search: search } } : {};

    const hsCodes = await HsCode.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ hsCode: 1 });

    const total = await HsCode.countDocuments(query);

    res.json({
      hsCodes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET HS code by code
router.get("/:hsCode", async (req, res) => {
  try {
    const hsCode = await HsCode.findOne({ hsCode: req.params.hsCode });
    if (!hsCode) {
      return res.status(404).json({ error: "HS Code not found" });
    }
    res.json(hsCode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new HS code
router.post("/", async (req, res) => {
  try {
    const hsCode = new HsCode(req.body);
    await hsCode.save();
    res.status(201).json(hsCode);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update HS code
router.put("/:hsCode", async (req, res) => {
  try {
    const hsCode = await HsCode.findOneAndUpdate(
      { hsCode: req.params.hsCode },
      req.body,
      { new: true, runValidators: true }
    );
    if (!hsCode) {
      return res.status(404).json({ error: "HS Code not found" });
    }
    res.json(hsCode);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE HS code
router.delete("/:hsCode", async (req, res) => {
  try {
    const hsCode = await HsCode.findOneAndDelete({ hsCode: req.params.hsCode });
    if (!hsCode) {
      return res.status(404).json({ error: "HS Code not found" });
    }
    res.json({ message: "HS Code deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
