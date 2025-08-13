const mongoose = require("mongoose");

const exemptionSchema = new mongoose.Schema(
  {
    hsCode: {
      type: String,
      required: true,
      trim: true,
      ref: "HsCode",
    },
    exemptionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    exemptionType: {
      type: String,
      enum: ["mfn", "gsp", "nafta", "usmca", "fta", "other"],
      required: true,
    },
    exemptionDescription: {
      type: String,
      trim: true,
    },
    eligibleCountries: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    expirationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for HS Code and exemption type
exemptionSchema.index({ hsCode: 1, exemptionType: 1 });
exemptionSchema.index({ isActive: 1 });
exemptionSchema.index({ eligibleCountries: 1 });

module.exports = mongoose.model("Exemption", exemptionSchema);
