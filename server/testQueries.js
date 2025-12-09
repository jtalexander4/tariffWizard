const mongoose = require("mongoose");
const Section99Rule = require("./models/Section99Rule");
const Section99RuleLine = require("./models/Section99RuleLine");
require("dotenv").config();

async function testQueries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard");
    console.log("Connected to MongoDB");

    // Test Section99Rule query
    const rules = await Section99Rule.find({
      tariffNo: "8517620090",
      countryOfOrigin: "VN",
      isActive: true,
    });
    console.log("Found rules:", rules.length);

    if (rules.length > 0) {
      const ruleIds = rules.map(rule => rule._id);
      const ruleLines = await Section99RuleLine.find({
        ruleId: { $in: ruleIds },
        isActive: true,
      }).populate('ruleId');
      console.log("Found rule lines:", ruleLines.length);
      console.log("Sample rule line:", ruleLines[0]);
    }

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

testQueries();