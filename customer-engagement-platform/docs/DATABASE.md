# Database Design

# AI Customer Engagement Platform

## 1. Purpose

This document defines the MongoDB database design for the AI Customer Engagement Platform.

The database is organized around business domains and follows the Feature-Based Modular Architecture.

Every collection has a single owning module.

---

# 2. Design Principles

The database should be:

- Modular
- Scalable
- Consistent
- Extensible
- Auditable

General rules:

- Every document has `createdAt` and `updatedAt`
- Use ObjectId references where relationships exist
- Prefer embedding only for small immutable objects
- Avoid deeply nested documents
- Create indexes for frequently queried fields
- Support future vector search without redesign

---

# 3. Collection Ownership

| Collection              | Owner Module |
| ----------------------- | ------------ |
| users                   | Auth         |
| visitors                | Visitor      |
| visitor_sessions        | Visitor      |
| conversations           | Chat         |
| messages                | Chat         |
| conversation_audit_logs | Chat         |
| executives              | Executive    |
| tickets                 | Ticket       |
| ticket_notes            | Ticket       |
| ticket_audit_logs       | Ticket       |
| ticket_counters         | Ticket       |
| leads                   | Lead         |
| knowledge_base          | Knowledge    |
| knowledge_base_versions | Knowledge    |
| knowledge_embeddings    | Knowledge    |
| ai_settings             | Settings     |
| widget_settings         | Settings     |
| business_hours          | Settings     |
| analytics_events        | Analytics    |
| conversation_summaries  | AI           |
| prompts                 | AI           |
| prompt_versions         | AI           |

---

# 4. Common Document Fields

Unless stated otherwise, every collection includes:

```text
_id

createdAt

updatedAt
```

Optional fields

```text
createdBy

updatedBy

isActive
```

---

# 5. Users

Purpose

Store authenticated users.

Used by

- Authentication
- Executive
- Admin

Fields

```text
name

email

passwordHash

role

status

lastLogin

isActive
```

Indexes

```
email (unique)
role
```

---

# 6. Visitors

Purpose

Store visitor profile information collected during conversations.

Fields

```text
visitorId

name

email

phone

company

preferredLanguage
```

Indexes

```
visitorId (unique)

email
```

---

# 7. Visitor Sessions

Purpose

Track anonymous browsing sessions.

Fields

```text
sessionId

visitorId

ipAddress

userAgent

startedAt

endedAt
```

Indexes

```
sessionId (unique)

visitorId
```

---

# 8. Conversations

Purpose

Store conversation metadata.

Fields

```text
conversationId

visitorId

assignedExecutiveId

status

channel

startedAt

endedAt

archivedAt
```

`archivedAt` is new in Sprint 2 (Conversation Lifecycle Redesign) —
`null` unless `status` is `ARCHIVED`, mirroring `endedAt`'s pattern for
`CLOSED`.

Status — Sprint 2 replaced the original list. `HANDOFF` was removed (it
was defined since Phase 8 but never once assigned anywhere in the
codebase — a dead value, not a real state); `RESOLVED` is now a real,
wired intermediate state instead of an unused one; `ARCHIVED` is new.
Valid transitions are enforced in code
(`chat/constants/chat.js#VALID_STATUS_TRANSITIONS`), the same pattern
already used for Tickets and Leads:

```
WAITING   -> ACTIVE
ACTIVE    -> RESOLVED, CLOSED
RESOLVED  -> ACTIVE (a visitor message auto-reopens it), CLOSED
CLOSED    -> ARCHIVED
ARCHIVED  -> CLOSED (restore)
```

Indexes

```
conversationId (unique)

visitorId

assignedExecutiveId

status
```

## Conversation Audit Logs (`conversation_audit_logs`)

Purpose

New in Sprint 2 — "Preserve executive assignment history." Immutable
history of every conversation assignment/status change
(`ASSIGNED`, `REASSIGNED`, `STATUS_CHANGED`, `ARCHIVED`, `RESTORED`),
mirroring `ticket_audit_logs`'s exact pattern: the `chat` module only
ever calls `create` on this collection, never `update`/`delete`.

Fields

