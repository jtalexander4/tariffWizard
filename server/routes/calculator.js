const express = require("express");
const router = express.Router();
const HsCode = require("../models/HsCode");
const CountryRate = require("../models/CountryRate");
const SpecialRate = require("../models/SpecialRate");
const Exemption = require("../models/Exemption");
const MaterialRate = require("../models/MaterialRate");
const metalPriceService = require("../services/metalPriceService");

// Function to generate customs invoice summary
function generateCustomsInvoiceSummary(calculation) {
  const summary = {
    "Line": calculation.lineNumber || "1",
    "Commodity Code": calculation.hsCode.replace(/\./g, ""),
    "COO": extractCountryCode(calculation.country),
  };

  // Only add metals section if there are materials with weight > 0
  const metalsWithWeight = calculation.materialSpecific.filter(m => m.weight > 0);
  if (metalsWithWeight.length > 0) {
    summary["Metals"] = {};

    metalsWithWeight.forEach(material => {
      const metalName = material.material.charAt(0).toUpperCase() + material.material.slice(1);
      summary["Metals"][metalName] = {
        "kg/unit": material.weight.toFixed(3),
      };

      if (material.currentMarketPrice) {
        summary["Metals"][metalName]["USD/kg"] = material.currentMarketPrice.price.toFixed(2);
      }

      summary["Metals"][metalName]["Country of Cast"] = extractCountryCode(calculation.countryOfCast || calculation.country);
      summary["Metals"][metalName]["Country of Smelt"] = extractCountryCode(calculation.countryOfSmelt || calculation.country);
    });
  }

  // Total Tariffs Due - group by rateCode
  summary["Total Tariffs Due"] = {};

  // Base tariff
  if (calculation.baseTariff.amount > 0) {
    const rateCode = calculation.baseTariff.rateCode || "Base";
    summary["Total Tariffs Due"][rateCode] = `$${calculation.baseTariff.amount.toFixed(2)}`;
  }

  // Country-specific tariff
  if (calculation.countrySpecific && calculation.countrySpecific.amount > 0) {
    const rateCode = calculation.countrySpecific.rateCode || "Country";
    summary["Total Tariffs Due"][rateCode] = `$${calculation.countrySpecific.amount.toFixed(2)}`;
  }

  // Special rates
  calculation.specialRates.forEach(rate => {
    if (rate.amount > 0) {
      const rateCode = rate.rateCode || "Special";
      summary["Total Tariffs Due"][rateCode] = `$${rate.amount.toFixed(2)}`;
    }
  });

  // Material tariffs
  calculation.materialSpecific.forEach(material => {
    if (material.amount > 0) {
      const rateCode = material.rateCode || "Material";
      summary["Total Tariffs Due"][rateCode] = `$${material.amount.toFixed(2)}`;
    }
  });

  return summary;
}

// Helper function to extract country code
function extractCountryCode(countryString) {
  if (!countryString) return "N/A";
  const match = countryString.match(/\(([^)]+)\)$/);
  return match ? match[1] : countryString;
}

// In-memory store for reports (key: reportId, value: array of calculations)
// In production, replace with a database (e.g., MongoDB) for persistence
const reports = new Map();

