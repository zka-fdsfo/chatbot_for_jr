const GroqProvider = require('./groqProvider');
const env = require('../../../config/env');

const PROVIDERS = {
  groq: GroqProvider,
};

function getProvider() {
  const ProviderClass = PROVIDERS[env.AI_PROVIDER];

  if (!ProviderClass) {
    throw new Error(`Unknown AI provider configured: ${env.AI_PROVIDER}`);
  }

  return new ProviderClass();
}

module.exports = { getProvider };