```text
conversationId

action

performedBy — ref users

details — Mixed (e.g. { from, to } for a status change or reassignment)
```

Indexes

```
conversationId, createdAt
```

---

# 9. Messages

Purpose

Store all chat messages.

Fields

```text
conversationId

senderType

senderId

message

messageType

attachments

metadata

sentAt

readAt
```

`readAt` is not in this document's original field list — added in Phase 8
to support read receipts (`null` until a participant on the other side of
the conversation reads it; see `docs/SOCKET_EVENTS.md`'s `chat:read` event).

Sender Types

```
VISITOR

AI

EXECUTIVE

SYSTEM
```

Message Types (`docs/CHAT_WIDGET.md` §10; `IMAGE`/`FILE` are documented as
future and not implemented)

```
TEXT

SYSTEM

LINK

QUICK_REPLY
```

Indexes

```
conversationId

sentAt
```

---

# 10. Executives

Purpose

Store executive profiles and availability.

Fields

```text
userId

department

skills

status

maxChats

currentChats

socketId

lastSeen
```

Status

```
ONLINE

OFFLINE

AWAY

BUSY

BREAK
```

Indexes

```
status

department
```

Executive Management (`ADMIN_PANEL.md` §11, Phase 11) creates/updates
these documents administratively — create/deactivate/reset-password acts
on the linked `users` document (`userId`), not this collection directly;
see `docs/API_SPEC.md` §10.

---

# 11. Tickets

Purpose

Support unresolved conversations (`TICKET_SYSTEM.md`, Phase 12).

Fields

```text
ticketNumber       — "TKT-000001", sequential (see Counters below)

conversationId     — nullable; not every ticket originates from a chat

visitorId          — nullable

assignedExecutiveId — ref users, nullable until assigned

subject

description

category

priority

status

source             — AI | EXECUTIVE | ADMINISTRATOR | VISITOR_REQUEST
                     (TICKET_SYSTEM.md §5 also lists "Future API
                     Integration" — not modeled, nothing produces it)

createdBy          — ref users (whoever's REST call created it — always
                     an authenticated Executive/Admin; there is no
                     visitor-facing ticket-creation endpoint, see
                     API_SPEC.md §15)

isDeleted, deletedAt — soft delete (TICKET_SYSTEM.md §13)
```

Status — reconciled with `TICKET_SYSTEM.md` §9, which is more detailed
than this document's original list (`PENDING`, no `REOPENED`):

```
OPEN

ASSIGNED

IN_PROGRESS

WAITING_CUSTOMER

RESOLVED

CLOSED

REOPENED
```

Valid transitions are enforced in code
(`ticket/constants/ticket.js#VALID_STATUS_TRANSITIONS`), matching the
lifecycle diagram in `TICKET_SYSTEM.md` §4: `OPEN → ASSIGNED →
IN_PROGRESS → WAITING_CUSTOMER → RESOLVED → CLOSED`, with `REOPENED` as a
branch off `RESOLVED`/`CLOSED` back into `ASSIGNED`/`IN_PROGRESS`.

Indexes

```
ticketNumber (unique)

status

priority

category

assignedExecutiveId

visitorId

createdAt (descending)
```

## Ticket Notes (`ticket_notes`)

Purpose

Internal notes (`TICKET_SYSTEM.md` §14) — never visible to visitors;
enforced by construction (no visitor-facing ticket read endpoint exists
at all, not just a `visible` flag).

Fields

```text
ticketId

authorId — ref users

content
```

## Ticket Audit Logs (`ticket_audit_logs`)

Purpose

Immutable history of every ticket action (`TICKET_SYSTEM.md` §18) —
`CREATED`, `ASSIGNED`, `REASSIGNED`, `STATUS_CHANGED`, `NOTE_ADDED`,
`UPDATED`, `DELETED`, `RESTORED`. Enforced by construction: the
`ticket` module only ever calls `create` on this collection, never
`update`/`delete`.

Fields

```text
ticketId

action

performedBy — ref users

details — Mixed (e.g. { from, to } for a status change or assignment)
```

## Ticket Counters (`ticket_counters`)

Purpose

A single document (`_id: "ticket"`) whose `seq` is atomically
incremented (`$inc`) to hand out `ticketNumber`s without a race
condition between two concurrent ticket creations.

---

# 12. Leads

Purpose

Store qualified business leads (`LEAD_MANAGEMENT.md`, Phase 13).

Fields — reconciled with `LEAD_MANAGEMENT.md` §6, which is more detailed
than this document's original list (`interestedService` singular, no
`company`/`notes`/`leadScore`/`source`/follow-up/conversion/loss fields):

