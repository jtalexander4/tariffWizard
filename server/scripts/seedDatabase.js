const mongoose = require("mongoose");
require("dotenv").config();

const HsCode = require("../models/HsCode");
const CountryRate = require("../models/CountryRate");
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
  {
    hsCode: "8205.59.8000",
    description: "Hand Tools",
    normalTariffRate: 3.7,
  },
];

const sampleCountries = [
  {
    country: "China",
    countryCode: "CN",
    adValoremRate: 10.0,
    rateCode: "9903.01.25",
  },
  {
    country: "Vietnam",
    countryCode: "VN",
    adValoremRate: 20.0,
    rateCode: "9903.02.69",
  },
  {
    country: "Taiwan",
    countryCode: "TW",
    adValoremRate: 20.0,
    rateCode: "9903.02.60",
  },
  {
    country: "Sweden",
    countryCode: "SE",
    adValoremRate: 15.0,
    rateCode: "9903.02.10",
  },
  {
    country: "Slovakia",
    countryCode: "SK",
    adValoremRate: 15.0,
    rateCode: "9903.02.10",
  },
  {
    country: "United States",
    countryCode: "US",
    adValoremRate: 0,
    rateCode: "9903.01.25",
  },
  {
    country: "United Arab Emirates",
    countryCode: "AE",
    adValoremRate: 10.0,
    rateCode: "9903.01.25",
  }
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
    rateCode: "9903.78.01"
  },
  {
    material: "aluminum",
    specialProductRate: 50,
    materialCategory: "aluminum",
    rateType: "section232",
    applicableHsCodes: ["8517.71.0000"],
    rateCode: "9903.85.08",
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
    rateCode: "9903.88.15",
  },
  {
    hsCode: "8517.71.0000",
    specialProductRate: 7.5,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.88.15",
  },
  {
    hsCode: "8526.91.0020",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.88.02",
  },
  {
    hsCode: "8544.42.1000",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.88.02",
  },
  {
    hsCode: "3920.99.9090",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.88.02",
  },
  {
    hsCode: "8504.40.8390",
    specialProductRate: 25,
    rateType: "section301",
    description: "Section 301",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.88.02",
  },
  {
    hsCode: "8517.62.0090",
    specialProductRate: 10.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.01.24",
  },
  {
    hsCode: "8517.71.0000",
    specialProductRate: 10.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.01.24",
  },
  {
    hsCode: "8526.91.0020",
    specialProductRate: 10.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.01.24",
  },
  {
    hsCode: "8544.42.1000",
    specialProductRate: 10.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.01.24",
  },
  {
    hsCode: "3920.99.9090",
    specialProductRate: 10.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.01.24",
  },
  {
    hsCode: "8504.40.8390",
    specialProductRate: 10.0,
    rateType: "fentanyl",
    description: "Fentanyl tariff",
    applicableCountries: ["China", "CN"],
    rateCode: "9903.01.24",
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
