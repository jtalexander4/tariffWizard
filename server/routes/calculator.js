const express = require("express");
const router = express.Router();
const HsCode = require("../models/HsCode");
const CountryRate = require("../models/CountryRate");
const SpecialRate = require("../models/SpecialRate");
const Exemption = require("../models/Exemption");
const MaterialRate = require("../models/MaterialRate");
const metalPriceService = require("../services/metalPriceService");

// POST calculate tariff
router.post("/calculate", async (req, res) => {
  try {
    const {
      hsCode,
      country,
      productCost,
      materials = [],
      materialWeights = {},
    } = req.body;

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

    // Get special rates that apply to this country
    const specialRates = await SpecialRate.find({
      hsCode,
      isActive: true,
      $or: [
        { appliesToAllCountries: true },
        { applicableCountries: { $in: [country] } },
      ],
    });

    // Get exemptions
    const exemptions = await Exemption.find({
      hsCode,
      isActive: true,
      eligibleCountries: { $in: [country] },
    });

    // Get material rates - only for materials the user has specified
    const materialRates = await MaterialRate.find({
      $and: [
        {
          $or: [
            { applicableHsCodes: { $in: [hsCode] } },
            { material: { $in: materials.map((m) => m.toLowerCase()) } },
          ],
        },
        // Only include material rates for materials the user has specified
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
      specialRates: [],
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

    // Add special rates (country-specific or global)
    specialRates.forEach((rate) => {
      const specialRate = {
        type: rate.rateType,
        rate: rate.specialProductRate,
        amount: (parseFloat(productCost) * rate.specialProductRate) / 100,
        description: rate.description,
        appliesToAllCountries: rate.appliesToAllCountries,
        applicableCountries: rate.applicableCountries,
      };
      calculation.specialRates.push(specialRate);
      calculation.totalTariffRate += rate.specialProductRate;
    });

    // Add material-specific rates with current market prices and weight-based calculations
    const currentMetalPrices = {};
    let totalMaterialCost = 0;

    // First, get all metal prices we need
    for (const rate of materialRates) {
      try {
        const trackedMetals = ["copper", "aluminum"];
        if (trackedMetals.includes(rate.material.toLowerCase())) {
          if (!currentMetalPrices[rate.material]) {
            currentMetalPrices[rate.material] =
              await metalPriceService.getMetalPrice(rate.material);
          }
        }
      } catch (error) {
        console.warn(`Could not fetch ${rate.material} price:`, error.message);
      }
    }

    // Process material rates with weight-based calculations
    materialRates.forEach((rate) => {
      const material = rate.material.toLowerCase();
      const currentPrice = currentMetalPrices[material];
      const materialWeight = parseFloat(materialWeights[material]) || 0;

      // Calculate material cost and tariff
      let materialCost = 0;
      let materialTariffAmount = 0;

      if (currentPrice && materialWeight > 0) {
        materialCost = currentPrice * materialWeight;
        materialTariffAmount = (materialCost * rate.specialProductRate) / 100;
        totalMaterialCost += materialCost;
      }

      const materialRate = {
        material: rate.material,
        type: rate.rateType,
        rate: rate.specialProductRate,
        weight: materialWeight,
        materialCost: materialCost,
        amount: materialTariffAmount,
        currentMarketPrice: currentPrice
          ? {
              price: currentPrice,
              unit: "USD per kg",
              source: "LME (London Metal Exchange)",
              note: "Current market price (updated weekly)",
            }
          : null,
      };

      calculation.materialSpecific.push(materialRate);

      // Only add to total tariff rate if we have weight-based calculation
      if (materialWeight > 0 && currentPrice) {
        // Material tariffs are calculated on material cost, not product cost
        // So we add the actual tariff amount, not a rate
        calculation.totalTariffAmount += materialTariffAmount;
      } else {
        // Fallback to old method if no weight specified
        calculation.totalTariffRate += rate.specialProductRate;
      }
    });

    // Apply exemptions (set country rate to zero if exemption applies)
    let countryRateExempted = false;
    exemptions.forEach((exemption) => {
      const exemptionData = {
        type: exemption.exemptionType,
        description: exemption.exemptionDescription,
        appliedToCountryRate: true,
      };
      calculation.exemptions.push(exemptionData);
      countryRateExempted = true;
    });

    // If exemption applies, zero out the country-specific rate
    if (countryRateExempted && calculation.countrySpecific) {
      const originalCountryRate = calculation.countrySpecific.rate;
      calculation.totalTariffRate -= originalCountryRate; // Remove original country rate from total
      calculation.countrySpecific = {
        rate: 0,
        amount: 0,
        exempted: true,
        originalRate: originalCountryRate,
      };
    }

    // Ensure tariff rate doesn't go below 0
    calculation.totalTariffRate = Math.max(0, calculation.totalTariffRate);

    // Calculate final amounts with material cost separation
    const remainingProductCost = Math.max(
      0,
      parseFloat(productCost) - totalMaterialCost
    );

    // Calculate tariff on remaining product cost (base + country + special rates)
    const remainingTariffAmount =
      (remainingProductCost * calculation.totalTariffRate) / 100;

    // Total tariff is material tariffs + remaining product tariffs
    calculation.totalTariffAmount += remainingTariffAmount;

    // Calculate the effective total tariff rate based on original product cost
    calculation.effectiveTotalTariffRate =
      (calculation.totalTariffAmount / parseFloat(productCost)) * 100;

    // Add calculation breakdown for transparency
    calculation.costBreakdown = {
      originalProductCost: parseFloat(productCost),
      totalMaterialCost: totalMaterialCost,
      remainingProductCost: remainingProductCost,
      materialTariffAmount:
        calculation.totalTariffAmount - remainingTariffAmount,
      remainingProductTariffAmount: remainingTariffAmount,
    };

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
