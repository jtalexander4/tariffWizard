const mongoose = require("mongoose");
require("dotenv").config();

const HsCode = require("../models/HsCode");
const CountryRate = require("../models/CountryRate");
const ProductRate = require("../models/ProductRate");
const SpecialRate = require("../models/SpecialRate");
const Exemption = require("../models/Exemption");
const MaterialRate = require("../models/MaterialRate");

// Sample data
const sampleHsCodes = [
  {
    hsCode: "8517.62.0090",
    description: "Cellular/Wi-Fi Modules/Adapters",
    normalTariffRate: 0,
  },
  {
    hsCode: "8526.91.0020",
    description: "GNSS Modules",
    normalTariffRate: 0,
  },
  {
    hsCode: "8517.71.0000",
    description: "Antennas",
    normalTariffRate: 0,
  },
  {
    hsCode: "8544.42.1000",
    description: "Interface Cables and Connectors",
    normalTariffRate: 0,
  },
  {
    hsCode: "3920.99.9090",
    description: "Thermal Pads",
    normalTariffRate: 0,
  },
  {
    hsCode: "8504.40.8390",
    description: "Power Adapters",
    normalTariffRate: 0,
  },
];

const sampleCountries = [
  { country: "China", countryCode: "CN", adValoremRate: 10.0 },
  { country: "Vietnam", countryCode: "VN", adValoremRate: 20.0 },
  { country: "Taiwan", countryCode: "TW", adValoremRate: 20.0 },
  { country: "Sweden", countryCode: "SE", adValoremRate: 15.0 },
  { country: "Slovakia", countryCode: "SK", adValoremRate: 15.0 },
  { country: "United States", countryCode: "US", adValoremRate: 0 },
];

const sampleProductRates = [
  {
    hsCode: "7208.10.00",
    specialProductRate: 25,
    rateType: "section232",
    productDescription: "Steel products under Section 232",
  },
  {
    hsCode: "7601.10.30",
    specialProductRate: 10,
    rateType: "section232",
    productDescription: "Aluminum products under Section 232",
  },
  {
    hsCode: "8542.31.00",
    specialProductRate: 25,
    rateType: "section301",
    productDescription: "Semiconductors under Section 301",
  },
];

const sampleExemptions = [
  {
    hsCode: "8517.62.0090",
    exemptionRate: 0,
    exemptionType: "other",
    exemptionDescription: "Special exemption for semiconductors",
    eligibleCountries: ["China", "CN"],
  },
];

const sampleMaterialRates = [
  {
    material: "copper",
    specialProductRate: 50,
    materialCategory: "copper",
    rateType: "section232",
    applicableHsCodes: ["8544.42.1000"],
  },
  {
    material: "aluminum",
    specialProductRate: 50,
    materialCategory: "aluminum",
    rateType: "section232",
    applicableHsCodes: ["8517.71.0000"],
  },
];

// NEW: Sample special rates with country restrictions
const sampleSpecialRates = [
  {
    hsCode: "8517.62.0090",
    specialProductRate: 7.5,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8517.71.0000",
    specialProductRate: 7.5,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8526.91.0020",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8544.42.1000",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "3920.99.9090",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8504.40.8390",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8517.62.0090",
    specialProductRate: 20.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8517.71.0000",
    specialProductRate: 20.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8526.91.0020",
    specialProductRate: 20.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8544.42.1000",
    specialProductRate: 20.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "3920.99.9090",
    specialProductRate: 20.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
  },
  {
    hsCode: "8504.40.8390",
    specialProductRate: 20.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB Atlas with proper connection string
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard";
    const connectionOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoURI, connectionOptions);
    console.log("Connected to MongoDB Atlas");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      HsCode.deleteMany({}),
      CountryRate.deleteMany({}),
      ProductRate.deleteMany({}),
      SpecialRate.deleteMany({}),
      Exemption.deleteMany({}),
      MaterialRate.deleteMany({}),
    ]);
    console.log("✅ Cleared all existing data");

    // Insert sample data
    console.log("📦 Inserting seed data...");

    await HsCode.insertMany(sampleHsCodes);
    console.log("✅ Inserted HS Codes");

    await CountryRate.insertMany(sampleCountries);
    console.log("✅ Inserted Country Rates");

    await ProductRate.insertMany(sampleProductRates);
    console.log("✅ Inserted Product Rates");

    // Insert special rates one by one to trigger pre-save middleware
    console.log("📋 Inserting Special Rates with country restrictions...");
    for (const rateData of sampleSpecialRates) {
      const rate = new SpecialRate(rateData);
      await rate.save();
      console.log(
        `   - ${rate.rateType} for ${rate.hsCode}: ${
          rate.specialProductRate
        }% (Countries: ${
          rate.applicableCountries.length > 0
            ? rate.applicableCountries.join(", ")
            : "All"
        })`
      );
    }
    console.log("✅ Inserted Special Rates");

    await Exemption.insertMany(sampleExemptions);
    console.log("✅ Inserted Exemptions");

    await MaterialRate.insertMany(sampleMaterialRates);
    console.log("✅ Inserted Material Rates");

    console.log("\n🎉 Database seeded successfully!");
    console.log("📊 Summary:");
    console.log(`   - ${sampleHsCodes.length} HS Codes`);
    console.log(`   - ${sampleCountries.length} Country Rates`);
    console.log(`   - ${sampleProductRates.length} Product Rates`);
    console.log(
      `   - ${sampleSpecialRates.length} Special Rates (with country restrictions)`
    );
    console.log(`   - ${sampleExemptions.length} Exemptions`);
    console.log(`   - ${sampleMaterialRates.length} Material Rates`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
