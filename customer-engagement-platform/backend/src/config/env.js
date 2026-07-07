require('dotenv').config();

const REQUIRED_VARS = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'VISITOR_TOKEN_SECRET'];

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  API_VERSION: process.env.API_VERSION || 'v1',
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 10000000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || 'Platform Admin',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
  VISITOR_TOKEN_SECRET: process.env.VISITOR_TOKEN_SECRET,
  VISITOR_SESSION_TIMEOUT: process.env.VISITOR_SESSION_TIMEOUT || '30d',
  AI_PROVIDER: process.env.AI_PROVIDER || 'groq',
  GROQ_API_KEY: process.env.GROQ_API_KEY || null,
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  AI_TEMPERATURE: Number(process.env.AI_TEMPERATURE) || 0.3,
  AI_MAX_TOKENS: Number(process.env.AI_MAX_TOKENS) || 800,
  AI_KNOWLEDGE_LIMIT: Number(process.env.AI_KNOWLEDGE_LIMIT) || 3,
};

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

module.exports = env;
