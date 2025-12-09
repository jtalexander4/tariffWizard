const mongoose = require('mongoose');

const section99RuleSchema = new mongoose.Schema({
  ruleNumber: { type: Number, unique: true, required: true },
  tariffNo: { type: String, required: true }, // HTS code, e.g., "8517620090"
  countryOfOrigin: { type: String, required: true }, // e.g., "VN"
  ruleType: { type: String, required: true }, // e.g., "Simple" or "Section 232_MetalSplit"
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Section99Rule', section99RuleSchema);