const fs = require('fs');
const path = require('path');
const promptRepository = require('../repository/promptRepository');
const promptVersionRepository = require('../repository/promptVersionRepository');
const { PROMPT_TYPES, PROMPT_STATUS } = require('../constants/prompt');
const { NotFoundError } = require('../../../shared/errors');

function loadTemplate(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'prompts', 'templates', name), 'utf8').trim();
}

// Seed content for the prompt types that already have a file-based
// equivalent from earlier phases (Phase 7's system/developer/fallback
// prompts, Phase 10's summary prompt, Phase 13's lead prompt). ESCALATION
// now has one too (the human-handoff acknowledgment sent when a visitor
// is escalated to an executive) — only affects fresh installs; the
// already-existing empty/DRAFT ESCALATION document from Phase 11 needed
// no migration, since chatReplyService's `getPublishedContent(...) ??
// fileDefault` falls back to this same file for a DRAFT doc regardless
// of its (empty) content, identical to how LEAD's Phase 13 fix worked.
const SEED_CONTENT = {
  [PROMPT_TYPES.SYSTEM]: () => loadTemplate('system.md'),
  [PROMPT_TYPES.DEVELOPER]: () => loadTemplate('developer.md'),
  [PROMPT_TYPES.FALLBACK]: () => loadTemplate('fallback.md'),
  [PROMPT_TYPES.SUMMARY]: () => loadTemplate('summary.md'),
  [PROMPT_TYPES.LEAD]: () => loadTemplate('lead.md'),
  [PROMPT_TYPES.ESCALATION]: () => loadTemplate('escalation.md'),
};

class PromptService {
  async ensureDefaults() {
    const existing = await promptRepository.listAll();
    const existingTypes = new Set(existing.map((doc) => doc.type));
    const missing = Object.values(PROMPT_TYPES).filter((type) => !existingTypes.has(type));

    await Promise.all(
      missing.map((type) => {
        const content = SEED_CONTENT[type]();
        const hasDefaultContent = content.length > 0;

        return promptRepository.create({
          type,
          content,
          status: hasDefaultContent ? PROMPT_STATUS.PUBLISHED : PROMPT_STATUS.DRAFT,
          publishedAt: hasDefaultContent ? new Date() : null,
        });
      }),
    );
  }

  async listAll() {
    await this.ensureDefaults();
    return promptRepository.listAll();
  }

  async getByType(type) {
    await this.ensureDefaults();
    const doc = await promptRepository.findByType(type);

    if (!doc) {
      throw new NotFoundError(`No prompt configured for type ${type}`);
    }

    return doc;
  }

  async getPublishedContent(type) {
    const doc = await promptRepository.findByType(type);
    if (!doc || doc.status !== PROMPT_STATUS.PUBLISHED || !doc.content) return null;
    return doc.content;
  }

  async update(type, content, updatedBy) {
    const doc = await this.getByType(type);

    if (doc.status === PROMPT_STATUS.PUBLISHED) {
      await this.snapshotVersion(doc);
      doc.version += 1;
    }

    doc.content = content;
    doc.updatedBy = updatedBy;
    await doc.save();

    return doc;
  }

  async publish(type, updatedBy) {
    const doc = await this.getByType(type);
    doc.status = PROMPT_STATUS.PUBLISHED;
    doc.publishedAt = new Date();
    doc.updatedBy = updatedBy;
    await doc.save();
    return doc;
  }

  async listVersions(type) {
    const doc = await this.getByType(type);
    return promptVersionRepository.findByPromptId(doc.id);
  }

  async restoreVersion(type, targetVersion, updatedBy) {
    const doc = await this.getByType(type);
    const snapshot = await promptVersionRepository.findByPromptIdAndVersion(doc.id, targetVersion);

    if (!snapshot) {
      throw new NotFoundError(`Version ${targetVersion} not found for prompt type ${type}`);
    }

    await this.snapshotVersion(doc);

    doc.content = snapshot.content;
    doc.version += 1;
    doc.updatedBy = updatedBy;
    await doc.save();

    return doc;
  }

  async snapshotVersion(doc) {
    await promptVersionRepository.create({
      promptId: doc.id,
      type: doc.type,
      version: doc.version,
      content: doc.content,
      status: doc.status,
    });
  }
}

module.exports = new PromptService();