```text
visitorId          — nullable

conversationId     — nullable

name, email, phone, company — nullable; a lead may exist with only
                     partial contact info, especially fresh out of
                     AI Lead Detection

interestedServices — array of strings (plural — a visitor can be
                     interested in more than one)

notes

leadScore          — HOT | WARM | COLD (§8)

status

source             — AI_CONVERSATION | EXECUTIVE | ADMINISTRATOR
                     (§5 also lists "Website Form" and "API Integration"
                     as Future — not modeled)

assignedExecutiveId — ref users, nullable until assigned

createdBy          — ref users, nullable (AI-detected leads created
                     without a human actor have no creator)

aiSummary          — embedded sub-document (§11): summary, visitorIntent,
                     interestedServices, recommendedFollowUp,
                     confidenceLevel (HIGH|MEDIUM|LOW), generatedAt.
                     A single current summary, regenerated in place on
                     demand — not versioned (no version-history
                     requirement was given for this, unlike Prompts or
                     Knowledge)

followUp           — embedded sub-document (§14): scheduledAt, notes,
                     outcome. The assigned executive is the lead's own
                     assignedExecutiveId, not duplicated here

convertedAt, convertedToTicketId — set by the Convert action; the ticket
                     link is optional (converting doesn't require
                     creating a ticket)

lostAt, lostReason — set by the Mark Lost action
```

Status — reconciled with `LEAD_MANAGEMENT.md` §9, which adds `ASSIGNED`,
`FOLLOW_UP`, and `ARCHIVED` to this document's original shorter list:

```
NEW

ASSIGNED

CONTACTED

FOLLOW_UP

QUALIFIED

CONVERTED

LOST

ARCHIVED
```

Valid transitions are enforced in code
(`lead/constants/lead.js#VALID_STATUS_TRANSITIONS`), matching the
lifecycle in `LEAD_MANAGEMENT.md` §4. Entering or leaving `ARCHIVED`
requires an `ADMIN` (§13's "Archive Leads"/"Restore Leads" are
Administrator actions) — enforced in `leadService.updateStatus`, not a
separate archive/restore endpoint, since `ARCHIVED` is already a regular
status in this enum (`ARCHIVED -> NEW` re-enters the pipeline fresh,
serving as "Restore").

Indexes

```
status

leadScore

assignedExecutiveId

visitorId

createdAt (descending)
```

Deliberately not built this phase: a dedicated lead audit-trail
collection (unlike `ticket_audit_logs`, Phase 12) and full-text/
multi-field search — neither "Audit" nor "Search" were in this phase's
explicit scope (`Lead Detection, Lead CRUD, AI Summary, Assignment,
Follow-up, Conversion`), unlike Phase 12's Ticket System which explicitly
asked for both.

---

# 13. Knowledge Base

Purpose

Single source of truth for AI responses.

Each document represents one knowledge category.

Fields

```text
category

title

slug

content

keywords

version

status (DRAFT | PUBLISHED | ARCHIVED — see docs/KNOWLEDGE_BASE.md §8)

publishedAt
```

