const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    company: {
      type: String,
      default: null,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

visitorSchema.index({ email: 1 });

const Visitor = mongoose.model('Visitor', visitorSchema, 'visitors');

module.exports = Visitor;
