const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const logger = require('../src/shared/logger/logger');
const knowledgeService = require('../src/modules/knowledge/service/knowledgeService');

// One-time/on-demand backfill: regenerates embeddings for every currently
// PUBLISHED knowledge document. New/edited documents auto-embed via
// knowledgeService's publish/update/restoreVersion hooks going forward —
// this script only exists to catch up documents published before Phase 16
// introduced embeddings, or to recover after a bulk data import.
async function reindexKnowledgeEmbeddings() {
  await connectDatabase();

  const count = await knowledgeService.reindexAll();
  logger.info(`Reindexed embeddings for ${count} published knowledge document(s).`);
}

reindexKnowledgeEmbeddings()
  .catch((error) => {
    logger.error(`Failed to reindex knowledge embeddings: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
