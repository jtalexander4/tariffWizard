const express = require("express");
const router = express.Router();
const CountryRate = require("../models/CountryRate");

// GET all countries
router.get("/", async (req, res) => {
  try {
    const { active = true } = req.query;
    const query = active === "false" ? {} : { isActive: true };

    const countries = await CountryRate.find(query).sort({ country: 1 });
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET country by code
router.get("/:countryCode", async (req, res) => {
  try {
    const country = await CountryRate.findOne({
      countryCode: req.params.countryCode.toUpperCase(),
    });
    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json(country);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new country rate
router.post("/", async (req, res) => {
  try {
    const countryRate = new CountryRate(req.body);
    await countryRate.save();
    res.status(201).json(countryRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update country rate
router.put("/:countryCode", async (req, res) => {
  try {
    const countryRate = await CountryRate.findOneAndUpdate(
      { countryCode: req.params.countryCode.toUpperCase() },
      req.body,
      { new: true, runValidators: true }
    );
    if (!countryRate) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json(countryRate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE country rate
router.delete("/:countryCode", async (req, res) => {
  try {
    const countryRate = await CountryRate.findOneAndDelete({
      countryCode: req.params.countryCode.toUpperCase(),
    });
    if (!countryRate) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json({ message: "Country rate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
