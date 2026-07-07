const BaseRepository = require('../../../shared/database/baseRepository');
const BusinessHours = require('../model/businessHoursModel');

class BusinessHoursRepository extends BaseRepository {
  constructor() {
    super(BusinessHours);
  }

  async getSingleton() {
    return this.model.findOne();
  }
}

module.exports = new BusinessHoursRepository();