`isPublished` is not a stored field — it's a derived/virtual property
(`status === 'PUBLISHED'`), kept for convenience since earlier drafts of
this document described a boolean. `docs/KNOWLEDGE_BASE.md` §8's three-state
`status` is the source of truth (needed to represent `ARCHIVED`, which a
boolean can't).

Categories

```
Company

Services

FAQs

Locations

Contact Information

Business Hours

Pricing

Policies

Privacy Policy

Terms & Conditions

Departments

Executives

Lead Collection

Greeting Messages

Escalation Rules

Chatbot Settings
```

Indexes

```
category

slug (unique)

keywords
```

## Versions Collection (`knowledge_base_versions`)

Purpose

Append-only history of every published knowledge document, so incorrect
information can be rolled back (`docs/KNOWLEDGE_BASE.md` §9, §14). Added in
Phase 6 — not present in earlier revisions of this document.

Fields

```text
knowledgeId (references knowledge_base._id)

version

category

title

content

keywords

status (snapshot of status at the time this version was current)
```

A new version snapshot is written whenever a `PUBLISHED` document is edited
or restored to a prior version — never on draft edits, since drafts were
never live.

Indexes

```
knowledgeId + version (unique compound)
```

## Knowledge Embeddings Collection (`knowledge_embeddings`)

Purpose

Vector Store for RAG (Phase 16, `docs/RAG.md`) — one document per chunk of
a `PUBLISHED` knowledge document's flattened content. Reconciles
`RAG.md` §8-9's original brief example (`knowledgeId`/`category`/
`chunkId`/`embedding`/`version`/`createdAt`) with the actual
implementation: `title`/`keywords` are denormalized from the parent
document (so the Retriever can return a complete result without a
follow-up query per match), and `text` (the chunk's own flattened text —
not in §9's example, but required so the Retriever can hand back the
actual matched content, not just its vector).

Fields

```text
knowledgeId (references knowledge_base._id)

category

title       (denormalized from the parent document)

keywords    (denormalized from the parent document)

chunkId     (0-based index within the parent document's chunks)

text        (this chunk's own flattened text)

embedding   (array of 256 numbers — a hashing-trick vector, not a true
             ML embedding; see below)

version     (the parent document's version at the time this chunk was
             generated)

createdAt
```

There is no `updatedAt` — a chunk is never edited in place. Any content
change deletes all of a document's chunks and regenerates them fresh
(`knowledgeEmbeddingService.regenerateForKnowledge`).

