const mongoose = require("mongoose");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Section99Code = require("../models/Section99Code");
const Section99Rule = require("../models/Section99Rule");
const Section99RuleLine = require("../models/Section99RuleLine");
const HsCode = require("../models/HsCode");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

async function importCsv(filePath, model, transformRow) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        if (transformRow) {
          row = transformRow(row);
        }
        results.push(row);
      })
      .on("end", async () => {
        try {
          // Try inserting one by one to get better error messages
          let inserted = 0;
          for (const result of results) {
            try {
              await model.create(result);
              inserted++;
            } catch (createError) {
              console.error(`Failed to create record:`, result, createError.message);
            }
          }
          console.log(`Imported ${inserted}/${results.length} records from ${path.basename(filePath)}`);
          resolve();
        } catch (error) {
          console.error(`Error importing ${path.basename(filePath)}:`, error.message);
          reject(error);
        }
      })
      .on("error", reject);
  });
}

async function importAllCsvs() {
  try {
    // Import HTS Codes
    await importCsv(
      path.join(__dirname, "../tempExamples/htsCodes.csv"),
      HsCode,
      (row) => ({
        hsCode: row["HTS Code"],
        description: row.Description,
        normalTariffRate: parseFloat(row["Normal Tariff Rate"]) || 0,
      })
    );

    // Import Section 99 Codes
    await importCsv(
      path.join(__dirname, "../tempExamples/section99codes.csv"),
      Section99Code,
      (row) => {
        console.log('Section99Code row:', row);
        const data = {
          id: parseInt(row.ID),
          code: row.Code,
          dutyRate: row["Duty Rate"],
          description: row.Description,
        };
        console.log('Parsed id:', row.ID, '->', data.id);
        return data;
      }
    );

    // Import Section 99 Rules
    await importCsv(
      path.join(__dirname, "../tempExamples/section99rules.csv"),
      Section99Rule,
      (row) => {
        console.log('All keys:', Object.keys(row));
        Object.keys(row).forEach(key => {
          console.log(`Key: "${key}" -> Value: "${row[key]}" (type: ${typeof row[key]})`);
        });
        const ruleNumStr = row['Rule Number'];
        console.log(`ruleNumStr: "${ruleNumStr}" typeof: ${typeof ruleNumStr}`);
        const parsed = parseInt(ruleNumStr);
        console.log(`parsed: ${parsed} isNaN: ${isNaN(parsed)}`);
        const data = {
          ruleNumber: parsed,
          tariffNo: row['Tariff No.'],
          countryOfOrigin: row['Country of Origin'],
          ruleType: row['Rule Type'],
          isActive: true,
        };
        return data;
      }
    );

    // Debug: check what rules were imported
    const allRules = await Section99Rule.find({});
    console.log('All imported rules count:', allRules.length);
    console.log('All imported rules:', allRules.map(r => ({ ruleNumber: r.ruleNumber, tariffNo: r.tariffNo, countryOfOrigin: r.countryOfOrigin })));
    console.log('Sample rule:', allRules[0]);

    // Import Section 99 Rule Lines
    await new Promise((resolve, reject) => {
      const ruleLinesData = [];
      fs.createReadStream(path.join(__dirname, "../tempExamples/section99rulelines.csv"))
        .pipe(csv())
        .on("data", (row) => {
          ruleLinesData.push({
            ruleLineId: parseInt(row["Rule Line ID"]),
            ruleNumber: parseInt(row["Rule ID"]), // Temporary, will be replaced with ObjectId
            section99HtsCodeId: parseInt(row["Section 99 HTS Code ID"]),
            dutyRate: row["Duty Rate"],
            appliesTo: row["Applies To"],
            lineDescription: row["Line Description"],
          });
        })
        .on("end", async () => {
          try {
            console.log(`Read ${ruleLinesData.length} rule lines from CSV`);
            // Now process rule lines with proper ruleId references
            const processedRuleLines = [];
            for (const line of ruleLinesData) {
              console.log(`Processing rule line for ruleNumber: ${line.ruleNumber}`);
              const rule = await Section99Rule.findOne({ ruleNumber: line.ruleNumber });
              console.log(`Found rule:`, rule ? rule._id : 'null');
              if (rule) {
                // Get the Section99Code for rateCode
                const section99Code = await Section99Code.findOne({ id: line.section99HtsCodeId });
                console.log(`Found section99Code:`, section99Code ? section99Code.code : 'null');
                const rateCode = section99Code ? section99Code.code : `Rule ${line.ruleNumber}`;

                processedRuleLines.push({
                  ruleId: rule._id,
                  rateCode: rateCode,
                  rate: parseFloat(line.dutyRate.replace('%', '')) || 0,
                  appliesTo: line.appliesTo,
                  description: line.lineDescription,
                  isActive: true,
                });
              }
            }

            console.log(`Processed ${processedRuleLines.length} rule lines`);
            await Section99RuleLine.insertMany(processedRuleLines, { ordered: false });
            console.log(`Imported ${processedRuleLines.length} rule lines`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on("error", reject);
    });

    console.log("All CSVs imported successfully!");
  } catch (error) {
    console.error("Import failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

connectDB().then(importAllCsvs);