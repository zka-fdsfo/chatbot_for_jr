const crypto = require('crypto');
const visitorRepository = require('../repository/visitorRepository');
const visitorSessionRepository = require('../repository/visitorSessionRepository');
const { signVisitorToken, verifyVisitorToken } = require('../../../shared/helpers/jwt');
const { AppError, NotFoundError } = require('../../../shared/errors');

const INVALID_SESSION_MESSAGE = 'Invalid or expired visitor session.';

function toSafeVisitor(visitor) {
  return {
    visitorId: visitor.visitorId,
    name: visitor.name,
    email: visitor.email,
    phone: visitor.phone,
    company: visitor.company,
    preferredLanguage: visitor.preferredLanguage,
  };
}

function toSafeSession(session) {
  return {
    sessionId: session.sessionId,
    visitorId: session.visitorId,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
  };
}

class VisitorService {
  async createSession({ ipAddress, userAgent, preferredLanguage } = {}) {
    const visitorId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    const visitor = await visitorRepository.create({
      visitorId,
      preferredLanguage: preferredLanguage ?? null,
    });

    const session = await visitorSessionRepository.create({
      sessionId,
      visitorId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    const visitorToken = signVisitorToken({ visitorId, sessionId });

    return { visitor: toSafeVisitor(visitor), session: toSafeSession(session), visitorToken };
  }

  async restoreSession(token) {
    if (!token) {
      throw new AppError(INVALID_SESSION_MESSAGE, 401);
    }

    let payload;
    try {
      payload = verifyVisitorToken(token);
    } catch {
      throw new AppError(INVALID_SESSION_MESSAGE, 401);
    }

    const session = await visitorSessionRepository.findBySessionId(payload.sessionId);

    if (!session || session.visitorId !== payload.visitorId || session.endedAt) {
      throw new AppError(INVALID_SESSION_MESSAGE, 401);
    }

    const visitor = await visitorRepository.findByVisitorId(payload.visitorId);

    if (!visitor) {
      throw new AppError(INVALID_SESSION_MESSAGE, 401);
    }

    const updatedSession = await visitorSessionRepository.touchActivity(session.sessionId);
    const visitorToken = signVisitorToken({ visitorId: visitor.visitorId, sessionId: session.sessionId });

    return {
      visitor: toSafeVisitor(visitor),
      session: toSafeSession(updatedSession),
      visitorToken,
    };
  }

  async getByVisitorId(visitorId) {
    const visitor = await visitorRepository.findByVisitorId(visitorId);

    if (!visitor) {
      throw new NotFoundError('Visitor not found');
    }

    return toSafeVisitor(visitor);
  }
}

module.exports = new VisitorService();
