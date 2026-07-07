const AIProvider = require('./aiProvider');
const env = require('../../../config/env');
const { AppError } = require('../../../shared/errors');
const logger = require('../../../shared/logger/logger');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

class GroqProvider extends AIProvider {
  async generateCompletion({
    messages,
    temperature = env.AI_TEMPERATURE,
    maxTokens = env.AI_MAX_TOKENS,
    model = env.GROQ_MODEL,
  }) {
    if (!env.GROQ_API_KEY) {
      throw new AppError('AI provider is not configured (missing GROQ_API_KEY).', 503);
    }

    let response;
    try {
      response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
    } catch (error) {
      logger.error(`Groq request failed to send: ${error.message}`);
      throw new AppError('Unable to reach the AI provider.', 502);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`Groq API error ${response.status}: ${errorBody}`);
      throw new AppError('The AI provider returned an error.', 502);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason ?? null,
      usage: data.usage ?? null,
    };
  }
}

module.exports = GroqProvider;
