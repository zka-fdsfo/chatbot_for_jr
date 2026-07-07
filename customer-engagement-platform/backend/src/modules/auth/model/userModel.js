const mongoose = require('mongoose');
const { ROLES, ACCOUNT_STATUS } = require('../../../shared/constants/roles');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    sessionId: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;
