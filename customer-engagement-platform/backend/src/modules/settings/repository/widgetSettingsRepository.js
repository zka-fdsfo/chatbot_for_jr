const BaseRepository = require('../../../shared/database/baseRepository');
const WidgetSettings = require('../model/widgetSettingsModel');

class WidgetSettingsRepository extends BaseRepository {
  constructor() {
    super(WidgetSettings);
  }

  async getSingleton() {
    return this.model.findOne();
  }
}

module.exports = new WidgetSettingsRepository();
