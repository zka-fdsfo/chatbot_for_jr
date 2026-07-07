const BaseRepository = require('../../../shared/database/baseRepository');
const AISettings = require('../model/aiSettingsModel');

class AISettingsRepository extends BaseRepository {
  constructor() {
    super(AISettings);
  }

  async getSingleton() {
    return this.model.findOne();
  }
}

module.exports = new AISettingsRepository();
