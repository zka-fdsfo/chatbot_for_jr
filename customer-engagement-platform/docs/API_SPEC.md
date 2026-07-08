# API Specification

# AI Customer Engagement Platform

## 1. Purpose

This document is the source of truth for the platform's REST API contract.
Every module's endpoints are documented here as they are implemented — this
file did not exist before Phase 4 (Authentication) and is seeded with the
health-check and authentication endpoints built so far. Update it whenever an
endpoint is added, changed, or removed, per `CODING_STANDARDS.md` and
`ARCHITECTURE.md`.

---

# 2. Conventions

- Base path: `/api/{version}` (currently `/api/v1`, see `API_VERSION` env var).
- All responses follow the standard envelope (`shared/responses/apiResponse.js`):

Success

```json
{
  "success": true,
  "message": "Human-readable message.",
  "data": {},
  "meta": {}
}
```

Error

```json
{
  "success": false,
  "message": "Human-readable message.",
  "errors": []
}
```

- Authenticated requests send `Authorization: Bearer <accessToken>`.
- The refresh token is never exposed to client-side JavaScript — it travels as
  an `httpOnly`, `secure` (in production), `sameSite=lax` cookie named
  `refreshToken`, scoped to the `/api/v1/auth` path.

---

# 3. Health

## GET /api/v1/health

Public. No authentication required.

Success `200`

```json
{
  "success": true,
  "message": "Service is healthy.",
  "data": {
    "status": "ok",
    "uptime": 12.34,
    "timestamp": "2026-07-03T10:00:00.000Z",
    "database": "connected"
  }
}
```

---

# 4. Authentication

Owned by the `auth` module (`backend/src/modules/auth/`). Covers
Administrator/Executive login only — anonymous visitor sessions are a
separate mechanism, see §6.

## POST /api/v1/auth/login

Public.

Request body

```json
{
  "email": "admin@example.com",
  "password": "ChangeMe123!"
}
```

Success `200` — also sets the `refreshToken` cookie.

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "665f1c2e...",
      "name": "Platform Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "isActive": true,
      "lastLogin": "2026-07-03T10:00:00.000Z"
    },
    "accessToken": "<jwt>"
  }
}
```

Errors

- `400` — validation failed (missing/invalid email or password).
- `401` — invalid email or password (generic message, per
  `AUTHENTICATION.md` #10).
- `403` — account is `INACTIVE`/`LOCKED`.

## POST /api/v1/auth/refresh

Public (reads the `refreshToken` cookie; no `Authorization` header needed).
Rotates the refresh token on every call (old one is invalidated).

Success `200` — same shape as login; sets a new `refreshToken` cookie.

Errors

- `401` — refresh token missing, invalid, expired, or already rotated.
- `403` — account is `INACTIVE`/`LOCKED`.

## POST /api/v1/auth/logout

Public (idempotent — reads the `refreshToken` cookie if present). Invalidates
the server-side refresh session and clears the cookie regardless of whether
the token was still valid.

Success `200`

```json
{ "success": true, "message": "Logged out successfully.", "errors": [] }
```

Note: does not disconnect an active socket connection or update executive
availability yet — those depend on Socket.io auth (Phase 8) and Executive
presence (Phase 10), which don't exist yet. Tracked as a known gap.

## GET /api/v1/auth/me

Requires `Authorization: Bearer <accessToken>`.

Success `200`

```json
{
  "success": true,
  "message": "Current user.",
  "data": {
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "role": "ADMIN",
      "status": "ACTIVE",
      "isActive": true,
      "lastLogin": "..."
    }
  }
}
```

Errors

- `401` — missing/invalid/expired access token.
- `403` — account is `INACTIVE`/`LOCKED`.

---

# 5. Authentication Middleware Reference

For endpoints built in later phases:

- `middleware/authenticate.js` — verifies the access token, re-fetches the
  user from the database (so a role/status change takes effect immediately,
  not just at next login), and attaches `req.user = { id, name, email,
role, status, isActive, lastLogin }`.
- `middleware/authorize.js` — `requireRole(...roles)` and
  `requirePermission(permission)`, built on `shared/constants/roles.js` and
  `shared/constants/permissions.js` (the permission matrix from
  `AUTHENTICATION.md` #18). Not yet used by any route — no protected business
  endpoints exist yet — but ready for the modules that will need them
  (ticket, knowledge, executive, analytics, settings).

---

# 6. Visitor Sessions

Owned by the `visitor` module (`backend/src/modules/visitor/`). Anonymous
website visitors — no password, no registration. Separate token mechanism
from Authentication (§4): the visitor token is never accepted by
`authenticate`/`authorize`, and admin access tokens are never accepted here.

The visitor token travels as a custom request header, not
`Authorization` and not a cookie:

```
X-Visitor-Token: <visitor jwt>
```

The client (chat widget, Phase 9) is responsible for storing this token
(e.g. `localStorage`) and sending it on every visitor-facing request.

## POST /api/v1/visitors/sessions

Public. No request body required. Creates a brand-new anonymous visitor and
session — the client calls this the first time it has no stored visitor
token (or its stored token turned out to be invalid/expired).

Success `201`

```json
{
  "success": true,
  "message": "Visitor session created.",
  "data": {
    "visitor": {
      "visitorId": "5d1f...uuid",
      "name": null,
      "email": null,
      "phone": null,
      "company": null,
      "preferredLanguage": null
    },
    "session": {
      "sessionId": "9a2c...uuid",
      "visitorId": "5d1f...uuid",
      "startedAt": "2026-07-03T12:00:00.000Z",
      "lastActivityAt": "2026-07-03T12:00:00.000Z"
    },
    "visitorToken": "<jwt>"
  }
}
```

## GET /api/v1/visitors/sessions/me

Requires `X-Visitor-Token: <visitorToken>`. This is session recovery — the
client calls this on every page load with its stored token instead of
always creating a new session. Every successful call is a sliding-expiration
renewal: `lastActivityAt` is updated and a freshly-signed `visitorToken`
(same `visitorId`/`sessionId`, renewed expiry) is returned — the client must
overwrite its stored token with the new one on every response.

Success `200` — same `data` shape as creation.

Errors

- `401` — token missing, invalid, expired, references a session that has
  ended (`endedAt` set), or references a visitor/session that no longer
  exists. The client's correct response to a `401` here is to call
  `POST /api/v1/visitors/sessions` and start a fresh session — there is no
  way to recover a session whose token is gone or invalid.

## PATCH /api/v1/visitors/sessions/me

New in Sprint 6 (Chat Widget/Visitor Session Improvements) — "Fix visitor
information collection." Requires `X-Visitor-Token`. Request body: any
subset of `{ "name": "...", "email": "...", "phone": "...", "company": "..." }`
(at least one key). The visitor updating their own profile — distinct
from the staff-facing lookup below, and from Lead capture (which infers
these same fields from conversation text via AI, never a form).

Success `200` — `data.visitor`, same shape as session creation.

## POST /api/v1/visitors/sessions/end

New in Sprint 6. Requires `X-Visitor-Token`. Sets `endedAt` on the
session — the last step of the widget's End Chat flow
(`docs/CHAT_WIDGET.md`'s End Chat spec, step 6: "Clear the current
session"). Nothing set `endedAt` before this (a Known Issue since Phase
5); `restoreSession` already correctly treats an ended session as
invalid, so the very next `GET /sessions/me` with the same token
correctly `401`s, forcing a genuinely fresh session.

Success `200` — `data: null`.

## Visitor Middleware Reference

- `middleware/visitorSession.js` — exports `requireVisitorSession` (401s if
  the token is missing/invalid/expired; used by `GET /sessions/me` above)
  and `attachVisitorSession` (same resolution, but sets `req.visitor =
