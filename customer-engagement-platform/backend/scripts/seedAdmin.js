const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const env = require('../src/config/env');
const logger = require('../src/shared/logger/logger');
const { ROLES, ACCOUNT_STATUS } = require('../src/shared/constants/roles');
const { hashPassword } = require('../src/shared/helpers/password');
const User = require('../src/modules/auth/model/userModel');

async function seedAdmin() {
  await connectDatabase();

  const existingAdmin = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });

  if (existingAdmin) {
    logger.info(`Admin user already exists: ${env.SEED_ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);

  await User.create({
    name: env.SEED_ADMIN_NAME,
    email: env.SEED_ADMIN_EMAIL,
    passwordHash,
    role: ROLES.ADMIN,
    status: ACCOUNT_STATUS.ACTIVE,
    isActive: true,
  });

  logger.info(`Admin user created: ${env.SEED_ADMIN_EMAIL}`);
}

seedAdmin()
  .catch((error) => {
    logger.error(`Failed to seed admin user: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
