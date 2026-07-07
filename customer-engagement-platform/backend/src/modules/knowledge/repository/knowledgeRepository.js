const BaseRepository = require('../../../shared/database/baseRepository');
const Knowledge = require('../model/knowledgeModel');

class KnowledgeRepository extends BaseRepository {
  constructor() {
    super(Knowledge);
  }

  async findBySlug(slug) {
    return this.model.findOne({ slug: slug.toLowerCase() });
  }

  async search({ category, keyword, status } = {}, options) {
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { keywords: { $regex: keyword, $options: 'i' } },
      ];
    }

    return this.findAll(filter, options);
  }
}

module.exports = new KnowledgeRepository();