null` instead of rejecting when there's no valid session — for routes that
  behave differently for known vs. anonymous visitors without requiring
  one). Both attach `req.visitor`, `req.visitorSession`, and
  `req.visitorToken` on success. Neither does business logic itself — both
  delegate to `visitorService.restoreSession`. `attachVisitorSession` has no
  route using it yet; it's ready for Chat (Phase 8) and similar modules.

## GET /api/v1/visitors/:visitorId

Added in Phase 10 — staff-facing (Executive Workspace's Visitor Panel,
`EXECUTIVE_DASHBOARD.md` §12). Requires `Authorization: Bearer <accessToken>`

- `VIEW_OWN_CONVERSATION` — a completely separate authentication path from
  the visitor-token routes above; this route never accepts `X-Visitor-Token`,
  and the visitor-token routes never accept an admin/executive access token.

Success `200` — same `visitor` shape as session creation. Errors: `404` if
no such visitor.

## GET /api/v1/visitors/:visitorId/conversations

Same auth as above. Returns the visitor's full conversation history
(`data.conversations`, paginated) — "Previous conversations" from
`EXECUTIVE_DASHBOARD.md` §12. "Lead status" (also listed in §12) is not
included — the Leads module doesn't exist yet (Phase 13).

---

# 7. Knowledge Base

Owned by the `knowledge` module (`backend/src/modules/knowledge/`). All
routes require `Authorization: Bearer <accessToken>` — per
`KNOWLEDGE_BASE.md` §16, visitors never access this directly (the AI reads
it server-side; there is no public knowledge endpoint). Read routes need
`VIEW_KNOWLEDGE_BASE` (ADMIN + EXECUTIVE); write routes (create, update,
publish, archive, restore) need `MANAGE_KNOWLEDGE_BASE` (ADMIN only).

A knowledge document's `status` is one of `DRAFT`, `PUBLISHED`, `ARCHIVED`.
Only `PUBLISHED` documents are meant to be used by the AI (not enforced by
this module — the AI Engine, Phase 7, is responsible for filtering on
`status` when it retrieves knowledge). Editing a `PUBLISHED` document
snapshots its current state into `knowledge_base_versions` and bumps
`version` before applying the change; editing a `DRAFT` does not (it was
never live, so there's nothing to preserve).

## POST /api/v1/knowledge

Requires `MANAGE_KNOWLEDGE_BASE`. Creates a new document with
`status: DRAFT`.

Request body

```json
{
  "category": "FAQS",
  "title": "Frequently Asked Questions",
  "slug": "faqs",
  "content": { "items": [{ "question": "...", "answer": "..." }] },
  "keywords": ["faq", "help"]
}
```

Success `201` — returns `{ "data": { "knowledge": { ... } } }` with the
created document (`version: 1`, `status: "DRAFT"`, `publishedAt: null`).

Errors

- `400` — validation failed (invalid `category`, missing `title`/`slug`/
  `content`, malformed `slug` — must be lowercase kebab-case).
- `400` — duplicate `slug` (translated into a validation error, not a raw
  MongoDB duplicate-key error).
- `401`/`403` — missing/invalid token, or caller isn't ADMIN.

## GET /api/v1/knowledge

Requires `VIEW_KNOWLEDGE_BASE`. Search/list with optional query params:
`category`, `status`, `keyword` (matches `title` or `keywords`, case
insensitive), `page`, `limit`.

Success `200` — `data.knowledge` is an array; `meta` is
`{ total, page, limit }`.

## GET /api/v1/knowledge/slug/:slug

## GET /api/v1/knowledge/:id

Requires `VIEW_KNOWLEDGE_BASE`. Fetch a single document by slug or Mongo id.

Errors: `404` if no document matches.

## PATCH /api/v1/knowledge/:id

Requires `MANAGE_KNOWLEDGE_BASE`. Partial update — any of `category`,
`title`, `slug`, `content`, `keywords`. At least one field required.

Errors: `400` (validation/duplicate slug), `404` (no such document).

## POST /api/v1/knowledge/:id/publish

Requires `MANAGE_KNOWLEDGE_BASE`. Sets `status: PUBLISHED` and stamps
`publishedAt`. Does not accept a body — update content first via `PATCH`,
then publish.

## POST /api/v1/knowledge/:id/archive

Requires `MANAGE_KNOWLEDGE_BASE`. Sets `status: ARCHIVED`. No route
currently un-archives directly — restore a version instead (see below) if
the intent is to bring content back, or `PATCH` + `publish` again.

## GET /api/v1/knowledge/:id/versions

Requires `VIEW_KNOWLEDGE_BASE`. Returns the version history (newest first)
as `data.versions`, each `{ version, category, title, content, keywords,
status, createdAt }`.

## POST /api/v1/knowledge/:id/versions/:version/restore

Requires `MANAGE_KNOWLEDGE_BASE`. Snapshots the current live state (so the
restore itself is never destructive), copies the target version's
`category`/`title`/`content`/`keywords` into the live document, and bumps
`version` forward — restoring never rewinds the version number.

Errors: `404` if the document or the specific version doesn't exist.

---

# 8. AI Engine (internal — no HTTP surface yet)

Owned by the `ai` module (`backend/src/modules/ai/`). Unlike every other
module documented above, **there is no `/api/v1/ai/...` route** — the AI
Engine is pure orchestration, called directly by other backend code (Node
function calls), not exposed over HTTP. The first (and currently only)
planned caller is the Chat module (Phase 8), which doesn't exist yet — so
right now this module is unreachable from outside the backend process.
Documented here as a reference for whoever wires it up next, not as an API
contract.

- `providers/aiProvider.js` — abstract base class (`generateCompletion` must
  be overridden); `providers/groqProvider.js` — the Groq implementation,
  calling `https://api.groq.com/openai/v1/chat/completions` via the
  platform's native `fetch` (Node 18+, no new dependency); `providers/
