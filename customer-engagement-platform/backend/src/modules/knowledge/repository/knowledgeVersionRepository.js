const BaseRepository = require('../../../shared/database/baseRepository');
const KnowledgeVersion = require('../model/knowledgeVersionModel');

class KnowledgeVersionRepository extends BaseRepository {
  constructor() {
    super(KnowledgeVersion);
  }

  async findByKnowledgeId(knowledgeId) {
    return this.model.find({ knowledgeId }).sort('-version');
  }

  async findByKnowledgeIdAndVersion(knowledgeId, version) {
    return this.model.findOne({ knowledgeId, version });
  }
}

module.exports = new KnowledgeVersionRepository();
