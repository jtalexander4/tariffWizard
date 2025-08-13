const express = require("express");
const router = express.Router();
const HsCode = require("../models/HsCode");
const CountryRate = require("../models/CountryRate");
const ProductRate = require("../models/ProductRate");
const Exemption = require("../models/Exemption");
const MaterialRate = require("../models/MaterialRate");

// POST calculate tariff
router.post("/calculate", async (req, res) => {
  try {
    const { hsCode, country, productCost, materials = [] } = req.body;

    if (!hsCode || !country || !productCost) {
      return res.status(400).json({
        error: "HS Code, country, and product cost are required",
      });
    }

    // Get base HS code information
    const hsCodeData = await HsCode.findOne({ hsCode });
    if (!hsCodeData) {
      return res.status(404).json({ error: "HS Code not found" });
    }

    // Get country rate
    const countryData = await CountryRate.findOne({
      $or: [
        { country: new RegExp(country, "i") },
        { countryCode: country.toUpperCase() },
      ],
      isActive: true,
    });

    // Get product-specific rates
    const productRates = await ProductRate.find({
      hsCode,
      isActive: true,
    });

    // Get exemptions
    const exemptions = await Exemption.find({
      hsCode,
      isActive: true,
      eligibleCountries: { $in: [country] },
    });

    // Get material rates
    const materialRates = await MaterialRate.find({
      $or: [
        { applicableHsCodes: { $in: [hsCode] } },
        { material: { $in: materials.map((m) => m.toLowerCase()) } },
      ],
      isActive: true,
    });

    // Calculate tariffs
    const calculation = {
      hsCode,
      country,
      productCost: parseFloat(productCost),
      baseTariff: {
        rate: hsCodeData.normalTariffRate,
        amount: (parseFloat(productCost) * hsCodeData.normalTariffRate) / 100,
      },
      countrySpecific: null,
      productSpecific: [],
      materialSpecific: [],
      exemptions: [],
      totalTariffRate: hsCodeData.normalTariffRate,
      totalTariffAmount: 0,
      finalCost: 0,
    };

    // Add country-specific rate
    if (countryData) {
      calculation.countrySpecific = {
        rate: countryData.adValoremRate,
        amount: (parseFloat(productCost) * countryData.adValoremRate) / 100,
      };
      calculation.totalTariffRate += countryData.adValoremRate;
    }

    // Add product-specific rates
    productRates.forEach((rate) => {
      const productRate = {
        type: rate.rateType,
        rate: rate.specialProductRate,
        amount: (parseFloat(productCost) * rate.specialProductRate) / 100,
      };
      calculation.productSpecific.push(productRate);
      calculation.totalTariffRate += rate.specialProductRate;
    });

    // Add material-specific rates
    materialRates.forEach((rate) => {
      const materialRate = {
        material: rate.material,
        type: rate.rateType,
        rate: rate.specialProductRate,
        amount: (parseFloat(productCost) * rate.specialProductRate) / 100,
      };
      calculation.materialSpecific.push(materialRate);
      calculation.totalTariffRate += rate.specialProductRate;
    });

    // Apply exemptions (reduce tariff rates)
    exemptions.forEach((exemption) => {
      const exemptionData = {
        type: exemption.exemptionType,
        rate: exemption.exemptionRate,
        amount: (parseFloat(productCost) * exemption.exemptionRate) / 100,
      };
      calculation.exemptions.push(exemptionData);
      calculation.totalTariffRate -= exemption.exemptionRate;
    });

    // Ensure tariff rate doesn't go below 0
    calculation.totalTariffRate = Math.max(0, calculation.totalTariffRate);

    // Calculate final amounts
    calculation.totalTariffAmount =
      (parseFloat(productCost) * calculation.totalTariffRate) / 100;
    calculation.finalCost =
      parseFloat(productCost) + calculation.totalTariffAmount;

    res.json(calculation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET calculation history (for future feature)
router.get("/history", async (req, res) => {
  try {
    // This would be implemented when user authentication is added
    res.json({ message: "History feature coming soon" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
