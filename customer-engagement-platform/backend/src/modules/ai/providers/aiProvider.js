class AIProvider {
  // eslint-disable-next-line no-unused-vars
  async generateCompletion({ messages, temperature, maxTokens }) {
    throw new Error(`${this.constructor.name} must implement generateCompletion()`);
  }
}

module.exports = AIProvider;