// POST calculate tariff
router.post("/calculate", async (req, res) => {
  try {
    const {
      hsCode,
      country,
      productCost,
      materials = [],
      materialWeights = {},
      quantity = 1,
      lineNumber,
    } = req.body;

    if (!hsCode || !country || !productCost) {
      return res.status(400).json({
        error: "HS Code, country, and product cost are required",
      });
    }

    // Parse and validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        error: "Quantity must be a positive integer",
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

    // Get exemptions - only based on HS code
    const exemptions = await Exemption.find({
      hsCode,
      isActive: true,
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
      quantity: parsedQuantity,
      manufacturerPartNumber: req.body.manufacturerPartNumber || "N/A",
      lineNumber: lineNumber || "1", // Default to "1" if not provided
      countryOfCast: req.body.countryOfCast || country,
      countryOfSmelt: req.body.countryOfSmelt || country,
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
        rateCode: countryData.rateCode,
        rate: countryData.adValoremRate,
        amount: (parseFloat(productCost) * countryData.adValoremRate) / 100,
      };
      calculation.totalTariffRate += countryData.adValoremRate;
    }

    // Add special rates (country-specific or global)
    specialRates.forEach((rate) => {
      const specialRate = {
        type: rate.rateType,
        rateCode: rate.rateCode,
        rateType: rate.rateType,
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
        rateCode: rate.rateCode,
        rateType: rate.rateType,
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

      // Only add to total tariff if we have both weight and price
      if (materialWeight > 0 && currentPrice) {
        // Material tariffs are calculated on material cost, not product cost
        // So we add the actual tariff amount, not a rate
        calculation.totalTariffAmount += materialTariffAmount;
      }
      // If no weight is specified (0 or empty), don't add any material tariff
      // This prevents the fallback to adding the rate to totalTariffRate
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
      const originalCountryAmount = calculation.countrySpecific.amount;
      const originalRateCode = calculation.countrySpecific.rateCode;

      calculation.totalTariffRate -= originalCountryRate; // Remove original country rate from total
      calculation.countrySpecific = {
        rateCode: originalRateCode,
        rate: 0,
        amount: 0,
        exempted: true,
        originalRate: originalCountryRate,
        originalAmount: originalCountryAmount,
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
    // But use the updated totalTariffRate which accounts for exemptions
    const remainingTariffAmount =
      (remainingProductCost * calculation.totalTariffRate) / 100;

    // Total tariff is material tariffs + remaining product tariffs
    calculation.totalTariffAmount += remainingTariffAmount;

    // Update individual tariff amounts to reflect final calculations
    calculation.baseTariff.amount =
      (remainingProductCost * calculation.baseTariff.rate) / 100;

    // Update country-specific amount to be based on remaining product cost
    if (calculation.countrySpecific && !calculation.countrySpecific.exempted) {
      calculation.countrySpecific.amount =
        (remainingProductCost * calculation.countrySpecific.rate) / 100;
    }

    // Update special rates amounts to be based on remaining product cost
    calculation.specialRates.forEach((rate) => {
      rate.amount = (remainingProductCost * rate.rate) / 100;
    });

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

    // Multiply all amounts by quantity
    calculation.baseTariff.amount *= parsedQuantity;
    if (calculation.countrySpecific) {
      calculation.countrySpecific.amount *= parsedQuantity;
    }
    calculation.specialRates.forEach((rate) => {
      rate.amount *= parsedQuantity;
    });
    calculation.materialSpecific.forEach((rate) => {
      rate.amount *= parsedQuantity;
      rate.materialCost *= parsedQuantity;
    });
    calculation.totalTariffAmount *= parsedQuantity;
    calculation.finalCost *= parsedQuantity;
    calculation.costBreakdown.originalProductCost *= parsedQuantity;
    calculation.costBreakdown.totalMaterialCost *= parsedQuantity;
    calculation.costBreakdown.remainingProductCost *= parsedQuantity;
    calculation.costBreakdown.materialTariffAmount *= parsedQuantity;
    calculation.costBreakdown.remainingProductTariffAmount *= parsedQuantity;

    // Generate customs invoice summary
    calculation.customsInvoiceSummary = generateCustomsInvoiceSummary(calculation);

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

// POST add to report
router.post("/add-to-report", async (req, res) => {
  try {
    const { reportId, calculation } = req.body;

    if (!calculation) {
      return res.status(400).json({ error: "Calculation data is required" });
    }

    let report = reports.get(reportId);
    if (!report) {
      report = [];
      reports.set(reportId, report);
    }

    report.push(calculation);
    res.json({ message: "Added to report", reportId, totalProducts: report.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET generate report
router.get("/generate-report/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reports.get(reportId);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Aggregate totals
    const totalTariffAmount = report.reduce((sum, calc) => sum + calc.totalTariffAmount, 0);
    const totalFinalCost = report.reduce((sum, calc) => sum + calc.finalCost, 0);
    const totalProductCost = report.reduce((sum, calc) => sum + (calc.productCost * calc.quantity), 0);

    // Add customs invoice summaries to each product
    const productsWithSummaries = report.map((calc, index) => ({
      ...calc,
      customsInvoiceSummary: generateCustomsInvoiceSummary(calc)
    }));

    res.json({
      reportId,
      products: productsWithSummaries,
      summary: {
        totalProducts: report.length,
        totalProductCost,
        totalTariffAmount,
        totalFinalCost,
      },
      message: "Report ready for PDF generation",
    });

    // Optional: Clear report after generation
    reports.delete(reportId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
