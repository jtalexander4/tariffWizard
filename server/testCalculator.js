const mongoose = require("mongoose");
const Section99Rule = require("./models/Section99Rule");
const Section99RuleLine = require("./models/Section99RuleLine");
require("dotenv").config();

async function testCalculator() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard");
    console.log("Connected to MongoDB");

    const hsCode = "8517620090";
    const country = "VN";
    const productCost = "100";

    // Get Section 99 rules
    const section99Rules = await Section99Rule.find({
      tariffNo: hsCode,
      countryOfOrigin: country,
      isActive: true,
    });
    console.log("Section 99 rules:", section99Rules.length);

    // Get rule lines
    const ruleIds = section99Rules.map(rule => rule._id);
    const section99RuleLines = await Section99RuleLine.find({
      ruleId: { $in: ruleIds },
      isActive: true,
    }).populate('ruleId');
    console.log("Rule lines:", section99RuleLines.length);

    // Process rules
    const calculation = {
      ruleBasedTariffs: [],
      totalTariffRate: 0,
    };

    section99RuleLines.forEach((ruleLine) => {
      const rule = ruleLine.ruleId;
      let baseAmount = parseFloat(productCost);

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
      calculation.totalTariffRate += ruleLine.rate;
    });

    console.log("Calculation result:", calculation);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

testCalculator();