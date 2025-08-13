const express = require("express");
const router = express.Router();
const MaterialRate = require("../models/MaterialRate");

// GET all material rates
router.get("/", async (req, res) => {
  try {
    const { material, materialCategory, active = true } = req.query;
    let query = active === "false" ? {} : { isActive: true };

    if (material) query.material = material.toLowerCase();
    if (materialCategory) query.materialCategory = materialCategory;

    const materialRates = await MaterialRate.find(query).sort({ material: 1 });
    res.json(materialRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET material rates by HS code
router.get("/hscode/:hsCode", async (req, res) => {
  try {
    const materialRates = await MaterialRate.find({
      applicableHsCodes: { $in: [req.params.hsCode] },
      isActive: true,
    });
    res.json(materialRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET material rate by material name
router.get("/material/:material", async (req, res) => {
  try {
    const materialRate = await MaterialRate.findOne({
      material: req.params.material.toLowerCase(),
      isActive: true,
    });
    if (!materialRate) {
      return res.status(404).json({ error: "Material rate not found" });
    }
    res.json(materialRate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new material rate
router.post("/", async (req, res) => {
  try {
    const materialRate = new MaterialRate(req.body);
    await materialRate.save();
    res.status(201).json(materialRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update material rate
router.put("/:id", async (req, res) => {
  try {
    const materialRate = await MaterialRate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!materialRate) {
      return res.status(404).json({ error: "Material rate not found" });
    }
    res.json(materialRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE material rate
router.delete("/:id", async (req, res) => {
  try {
    const materialRate = await MaterialRate.findByIdAndDelete(req.params.id);
    if (!materialRate) {
      return res.status(404).json({ error: "Material rate not found" });
    }
    res.json({ message: "Material rate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
