const aiSettingsRepository = require('../repository/aiSettingsRepository');

class AISettingsService {
  async get() {
    const existing = await aiSettingsRepository.getSingleton();
    if (existing) return existing;

    return aiSettingsRepository.create({});
  }

  async update(updates, updatedBy) {
    const settings = await this.get();
    Object.assign(settings, updates, { updatedBy });
    await settings.save();
    return settings;
  }
}

module.exports = new AISettingsService();
