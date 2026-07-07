const executiveRepository = require('../repository/executiveRepository');
const authService = require('../../auth/service/authService');
const { ROLES } = require('../../../shared/constants/roles');
const { EXECUTIVE_STATUS } = require('../constants/executive');
const { NotFoundError } = require('../../../shared/errors');
const analyticsEventService = require('../../analytics/service/analyticsEventService');
const { EVENT_TYPE } = require('../../analytics/constants/analytics');

class ExecutiveService {
  async getOrCreateForUser(userId) {
    const existing = await executiveRepository.findByUserId(userId);
    if (existing) return existing;

    return executiveRepository.create({ userId });
  }

  async getByUserId(userId) {
    const executive = await executiveRepository.findByUserId(userId);

    if (!executive) {
      throw new NotFoundError('Executive profile not found');
    }

    return executive;
  }

  async list({ status } = {}, options) {
    const filter = {};
    if (status) filter.status = status;

    return executiveRepository.findAll(filter, options);
  }

  async setStatus(userId, status) {
    await this.getOrCreateForUser(userId);
    const executive = await executiveRepository.model.findOneAndUpdate(
      { userId },
      { status, lastSeen: new Date() },
      { new: true },
    );

    if (status === EXECUTIVE_STATUS.ONLINE) {
      analyticsEventService.record(EVENT_TYPE.EXECUTIVE_ONLINE, { userId: String(userId) });
    } else if (status === EXECUTIVE_STATUS.OFFLINE) {
      analyticsEventService.record(EVENT_TYPE.EXECUTIVE_OFFLINE, { userId: String(userId) });
    }

    return executive;
  }

  async markOnline(userId, socketId) {
    await this.getOrCreateForUser(userId);
    const executive = await executiveRepository.model.findOneAndUpdate(
      { userId },
      { status: EXECUTIVE_STATUS.ONLINE, socketId, lastSeen: new Date() },
      { new: true },
    );

    analyticsEventService.record(EVENT_TYPE.EXECUTIVE_ONLINE, { userId: String(userId) });

    return executive;
  }

  async markOffline(userId) {
    const executive = await executiveRepository.model.findOneAndUpdate(
      { userId },
      { status: EXECUTIVE_STATUS.OFFLINE, socketId: null, lastSeen: new Date() },
      { new: true },
    );

    analyticsEventService.record(EVENT_TYPE.EXECUTIVE_OFFLINE, { userId: String(userId) });

    return executive;
  }

  async incrementChats(userId) {
    return executiveRepository.incrementCurrentChats(userId, 1);
  }

  async decrementChats(userId) {
    return executiveRepository.incrementCurrentChats(userId, -1);
  }

  // Below: admin-only Executive Management (ADMIN_PANEL.md §11) — distinct
  // from the self-service methods above (a logged-in executive managing
  // their own presence/status).
  async adminList({ status } = {}, options) {
    const filter = {};
    if (status) filter.status = status;

    return executiveRepository.listWithUser(filter, options);
  }

  async getByIdOrThrow(executiveId) {
    const executive = await executiveRepository.findById(executiveId);

    if (!executive) {
      throw new NotFoundError('Executive not found');
    }

    return executive;
  }

  async createExecutive({ name, email, password, department, maxChats }) {
    const user = await authService.createUser({ name, email, password, role: ROLES.EXECUTIVE });

    return executiveRepository.create({
      userId: user.id,
      department: department ?? null,
      maxChats,
    });
  }

  async updateProfile(executiveId, updates) {
    const executive = await this.getByIdOrThrow(executiveId);
    Object.assign(executive, updates);
    await executive.save();
    return executive;
  }

  async setActive(executiveId, isActive) {
    const executive = await this.getByIdOrThrow(executiveId);
    await authService.setActive(executive.userId, isActive);
    return executive;
  }

  async resetPassword(executiveId, newPassword) {
    const executive = await this.getByIdOrThrow(executiveId);
    await authService.resetPassword(executive.userId, newPassword);
    return executive;
  }
}

module.exports = new ExecutiveService();
