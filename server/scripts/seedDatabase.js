const mongoose = require("mongoose");
require("dotenv").config();

const HsCode = require("../models/HsCode");
const CountryRate = require("../models/CountryRate");
const ProductRate = require("../models/ProductRate");
const Exemption = require("../models/Exemption");
const MaterialRate = require("../models/MaterialRate");

// Sample data
const sampleHsCodes = [
  {
    hsCode: "8471.30.01",
    description: "Portable automatic data processing machines",
    normalTariffRate: 0,
  },
  {
    hsCode: "7208.10.00",
    description: "Flat-rolled products of iron or non-alloy steel",
    normalTariffRate: 0,
  },
  {
    hsCode: "7601.10.30",
    description: "Aluminum, not alloyed, unwrought",
    normalTariffRate: 0,
  },
  {
    hsCode: "8542.31.00",
    description: "Electronic integrated circuits: processors and controllers",
    normalTariffRate: 0,
  },
  {
    hsCode: "8708.80.65",
    description: "Suspension shock absorbers for motor vehicles",
    normalTariffRate: 2.5,
  },
];

const sampleCountries = [
  { country: "China", countryCode: "CN", adValoremRate: 7.4 },
  { country: "Canada", countryCode: "CA", adValoremRate: 0 },
  { country: "Mexico", countryCode: "MX", adValoremRate: 0 },
  { country: "Germany", countryCode: "DE", adValoremRate: 0 },
  { country: "Japan", countryCode: "JP", adValoremRate: 0 },
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
    hsCode: "8471.30.01",
    exemptionRate: 0,
    exemptionType: "mfn",
    exemptionDescription: "Most Favored Nation treatment",
    eligibleCountries: ["CA", "MX", "DE", "JP"],
  },
  {
    hsCode: "7208.10.00",
    exemptionRate: 25,
    exemptionType: "nafta",
    exemptionDescription: "NAFTA/USMCA exemption for steel",
    eligibleCountries: ["CA", "MX"],
  },
];

const sampleMaterialRates = [
  {
    material: "steel",
    specialProductRate: 25,
    materialCategory: "steel",
    rateType: "section232",
    applicableHsCodes: ["7208.10.00", "7208.25.00", "7208.36.00"],
  },
  {
    material: "aluminum",
    specialProductRate: 10,
    materialCategory: "aluminum",
    rateType: "section232",
    applicableHsCodes: ["7601.10.30", "7601.20.60", "7604.10.10"],
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard"
    );
    console.log("Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      HsCode.deleteMany({}),
      CountryRate.deleteMany({}),
      ProductRate.deleteMany({}),
      Exemption.deleteMany({}),
      MaterialRate.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // Insert sample data
    await HsCode.insertMany(sampleHsCodes);
    console.log("Inserted HS Codes");

    await CountryRate.insertMany(sampleCountries);
    console.log("Inserted Country Rates");

    await ProductRate.insertMany(sampleProductRates);
    console.log("Inserted Product Rates");

    await Exemption.insertMany(sampleExemptions);
    console.log("Inserted Exemptions");

    await MaterialRate.insertMany(sampleMaterialRates);
    console.log("Inserted Material Rates");

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