**No real embedding model or API is used.** This project's only
configured AI provider (Groq) has no embeddings endpoint, and adding a
new embeddings provider/library was judged out of scope for a
`no-new-dependency` phase (see `IMPLEMENTATION_STATUS.md`'s Architecture
Decisions). Instead, `embedding` is a 256-dimension "hashing trick"
vector: each chunk's significant words are hashed into fixed buckets
(term-frequency counts), then L2-normalized — a standard, dependency-free
technique that captures lexical/token-overlap similarity, not true
semantic similarity. Cosine similarity between two such vectors is
computed in application code (a plain dot product, since both vectors are
pre-normalized) — **not** via MongoDB's native `$vectorSearch`, which is
an Atlas-only aggregation stage unavailable to this project's self-hosted
MongoDB Community 7 (`docker-compose.yml`'s `mongo:7` image).

Lifecycle: generated when a document is published or an already-published
document is edited/restored (`RAG.md` §7, §19); deleted entirely when a
document is archived (`RAG.md` §25: "Published knowledge is the only
source for embeddings"). Generation is fire-and-forget (never awaited by
the triggering request — `RAG.md` §20: "Visitors should never wait for
embedding generation"); a failure here is only logged, never thrown.

Indexes

```
knowledgeId

category
```

---

# 14. AI Settings and Widget Settings

This document originally described a single "Chatbot Settings" collection
(`assistantName`, `greeting`, `fallbackMessage`, `enableHumanHandoff`,
`leadCollectionEnabled`). Phase 11 built the Admin Portal against
`ADMIN_PANEL.md` §9-10 instead, which specifies two more detailed,
distinct concerns — AI Configuration and Widget Configuration — so this
section now describes the two collections actually built, reconciling
the original field list into them (`greeting` → `welcomeMessage`,
`fallbackMessage` → `Prompt` type `FALLBACK` — see §16b, not a settings
field — `enableHumanHandoff`/`leadCollectionEnabled` →
`featureToggles.humanHandoffEnabled` and a general toggles map).
`assistantName` was not carried over — nothing currently displays it.

## AI Settings (`ai_settings`)

Purpose

Global AI Engine configuration (`ADMIN_PANEL.md` §9), editable without a
redeploy.

Fields

```text
provider        — only "groq" is implemented; stored for a future
                  multi-provider switch, per ADMIN_PANEL.md §9's "Provider
                  changes should not affect business logic"

model

temperature

maxTokens

responseLength  — stored; nothing reads it yet, no response-length
                  post-processing exists

confidenceThreshold — stored; unconsumed, no confidence scoring exists

escalationRules — stored; unconsumed, no Escalation Detection exists
                  (same gap noted in AI_ENGINE.md since Phase 7)

updatedBy
```

Only one document should exist (a singleton — `aiSettingsService.get()`
lazily creates it with defaults from `.env` on first read, same pattern
`executiveService.getOrCreateForUser` established in Phase 10).
`aiEngine.generateResponse` reads `temperature`/`maxTokens`/`model` from
here on every call — never `.env` directly once this collection exists.

## Widget Settings (`widget_settings`)

Purpose

Chat Widget display/behavior configuration (`ADMIN_PANEL.md` §10),
publicly readable (the anonymous Chat Widget fetches it before any
visitor session exists) but only ADMIN-writable.

Fields

```text
brandLogoUrl        — a URL, not an uploaded file; see Known Issues

primaryColor

theme                — LIGHT | DARK

position              — BOTTOM_RIGHT | BOTTOM_LEFT

welcomeMessage

suggestedQuestions    — array of strings

offlineMessage

featureToggles        — { typingIndicatorEnabled, soundNotificationsEnabled,
                          quickRepliesEnabled, humanHandoffEnabled }

updatedBy
```

Only one document should exist (singleton, same lazy-create pattern as
AI Settings). Consumed by the Chat Widget (Phase 9) via
`WidgetSettingsProvider` — see `CHAT_WIDGET.md` follow-up in
`IMPLEMENTATION_STATUS.md` Phase 11 notes for exactly which fields are
wired to real widget behavior versus stored-but-not-yet-consumed
(`humanHandoffEnabled`).

---

# 15. Business Hours

Purpose

Store company operating hours (`BUSINESS_HOURS.md`, Phase 14). Owned by
the `settings` module (`business_hours` collection) — same lazy-create-
with-defaults singleton pattern as AI Settings/Widget Settings (Phase
11).

Fields

```text
timezone           — an IANA zone name (e.g. "Australia/Melbourne", the
                     doc's own example), validated against
                     Intl.supportedValuesOf('timeZone') — never assumed
                     to be the server's timezone (§6)

weeklySchedule     — exactly 7 embedded sub-documents (Monday-first,
                     §4), each: { day, enabled, open ("HH:MM" 24-hour),
                     close ("HH:MM") }

holidays           — embedded sub-documents (each with its own _id for
                     individual add/remove): { name, date ("YYYY-MM-DD"
                     — a calendar date, not a timestamp, since a holiday
                     is the same day regardless of what time zone's
                     clock reads it), type (PUBLIC | COMPANY |
                     EMERGENCY) }
```

Only one document should exist. Holidays override the weekly schedule
for their date (§8); "Special Hours" (§9 — seasonal/event schedules
distinct from holidays) was not built this phase — not in the explicit
task list (`Weekly Schedule, Holidays, Availability Service, Timezone
Support, Callback Availability`).

Status calculation (`OPEN`/`CLOSED`/`OPENING_SOON`/`CLOSING_SOON`/
`HOLIDAY`, §7) and callback-availability slot suggestions are computed
on demand by `businessHoursService`, not stored — BUSINESS_HOURS.md §20:
"Business status should be... recalculated when required," and a
singleton-document lookup is already cheap enough that no separate cache
layer was added.

Timezone conversion uses only `Intl.DateTimeFormat` (no new dependency
like `luxon`/`date-fns-tz`) — both directions (UTC instant -> local
wall-clock, for status; local wall-clock -> UTC instant, for callback
slot suggestions) are handled via the standard "format, compare, adjust"
technique. The one known limitation: converting a wall-clock time that
falls in the ambiguous or skipped hour of a DST transition itself can be
off by an hour — acceptable for a callback-slot _suggestion_, not used
anywhere safety-critical.

---

# 16. Conversation Summaries

Purpose

Store AI-generated summaries.

Fields

```text
conversationId

summary

visitorIntent

sentiment

outcome

followUpRecommendation

generatedAt
```

`visitorIntent` and `followUpRecommendation` are not in this document's
original field list — added in Phase 10 to match `AI_ENGINE.md` §16's fuller
description ("Summary, Visitor Intent, Outcome, Lead Information, Follow-up
Recommendation"). "Lead Information" was not added as a field — Lead
capture is Phase 13 (`leads` collection); nothing produces lead data yet.

Generated on demand (an executive-triggered "Generate Summary" action), not
automatically at conversation end or AI handoff — there is no automatic
handoff trigger yet (Escalation Detection was explicitly out of scope in
Phase 7, and AI Responses were explicitly out of scope in Phase 8).

Indexes

```
conversationId
```

---

# 16b. Prompts

Purpose

Prompt Management (`ADMIN_PANEL.md` §8) — lets an admin edit, version,
publish, and roll back the AI Engine's prompts without a redeploy.

## Prompts (`prompts`)

Exactly one document per `type` (`type` is uniquely indexed — this is a
fixed set of six named "slots", unlike `knowledge_base`'s many documents
per category).

Fields

```text
type          — SYSTEM | DEVELOPER | LEAD | SUMMARY | ESCALATION | FALLBACK

content

version

status        — DRAFT | PUBLISHED  (no ARCHIVED — always exactly one
                current prompt per type; "removing" one isn't meaningful)

publishedAt

updatedBy
```

Seeded lazily (`promptService.ensureDefaults()`, same lazy pattern as
Executive/AI Settings/Widget Settings) the first time any prompt endpoint
is hit: `SYSTEM`/`DEVELOPER`/`FALLBACK`/`SUMMARY` seed from their existing
Phase 7/10 file templates and start `PUBLISHED` (identical content to
what was already live via files — seeding changes nothing observable);
`LEAD` and `ESCALATION` seed empty and `DRAFT` since neither has a
current file or a runtime consumer (no Lead module — Phase 13; no
Escalation Detection — deferred since Phase 7).

`promptBuilder.build()` and `summaryService.generate()` check here first
for a `PUBLISHED` document of the relevant type, falling back to the
original file constant if none exists or nothing's published — the file
templates remain the permanent ground-truth default, never deleted.

## Prompt Versions (`prompt_versions`)

Same snapshot-on-edit-while-published pattern as
`knowledge_base_versions` (§13).

Fields

```text
promptId

type

version

content

status
```

Indexes

```
{ promptId: 1, version: 1 } — unique
```

---

# 17. Analytics Events

Purpose

Track business metrics (Phase 15). Reconciles this section's original
brief field list (`eventType`/`visitorId`/`conversationId`/`metadata`/
`occurredAt`) with the actual implementation: `visitorId`/`conversationId`
and any other identifiers live inside the flexible `payload` object rather
than as top-level fields, since which identifiers are relevant differs per
event type (a `TICKET_CREATED` event has no `visitorId`, an
`EXECUTIVE_ONLINE` event has neither).

Collection: `analytics_events`

Fields

```text
type            (string, enum — see Event Types below)
payload         (object, arbitrary per-type metadata — e.g. conversationId,
                 visitorId, executiveUserId, durationSeconds,
                 resolutionTimeSeconds; see ANALYTICS.md §21)
createdAt       (date — the event's own timestamp; there is no updatedAt,
                 since events are never modified)
```

Immutability: this collection has no update or delete path anywhere in
the codebase — only `create` — enforcing ANALYTICS.md §21/§23's "Events
should be immutable" / "Historical data should remain immutable" by
construction, the same pattern already used for `ticket_audit_logs`.

Event Types

Only event types with a real, wireable trigger somewhere in the codebase
exist — there is no `AI_RESPONSE`/`AI_HANDOFF`/`AI_FAILED` type, since
nothing in this project currently generates a live AI chat reply (see
Known Issues, tracked since Phase 8).

```
CONVERSATION_STARTED     — a new conversation is created for a visitor
CONVERSATION_CLOSED      — an executive closes a conversation
CONVERSATION_HANDOFF     — an executive claims a WAITING conversation
                            (counted as "Human Handoffs" under AI
                            Analytics — every conversation currently goes
                            straight to a human, there is no AI-first
                            triage stage to hand off from)
LEAD_CREATED             — a lead is created
LEAD_CONVERTED           — a lead is marked CONVERTED
TICKET_CREATED           — a ticket is created
TICKET_CLOSED            — a ticket transitions to CLOSED
TICKET_REOPENED          — a ticket transitions to REOPENED
EXECUTIVE_ONLINE         — an executive's status becomes ONLINE
EXECUTIVE_OFFLINE        — an executive's status becomes OFFLINE
WIDGET_OPENED            — client-reported, via the public event endpoint
WIDGET_CLOSED            — client-reported
SUGGESTED_QUESTION_USED  — client-reported
QUICK_REPLY_USED         — client-reported
```

The last four (`WIDGET_*`, `SUGGESTED_QUESTION_USED`, `QUICK_REPLY_USED`)
are the only types a visitor's browser may submit directly, via the public
`POST /analytics/events` endpoint — everything else is recorded
server-side as a side effect of an authenticated/internal operation and
can never be spoofed in from client input.

Indexes

```
{ type: 1, createdAt: 1 }
```

Historical data: because this collection was introduced in Phase 15,
nothing before it exists here — Analytics endpoints only reflect activity
recorded from this phase onward, not the platform's full history.

---

# 18. Relationships

```text
Visitor
│
├── Visitor Sessions
├── Conversations
├── Leads
└── Tickets

Conversation
│
├── Messages
├── Summary
└── Ticket

Executive
│
├── User
└── Conversations

Knowledge Base
│
└── AI
```

---

# 19. Index Strategy

Unique indexes

- users.email
- visitors.visitorId
- visitor_sessions.sessionId
- conversations.conversationId
- tickets.ticketNumber
- knowledge_base.slug

Query indexes

- conversationId
- visitorId
- assignedExecutiveId
- status
- category
- occurredAt

---

# 20. Future Collections

These are planned for future phases.

```text
knowledge_embeddings

notifications

callback_requests

email_logs

audit_logs

workflow_rules

attachments
```

---

# 21. Data Lifecycle

- Visitor Sessions may expire after a configurable retention period.
- Conversations and Messages are retained for historical analysis.
- Analytics Events are append-only.
- Knowledge Base uses versioning instead of deletion.
- Business configuration documents are updated in place while preserving audit history where required.

---

# 22. Database Rules

- Every collection belongs to exactly one module.
- Services access collections through repositories only.
- Never bypass repositories from controllers.
- Never duplicate data without a clear business reason.
- Prefer references over deep document embedding.
- Database schema changes must also update `PROJECT_MEMORY.md` and relevant API documentation.

# Conversation Lifecycle

## Overview

The Conversation collection is the single source of truth for every interaction between a visitor, the AI assistant, and a human executive.

A conversation is created only once when a visitor starts a new chat session. All subsequent messages, ticket information, assignments, and summaries must be linked to the same conversation.

The conversation lifecycle is illustrated below.

```text
Visitor
    │
    ▼
Conversation Created
    │
    ▼
AI Conversation
    │
    ▼
Messages Persisted
    │
    ▼
AI Summary Generated
    │
    ▼
Ticket Created (Optional)
    │
    ▼
Executive Assignment
    │
    ▼
Live Conversation
    │
    ▼
Conversation Closed
    │
    ▼
Archived
```

## Design Principles

- A conversation must never be recreated after it has been started.
- Ticket creation must not create a new conversation.
- Executive assignment must not create a new conversation.
- All AI messages and executive messages belong to the same conversation.
- Conversation history must remain complete throughout the entire lifecycle.
- AI summaries, visitor information, ticket references, and lead information must be linked to the original conversation.
- Archived conversations must remain available for reporting, analytics, and future reference.

The Conversation collection is the parent entity for:

- Messages
- AI Summary
- Ticket
- Executive Assignment
- Lead Information
- Conversation Analytics
- Conversation Status History
