const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');

const DURATION_UNITS_TO_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseDurationToMs(duration) {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNITS_TO_MS[unit];
}

function signAccessToken({ userId, role, email, sessionId }) {
  return jwt.sign({ userId, role, email, sessionId }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function signRefreshToken({ userId, sessionId }) {
  return jwt.sign({ userId, sessionId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signVisitorToken({ visitorId, sessionId }) {
  return jwt.sign({ visitorId, sessionId }, env.VISITOR_TOKEN_SECRET, {
    expiresIn: env.VISITOR_SESSION_TIMEOUT,
  });
}

function verifyVisitorToken(token) {
  return jwt.verify(token, env.VISITOR_TOKEN_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseDurationToMs,
  signVisitorToken,
  verifyVisitorToken,
};
