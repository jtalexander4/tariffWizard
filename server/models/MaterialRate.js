const mongoose = require("mongoose");

const materialRateSchema = new mongoose.Schema(
  {
    material: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    specialProductRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    materialCategory: {
      type: String,
      enum: ["aluminum", "copper"],
      required: true,
    },
    rateType: {
      type: String,
      enum: [
        "section232",
        "section301",
        "antidumping",
        "countervailing",
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
    applicableHsCodes: [
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

// Index for efficient searching
materialRateSchema.index({ material: 1 });
materialRateSchema.index({ materialCategory: 1 });
materialRateSchema.index({ isActive: 1 });
materialRateSchema.index({ applicableHsCodes: 1 });

module.exports = mongoose.model("MaterialRate", materialRateSchema);