providerManager.js` — `getProvider()` returns the provider selected by
  `AI_PROVIDER` (currently only `"groq"`). Adding a second provider means
  adding one class + one registry entry — nothing else changes.
- `prompts/promptBuilder.js` — `build({ knowledge, conversationSummary,
recentMessages, visitor, currentMessage })` assembles a chat-completions
  `messages` array in the order `PROMPT_ENGINEERING.md` §10 specifies
  (system+developer+knowledge → summary → recent messages → visitor context
  → current message). Templates live in `prompts/templates/*.md` as plain
  files, not inline strings, per §11. User-provided text is sanitized
  (control characters stripped, length-capped) before being placed in a
  message, per §9/§24.
- `service/contextBuilder.js` — `build({ message, category, visitor,
conversationSummary, conversationHistory })` retrieves knowledge via
  `knowledgeService.search()` (category/keyword, `status: PUBLISHED` only —
  never queries MongoDB directly, per `AI_ENGINE.md` §7/§25), capped at
  `AI_KNOWLEDGE_LIMIT` documents.
- `service/responseParser.js` — `parse(rawResponse)` returns `{ content,
isValid, isTruncated, finishReason, usage }`. `isValid` is a concrete,
  checkable condition (non-empty content) — it does **not** attempt
  hallucination or fabricated-pricing detection (`AI_ENGINE.md` §12 lists
  these as validation goals, but implementing them as real checks needs
  more than this phase scoped; see `docs/IMPLEMENTATION_STATUS.md`).
- `service/aiEngine.js` — `generateResponse({ message, category, visitor,
conversationSummary, conversationHistory })` orchestrates the above and
  returns the parsed result, substituting the fallback template
  (`prompts/templates/fallback.md`) when the response is invalid.

Explicitly not built this phase: Intent Detection, Lead Detection,
Escalation Detection, Confidence Evaluation (HIGH/MEDIUM/LOW), Conversation
Summary generation — all listed as AI Engine responsibilities in
`AI_ENGINE.md` §2/§4, but meaningless without a real conversation to act on
(Chat, Phase 8).

---

# 9. Conversations

Owned by the `chat` module (`backend/src/modules/chat/`). Real-time
conversation creation, messaging, typing indicators, read receipts, and
assignment claiming happen over **Socket.io**, documented separately in
`docs/SOCKET_EVENTS.md` — these REST routes are for staff to browse
conversation history and act on already-assigned conversations (the
Executive Workspace, Phase 10). Visitors never call these; they interact
entirely through sockets.

All routes require `Authorization: Bearer <accessToken>` and
`VIEW_OWN_CONVERSATION` (currently granted to both ADMIN and EXECUTIVE).

**Sprint 2 (Conversation Lifecycle Redesign) note on scoping:** every
route below now enforces the same assignment-based access Tickets and
Leads already had (`assertAccessible` — ADMIN sees everything; a
non-admin sees a conversation only if it's unclaimed (`WAITING`, the
shared queue) or assigned to them). Before this sprint, `getById`,
`listMessages`, `generateSummary`, and `getSummary` had no ownership
check at all, and `list` only scoped to the caller when the client
explicitly opted in with `?mine=true` — the default was every
conversation in the system. That gap is now closed.

## GET /api/v1/conversations

Query params: `status` (`WAITING`/`ESCALATED`/`ACTIVE`/`RESOLVED`/
`CLOSED`/`ARCHIVED`), `visitorId`, `mine` (boolean — filters to
`assignedExecutiveId ===` the caller's own user id), `page`, `limit`.
`?status=ESCALATED` is the Conversation Queue (Executive Handoff
Redesign — conversations the AI has handed off, waiting for an executive
to claim/be assigned via `chat:join` — see `docs/SOCKET_EVENTS.md` §4).
A non-admin caller only ever sees an `ESCALATED` conversation here if
it's unassigned or assigned to them — `?status=WAITING` returns nothing
for a non-admin at all, since a plain WAITING (AI-only) conversation
hasn't been handed off yet and isn't visible to executives (see
`assertAccessible`).

Success `200` — `data.conversations` is an array; `meta` is
`{ total, page, limit }`.

## GET /api/v1/conversations/:id

Fetch one conversation by Mongo id. Errors: `404` if not found, `403` if
it's assigned to a different executive.

## GET /api/v1/conversations/:id/messages

Paginated message history for the conversation (oldest first), including
any `AI`-sender messages — nothing filters by sender type anywhere in
this path. Query params: `page`, `limit`.

Success `200` — `data.messages` is an array; `meta` is
`{ total, page, limit }`.

## POST /api/v1/conversations/:id/close

Closes a conversation (`status: CLOSED`, `endedAt` stamped) and
decrements the caller's `currentChats`. Errors: `403` if the caller isn't
the assigned executive. Equivalent REST alternative to the `chat:close`
socket event (`docs/SOCKET_EVENTS.md` §10) for clients that prefer REST
for a one-off action. Broadcasts `conversation:closed` to the visitor's
own conversation room (Sprint 2 fix — previously this REST path never
notified the visitor's client at all, only the socket-triggered
`chat:close` did).

## PATCH /api/v1/conversations/:id/status

New in Sprint 2. Request body: `{ "status": "RESOLVED" }`. Validated
against the same transition map as the model
(`WAITING→ESCALATED|CLOSED`, `ESCALATED→ACTIVE|CLOSED`,
`ACTIVE→RESOLVED|CLOSED|ESCALATED`, `RESOLVED→ACTIVE|CLOSED`,
`CLOSED→ARCHIVED`, `ARCHIVED→CLOSED`). `WAITING→CLOSED` was added in
Sprint 6 for visitor-initiated End Chat on a never-claimed conversation;
`ESCALATED` itself was added in the Executive Handoff Redesign, and
`ACTIVE→ESCALATED` was added for Transfer (same redesign) — see
`docs/DATABASE.md` §8. Errors: `400` for an invalid
transition, `403` if the caller isn't the assigned executive (or Admin).
Records a `STATUS_CHANGED` entry in the conversation's audit trail and
notifies the `executives` room (`notification:new`, type
`CONVERSATION_STATUS_CHANGED`). Note: the dedicated `chat:transfer`
socket event (`docs/SOCKET_EVENTS.md`) is the intended path for an
executive-initiated transfer — it also decrements `currentChats` and
re-broadcasts `CONVERSATION_ESCALATED` for the queue, neither of which
this generic status-PATCH route does.

## PATCH /api/v1/conversations/:id/assign

New in Sprint 2 — reassign a conversation to a different executive.
**Admin-only**, enforced inside the service (not a separate route
permission) — same pattern as Lead's `ARCHIVED` entry/exit. Request
body: `{ "assignedExecutiveId": "..." }`. Records a `REASSIGNED` audit
entry and notifies the `executives` room (type `CONVERSATION_REASSIGNED`).

## POST /api/v1/conversations/:id/archive

New in Sprint 2. **Admin-only.** Only reachable from `CLOSED`. Sets
`status: ARCHIVED`, stamps `archivedAt`, records an `ARCHIVED` audit
entry, notifies the `executives` room. Errors: `403` for a non-admin,
`400` if the conversation isn't currently `CLOSED`.

## POST /api/v1/conversations/:id/restore

New in Sprint 2. **Admin-only.** The inverse of archive — only reachable
from `ARCHIVED`, returns the conversation to `CLOSED`. Records a
`RESTORED` audit entry.

## GET /api/v1/conversations/:id/audit

New in Sprint 2. Returns the conversation's full assignment/status
history — `data.audit` is an array of
`{ action, performedBy, details, createdAt }`, oldest first. Same
immutable-log pattern as `GET /tickets/:id/audit`.

## POST /api/v1/conversations/:id/summary

Generates a new AI summary of the conversation (`AI Summary`,
`EXECUTIVE_DASHBOARD.md` §10-11) and stores it in
`conversation_summaries`. Calls the AI Engine (Phase 7) with a dedicated
summary prompt (`modules/ai/prompts/templates/summary.md`), asking for
strict JSON; falls back to storing the raw response as plain `summary`
text if the model doesn't return valid JSON (still stored, never crashes).
This is executive-triggered (a "Generate Summary" button), not automatic —
there's no AI handoff event to trigger it automatically yet.

Success `201`

```json
{
  "success": true,
  "message": "Conversation summary generated.",
  "data": {
    "summary": {
      "conversationId": "...",
      "summary": "The visitor asked about business hours and pricing...",
      "visitorIntent": "Pricing inquiry",
      "sentiment": "NEUTRAL",
      "outcome": "Unresolved — awaiting executive reply",
      "followUpRecommendation": "Share the pricing page and confirm budget.",
      "generatedAt": "2026-07-04T10:00:00.000Z"
    }
  }
}
```

Errors: `400` if the conversation has no messages yet; `502` if the AI
provider returns an empty response.

## GET /api/v1/conversations/:id/summary

Returns the most recently generated summary. Errors: `404` if none has
been generated yet.

---

# 10. Executives

Owned by the new `executive` module (`backend/src/modules/executive/`) —
Executive Profiles, Availability, and Presence (`ARCHITECTURE.md`'s
Executive module ownership). All routes require
`Authorization: Bearer <accessToken>`; no specific permission beyond being
authenticated (an Executive/Admin viewing/updating their own availability,
or browsing colleague availability, doesn't need a separate grant).

An `Executive` profile document is created automatically, on demand, the
first time a user reaches any of these routes or connects a socket
(`executiveService.getOrCreateForUser`). Admin-only Executive Management
routes (create/update/activate/deactivate/reset-password) were added in
Phase 11 — see below.

## GET /api/v1/executives/me

Returns (and lazily creates) the caller's own executive profile, alongside
their `user` object (from `req.user`, already available post-`authenticate`).

Success `200`

```json
{
  "success": true,
  "message": "Executive profile retrieved.",
  "data": {
    "executive": {
      "userId": "...",
      "department": null,
      "skills": [],
      "status": "OFFLINE",
      "maxChats": 5,
      "currentChats": 0,
      "socketId": null,
      "lastSeen": null
    },
    "user": { "id": "...", "name": "...", "email": "...", "role": "EXECUTIVE" }
  }
}
```

## PATCH /api/v1/executives/me/status

Updates the caller's own availability (`ONLINE`/`OFFLINE`/`BUSY`/`AWAY`/
`BREAK` — `DATABASE.md` §10, `EXECUTIVE_DASHBOARD.md` §7). Note: connecting
a socket already sets `ONLINE` automatically and disconnecting sets
`OFFLINE` (`docs/SOCKET_EVENTS.md` §11) — this endpoint is for the other
three statuses, or for explicitly going offline/online without touching
the socket connection.

Request body: `{ "status": "BUSY" }`.

## GET /api/v1/executives

Query params: `status`, `page`, `limit`. Team availability list — "Monitor
assigned workload" (`EXECUTIVE_DASHBOARD.md` §1) needs to see colleagues'
status/`currentChats`, not just one's own. Since Phase 11, each item's
`userId` is populated (`name`, `email`, `role`, `status`, `isActive`,
`lastLogin`) rather than a bare ObjectId — the Executive Management admin
table (`ADMIN_PANEL.md` §11) needs this in one call.

### Executive Management (Phase 11, admin-only)

The following require `Authorization: Bearer <accessToken>` for an
`ADMIN` (`requirePermission(MANAGE_EXECUTIVES)` — `403` for an
`EXECUTIVE`). Distinct from the self-service routes above.

## POST /api/v1/executives

Creates a new executive: a `users` document (`role: EXECUTIVE`,
password hashed) and its linked `executives` profile, in one call.

Request body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "TempPass123!",
  "department": "Support",
  "maxChats": 5
}
```

Success `201` — `data.executive` (the profile; `userId` is a bare id
here, not populated).

Errors: `400` validation; `409` if the email is already in use.

## PATCH /api/v1/executives/:id

Updates `department`/`maxChats` on the executive profile identified by
its own `_id` (not the linked user's id). Request body: either/both of
`{ "department": "...", "maxChats": 10 }`.

## PATCH /api/v1/executives/:id/activate

## PATCH /api/v1/executives/:id/deactivate

Toggles the linked user's `isActive` (`DATABASE.md` §5/§12's `ACTIVE`/
`INACTIVE`/`LOCKED` status is separate and untouched — this only flips
the boolean). A deactivated executive's next login attempt (and any
in-flight refresh) fails with the existing `403` "Account is not active"
response (`AUTHENTICATION.md`'s `isAccountUsable` check) — deactivating
does not forcibly disconnect an already-open session/socket (same
long-standing gap as logout, §4).

## POST /api/v1/executives/:id/reset-password

Sets a new password (admin-supplied, not generated) and invalidates the
executive's current refresh session, forcing re-login. Request body:
`{ "password": "NewPass456!" }`.

---

# 11. Prompts

Owned by the `ai` module (Prompt Management, `ADMIN_PANEL.md` §8).
Admin-only (`requirePermission(CONFIGURE_AI)`, same permission as
Settings' AI routes below — both are "AI configuration" in
`FOLDER_STRUCTURE.md`'s module ownership sense). Six fixed prompt
`type`s: `SYSTEM`, `DEVELOPER`, `LEAD`, `SUMMARY`, `ESCALATION`,
`FALLBACK` (`DATABASE.md` §16b) — there's no create/delete, only
edit-in-place per type, since these are fixed slots, not an open
collection like Knowledge.

## GET /api/v1/prompts

Lists all six (lazily seeded on first access — see `DATABASE.md` §16b).

## GET /api/v1/prompts/:type

## PATCH /api/v1/prompts/:type

Request body: `{ "content": "..." }`. Snapshots the current version to
`prompt_versions` first if the prompt is currently `PUBLISHED` (same
edit-while-published versioning `knowledgeService.update` established in
Phase 6), then bumps `version`.

## POST /api/v1/prompts/:type/publish

Marks the prompt `PUBLISHED`. Once published, `promptBuilder`/
`summaryService` use its content instead of the file-based default on
their next call — no restart needed.

## GET /api/v1/prompts/:type/versions

## POST /api/v1/prompts/:type/versions/:version/restore

"Rollback" — restores a prior version's content as a new version (same
"restore snapshots forward" semantics as
`POST /knowledge/:id/versions/:version/restore`, §7).

---

# 12. Settings

Owned by the new `settings` module (`backend/src/modules/settings/`) —
AI Configuration and Widget Configuration (`ADMIN_PANEL.md` §9-10,
`FOLDER_STRUCTURE.md`'s `settings` module ownership). Both are
singleton documents (`DATABASE.md` §14) — no collection of many, no
create/delete, just get/update.

## GET /api/v1/settings/widget

**Public — no authentication.** The anonymous Chat Widget (Phase 9)
fetches this before a visitor session even exists, so it cannot sit
behind `authenticate`.

## PATCH /api/v1/settings/widget

Admin-only (`requirePermission(MANAGE_WIDGET_SETTINGS)`). Request body:
any subset of `brandLogoUrl`, `primaryColor`, `theme`, `position`,
`welcomeMessage`, `suggestedQuestions`, `offlineMessage`,
`featureToggles` (a partial object — only the provided toggle keys are
merged in, others are left as-is).

## GET /api/v1/settings/ai

## PATCH /api/v1/settings/ai

Both admin-only (`requirePermission(CONFIGURE_AI)`). Request body for
the `PATCH`: any subset of `provider`, `model`, `temperature`,
`maxTokens`, `responseLength`, `confidenceThreshold`, `escalationRules`.
Only `provider`/`model`/`temperature`/`maxTokens` are actually consumed
right now (by `aiEngine.generateResponse`) — see `DATABASE.md` §14 for
which fields are stored-but-not-yet-consumed and why.

---

# 13. Admin Dashboard

Owned by the new, deliberately minimal `admin` module
(`backend/src/modules/admin/`) — just this one aggregation endpoint.
Executive Management (§10) and Knowledge Management (§7) already had a
natural home in their own modules; this is the one piece of the Admin
Portal with no single owning module (`ADMIN_PANEL.md` §6).

## GET /api/v1/admin/dashboard/metrics

Admin-only (`requirePermission(VIEW_DASHBOARD)`).

Success `200`

```json
{
  "success": true,
  "message": "Dashboard metrics retrieved.",
  "data": {
    "metrics": {
      "activeVisitors": 4,
      "activeConversations": 3,
      "waitingChats": 1,
      "onlineExecutives": 2,
      "averageResponseTimeSeconds": 42,
      "openTickets": 7,
      "todaysLeads": 2,
      "aiResolutionRate": null
    }
  }
}
```

`openTickets` (`ticketService.countOpen` — not `isDeleted` and not
`CLOSED`) and `todaysLeads` (`leadService.countCreatedToday` — created
since local midnight) were wired to real counts once the Ticket (Phase 12) and Lead (Phase 13) modules existed to compute them; both were
`null` in this doc before then. `aiResolutionRate` remains `null`, not
`0` — there's no resolution-tracking concept anywhere (no signal exists
for "the AI resolved this without a handoff"), so there's no data to be
zero _of_; the frontend renders "N/A" for a `null` metric rather than a
misleading real-looking number. `averageResponseTimeSeconds` is also
`null` until at least one conversation has both a visitor message and a
subsequent executive reply (`messageService.getAverageFirstResponseSeconds`,
capped to the 200 most recent conversations).

This endpoint is polled by the frontend (no dedicated Socket.io event) —
see `docs/SOCKET_EVENTS.md`'s Not Yet Implemented note on "Dashboard
Metrics" real-time updates (`ADMIN_PANEL.md` §21 lists it, deliberately
not built this phase to keep scope bounded).

---

# 14. Tickets

Owned by the new `ticket` module (`backend/src/modules/ticket/`).
Requires `Authorization: Bearer <accessToken>` and
`requirePermission(MANAGE_TICKETS)` (both `ADMIN` and `EXECUTIVE` have
it) for every route; two routes additionally require `ADMIN` (noted
below). There is no visitor-facing ticket-creation endpoint — tickets are
created by an authenticated Executive/Admin (`source` records who/what
originated the need for one: `AI`, `EXECUTIVE`, `ADMINISTRATOR`, or
`VISITOR_REQUEST` for a visitor's request relayed by staff).

Authorization scoping (`TICKET_SYSTEM.md` §21): an `EXECUTIVE`'s
`GET /tickets` and `GET /tickets/:id` are silently scoped to tickets
`assignedExecutiveId` matches their own user id — passing a different
`assignedExecutiveId` filter is ignored, not honored, and a direct
`GET /tickets/:id` for someone else's ticket is a `403`, not a `404`
(so as not to accidentally suggest the id doesn't exist). `ADMIN` sees
everything.

## POST /api/v1/tickets

Request body

```json
{
  "subject": "Cannot access my account",
  "description": "Visitor locked out after password change.",
  "category": "TECHNICAL",
  "priority": "HIGH",
  "source": "ADMINISTRATOR",
  "conversationId": null,
  "visitorId": null
}
```

`category` defaults `GENERAL`, `priority` defaults `MEDIUM`, `status`
always starts `OPEN`. Success `201` — `data.ticket`, with a generated
`ticketNumber` (`TKT-000001`, sequential).

If `conversationId` is provided, Sprint 2 (Conversation Lifecycle
Redesign) added a check that it references a real, existing conversation
— errors `404` otherwise, instead of silently storing a dangling
reference. Ticket creation never creates or mutates a conversation; it
only ever references one that already exists.

**Conversation Lifecycle Sprint:** a `source: "AI"` ticket can also be
created automatically, without going through this endpoint at all —
`ticketService.createFromAiEscalation()` is called internally from the
`chat:message` socket handler when the AI reply pipeline falls back
(couldn't answer) or the visitor asks for a human. It bypasses this
route/validator entirely (it isn't an HTTP request), sets
`createdBy: null` (no human creator), and — since the Executive Handoff
Redesign — always creates the ticket `OPEN`/unassigned, exactly like a
manually-created one. There is no assignee at creation time; an
executive only becomes associated with the conversation once they win
the first-to-claim race via `chat:join` (see §9 and
`docs/SOCKET_EVENTS.md`).

## GET /api/v1/tickets

Query params: `status`, `priority`, `category`, `assignedExecutiveId`,
`visitorId`, `ticketNumber`, `from`/`to` (ISO date range on
`createdAt`), `includeDeleted`, `page`, `limit`.

## GET /api/v1/tickets/:id

## PATCH /api/v1/tickets/:id

Edits `subject`/`description`/`category`/`priority` (any subset). Does
**not** change `status` or `assignedExecutiveId` — use the two
dedicated routes below, both of which have side effects (validation,
audit, notifications) that a generic field patch shouldn't silently
trigger.

## PATCH /api/v1/tickets/:id/status

Request body: `{ "status": "IN_PROGRESS" }`. Validated against
`VALID_STATUS_TRANSITIONS` (`DATABASE.md` §11) — Errors: `400` if the
transition isn't allowed from the ticket's current status (e.g.
`ASSIGNED → RESOLVED` directly is rejected; must pass through
`IN_PROGRESS` first).

## PATCH /api/v1/tickets/:id/assign

Request body: `{ "assignedExecutiveId": "<userId>" }`. Assigning an
`OPEN` or `REOPENED` ticket auto-transitions it to `ASSIGNED` (the
natural side effect of a first assignment); reassigning an
already-in-progress ticket leaves its status untouched. Errors: `404`
if `assignedExecutiveId` has no Executive profile.

## GET /api/v1/tickets/:id/notes

## POST /api/v1/tickets/:id/notes

Request body: `{ "content": "Called visitor, awaiting callback." }`.
Internal notes only — `TICKET_SYSTEM.md` §14; there is no visitor-facing
route that could ever expose these.

## GET /api/v1/tickets/:id/audit

Full, immutable action history — every create/assign/reassign/status
change/note/update/delete/restore, each with `performedBy` and a
`details` object (e.g. `{ from, to }` for a status change).

## GET /api/v1/tickets/:id/context

Aggregates cross-module data on demand — `TICKET_SYSTEM.md` §15:
"Every ticket should reference Original Conversation, AI Summary,
Conversation Transcript, Visitor Information. This prevents duplicate
information." Nothing is copied onto the ticket document itself.

Success `200`

```json
{
  "success": true,
  "message": "Ticket context retrieved.",
  "data": {
    "context": {
      "conversation": { "...": "..." },
      "messages": [{ "...": "..." }],
      "summary": { "...": "..." },
      "visitor": { "...": "..." }
    }
  }
}
```

Any field is `null`/`[]` if the ticket has no `conversationId`/
`visitorId`, or if nothing exists yet for it (e.g. `summary` is `null`
until an executive generates one for that conversation, §9).

## DELETE /api/v1/tickets/:id

**Admin-only** (`requireRole(ADMIN)`, in addition to `MANAGE_TICKETS`).
Soft delete (`TICKET_SYSTEM.md` §13) — sets `isDeleted`/`deletedAt`;
excluded from `GET /tickets` by default (`includeDeleted=true` to see
deleted tickets alongside active ones).

## POST /api/v1/tickets/:id/restore

**Admin-only.** Clears `isDeleted`/`deletedAt`.

All ticket mutations broadcast a `notification:new` event to the
`executives` room (`docs/SOCKET_EVENTS.md` §12) — `TICKET_CREATED`,
`TICKET_ASSIGNED`, `TICKET_REASSIGNED`, `TICKET_STATUS_CHANGED`,
`TICKET_CLOSED`, `TICKET_REOPENED`, `TICKET_NOTE_ADDED` — reusing the
existing event/room rather than adding new socket infrastructure, same
as Phase 10's conversation notifications.

---

# 15. Leads

Owned by the new `lead` module (`backend/src/modules/lead/`).
Requires `Authorization: Bearer <accessToken>` and
`requirePermission(MANAGE_LEADS)` (both `ADMIN` and `EXECUTIVE` have it)
for every route. Authorization scoping is identical to Tickets
(`TICKET_SYSTEM.md`/`LEAD_MANAGEMENT.md` §20-21): an `EXECUTIVE`'s
`GET /leads` and `GET /leads/:id` are scoped to leads
`assignedExecutiveId` matches their own user id; a direct
`GET /leads/:id` for someone else's lead is a `403`.

## POST /api/v1/leads/detect

AI Lead Detection (`LEAD_MANAGEMENT.md` §7, §10). Request body:
`{ "conversationId": "..." }`. Analyzes the conversation transcript and
returns a _suggestion_ — nothing is persisted by this call; the
executive reviews it and calls `POST /leads` themselves to actually keep
it (`LEAD_MANAGEMENT.md` §22: "Executives remain responsible for final
qualification").

Success `200`

```json
{
  "success": true,
  "message": "Lead detection completed.",
  "data": {
    "suggestion": {
      "isQualifiedLead": true,
      "leadScore": "HOT",
      "confidenceLevel": "HIGH",
      "extractedInfo": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": null,
        "company": "Acme Corp"
      },
      "interestedServices": ["Consulting"],
      "reasoning": "Visitor requested pricing and shared contact details."
    }
  }
}
```

Errors: `400` if the conversation has no messages; `503` if the AI
provider isn't configured (no `GROQ_API_KEY`) — same graceful-failure
behavior as every other AI-consuming endpoint in this project.

## POST /api/v1/leads

Request body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": null,
  "company": "Acme Corp",
  "interestedServices": ["Consulting"],
  "leadScore": "HOT",
  "source": "AI_CONVERSATION",
  "conversationId": "...",
  "visitorId": "..."
}
```

`source` is required (`AI_CONVERSATION` | `EXECUTIVE` | `ADMINISTRATOR`
— `LEAD_MANAGEMENT.md` §5 also lists "Website Form" and "API
Integration" as Future, not modeled). Success `201` — `data.lead`.

## GET /api/v1/leads

Query params: `status`, `leadScore`, `assignedExecutiveId`, `page`,
`limit`. No date-range/interested-service/name/email filters — full
`Search & Filters` (`LEAD_MANAGEMENT.md` §16) wasn't in this phase's
explicit scope (see §19 Not Yet Implemented).

## GET /api/v1/leads/:id

## PATCH /api/v1/leads/:id

Edits `name`/`email`/`phone`/`company`/`interestedServices`/`notes`/
`leadScore` (any subset). Does not change `status` or
`assignedExecutiveId` — same separation of concerns as Tickets §14.

## PATCH /api/v1/leads/:id/status

Request body: `{ "status": "QUALIFIED" }`. Validated against
`VALID_STATUS_TRANSITIONS` (`DATABASE.md` §12). Entering or leaving
`ARCHIVED` requires `ADMIN` — Errors: `403` for an `EXECUTIVE` attempting
to archive or restore (`LEAD_MANAGEMENT.md` §13); `400` for any other
invalid transition.

## PATCH /api/v1/leads/:id/assign

Request body: `{ "assignedExecutiveId": "<userId>" }`. Assigning a `NEW`
lead auto-transitions it to `ASSIGNED`. Errors: `404` if
`assignedExecutiveId` has no Executive profile.

## POST /api/v1/leads/:id/summary

AI Qualification Summary (`LEAD_MANAGEMENT.md` §11) — generates
`summary`/`visitorIntent`/`interestedServices`/`recommendedFollowUp`/
`confidenceLevel` from the lead's linked conversation and stores it on
the lead's `aiSummary`. On-demand only, like Phase 10's conversation
summaries. Errors: `400` if the lead has no `conversationId`; `503` if
the AI provider isn't configured.

## PATCH /api/v1/leads/:id/follow-up

Request body: any subset of `{ "scheduledAt": "2026-07-10T15:00:00.000Z", "notes": "...", "outcome": "..." }`.
Scheduling a follow-up on a `CONTACTED` lead auto-transitions it to
`FOLLOW_UP`.

## POST /api/v1/leads/:id/convert

Request body: `{ "ticketId": "..." }` (optional). Marks the lead
`CONVERTED`, stamps `convertedAt`, and links `convertedToTicketId` if a
ticket id was provided — converting doesn't require creating a ticket.
Errors: `400` if `CONVERTED` isn't a valid transition from the lead's
current status; `404` if `ticketId` doesn't refer to a real ticket.

## POST /api/v1/leads/:id/lost

Request body: `{ "reason": "..." }` (optional). Marks the lead `LOST`,
stamps `lostAt`/`lostReason`.

## GET /api/v1/leads/:id/context

Same pattern as the Ticket module's context endpoint (§14) —
`LEAD_MANAGEMENT.md` §15: "Every lead should reference Conversation ID,
AI Summary, Conversation Transcript, Ticket (if created)." The AI
Summary is already on the lead document itself (`aiSummary`); this
endpoint aggregates the rest on demand: `conversation`, `messages`
(transcript), and `ticket` (if `convertedToTicketId` is set).

All lead mutations broadcast a `notification:new` event to the
`executives` room — `LEAD_CREATED`, `LEAD_ASSIGNED`, `LEAD_UPDATED`
(covers status changes, edits, and mark-lost), `LEAD_CONVERTED`,
`FOLLOW_UP_SCHEDULED` — same reused event/room as Tickets. There is no
proactive "Follow-up Due" notification (`LEAD_MANAGEMENT.md` §17) — that
would need a scheduler/cron, which doesn't exist in this project; only
directly-triggered events are covered.

---

# 16. Business Hours

Owned by the `settings` module (`backend/src/modules/settings/`,
alongside AI Settings and Widget Settings — `FOLDER_STRUCTURE.md`'s
`settings` module explicitly lists "Business hours"). Two routes are
public (no `authenticate`) since the anonymous Chat Widget needs them
before a visitor session exists; the rest require
`requirePermission(MANAGE_BUSINESS_HOURS)` (`ADMIN`-only, unlike Tickets/
Leads — `BUSINESS_HOURS.md` §19: "Only administrators may modify").

## GET /api/v1/business-hours/status

**Public.** The core Availability Service computation
(`BUSINESS_HOURS.md` §7, §10) — recalculated on every call from the
stored config, not cached (a singleton-document lookup is already
cheap; see `DATABASE.md` §15).

Success `200`

```json
{
  "success": true,
  "message": "Business status retrieved.",
  "data": {
    "status": {
      "status": "OPEN",
      "timezone": "Australia/Melbourne",
      "closesAt": "17:30"
    }
  }
}
```

`status` is one of `OPEN`/`CLOSED`/`OPENING_SOON`/`CLOSING_SOON`/
`HOLIDAY` (the last one also includes `holiday`, the matching holiday's
name — holidays override the weekly schedule, §8).
`OPENING_SOON`/`CLOSING_SOON` trigger within 30 minutes of the
open/close boundary. `opensAt`/`closesAt` are `"HH:MM"` in the
configured timezone, not UTC instants.

## GET /api/v1/business-hours/callback-availability

**Public.** `BUSINESS_HOURS.md` §11: "Callbacks should be scheduled
within future business hours." Query params:

- `proposedAt` (ISO datetime) — validates that exact instant against
  the schedule (future, not a holiday, within an enabled day's
  open/close window). Returns `{ "isAvailable": true }` or
  `{ "isAvailable": false, "reason": "..." }`.
- `count` (default 5, max 20) — with no `proposedAt`, returns the next
  `count` upcoming open windows instead, as real UTC instants (so the
  frontend can render them in the visitor's own local time), searching
  up to 14 days ahead and skipping holidays and disabled days.

Success `200` (slot-suggestion form)

```json
{
  "success": true,
  "message": "Callback availability retrieved.",
  "data": {
    "availability": {
      "slots": [
        {
          "date": "2026-07-06",
          "opensAt": "2026-07-05T23:00:00.000Z",
          "closesAt": "2026-07-06T07:30:00.000Z"
        }
      ]
    }
  }
}
```

There is no visitor-facing "submit a callback request" endpoint — this
is the _availability_ check/suggestion only (matching this phase's
explicit scope, "Callback Availability," not "Callback Requests");
submitting one would require a new visitor-facing write path into Lead
or Ticket, which Phase 13 explicitly deferred (see its Known Issues).

## GET /api/v1/business-hours

Full config (`timezone`, `weeklySchedule`, `holidays`). Any authenticated
user (`ADMIN` or `EXECUTIVE`) — `BUSINESS_HOURS.md` §19: "Read access is
available to all business modules."

## PATCH /api/v1/business-hours

Admin-only. Request body: any subset of `{ "timezone": "...",
"weeklySchedule": [ ...all 7 days... ] }` — `weeklySchedule`, if
provided, must include exactly one entry per day (partial-day updates
aren't supported; edit the whole week at once). Errors: `400` if
`timezone` isn't a recognized IANA zone, or if any enabled day's `open`
isn't strictly before its `close` (`BUSINESS_HOURS.md` §18).

## POST /api/v1/business-hours/holidays

Admin-only. Request body: `{ "name": "Christmas", "date": "2026-12-25", "type": "PUBLIC" }`
(`type` defaults `PUBLIC`). Success `201`. Errors: `400` for an invalid
`YYYY-MM-DD` date.

## DELETE /api/v1/business-hours/holidays/:holidayId

Admin-only. Removes one holiday by its own `_id` (visible in the
`holidays` array from `GET /business-hours`).

---

# 17. Analytics

Owned by the new `analytics` module (`backend/src/modules/analytics/`).
Implements Event Collection, Dashboard APIs, Metrics, Reports, and
Aggregations (`ANALYTICS.md`'s explicit task list) — Charts, Export, and
Real-Time Updates (`ANALYTICS.md` §15-17) were not requested and are not
built (see §19 below). "Reports" is not a separate concept from
"Metrics" here — every domain endpoint below accepts the same
`range`/`from`/`to` query params (`ANALYTICS.md` §14's Time-Based
Reports), so date-range filtering _is_ the Reports feature, layered on
top of each Metrics domain rather than duplicated as its own surface.

All metrics endpoints require `authenticate` + `requirePermission(VIEW_
ANALYTICS)` (`ADMIN`-only) **except** `GET /analytics/executives`, which
only requires `authenticate` — an `EXECUTIVE` caller is force-scoped to
their own id server-side regardless of any `executiveUserId` query
param, mirroring Tickets'/Leads' `assertAccessible` pattern
(`ANALYTICS.md` §18: "Executives: View personal analytics only").
`POST /analytics/events` is public (no `authenticate`) — the Chat
Widget is anonymous and has no other way to report its own usage.

Query params shared by every metrics endpoint below:

- `range` — one of `TODAY` / `YESTERDAY` / `LAST_7_DAYS` / `LAST_30_DAYS`
  / `THIS_MONTH` / `CUSTOM`. Omit for `TODAY`.
- `from` / `to` (ISO datetime) — required together when `range=CUSTOM`;
  ignored otherwise.

## GET /api/v1/analytics/dashboard

`ANALYTICS.md` §5's live, current-state KPIs — no date range (always
"right now"). Deliberately sourced the same way as the Phase 11 Admin
Dashboard (direct repository counts, not the `analytics_events`
aggregate) — see `IMPLEMENTATION_STATUS.md`'s Architecture Decisions for
why the two weren't unified.

Success `200`

```json
{
  "success": true,
  "message": "Dashboard metrics retrieved.",
  "data": {
    "metrics": {
      "activeVisitors": 8,
      "activeConversations": 1,
      "waitingConversations": 7,
      "onlineExecutives": 0,
      "openTickets": 0,
      "newLeads": 0,
      "aiResolutionRate": null,
      "averageResponseTimeSeconds": 11
    }
  }
}
```

## GET /api/v1/analytics/conversations

`ANALYTICS.md` §6. Response `data.metrics`: `range`,
`conversationsStarted`, `conversationsCompleted`, `activeConversations`
(a live snapshot, not range-scoped), `averageConversationDurationSeconds`
(null if nothing ended in range), `averageMessagesPerConversation`,
`conversationsByDay` (`[{ date, count }]`), `conversationsByHour`
(`[{ hour, count }]`, 0-23).

## GET /api/v1/analytics/ai

`ANALYTICS.md` §7. Response `data.metrics`: `range`, `aiResponses`
(real — a count of `AI`-sender messages; the live AI reply pipeline —
`chatReplyService`, wired into `chat:message` for any conversation not
yet claimed by an executive — now generates these, so this is no longer
always 0), `aiResolutionRate` (`null`, no resolution-tracking concept),
`humanHandoffs` (real — every executive claim of a `WAITING`
conversation currently counts, since there's no AI-first triage stage to
hand off from), `aiConfidence` / `failedResponses` / `fallbackResponses`
(all `null` — no data source exists anywhere for these; a provider
failure falls back to a graceful message but isn't flagged/counted
anywhere), `averageResponseTimeSeconds`.

## GET /api/v1/analytics/executives

`ANALYTICS.md` §8. Extra query param: `executiveUserId` (ignored for an
`EXECUTIVE` caller, who is always scoped to themselves). Response
`data.metrics`: `range`, `executiveUserId` (`null` for an Admin's
merged, all-executives view), `assignedConversations`,
`resolvedConversations`, `averageResponseTimeSeconds` (`null` — no
per-executive first-response tracking exists), `averageResolutionTimeSeconds`,
`activeTime` (`null` — no active-time tracking exists), `ticketCount`
(`null` in the merged all-executives view).

## GET /api/v1/analytics/leads

`ANALYTICS.md` §9. Response `data.metrics`: `range`, `totalLeads`,
`qualifiedLeads`, `convertedLeads`, `lostLeads`, `conversionRate`
(percentage, one decimal, `null` if `totalLeads` is 0), `leadSources`
(`[{ key, count }]`, grouped by `source`), `leadScoreDistribution`
(grouped by `leadScore`).

## GET /api/v1/analytics/tickets

`ANALYTICS.md` §10. Response `data.metrics`: `range`, `openTickets`,
`closedTickets`, `resolutionTimeSeconds` (average, from each
`TICKET_CLOSED` event's own recorded duration), `reopenedTickets`,
`ticketCategories` / `ticketPriorities` (`[{ key, count }]`
distributions).

## GET /api/v1/analytics/visitors

`ANALYTICS.md` §11. Response `data.metrics`: `range`, `uniqueVisitors`
(distinct visitors with a session started in range), `newVisitors`
(Visitor documents created in range), `returningVisitors` (a visitor
whose account predates the range but started a session within it),
`deviceType` / `browser` (`[{ key, count }]`, classified from each
session's stored `userAgent` via a small built-in regex classifier — no
new parsing dependency), `language` (grouped by the visitor's own
`preferredLanguage` field — the closest real field to a detected
browser language; no user-agent-based language detection exists).
Geographic Distribution (`ANALYTICS.md` §11) is explicitly "(Future)" in
the source doc and not built.

## GET /api/v1/analytics/widget

`ANALYTICS.md` §12. Response `data.metrics`: `range`, `widgetOpens`,
`widgetCloses`, `suggestedQuestionUsage`, `quickReplyUsage` (all four
sourced from client-reported events via `POST /analytics/events`),
`messagesSent` (real — visitor-sender message count, sourced from the
`messages` collection), `averageSessionDurationSeconds` (`null` — opens
and closes aren't correlated by a shared session id, so a real duration
can't be computed from the data collected).

## GET /api/v1/analytics/business-hours

`ANALYTICS.md` §13. Response `data.metrics`: `range`,
`chatsDuringBusinessHours` / `chatsOutsideBusinessHours` (each real
`CONVERSATION_STARTED` event's timestamp classified against the
configured Business Hours schedule, reusing Phase 14's
`businessHoursService.computeStatus`), `callbackRequests` (always `0` —
no visitor-facing callback-request submission endpoint exists, see
`BUSINESS_HOURS.md`'s Not Yet Implemented notes), `ticketsCreatedAfterHours`
(same classification applied to `TICKET_CREATED` events).

## POST /api/v1/analytics/events

**Public.** Request body: `{ "type": "WIDGET_OPENED", "payload": {} }`.
`type` must be one of `WIDGET_OPENED` / `WIDGET_CLOSED` /
`SUGGESTED_QUESTION_USED` / `QUICK_REPLY_USED` — every other event type
is recorded server-side only, as a side effect of an authenticated/
internal operation, and this endpoint rejects them with `400` rather
than accepting arbitrary client-asserted events. `payload` is an
optional object (max 10 keys). Recording never blocks or fails the
caller's own action — a database error here is only logged, never
thrown — so this endpoint always responds `202 Accepted` once
validation passes.

---

# 18. RAG (Retrieval-Augmented Generation)

No new REST endpoints — Phase 16's five task items (Embedding Service,
Vector Store Integration, Retriever, Context Ranking, Hybrid Search) are
entirely internal to the `knowledge` module and the AI Engine, per
`RAG.md` §25: "RAG should be introduced by replacing the Retrieval
Engine, not redesigning the application." The only externally-visible
change is behavioral: the AI Engine's Context Builder now retrieves
knowledge through a ranked hybrid search instead of a plain category/
keyword filter, whenever a chat response is generated (`summaryService`/
`leadAiService`, the two places `aiEngine.generateResponse` is actually
invoked today — see `IMPLEMENTATION_STATUS.md`'s Known Issues for why
there's still no live in-conversation AI reply to retrieve for).

Pipeline (all inside `backend/src/modules/knowledge/`):

- **Embedding Service** (`service/embeddingService.js`) — chunks a
  document's flattened content into 500-word chunks (75-word overlap,
  `RAG.md` §10-11) and generates a 256-dimension "hashing trick" vector
  per chunk (no ML embedding model/API is available or configured
  anywhere in this project — see `DATABASE.md`'s Knowledge Embeddings
  section for why).
- **Vector Store Integration** (`model/knowledgeEmbeddingModel.js`,
  `repository/knowledgeEmbeddingRepository.js`,
  `service/knowledgeEmbeddingService.js`) — the `knowledge_embeddings`
  collection; embeddings are (re)generated whenever a document is
  published, an already-published document is edited or restored to a
  prior version, and removed entirely when a document is archived
  (`RAG.md` §7, §19, §25). Generation is fire-and-forget, never awaited
  by the triggering request.
- **Retriever** + **Hybrid Search** + **Context Ranking**
  (`service/retrieverService.js`) — one file, three clearly-separated
  steps: fetch category-pre-filtered candidate chunks (metadata
  filtering), score each by vector cosine-similarity + keyword-overlap
  (Hybrid Search, `RAG.md` §13 Phase 3), then combine those with a
  Freshness factor and select the top-K, one result per parent document
  (Context Ranking, `RAG.md` §14 — Popularity and Business Priority are
  omitted, no data source exists for either).
- **Integration** — `knowledgeService.retrieveForQuery(query, {category,
limit})` is the new single entry point the AI Engine's Context Builder
  calls, replacing its previous direct `knowledgeService.search(...)`
  call; falls back to the original category/keyword search automatically
  if the knowledge base has no embeddings at all yet (e.g. a fresh
  install, or before `npm run reindex:knowledge` has been run once to
  backfill documents published before this phase existed).

A new operational script, `backend/scripts/reindexKnowledgeEmbeddings.js`
(`npm run reindex:knowledge`), regenerates embeddings for every currently
`PUBLISHED` document — a one-time catch-up for pre-Phase-16 knowledge;
new/edited documents auto-embed going forward via the hooks above.

---

# 19. Not Yet Implemented

Documented in other files but not built yet — do not assume these exist:

- Special Hours (`BUSINESS_HOURS.md` §9 — seasonal/event schedules
  distinct from holidays) — not in Phase 14's explicit scope (`Weekly
Schedule, Holidays, Availability Service, Timezone Support, Callback
Availability`).
- AI/Ticket/Lead integration with Business Hours (`BUSINESS_HOURS.md`
  §13, §15, §16 — the AI checking availability before escalating,
  encouraging ticket/callback creation when closed, notifying executives
  when business reopens for after-hours leads) — none of these have a
  trigger to hang off yet: the AI still never participates in
  `chat:message` (a gap noted since Phase 8), and there's no
  scheduler/cron for the "notify when reopened" case. The Availability
  Service itself (status + callback-availability) is fully built and
  ready for a future phase to wire into these flows.
- A visitor-facing "submit a callback request" endpoint — see the note
  under `GET /business-hours/callback-availability` above.
- Executive working hours, department hours, and multiple locations
  (`BUSINESS_HOURS.md` §21) — explicitly "Future" in the source doc; one
  single, company-wide schedule is modeled.
- Calendar sync (Google/Outlook) and automatic holiday import
  (`BUSINESS_HOURS.md` §21) — explicitly "Future."
- AI-generated responses inside a conversation (see `docs/SOCKET_EVENTS.md`
  §5's note) — Phase 8 built persistence/real-time messaging only; wiring
  the AI Engine (Phase 7) into `chat:message` is a distinct future step.
- POST/PATCH conversation-creation endpoints — conversations are only
  created via `chat:join` over the socket, never via REST (§9's REST routes
  are read/close/summary only).
- Department/skill/priority-based queue routing, and SLA/response-time
  metrics (`EXECUTIVE_DASHBOARD.md` §8, §17) — the Executive Handoff
  Redesign's broadcast-and-claim allocation notifies every `ONLINE`
  executive and lets whoever accepts first lock the chat; it is not
  department/skill/priority-aware, and there's no metrics layer yet
  (that's Analytics, explicitly out of scope this phase).
- Visitor-facing ticket creation/viewing — `TICKET_SYSTEM.md` §5 lists
  "Visitor Request" as a ticket source and §21 implies visitors can "view
  only their own tickets," but no visitor-facing ticket endpoint exists;
  a visitor's request is relayed into a ticket by staff (`source:
VISITOR_REQUEST`), not self-served.
- ~~AI Ticket Creation~~ (`TICKET_SYSTEM.md` §11) — **implemented**
  (Executive Handoff Redesign): `ticketService.createFromAiEscalation`
  auto-creates a `source: AI` ticket when the AI can't resolve a query or
  the visitor asks for a human — no visitor confirmation step, since the
  handoff happens directly in the same chat rather than needing a
  separate accept/decline.
- Ticket category/priority configuration (`ADMIN_PANEL.md` §13 —
  "Configure Categories," "Configure Priorities") — both are fixed enums
  (`TICKET_SYSTEM.md` §7-8), not admin-editable, same scope line as
  Knowledge's fixed category list.
- Ticket SLA tracking, export, and Reporting (`TICKET_SYSTEM.md` §19-20)
  — explicitly "Future" in the source doc; Reporting also feeds
  Analytics, out of scope.
- Visitor-facing lead visibility — `LEAD_MANAGEMENT.md` §20: "Visitors
  cannot access leads" (matches; there's no visitor-facing lead endpoint
  at all, nothing to build here beyond confirming the exclusion).
- A dedicated Lead audit-trail collection and full-text/multi-field lead
  search (`LEAD_MANAGEMENT.md` §16, §18) — neither "Audit" nor "Search"
  were in Phase 13's explicit scope (`Lead Detection, Lead CRUD, AI
Summary, Assignment, Follow-up, Conversion`), unlike Phase 12's Ticket
  System which explicitly asked for both.
- Lead scoring rule configuration and Export
  (`LEAD_MANAGEMENT.md` §13's "Administrators can also configure lead
  scoring rules" and "Export Leads") — `leadScore` is a fixed `HOT`/
  `WARM`/`COLD` enum the AI assigns, not an admin-configurable rules
  engine.
- Automated "Follow-up Due" reminders (`LEAD_MANAGEMENT.md` §17) — no
  scheduler/cron infrastructure exists in this project to check for due
  follow-ups and fire a notification; only directly-triggered lead events
  broadcast in real time.
- Lead Analytics/Reporting (`LEAD_MANAGEMENT.md` §19) — feeds the
  Analytics module, explicitly out of scope.
- User Management, Business Settings, Analytics, Audit Logs (the
  system-wide kind — `ADMIN_PANEL.md` §16, not to be confused with the
  Ticket Audit Trail built this phase), System Settings, and Search
  (`ADMIN_PANEL.md` §12-13, §15-16, §18, §20) — none of these were in
  either Phase 11's or Phase 12's explicit scope. "Ticket Management"
  (`ADMIN_PANEL.md` §14) is now mostly covered by the `ticket` module's
  own authorization scoping (Admin sees/assigns/reassigns/deletes/
  restores all tickets, per §21) rather than a separate Admin Portal
  page — Export and Configure Categories/Priorities are the two pieces
  of §14 still not built (see the ticket category/priority bullet
  above).
- Brand logo file upload — `widgetSettings.brandLogoUrl` is a plain URL
  string field; there's no `multer`/file-storage/serving infrastructure
  in this project yet, so an admin pastes a hosted URL rather than
  uploading a file directly.
- Password reset, MFA, OAuth/SSO (`AUTHENTICATION.md` §20 — future).
- True semantic embeddings — Phase 16 built the full RAG pipeline
  (`knowledge_embeddings`, chunking, a Retriever, Hybrid Search, Context
  Ranking, AI Engine integration — see §18), but the embedding vectors
  themselves are a dependency-free "hashing trick" (lexical/token-overlap
  similarity), not a true ML embedding model — no embeddings API is
  configured anywhere in this project (Groq is chat-completion only).
- MongoDB Atlas `$vectorSearch` — this project's self-hosted MongoDB
  Community 7 doesn't support it; similarity is scored in application
  code instead (see §18 and `DATABASE.md`'s Knowledge Embeddings section).
- Re-ranking (`RAG.md` §18 — cross-encoder/LLM re-ranking/business
  rules), Query Expansion (`RAG.md` §6), and Intent Detection feeding the
  Retriever — all explicitly "Future" in the source doc.
- Knowledge search beyond category/keyword/status filtering via the admin
  `GET /knowledge` REST endpoint (`KNOWLEDGE_BASE.md` §11's "Future
  implementation") — that endpoint is unchanged this phase; only the AI
  Engine's own internal retrieval path was upgraded (§18).
- Intent Detection and Confidence Evaluation (see §8) remain unbuilt.
  Conversation Summary generation (§9's `/summary` routes), Lead
  Detection (Phase 13), and Escalation Detection (Executive Handoff
  Redesign — `humanRequestDetector` plus the AI-fallback signal, not a
  full intent classifier) are all now implemented.
- Charts (`ANALYTICS.md` §15 — Line/Bar/Pie/Trend visualizations) — the
  Admin Analytics page renders every metric above as plain numbers/tables,
  no charting library was added. The underlying data (e.g.
  `conversationsByDay`/`conversationsByHour`) is already shaped for a
  future chart to consume directly.
- Export (`ANALYTICS.md` §16 — CSV/Excel/PDF) and Real-Time Updates
  (`ANALYTICS.md` §17 — Socket.io-pushed dashboard changes) — not in
  Phase 15's explicit scope (`Event Collection, Dashboard APIs, Metrics,
Reports, Aggregations`); every analytics endpoint is pull-only REST.
- Data Retention/archival policy (`ANALYTICS.md` §19) — `analytics_events`
  has no TTL index or archival job; every event is kept indefinitely.
- Analytics only reflects activity recorded from Phase 15 onward — the
  `analytics_events` collection didn't exist before this phase, so nothing
  that happened earlier in the project's history appears in any Metrics/
  Reports endpoint (`EXECUTIVE_DASHBOARD.md` §17's performance metrics are
  covered by `GET /analytics/executives` going forward, not retroactively).
