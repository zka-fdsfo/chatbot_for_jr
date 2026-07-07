const BaseRepository = require('../../../shared/database/baseRepository');
const PromptVersion = require('../model/promptVersionModel');

class PromptVersionRepository extends BaseRepository {
  constructor() {
    super(PromptVersion);
  }

  async findByPromptId(promptId) {
    return this.model.find({ promptId }).sort({ version: -1 });
  }

  async findByPromptIdAndVersion(promptId, version) {
    return this.model.findOne({ promptId, version });
  }
}

module.exports = new PromptVersionRepository();
