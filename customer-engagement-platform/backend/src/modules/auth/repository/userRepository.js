const BaseRepository = require('../../../shared/database/baseRepository');
const User = require('../model/userModel');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmailWithSecrets(email) {
    return this.model.findOne({ email: email.toLowerCase() }).select(
      '+passwordHash +refreshTokenHash +refreshTokenExpiresAt +sessionId',
    );
  }

  async findByIdWithSecrets(id) {
    return this.model
      .findById(id)
      .select('+passwordHash +refreshTokenHash +refreshTokenExpiresAt +sessionId');
  }

  async setRefreshSession(id, { refreshTokenHash, refreshTokenExpiresAt, sessionId }) {
    return this.model.findByIdAndUpdate(id, {
      refreshTokenHash,
      refreshTokenExpiresAt,
      sessionId,
    });
  }

  async clearRefreshSession(id) {
    return this.model.findByIdAndUpdate(id, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      sessionId: null,
    });
  }

  async recordLogin(id) {
    return this.model.findByIdAndUpdate(id, { lastLogin: new Date() });
  }
}

module.exports = new UserRepository();
