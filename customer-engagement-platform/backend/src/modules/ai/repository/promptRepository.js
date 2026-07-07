const BaseRepository = require('../../../shared/database/baseRepository');
const Prompt = require('../model/promptModel');

class PromptRepository extends BaseRepository {
  constructor() {
    super(Prompt);
  }

  async findByType(type) {
    return this.model.findOne({ type });
  }

  async listAll() {
    return this.model.find().sort({ type: 1 });
  }
}

module.exports = new PromptRepository();
