const widgetSettingsRepository = require('../repository/widgetSettingsRepository');

class WidgetSettingsService {
  async get() {
    const existing = await widgetSettingsRepository.getSingleton();
    if (existing) return existing;

    return widgetSettingsRepository.create({});
  }

  async update(updates, updatedBy) {
    const settings = await this.get();

    if (updates.featureToggles) {
      Object.assign(settings.featureToggles, updates.featureToggles);
      delete updates.featureToggles;
    }

    Object.assign(settings, updates, { updatedBy });
    await settings.save();
    return settings;
  }
}

module.exports = new WidgetSettingsService();
