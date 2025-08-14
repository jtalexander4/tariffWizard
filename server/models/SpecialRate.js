const mongoose = require("mongoose");

const specialRateSchema = new mongoose.Schema(
  {
    hsCode: {
      type: String,
      required: true,
      trim: true,
      ref: "HsCode",
    },
    specialProductRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      trim: true,
    },
    rateType: {
      type: String,
      enum: [
        "antidumping",
        "countervailing",
        "section232",
        "section301",
        "fentanyl",
        "other",
      ],
      required: true,
    },
    rateCode: {
      type: String,
      trim: true,
      uppercase: true,
      // Examples: "9903.88.15", "9903.89.01", etc.
    },
    // NEW: Country restrictions for this special rate
    applicableCountries: {
      type: [String],
      default: [], // Empty array means applies to ALL countries
      trim: true,
    },
    // Helper field to indicate if rate applies to all countries
    appliesToAllCountries: {
      type: Boolean,
      default: true, // Default to applying to all countries
    },
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

// Compound index for HS Code and rate type
specialRateSchema.index({ hsCode: 1, rateType: 1 });
specialRateSchema.index({ isActive: 1 });
specialRateSchema.index({ applicableCountries: 1 });

// Pre-save middleware to automatically set appliesToAllCountries
specialRateSchema.pre("save", function (next) {
  this.appliesToAllCountries =
    !this.applicableCountries || this.applicableCountries.length === 0;
  next();
});

module.exports = mongoose.model("SpecialRate", specialRateSchema);
