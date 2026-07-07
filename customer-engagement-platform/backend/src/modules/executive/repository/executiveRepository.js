const BaseRepository = require('../../../shared/database/baseRepository');
const Executive = require('../model/executiveModel');

class ExecutiveRepository extends BaseRepository {
  constructor() {
    super(Executive);
  }

  async findByUserId(userId) {
    return this.model.findOne({ userId });
  }

  async incrementCurrentChats(userId, delta) {
    return this.model.findOneAndUpdate(
      { userId },
      { $inc: { currentChats: delta } },
      { new: true },
    );
  }

  async listWithUser(filter = {}, { page = 1, limit = 20, sort = '-createdAt' } = {}) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('userId', 'name email role status isActive lastLogin')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }
}

module.exports = new ExecutiveRepository();
