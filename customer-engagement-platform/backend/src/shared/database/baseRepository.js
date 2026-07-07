class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return this.model.create(data);
  }

  async findById(id) {
    return this.model.findById(id);
  }

  async findOne(filter = {}) {
    return this.model.findOne(filter);
  }

  async findAll(filter = {}, { page = 1, limit = 20, sort = '-createdAt' } = {}) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async updateById(id, update) {
    return this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}

module.exports = BaseRepository;
