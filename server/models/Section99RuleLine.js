const mongoose = require('mongoose');

const section99RuleLineSchema = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Section99Rule' }, // Links to Section99Rule._id
  rateCode: { type: String, required: true }, // e.g., "9903.01.32"
  rate: { type: Number, required: true }, // e.g., 25 (percentage)
  appliesTo: { type: String, required: true }, // e.g., "FullValue", "RemainderValue", "MetalContentValue"
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Section99RuleLine', section99RuleLineSchema);