const { NotFoundError } = require('../errors');

class BaseService {
  constructor(repository, resourceName = 'Resource') {
    this.repository = repository;
    this.resourceName = resourceName;
  }

  async create(data) {
    return this.repository.create(data);
  }

  async getById(id) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new NotFoundError(`${this.resourceName} not found`);
    }

    return item;
  }

  async list(filter, options) {
    return this.repository.findAll(filter, options);
  }

  async updateById(id, update) {
    const item = await this.repository.updateById(id, update);

    if (!item) {
      throw new NotFoundError(`${this.resourceName} not found`);
    }

    return item;
  }

  async deleteById(id) {
    const item = await this.repository.deleteById(id);

    if (!item) {
      throw new NotFoundError(`${this.resourceName} not found`);
    }

    return item;
  }
}

module.exports = BaseService;
