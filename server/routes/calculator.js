const express = require("express");
const router = express.Router();
const HsCode = require("../models/HsCode");
const Section99Rule = require("../models/Section99Rule");
const Section99RuleLine = require("../models/Section99RuleLine");
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

  // Rule-based tariffs
  calculation.ruleBasedTariffs.forEach(tariff => {
    if (tariff.amount > 0) {
      const rateCode = tariff.rateCode || "Rule";
      summary["Total Tariffs Due"][rateCode] = `$${tariff.amount.toFixed(2)}`;
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

    // Get Section 99 rules for this HS code and country
    const section99Rules = await Section99Rule.find({
      tariffNo: hsCode,
      countryOfOrigin: country,
      isActive: true,
    });

    // Get all rule lines for these rules
    const ruleIds = section99Rules.map(rule => rule._id);
    const section99RuleLines = await Section99RuleLine.find({
      ruleId: { $in: ruleIds },
      isActive: true,
    }).populate('ruleId');

    // Get HS code description for display
    const hsCodeData = await HsCode.findOne({ hsCode });

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
        rate: 0,
        amount: 0,
      },
      countrySpecific: null,
      ruleBasedTariffs: [],
      materialSpecific: [],
      totalTariffRate: 0,
      totalTariffAmount: 0,
      finalCost: 0,
    };

    // Process Section 99 rule lines
    section99RuleLines.forEach((ruleLine) => {
      const rule = ruleLine.ruleId;
      let baseAmount = 0;

      switch (ruleLine.appliesTo) {
        case 'FullValue':
          baseAmount = parseFloat(productCost);
          break;
        case 'RemainderValue':
          // Will be calculated after material costs are known
          baseAmount = parseFloat(productCost); // Placeholder, will be updated later
          break;
        case 'MetalContentValue':
          // Will be calculated after material costs are known
          baseAmount = 0; // Placeholder, will be updated later based on actual metal content
          break;
        default:
          baseAmount = parseFloat(productCost);
      }

      const tariffAmount = (baseAmount * ruleLine.rate) / 100;

      const ruleBasedTariff = {
        ruleType: rule.ruleType,
        rateCode: ruleLine.rateCode,
        appliesTo: ruleLine.appliesTo,
        rate: ruleLine.rate,
        amount: tariffAmount,
        description: ruleLine.description,
      };

      calculation.ruleBasedTariffs.push(ruleBasedTariff);
      // Don't add to totalTariffRate here - we'll recalculate it properly later
    });

    // Process materials for cost tracking (tariffs now handled by rule lines)
    const currentMetalPrices = {};
    let totalMaterialCost = 0;

    // Get metal prices for cost calculation
    for (const material of materials) {
      try {
        const trackedMetals = ["copper", "aluminum"];
        if (trackedMetals.includes(material.toLowerCase())) {
          if (!currentMetalPrices[material]) {
            currentMetalPrices[material] =
              await metalPriceService.getMetalPrice(material);
          }
        }
      } catch (error) {
        console.warn(`Could not fetch ${material} price:`, error.message);
      }
    }

    // Track materials for cost calculation and reporting
    materials.forEach((material) => {
      const materialLower = material.toLowerCase();
      const currentPrice = currentMetalPrices[materialLower];
      const materialWeight = parseFloat(materialWeights[materialLower]) || 0;

      let materialCost = 0;
      if (currentPrice && materialWeight > 0) {
        materialCost = currentPrice * materialWeight;
        totalMaterialCost += materialCost;
      }

      const materialInfo = {
        material: material,
        weight: materialWeight,
        materialCost: materialCost,
        currentMarketPrice: currentPrice
          ? {
              price: currentPrice,
              unit: "USD per kg",
              source: "LME (London Metal Exchange)",
              note: "Current market price (updated weekly)",
            }
          : null,
      };

      calculation.materialSpecific.push(materialInfo);
    });

    // Ensure tariff rate doesn't go below 0
    calculation.totalTariffRate = Math.max(0, calculation.totalTariffRate);

    // Calculate final amounts with material cost separation
    const remainingProductCost = Math.max(
      0,
      parseFloat(productCost) - totalMaterialCost
    );

    // Update RemainderValue rule amounts to be based on remaining product cost
    calculation.ruleBasedTariffs.forEach((tariff) => {
      if (tariff.appliesTo === 'RemainderValue') {
        tariff.amount = (remainingProductCost * tariff.rate) / 100;
      }
    });

    // Calculate tariff on remaining product cost (rule-based rates that apply to remainder)
    // Recalculate totalTariffRate based on rates that apply to remaining product cost
    let remainingTariffRate = 0;
    // Add rates from rules that apply to remaining product cost
    calculation.ruleBasedTariffs.forEach((tariff) => {
      if (tariff.appliesTo === 'RemainderValue' || tariff.appliesTo === 'FullValue') {
        remainingTariffRate += tariff.rate;
      }
    });

    const remainingTariffAmount = (remainingProductCost * remainingTariffRate) / 100;

    // Total tariff is rule-based tariffs (material content and remaining product)
    calculation.totalTariffAmount += remainingTariffAmount;

    // Update totalTariffRate to reflect the rate applied to remaining product cost
    calculation.totalTariffRate = remainingTariffRate;

    // Update rule-based tariffs amounts to be based on remaining product cost (except RemainderValue and MetalContentValue which have special logic)
    calculation.ruleBasedTariffs.forEach((tariff) => {
      if (tariff.appliesTo === 'RemainderValue') {
        // Already updated above
      } else if (tariff.appliesTo === 'MetalContentValue') {
        // Apply to total material cost
        tariff.amount = (totalMaterialCost * tariff.rate) / 100;
        calculation.totalTariffAmount += tariff.amount; // Add to total since MetalContentValue tariffs weren't included in remainingTariffAmount
      } else {
        // FullValue and other rules apply to remaining product cost
        tariff.amount = (remainingProductCost * tariff.rate) / 100;
      }
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
    calculation.ruleBasedTariffs.forEach((tariff) => {
      tariff.amount *= parsedQuantity;
    });
    calculation.materialSpecific.forEach((material) => {
      material.materialCost *= parsedQuantity;
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

// POST generate invoice rows
router.post("/generate-invoice-rows", async (req, res) => {
  try {
    const {
      hsCode,
      country,
      productCost,
      materials = [],
      materialWeights = {},
      quantity = 1,
      lineNumber,
      manufacturerPartNumber,
      countryOfCast,
      countryOfSmelt,
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

    // Get Section 99 rules for this HS code and country
    const section99Rules = await Section99Rule.find({
      tariffNo: hsCode,
      countryOfOrigin: country,
      isActive: true,
    });

    // Get all rule lines for these rules
    const ruleIds = section99Rules.map(rule => rule._id);
    const section99RuleLines = await Section99RuleLine.find({
      ruleId: { $in: ruleIds },
      isActive: true,
    }).populate('ruleId');

    // Get HS code description for display
    const hsCodeData = await HsCode.findOne({ hsCode });

    // Calculate tariffs (same logic as /calculate endpoint)
    const calculation = {
      hsCode,
      country,
      productCost: parseFloat(productCost),
      quantity: parsedQuantity,
      manufacturerPartNumber: manufacturerPartNumber || "N/A",
      lineNumber: lineNumber || "1",
      countryOfCast: countryOfCast || country,
      countryOfSmelt: countryOfSmelt || country,
      baseTariff: {
        rate: 0,
        amount: 0,
      },
      countrySpecific: null,
      ruleBasedTariffs: [],
      materialSpecific: [],
      totalTariffRate: 0,
      totalTariffAmount: 0,
      finalCost: 0,
    };

    // Process Section 99 rule lines
    section99RuleLines.forEach((ruleLine) => {
      const rule = ruleLine.ruleId;
      let baseAmount = 0;

      switch (ruleLine.appliesTo) {
        case 'FullValue':
          baseAmount = parseFloat(productCost);
          break;
        case 'RemainderValue':
          baseAmount = parseFloat(productCost); // Placeholder
          break;
        case 'MetalContentValue':
          baseAmount = 0; // Placeholder
          break;
        default:
          baseAmount = parseFloat(productCost);
      }

      const tariffAmount = (baseAmount * ruleLine.rate) / 100;

      const ruleBasedTariff = {
        ruleType: rule.ruleType,
        rateCode: ruleLine.rateCode,
        appliesTo: ruleLine.appliesTo,
        rate: ruleLine.rate,
        amount: tariffAmount,
        description: ruleLine.description,
      };

      calculation.ruleBasedTariffs.push(ruleBasedTariff);
    });

    // Process materials for cost tracking (tariffs now handled by rule lines)
    const currentMetalPrices = {};
    let totalMaterialCost = 0;

    // Get metal prices for cost calculation
    for (const material of materials) {
      try {
        const trackedMetals = ["copper", "aluminum"];
        if (trackedMetals.includes(material.toLowerCase())) {
          if (!currentMetalPrices[material]) {
            currentMetalPrices[material] =
              await metalPriceService.getMetalPrice(material);
          }
        }
      } catch (error) {
        console.warn(`Could not fetch ${material} price:`, error.message);
      }
    }

    // Track materials for cost calculation and reporting
    materials.forEach((material) => {
      const materialLower = material.toLowerCase();
      const currentPrice = currentMetalPrices[materialLower];
      const materialWeight = parseFloat(materialWeights[materialLower]) || 0;

      let materialCost = 0;
      if (currentPrice && materialWeight > 0) {
        materialCost = currentPrice * materialWeight;
        totalMaterialCost += materialCost;
      }

      const materialInfo = {
        material: material,
        weight: materialWeight,
        materialCost: materialCost,
        currentMarketPrice: currentPrice
          ? {
              price: currentPrice,
              unit: "USD per kg",
              source: "LME (London Metal Exchange)",
              note: "Current market price (updated weekly)",
            }
          : null,
      };

      calculation.materialSpecific.push(materialInfo);
    });

    // Calculate final amounts with material cost separation
    const remainingProductCost = Math.max(
      0,
      parseFloat(productCost) - totalMaterialCost
    );

    // Update RemainderValue rule amounts
    calculation.ruleBasedTariffs.forEach((tariff) => {
      if (tariff.appliesTo === 'RemainderValue') {
        tariff.amount = (remainingProductCost * tariff.rate) / 100;
      }
    });

    // Calculate tariff on remaining product cost
    let remainingTariffRate = calculation.baseTariff.rate;
    if (calculation.countrySpecific) {
      remainingTariffRate += calculation.countrySpecific.rate;
    }
    calculation.ruleBasedTariffs.forEach((tariff) => {
      if (tariff.appliesTo === 'RemainderValue' || tariff.appliesTo === 'FullValue') {
        remainingTariffRate += tariff.rate;
      }
    });

    const remainingTariffAmount = (remainingProductCost * remainingTariffRate) / 100;
    calculation.totalTariffAmount += remainingTariffAmount;
    calculation.totalTariffRate = remainingTariffRate;

    // Update individual tariff amounts
    calculation.baseTariff.amount = (remainingProductCost * calculation.baseTariff.rate) / 100;
    if (calculation.countrySpecific) {
      calculation.countrySpecific.amount = (remainingProductCost * calculation.countrySpecific.rate) / 100;
    }

    calculation.ruleBasedTariffs.forEach((tariff) => {
      if (tariff.appliesTo === 'RemainderValue') {
        // Already updated
      } else if (tariff.appliesTo === 'MetalContentValue') {
        tariff.amount = (totalMaterialCost * tariff.rate) / 100;
      } else {
        tariff.amount = (remainingProductCost * tariff.rate) / 100;
      }
    });

    // Calculate effective total tariff rate
    calculation.effectiveTotalTariffRate =
      (calculation.totalTariffAmount / parseFloat(productCost)) * 100;

    // Multiply all amounts by quantity
    calculation.ruleBasedTariffs.forEach((tariff) => {
      tariff.amount *= parsedQuantity;
    });
    calculation.materialSpecific.forEach((material) => {
      material.materialCost *= parsedQuantity;
    });
    calculation.totalTariffAmount *= parsedQuantity;
    calculation.finalCost = parseFloat(productCost) * parsedQuantity + calculation.totalTariffAmount;

    // Now generate invoice rows based on the calculation
    const invoiceRows = [];
    let totalDuties = 0;

    // Group rules by appliesTo
    const fullValueRules = calculation.ruleBasedTariffs.filter(t => t.appliesTo === 'FullValue');
    const remainderValueRules = calculation.ruleBasedTariffs.filter(t => t.appliesTo === 'RemainderValue');
    const metalContentValueRules = calculation.ruleBasedTariffs.filter(t => t.appliesTo === 'MetalContentValue');

    // Helper function to format HTS code
    const formatHtsCode = (code) => {
      return code.replace(/\./g, '');
    };

    // Helper function to extract country code
    const extractCountryCode = (countryString) => {
      if (!countryString) return "";
      const match = countryString.match(/\(([^)]+)\)$/);
      return match ? match[1] : countryString;
    };

    // Determine if we need split rows (has both RemainderValue and MetalContentValue rules)
    const hasSplitRows = remainderValueRules.length > 0 && metalContentValueRules.length > 0;

    if (hasSplitRows) {
      // First row: RemainderValue rules
      if (remainderValueRules.length > 0) {
        const chapter99HtsCodes = remainderValueRules.map(r => r.rateCode).join('<br><br>');
        const dutyRates = remainderValueRules.map(r => r.description).join('<br><br>');
        const dutyOwed = remainderValueRules.reduce((sum, r) => sum + r.amount, 0);

        invoiceRows.push({
          lineNumber: calculation.lineNumber,
          htsCode: formatHtsCode(calculation.hsCode),
          countryOfOrigin: extractCountryCode(calculation.country),
          description: hsCodeData?.description || calculation.hsCode,
          chapter99HtsCode: chapter99HtsCodes,
          grossWeight: "",
          unitPrice: remainingProductCost.toFixed(2),
          quantity: parsedQuantity,
          enteredValue: (remainingProductCost * parsedQuantity).toFixed(2),
          metalCountrySmelt: "",
          metalCountryCast: "",
          dutyRate: dutyRates,
          dutyOwed: dutyOwed.toFixed(2)
        });

        totalDuties += dutyOwed;
      }

      // Second row: MetalContentValue rules
      if (metalContentValueRules.length > 0) {
        const chapter99HtsCodes = metalContentValueRules.map(r => r.rateCode).join('<br><br>');
        const dutyRates = metalContentValueRules.map(r => r.description).join('<br><br>');
        const dutyOwed = metalContentValueRules.reduce((sum, r) => sum + r.amount, 0);

        // Calculate total metal weight
        const totalMetalWeight = calculation.materialSpecific.reduce((sum, m) => sum + (m.weight * parsedQuantity), 0);

        invoiceRows.push({
          lineNumber: calculation.lineNumber,
          htsCode: formatHtsCode(calculation.hsCode),
          countryOfOrigin: extractCountryCode(calculation.country),
          description: hsCodeData?.description || calculation.hsCode,
          chapter99HtsCode: chapter99HtsCodes,
          grossWeight: totalMetalWeight > 0 ? totalMetalWeight.toFixed(3) : "",
          unitPrice: "",
          quantity: "",
          enteredValue: (totalMaterialCost * parsedQuantity).toFixed(2),
          metalCountrySmelt: extractCountryCode(calculation.countryOfSmelt),
          metalCountryCast: extractCountryCode(calculation.countryOfCast),
          dutyRate: dutyRates,
          dutyOwed: dutyOwed.toFixed(2)
        });

        totalDuties += dutyOwed;
      }
    } else {
      // Single row: either FullValue rules only, or RemainderValue only, or MetalContentValue only
      const allRules = [...fullValueRules, ...remainderValueRules, ...metalContentValueRules];
      if (allRules.length > 0) {
        const chapter99HtsCodes = allRules.map(r => r.rateCode).join('<br><br>');
        const dutyRates = allRules.map(r => r.description).join('<br><br>');
        const dutyOwed = allRules.reduce((sum, r) => sum + r.amount, 0);

        invoiceRows.push({
          lineNumber: calculation.lineNumber,
          htsCode: formatHtsCode(calculation.hsCode),
          countryOfOrigin: extractCountryCode(calculation.country),
          description: hsCodeData?.description || calculation.hsCode,
          chapter99HtsCode: chapter99HtsCodes,
          grossWeight: "",
          unitPrice: parseFloat(productCost).toFixed(2),
          quantity: parsedQuantity,
          enteredValue: (parseFloat(productCost) * parsedQuantity).toFixed(2),
          metalCountrySmelt: extractCountryCode(calculation.countryOfSmelt),
          metalCountryCast: extractCountryCode(calculation.countryOfCast),
          dutyRate: dutyRates,
          dutyOwed: dutyOwed.toFixed(2)
        });

        totalDuties += dutyOwed;
      }
    }

    res.json({
      invoiceRows,
      totalDuties: totalDuties.toFixed(2)
    });

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
