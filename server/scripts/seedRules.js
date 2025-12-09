const mongoose = require("mongoose");
const Section99Rule = require("../models/Section99Rule");
const Section99RuleLine = require("../models/Section99RuleLine");
const Section99Code = require("../models/Section99Code");
const HsCode = require("../models/HsCode");
require("dotenv").config();

async function seedRules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard");
    console.log("Connected to MongoDB");

    // Clear existing data and drop indexes
    await mongoose.connection.db.dropCollection('section99rules').catch(() => {});
    await mongoose.connection.db.dropCollection('section99rulelines').catch(() => {});
    await mongoose.connection.db.dropCollection('section99codes').catch(() => {});
    await mongoose.connection.db.dropCollection('hscodes').catch(() => {});

    // Seed Section 99 Codes
    const codes = [
      { id: 1, code: "9903.01.32", dutyRate: "0%", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { id: 2, code: "9903.01.24", dutyRate: "10%", description: "10% - IEEPA China/Hong Kong" },
      { id: 3, code: "9903.88.15", dutyRate: "7.5%", description: "7.5% - Section 301 List 4A" },
      { id: 4, code: "9903.02.60", dutyRate: "20%", description: "20% - IEEPA Taiwan" },
      { id: 5, code: "9903.01.33", dutyRate: "0%", description: "0% - IEEPA Reciprocal 232 Exclusion" },
      { id: 6, code: "9903.85.08", dutyRate: "50%", description: "50% - Section 232 Aluminum New Derivative Products" },
      { id: 7, code: "9903.01.25", dutyRate: "10%", description: "10% - IEEPA Reciprocal All Country" },
      { id: 8, code: "9903.88.01", dutyRate: "25%", description: "25% - Section 301 List 1" },
      { id: 9, code: "9903.02.20", dutyRate: "15%", description: "15% - IEEPA European Union" },
      { id: 10, code: "9903.78.02", dutyRate: "0%", description: "0% - Section 232 Non-Copper Content" },
      { id: 11, code: "9903.78.01", dutyRate: "50%", description: "50% - Section 232 Copper" },
      { id: 12, code: "9903.02.69", dutyRate: "20%", description: "20% - IEEPA Vietnam" },
    ];

    for (const code of codes) {
      await Section99Code.create(code);
    }
    console.log("Seeded Section99Codes");

    // Seed Section 99 Rules
    const rules = [
      { ruleNumber: 1, tariffNo: "8517620090", countryOfOrigin: "VN", ruleType: "Simple", isActive: true },
      { ruleNumber: 2, tariffNo: "8517620090", countryOfOrigin: "MY", ruleType: "Simple", isActive: true },
      { ruleNumber: 3, tariffNo: "8517620090", countryOfOrigin: "SE", ruleType: "Simple", isActive: true },
      { ruleNumber: 4, tariffNo: "8517620090", countryOfOrigin: "CN", ruleType: "Simple", isActive: true },
      { ruleNumber: 5, tariffNo: "8517.62.0090", countryOfOrigin: "TW", ruleType: "Simple", isActive: true },
      { ruleNumber: 6, tariffNo: "8517.62.0090", countryOfOrigin: "SE", ruleType: "Simple", isActive: true },
      { ruleNumber: 7, tariffNo: "8517710000", countryOfOrigin: "TW", ruleType: "Section 232_MetalSplit", isActive: true },
      { ruleNumber: 8, tariffNo: "8517710000", countryOfOrigin: "SE", ruleType: "Section 232_MetalSplit", isActive: true },
      { ruleNumber: 9, tariffNo: "8544421000", countryOfOrigin: "TW", ruleType: "Section 232_MetalSplit", isActive: true },
      { ruleNumber: 10, tariffNo: "8526910020", countryOfOrigin: "VN", ruleType: "Simple", isActive: true },
    ];

    for (const rule of rules) {
      await Section99Rule.create(rule);
    }
    console.log("Seeded Section99Rules");

    // Create a map of Section99Code IDs to codes and rates
    const codeMap = {};
    codes.forEach(code => {
      codeMap[code.id] = { code: code.code, rate: parseFloat(code.dutyRate.replace('%', '')) || 0 };
    });

    // Seed Section 99 Rule Lines
    const ruleLines = [
      { ruleNumber: 1, section99CodeId: 1, appliesTo: "FullValue", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { ruleNumber: 2, section99CodeId: 1, appliesTo: "FullValue", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { ruleNumber: 3, section99CodeId: 1, appliesTo: "FullValue", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { ruleNumber: 4, section99CodeId: 1, appliesTo: "FullValue", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { ruleNumber: 4, section99CodeId: 2, appliesTo: "FullValue", description: "10% - IEEPA China/Hong Kong" },
      { ruleNumber: 4, section99CodeId: 3, appliesTo: "FullValue", description: "7.5% - Section 301 List 4A" },
      { ruleNumber: 5, section99CodeId: 1, appliesTo: "FullValue", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { ruleNumber: 6, section99CodeId: 1, appliesTo: "FullValue", description: "0% - IEEPA Reciprocal Annex II Exclusion" },
      { ruleNumber: 7, section99CodeId: 4, appliesTo: "RemainderValue", description: "20% - IEEPA Taiwan" },
      { ruleNumber: 7, section99CodeId: 5, appliesTo: "RemainderValue", description: "0% - IEEPA Reciprocal 232 Exclusion" },
      { ruleNumber: 7, section99CodeId: 6, appliesTo: "MetalContentValue", description: "50% - Section 232 Aluminum New Derivative Products" },
      { ruleNumber: 8, section99CodeId: 9, appliesTo: "RemainderValue", description: "15% - IEEPA European Union" },
      { ruleNumber: 8, section99CodeId: 5, appliesTo: "RemainderValue", description: "0% - IEEPA Reciprocal 232 Exclusion" },
      { ruleNumber: 8, section99CodeId: 6, appliesTo: "MetalContentValue", description: "50% - Section 232 Aluminum New Derivative Products" },
      { ruleNumber: 9, section99CodeId: 4, appliesTo: "RemainderValue", description: "20% - IEEPA Taiwan" },
      { ruleNumber: 9, section99CodeId: 10, appliesTo: "RemainderValue", description: "0% - Section 232 Non-Copper Content" },
      { ruleNumber: 9, section99CodeId: 5, appliesTo: "MetalContentValue", description: "0% - IEEPA Reciprocal 232 Exclusion" },
      { ruleNumber: 9, section99CodeId: 11, appliesTo: "MetalContentValue", description: "50% - Section 232 Copper" },
      { ruleNumber: 10, section99CodeId: 12, appliesTo: "FullValue", description: "20% - IEEPA Vietnam" },
    ];

    for (const line of ruleLines) {
      const rule = await Section99Rule.findOne({ ruleNumber: line.ruleNumber });
      const codeInfo = codeMap[line.section99CodeId];
      if (rule && codeInfo) {
        await Section99RuleLine.create({
          ruleId: rule._id,
          rateCode: codeInfo.code,
          rate: codeInfo.rate,
          appliesTo: line.appliesTo,
          description: line.description,
          isActive: true,
        });
      }
    }
    console.log("Seeded Section99RuleLines");

    // Seed HS Codes (extract unique HTS codes from rules)
    const uniqueHsCodes = [...new Set(rules.map(rule => rule.tariffNo))];
    const hsCodeData = [
      { hsCode: "8517620090", description: "Cellular / Wi-fi Modules" },
      { hsCode: "8517.62.0090", description: "Adapters for embedded wireless modules" },
      { hsCode: "8517710000", description: "Antenna" },
      { hsCode: "8544421000", description: "Interface cable" },
      { hsCode: "8526910020", description: "GPS/GNSS modules" },
    ];

    for (const hsData of hsCodeData) {
      await HsCode.findOneAndUpdate(
        { hsCode: hsData.hsCode },
        hsData,
        { upsert: true, new: true }
      );
    }
    console.log("Seeded HS Codes");

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

seedRules();