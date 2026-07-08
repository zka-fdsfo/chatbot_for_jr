# Improvement Status

## Purpose

This document is the **single source of truth** for all post-implementation improvements.

The original implementation roadmap (Phase 1–16) has been completed.

All future work including bug fixes, feature enhancements, UI improvements, AI improvements, refactoring, and performance optimization must be tracked here.

Claude must read this document before starting any new improvement task and update it after completing each sprint.

---

# Current Project Status

**Current Stage**

Post-Implementation Improvements

**Current Sprint**

Sprint 2 – Executive Workspace Improvements (partially addressed — see below)

**Overall Progress**

* Initial Implementation (Phase 1–16): ✅ Completed
* Improvement Sprint 1 (Conversation Lifecycle Improvements): ✅ Completed
* Sprint 1 Extension (AI Reply Pipeline, Auto-Escalation, Round-Robin
  Allocation): ✅ Completed
* Improvement Sprint 6 (Chat Widget UI/UX Improvements): ✅ Completed
* Cross-Cutting Bug-List Pass (Embeddable Widget Architecture, Visitor
  Identification, Conversation Visibility for Executive + Admin): ✅
  Completed — see its own Progress section below
* Executive Handoff Redesign (AI-first escalation, human-request
  detection, broadcast-to-all-executives/first-to-claim locking,
  Transfer, refresh-redirect): ✅ Completed — see its own Progress
  section below
* Improvement Sprint 2 (Executive Workspace Improvements): 🟡 Partially
  addressed (Conversation History built; Chat Search/Timeline/richer
  Conversation Management still pending)
* Improvement Sprint 3 (Admin Portal Improvements): 🟡 Partially addressed
  (all-conversations/lead-gen view built; broader Admin Portal work still
  pending)

---

# Improvement Roadmap

| Sprint   | Title                               | Status        |
| -------- | ----------------------------------- | ------------- |
| Sprint 1 | Conversation Lifecycle Improvements | ✅ Completed |
| Sprint 2 | Executive Workspace Improvements    | 🟡 Partial    |
| Sprint 3 | Admin Portal Improvements           | 🟡 Partial    |
| Sprint 4 | Company Knowledge Improvements      | ⏳ Pending     |
| Sprint 5 | AI Improvements                     | ⏳ Pending     |
| Sprint 6 | Chat Widget UI/UX Improvements      | ✅ Completed  |
| Sprint 7 | Analytics Improvements              | ⏳ Pending     |
| Sprint 8 | Code Quality & Technical Debt       | ⏳ Pending     |

*Note: the request that produced this sprint referred to it as "Sprint 2," but its objectives (redesign the conversation lifecycle, ticket/executive-assignment continuity, AI message visibility, status lifecycle, archiving) match this document's own Sprint 1 exactly, not Sprint 2 (Executive Workspace). Completed against Sprint 1, per this document's own numbering — same reconciliation the user confirmed for an earlier phase-numbering mismatch this project hit.*

*A second request, titled "Conversation Lifecycle" rather than a numbered sprint, asked for the full AI-handles-first / auto-escalate-on-failure / round-robin-notify lifecycle described in this document's own Sprint 1 objectives, plus three genuinely new capabilities Sprint 1 never built: a live AI reply, automatic ticket escalation when the AI can't resolve a question, and round-robin executive allocation. Tracked below as "Sprint 1 Extension" rather than a new numbered sprint, since it deepens Sprint 1's own scope rather than starting Sprint 2's (Executive Workspace).*

*A third request arrived as an unstructured bug list (10 items) rather than a sprint reference, reporting (among other things) that the chat still wasn't replying. Investigation found that an earlier, uncommitted pass of Sprint 6 (Chat Widget UI/UX Improvements) and of the AI Reply Pipeline fix had been lost from the working tree (reverted back to an older commit) before this pass began — so item-by-item, the bug list turned out to be a mix of: (a) previously-fixed work that needed rebuilding from scratch, (b) two genuinely new, cross-cutting architecture asks not owned by any single roadmap sprint (an embeddable widget bundle and a separate staff app — closest to Sprint 6, but bigger than "UI/UX"), and (c) one feature each from Sprint 2 (Executive: view full conversation history) and Sprint 3 (Admin: view all conversations for lead generation). Rebuilt Sprint 6 in full (now ✅ Completed again) and added the two new architecture/visibility pieces as their own "Cross-Cutting Bug-List Pass" below, rather than force-fitting ten unrelated bug reports into one sprint label.*

*A fourth request asked for real, non-blind executive handoff: a ticket/claimable conversation should never exist until the AI genuinely can't resolve the query or the visitor explicitly asks for a human, multiple executives should be notified with one of them ending up actually connected (by name) to the visitor, and the AI's own hallucinated "I'll email you a link" reply (a real bug, not a request) needed a hard constraint. Built initially with round-robin allocation (an executive reserved automatically at escalation time). A follow-up request arrived the same day changing this specific allocation requirement — "notify all employees; whoever accepts locks the chat; a Transfer button re-notifies everyone; refreshing redirects an executive back to their locked chat" — a deliberate simplification, not a second bug report, so round-robin was replaced rather than kept alongside it. Tracked below as one combined "Executive Handoff Redesign" section describing the final (broadcast-and-claim) behavior, since the round-robin intermediate step was superseded before this document's own write-up of it was ever committed; the full blow-by-blow of both passes (round-robin, then its replacement) is preserved in `docs/IMPLEMENTATION_STATUS.md`'s Architecture Decisions 102/103.*

---

# Sprint 1 Progress — ✅ Completed 2026-07-07

## Objectives

* Preserve complete conversation history
* Preserve AI conversation after ticket creation
* Executive continues existing conversation
* No duplicate conversations
* Improve visitor identification
* Add End Chat functionality
* Improve session lifecycle
* Improve chat restoration
* Improve conversation persistence

## What this sprint actually found and built

Before writing any code, the current implementation was verified directly
(not assumed from the docs above) via a full read-only Architecture
Review. Three of the sprint's underlying concerns turned out to already
be true by construction:

* A conversation is created only once per open session
  (`getOrCreateActiveForVisitor` finds an existing open one before ever
  creating a new one).
* Ticket/Lead creation never creates or mutates a conversation — only
  ever references one, read-only, via `getContext()`.
* An executive joining an existing conversation reuses it in place
  (`joinAsExecutive`), never spawns a new record.
* No message list anywhere filters by `senderType` — an `AI`-sender
  message (none exist yet, since no live AI-reply pipeline is wired into
  `chat:message`) would already be fully visible wherever messages are
  shown; nothing needed to change to "preserve" it.

What genuinely needed building: a real, transition-validated status
lifecycle (the previous status enum had two dead values, `HANDOFF` and
`RESOLVED`, defined since Phase 8 but never once assigned anywhere), an
audit trail for assignment/status history (none existed at all), an
`ARCHIVED` terminal state, corrected REST access scoping (previously
unscoped by default for non-admins — a real gap, not part of the
original ask but found and fixed as part of "redesign the lifecycle"),
and two real bugs caught during this sprint's own verification (see
Notes below).

---

## Task Checklist

### Conversation

* [x] Preserve AI messages after handoff — verified no code path filters
      by `senderType` anywhere; nothing needed to change.
* [x] Continue same conversation after executive joins — already true;
      now also recorded in the new `conversation_audit_logs`.
* [x] Prevent duplicate conversations — already true within one open
      session. (A new conversation does start after a prior one is
      `CLOSED`/`ARCHIVED` — that's intentional: a closed conversation is a
      finished thread, not a duplicate to prevent.)
* [x] Improve conversation status management — new
      `WAITING → ACTIVE → RESOLVED → CLOSED → ARCHIVED` lifecycle with
      explicit `VALID_STATUS_TRANSITIONS`, mirroring Ticket's pattern.
* [ ] Improve conversation summary generation — not touched this sprint;
      `summaryService` is unchanged.

### Visitor

* [ ] Fix visitor information collection — not touched; the widget still
      has no structured name/email capture form (Lead capture remains
      entirely AI-inferred from conversation text). Real gap, out of this
      sprint's scope.
* [ ] Improve visitor session handling — not touched; `visitor_sessions`
      still has no "end session" route (Known Issue since Phase 5).
* [x] Restore existing conversation — already true
      (`getOrCreateActiveForVisitor`/`chat:join`).
* [ ] Improve visitor profile management — not touched this sprint.

### Ticket

* [x] Link ticket to existing conversation — `ticketService.create` now
      validates a provided `conversationId` actually exists (404
      otherwise) instead of silently storing a dangling reference.
* [x] Preserve full chat history — already true; ticket creation never
      touches the conversation or its messages.
* [x] Store AI summary — already satisfied by `getContext()`'s read-time
      aggregation of the linked conversation's latest summary; not
      duplicated onto the ticket itself, consistent with this project's
      existing anti-duplication pattern.
* [ ] Improve ticket lifecycle — not touched this sprint; Ticket's own
      status lifecycle is unchanged.

### Executive

* [x] View full AI conversation — already true (no message filtering
      anywhere).
* [x] Continue same conversation — see Conversation section above.
* [ ] View conversation timeline — not built; this is Sprint 2's
      (Executive Workspace) territory.
* [x] View visitor profile — already existed (`VisitorPanel`, Phase 10),
      unchanged this sprint.

### Admin

* [ ] View all conversations — **backend now supports this correctly**
      (an Admin's `GET /conversations` sees everything, unscoped), but no
      Admin Portal "Conversations" page exists yet to browse it. UI is
      Sprint 3 (Admin Portal) territory.
* [ ] View AI-only conversations — not built; also not yet meaningful,
      since no live AI messages exist anywhere yet.
* [ ] Search conversations — not built (no UI).
* [ ] Filter conversations — the API already supports `status`/`visitorId`
      filters; no UI exposes them yet.

### Chat Widget

* [ ] End Chat button — not built this sprint. Deliberately scoped out:
      this sprint's explicit requirements were about lifecycle
      correctness/history/status, not new visitor-facing controls. Good
      candidate for the next Chat Widget sprint.
* [ ] Session reset — not built.
* [x] Restore conversation — already true.
* [ ] Better loading states — not touched.
* [x] Better error handling (partial) — the widget now shows a real
      "This conversation has ended" state and disables the composer when
      its conversation is closed/archived (previously: no indication at
      all, and the composer stayed enabled indefinitely). Broader loading/
      error-state work beyond this one case is not in scope this sprint.

---

# Sprint 1 Extension — AI Reply, Auto-Escalation & Round-Robin — ✅ Completed 2026-07-08

## Objective (the "Conversation Lifecycle" request)

Required lifecycle: Visitor Starts Chat → One Conversation Created → AI
Handles Conversation → AI Replies → If AI cannot resolve → Support
Ticket Created → Executive Accepts Ticket → Executive Joins SAME
Conversation → Visitor and Executive continue chatting → Conversation
Closed → Conversation Archived. Plus: only one conversation; ticket
creation never creates another conversation; AI/visitor/executive
messages all remain visible; conversation/ticket/executive-assignment
history preserved; status lifecycle; archiving; round-robin executive
notification/allocation; tickets named from the visitor's stated name so
a ticket and its conversation are easy to correlate.

## Inspected first, assumed nothing

Per instruction, the actual code was inspected before writing anything.
Most of the lifecycle was already true by construction from Sprint 1:
single conversation (`getOrCreateActiveForVisitor`), ticket-conversation
linkage without ticket-created-conversation (`ticketService.create`
validates `conversationId`, never creates one), no message-visibility
filtering by `senderType` anywhere, a real status lifecycle with a full
audit trail, and admin-only archiving.

**Two real gaps were found, one of them a direct documentation/
implementation mismatch:**

* `docs/API_SPEC.md` already described `aiResponses` as driven by a
  `chatReplyService` wired into `chat:message` — **no such file or wiring
  existed in the code.** Confirmed by grepping the whole backend for
  `aiEngine.generateResponse`: zero callers besides its own definition.
  `chat:message` persisted and relayed visitor/executive messages only;
  the AI never replied. This is exactly the kind of doc-ahead-of-code
  drift the instruction warned not to assume past.
* No automatic escalation to a ticket existed anywhere, and no round-
  robin allocation existed anywhere — `notification:new` was always a
  blind broadcast to the whole `executives` room, and `TICKET_SOURCE.AI`
  (defined since Phase 12) had never actually been produced by anything.

## What was built

* **AI reply pipeline** (rebuilt): `backend/src/modules/ai/service/
  chatReplyService.js` (new) — reuses the existing, unmodified
  `aiEngine.generateResponse`, building context from the conversation's
  own history/summary/visitor profile. Triggered from `chat:message` only
  when the conversation has no assigned executive; stops once an
  executive joins, per "Executives always continue the existing
  conversation."
* **Auto-escalation**: `ticketService.createFromAiEscalation(...)` — when
  the AI reply falls back (couldn't answer), creates a `source: AI`
  ticket linked to the same `conversationId`/`visitorId`, unless an open
  one already exists for that conversation (no duplicate-ticket spam on
  repeated AI failures in the same chat).
* **Round-robin allocation**: new `executive.lastAssignedAt` field;
  `executiveService.pickNextForRoundRobin()` picks the least-recently-
  assigned `ONLINE` executive with spare capacity
  (`currentChats < maxChats`), stamps their `lastAssignedAt`, and the
  escalation ticket is created already `ASSIGNED` to them. That
  executive also gets a **targeted** `notification:new` (`TICKET_ASSIGNED`)
  via their tracked `socketId`, in addition to the existing room-wide
  `TICKET_CREATED` broadcast everyone still receives.
* **Traceable naming**: the escalation ticket's `subject` is
  `Support needed — <visitor name>` when the visitor has given one, or a
  short visitor-id fallback otherwise — the same `conversationId` the
  ticket already carried since Sprint 1 makes the two trivially
  correlatable in the existing Tickets table (`ticket.subject` was
  already rendered there; no frontend change needed).
* **Schema fix required to make any of this possible**: `Ticket.createdBy`
  and `TicketAudit.performedBy` were both `required: true`, which is fine
  for every human-initiated path but blocks a system-created ticket
  outright. Relaxed both to nullable — `TICKET_SOURCE.AI` already
  anticipated a non-human creator; the schema just hadn't caught up.

## Task Checklist

* [x] Only one conversation — unchanged, already true (Sprint 1)
* [x] Ticket creation never creates another conversation — unchanged,
      already true (Sprint 1)
* [x] AI messages remain visible — now meaningful: AI messages are
      real and render with no filtering anywhere
* [x] Visitor/Executive messages remain visible — unchanged, already true
* [x] Preserve conversation/ticket/executive-assignment history —
      unchanged, already true (Sprint 1's audit trails)
* [x] Status lifecycle / archiving — unchanged, already true (Sprint 1)
* [x] Notification to active executive, round-robin allocation — new,
      built this pass
* [x] Ticket named from visitor's stated name, traceable to its
      conversation — new, built this pass

---

# Sprint 6 Progress — ✅ Completed 2026-07-08

## What happened

A prior pass had already built this sprint in full (visitor info form,
End Chat, session reset, connection-state messaging, mobile fixes,
message timestamps/auto-linking, labeled typing indicator) but that work
was never committed and was lost from the working tree before this pass
began, alongside the AI Reply Pipeline fix. Rebuilt from scratch,
re-verified end-to-end, and — this time — a real bug was caught that
didn't exist in the original build: `endChat()` cleared all the
conversation/session state but never set `isOpen` back to `false`, so
the widget stayed rendered as an empty, disconnected chat window instead
of resetting to the launcher. Fixed and re-verified.

## Task Checklist

* [x] Fix visitor information collection — `PATCH /visitors/sessions/me`
      + the widget's name/email form (`VisitorInfoForm.jsx`)
* [x] Restore previous conversations — already true (unaffected by the
      revert)
* [x] Add End Chat — visitor-initiated `chat:close`
      (`closeAsVisitor`/`_applyTransition`), `WAITING -> CLOSED` added to
      the transition map
* [x] Reset visitor session — `POST /visitors/sessions/end`, widget
      state fully cleared including `isOpen` (the bug above)
* [x] Improve loading states — differentiated connecting/reconnecting/
      session-recovered banner text
* [x] Improve error handling — malformed-JSON-body 500 fixed globally in
      `errorHandler.js`; `connect_error` recovery with a capped retry
* [x] Improve mobile responsiveness — header/composer `flexShrink: 0`
* [x] Preserve chat after reconnect — already true
* [x] Improve typing indicator — labeled by `senderType`
      ("AI Assistant is typing" / "Support is typing")
* [x] Improve message rendering — real timestamps, auto-linked URLs

---

# Cross-Cutting Bug-List Pass — ✅ Completed 2026-07-08

## Objective

A ten-item bug list, reported informally rather than as a sprint
reference. Investigated each item against the actual current code (not
assumed) before building anything — see the roadmap note above for how
each item was triaged.

## What was built

* **Visitor information (#6)** — root-caused: `visitors.name`/`email`/
  `phone`/`company` had no write path anywhere in the codebase at all
  (not a bug introduced recently — true since Phase 5). Fixed as part of
  the Sprint 6 rebuild above.
* **Chat not responding (#3)** — the AI Reply Pipeline (Sprint 1
  Extension) had also been lost in the same revert as Sprint 6.
  Re-verified it was rebuilt and still live before doing anything else.
* **Separate chatbot/staff surfaces (#2) + embeddable widget (#10)** —
  the chat widget is now a fully independent Vite build entry
  (`widget.html` → `src/WidgetApp.jsx`, mounting only `<ChatWidget />`,
  no router/auth/admin code at all) instead of being mounted globally
  inside the staff app's `App.jsx`. A new `public/embed.js` loader script
  is what any external website includes — it creates an iframe pointed
  at this platform's own `/widget.html`, resized via `postMessage` to
  match the widget's actual footprint (a small box around the launcher,
  the full chat window when open, fullscreen on mobile) rather than
  covering the whole host page. The staff app (`index.html` → `App.jsx`)
  no longer renders the widget on any route, including `/dashboard` and
  `/admin/*` — closing the "executive sees the customer chat bubble on
  their own dashboard" bug this item described.
* **Executive conversation history (#1)** — new
  `frontend/src/pages/ConversationHistoryPage.jsx` at `/conversations` —
  reuses the existing `GET /conversations?mine=true` endpoint, already
  correctly scoped by Sprint 1's `assertAccessible` to return an
  executive's own assignments regardless of status; no backend changes
  were needed.
* **Admin all-conversations / lead-gen view (#8)** — new
  `frontend/src/pages/admin/AdminConversationsPage.jsx` at
  `/admin/conversations` — Admin's `GET /conversations` was already
  unscoped (sees every conversation, AI-only or executive-handled); a
  conversation with no `assignedExecutiveId` is now labeled "AI-only" in
  the list. A "Find Leads" button deep-links into the existing Leads
  page's "Detect from Conversation" dialog (pre-filled), reusing that
  flow entirely rather than duplicating lead-detection UI.
* **UI polish (#9)** — visual review of every rebuilt/new surface caught
  one real readability bug: `ConversationQueue.jsx` showed a visitor's
  full raw UUID as the primary label (wrapping awkwardly onto two
  lines); changed to the same shortened `Visitor <8 chars>` convention
  used everywhere else in this pass.

## Task Checklist

* [x] #1 Executive: view complete chat history of all conversations
      handled — built (`ConversationHistoryPage.jsx`)
* [x] #2 Chatbot interface separate from Executive/Admin — built
      (separate Vite bundle, widget never mounts on staff routes)
* [x] #3 Chat not responding — re-verified fixed (was lost in a prior
      revert, not a new regression)
* [x] #4 AI-first, ticket-on-failure lifecycle — unchanged, already true
      (Sprint 1 Extension)
* [x] #5 Full chat history preserved across ticket creation — unchanged,
      already true (Sprint 1)
* [x] #6 Visitor information fetch — fixed (Sprint 6 rebuild)
* [x] #7 End/close chat, session cleared — fixed (Sprint 6 rebuild)
* [x] #8 Admin views all chat histories (AI + tickets) for lead
      generation — built (`AdminConversationsPage.jsx` + Leads deep link)
* [x] #9 Overall UI/UX improvement — targeted polish pass (see above);
      broader visual redesign was judged out of scope for this pass
* [x] #10 Separate URLs for chatbot / executive / admin — built
      (`widget.html` embeddable bundle + `public/embed.js` loader;
      Executive and Admin remain on the staff app's existing
      `/dashboard` and `/admin/*` routes, distinct from the widget)

---

# Executive Handoff Redesign — AI-first Escalation & Broadcast-and-Claim — ✅ Completed 2026-07-08

## Objective

A claimable conversation/ticket must never exist until the AI genuinely
can't resolve the query, or the visitor explicitly asks for a human —
until then no executive may see or claim the chat. Once it is handed
off: notify every employee in the dashboard; whoever accepts locks the
chat so no one else can handle it; a "Transfer" button lets a locked-in
executive give it up, re-notifying everyone so someone else can lock it;
refreshing the page must redirect an executive straight back to a chat
still locked to them, so they can't wander off without closing or
transferring it; all of this needs to be visually unmissable in the
dashboard. Also reported as a live bug: the chatbot claiming it would
"notify our support team... they'll reach out to you at [email] with a
link" — a fictional handoff procedure invented by the model, not
anything this project actually does.

## What was built

* `humanRequestDetector.js` (new, `ai` module) — a deterministic
  keyword/regex check ("talk to a human," "speak with an agent," etc.)
  run *before* ever calling the LLM, so a visitor's explicit request
  escalates instantly and for free, with zero hallucination risk.
* New `CONVERSATION_STATUS.ESCALATED`, sitting between `WAITING`
  (AI-only, invisible to every executive) and `ACTIVE` (an executive has
  actually joined) — the only status an executive may ever claim from.
* `system.md` gained an explicit rule against inventing an email/phone/
  link handoff — fixed in both the file default and the live, already-
  `PUBLISHED` database override (Prompt Management takes precedence over
  the file once an admin — or the seed — has ever published a version).
* Escalation broadcasts `notification:new` (`CONVERSATION_ESCALATED`) to
  **every** `ONLINE` executive with no server-side picking at all —
  whichever executive's `chat:join` arrives first locks the conversation
  (`assignedExecutiveId` set, `ACTIVE`); anyone else's `chat:join` on the
  same conversation is rejected. This atomic already-assigned check
  (needed regardless, to stop two executives claiming one conversation)
  turned out to be the entire locking primitive — no separate lock
  needed.
* "Transfer" (new `chat:transfer` socket event + button in
  `ActiveChatPanel`, with a confirmation dialog so a stray click can't
  abandon a live chat): unlocks an `ACTIVE` conversation back to
  `ESCALATED`/unassigned and re-fires the exact same broadcast a fresh
  escalation would, so any other `ONLINE` executive can claim it.
* Refresh-redirect: on every socket reconnect, the Executive Workspace
  queries for a conversation still `ACTIVE` and assigned to the current
  user and auto-rejoins it — the same claim path an executive would use
  manually, just run automatically. A `beforeunload` prompt (native
  browser "leave site?" confirmation) fires as a secondary deterrent
  while a locked conversation is open.
* Dashboard highlighting: every escalation/transfer notification is now
  a persistent, sound-accompanied toast (not an auto-dismissing one);
  the Conversation Queue tags incoming items as newly-escalated or
  transferred with a colored border and chip; the Active Chat panel
  shows a "Locked to you" chip while `ACTIVE`.
* A support ticket is still auto-created on escalation
  (`ticketService.createFromAiEscalation`), but always `OPEN`/unassigned
  now — there is no executive to assign it to at creation time under
  this model.

Round-robin allocation (capacity/fairness-aware auto-assignment to one
available executive at escalation time) was built first, then removed
the same day per the follow-up request above — see
`docs/IMPLEMENTATION_STATUS.md` Architecture Decisions 102/103 for that
full history, including why no new locking primitive was needed to
replace it.

## Task Checklist

* [x] No claimable chat/ticket exists until AI failure or an explicit
      human request
* [x] Every `ONLINE` executive is notified on escalation
* [x] First executive to accept locks the chat; others are rejected
* [x] "Transfer" button unlocks and re-notifies everyone
* [x] Refreshing redirects an executive back to their still-locked chat
* [x] Escalation/transfer/lock events are visually prominent in the
      dashboard, not just a plain toast
* [x] Visitor is told once a real executive has joined (by name)
* [x] Visitor is told if nobody is currently available
* [x] Chatbot no longer invents an email/phone/link handoff procedure

---

# Database Changes

## Completed

* `Conversation.status` enum: removed dead `HANDOFF`; `RESOLVED` is now a
  real, wired intermediate state; added `ARCHIVED`. Added `archivedAt`.
* New collection `conversation_audit_logs` — immutable, mirrors
  `ticket_audit_logs` exactly (`ASSIGNED`, `REASSIGNED`,
  `STATUS_CHANGED`, `ARCHIVED`, `RESTORED`).

## Pending

* Visitor/Lead schema review — not touched this sprint; still pending for
  a future sprint (Visitor identification is a real, separate gap — see
  Task Checklist above).

## Completed (Sprint 1 Extension)

* `Ticket.createdBy` and `TicketAudit.performedBy` are now nullable — a
  `source: AI` (auto-escalated) ticket has no human creator/performer.
* `Executive.lastAssignedAt` (new field) — powers round-robin allocation.

## Completed (Sprint 6 rebuild)

* `Conversation.VALID_STATUS_TRANSITIONS`: `WAITING -> CLOSED` added
  (visitor End Chat on a never-claimed conversation).
* `visitor_sessions.endedAt` is real now — set by
  `visitorSessionRepository.endSession`.

## Completed (Executive Handoff Redesign)

* `Conversation.status` — new `ESCALATED` value; `VALID_STATUS_TRANSITIONS`
  updated (`WAITING -> ESCALATED`, `ESCALATED -> ACTIVE`, and
  `ACTIVE -> ESCALATED` for Transfer). New `CONVERSATION_AUDIT_ACTIONS.TRANSFERRED`.
* `Executive.lastAssignedAt` (added for round-robin, Sprint 1 Extension)
  removed — dead field under broadcast-and-claim; existing documents may
  still carry a stale value, unused and not migrated.
* `Ticket.assignedExecutiveId`/`status` for an AI-escalation ticket are
  now always `null`/`OPEN` at creation — `createFromAiEscalation` no
  longer takes an assignee.

---

# API Changes

## Completed

* `GET/POST /conversations/*` — corrected ownership scoping
  (`assertAccessible`, matching Tickets/Leads' existing pattern; a
  conversation is visible to a non-admin if it's unclaimed `WAITING` or
  assigned to them, never another executive's).
* New: `PATCH /conversations/:id/status`, `PATCH /conversations/:id/assign`,
  `POST /conversations/:id/archive`, `POST /conversations/:id/restore`,
  `GET /conversations/:id/audit`.
* `POST /tickets` now validates a provided `conversationId` exists.

## Pending

* Visitor APIs, Executive APIs, Admin APIs — not touched this sprint;
  Sprint 2/3 territory.

## Completed (Sprint 1 Extension)

* No new REST endpoints — AI-escalation ticket creation
  (`ticketService.createFromAiEscalation`) is an internal-only flow
  triggered from the socket layer, not a route; it bypasses the REST
  `POST /tickets` validator entirely (it's not an HTTP request).
* `GET /analytics/ai`'s `aiResponses` now reports real, non-zero data —
  it already counted `AI`-sender messages directly, which now exist.

## Completed (Sprint 6 rebuild)

* New `PATCH /visitors/sessions/me` (visitor self-service profile
  update) and `POST /visitors/sessions/end` (ends the visitor session).
* Global fix: a malformed JSON request body now returns a clean `400`
  instead of a `500`.

## Completed (Cross-Cutting Bug-List Pass)

* No new REST endpoints — Executive's Conversation History and Admin's
  all-conversations page both reuse the existing `GET /conversations`
  (with `mine`/`status`/`visitorId` filters, already supported) and
  `GET /conversations/:id/messages`.

## Completed (Executive Handoff Redesign)

* No new REST endpoints. `PATCH /conversations/:id/status` now also
  accepts the `ACTIVE -> ESCALATED` transition (Transfer's REST-visible
  equivalent, though the dedicated `chat:transfer` socket event is the
  intended path — see Socket.io Changes below). `GET /conversations` with
  `?mine=true&status=ACTIVE` is what the frontend polls on reconnect to
  implement refresh-redirect — an existing filter combination, no new
  query param needed.

---

# Socket.io Changes

## Completed

* `chat:message` now rejects sends into `CLOSED`/`ARCHIVED` conversations
  (previously no check existed at all — a real bug).
* A visitor message on a `RESOLVED` conversation auto-reopens it to
  `ACTIVE`.
* `chat:join`'s claim path now records an `ASSIGNED` audit entry.
* `conversation:closed` broadcast centralized into
  `conversationService.updateStatus` — fixes a real bug caught during this
  sprint's own verification: the REST close path never broadcast it at
  all, only the socket-triggered `chat:close` did.
* Four new `notification:new` types (`CONVERSATION_STATUS_CHANGED`,
  `CONVERSATION_REASSIGNED`, `CONVERSATION_ARCHIVED`,
  `CONVERSATION_RESTORED`) — reusing the existing event/room convention
  rather than the `snake_case` event names originally sketched below.

## Pending (reconciled against this document's original Sprint 2 socket list)

* `executive_joined` — genuinely not implemented; the visitor is never
  explicitly told an executive joined (see `docs/SOCKET_EVENTS.md` §14 for
  the full reconciliation of every originally-planned event).
* `executive_left` — not implemented (would need per-conversation, not
  just global, presence tracking).
* `session_ended` — not implemented; a different concept (visitor
  session, not conversation) than this sprint addressed.
* `conversation_restored`, `ticket_created`, `conversation_closed`,
  `conversation_reopened` — all already covered by existing mechanisms;
  see `docs/SOCKET_EVENTS.md` §14 for exactly how each maps.

## Completed (Sprint 1 Extension)

* `chat:message`'s `VISITOR`-sender branch, when the conversation has no
  assigned executive, now triggers a real AI reply: `chat:typing`/
  `chat:stop-typing` with `senderType: "AI"` fire around generation, and
  the reply broadcasts over the same `chat:message` event.
* New targeted `notification:new` type `TICKET_ASSIGNED` — sent only to
  the specific round-robin-chosen executive's own socket (via their
  tracked `socketId`), not the whole `executives` room, alongside the
  existing room-wide `TICKET_CREATED` broadcast.

## Completed (Sprint 6 rebuild)

* `chat:close` now accepts a visitor closing their own conversation, not
  just an executive (`closeAsVisitor`).
* `chat:typing`'s `senderType` is now actually used client-side to label
  the typing indicator.

## Completed (Executive Handoff Redesign)

* Escalation now checks `humanRequestDetector` before ever calling the
  LLM; either trigger (AI fallback or explicit human request) broadcasts
  `notification:new` (`CONVERSATION_ESCALATED`, renamed from
  `NEW_CONVERSATION`) to every `ONLINE` executive — no server-side
  picking, unlike the Sprint 1 Extension's round-robin targeted emit
  (removed).
* `chat:join`'s claim path is now the *only* allocation mechanism —
  first `chat:join` on an unassigned `ESCALATED` conversation locks it;
  a second executive's `chat:join` on the same conversation is rejected.
* New `chat:transfer` event — unlocks an `ACTIVE` conversation back to
  `ESCALATED`, decrements `currentChats`, re-broadcasts
  `CONVERSATION_ESCALATED` with `transferredFrom` set, and sends the
  visitor a `SYSTEM` message about the handoff.

---

# UI Improvements

## Completed

* Chat Widget: a real closed/archived state (disabled composer, "This
  conversation has ended" message, quick replies hidden) driven by a new
  `conversation:closed` listener that previously didn't exist at all.
* Executive Workspace: `ActiveChatPanel`'s closed-state check now also
  treats `ARCHIVED` as closed (previously only checked `CLOSED`).

## Completed (Sprint 6 rebuild)

* A visitor name/email capture form, an End Chat button + confirm
  dialog, message timestamps + auto-linked URLs, a labeled typing
  indicator, and a differentiated connection banner
  (connecting/reconnecting/session-recovered).

## Completed (Cross-Cutting Bug-List Pass)

* The Chat Widget is now a separate, embeddable bundle
  (`widget.html`/`WidgetApp.jsx`) loaded via `public/embed.js` on any
  website — never rendered on any staff (Executive/Admin) page anymore.
* New Executive page: Conversation History (`/conversations`).
* New Admin page: Conversations (`/admin/conversations`), with an
  "AI-only" label per conversation and a "Find Leads" deep link into the
  existing Leads detection flow.
* `ConversationQueue.jsx` now shows a shortened `Visitor <8 chars>` label
  instead of the visitor's full raw UUID (a real readability bug caught
  during this pass's own visual review).

## Completed (Executive Handoff Redesign)

* `ConversationQueue.jsx` tags each incoming escalation/transfer with a
  colored left border and a "New"/"Transferred" chip, so a claimable
  conversation stands out rather than blending into the plain list.
* `ActiveChatPanel.jsx` shows a "Locked to you" chip and a highlighted
  border while `ACTIVE`, plus a "Transfer" button (next to "Close
  Conversation," disabled unless `ACTIVE`) that opens a confirmation
  dialog before unlocking — guards against an accidental click
  abandoning a live conversation.
* Every `CONVERSATION_ESCALATED` notification (fresh escalation or
  transfer) is now a persistent, sound-accompanied toast that doesn't
  auto-dismiss, with wording that distinguishes the two cases.

## Pending

### Executive Dashboard

* Chat search, richer filters, a conversation timeline view — Sprint 2's
  remaining scope beyond Conversation History.

### Admin Portal

* Better tables/filters/pagination on the new Conversations page beyond
  its current 100-row cap; a dedicated conversation management page with
  bulk actions — Sprint 3's remaining scope.

### General

* Broader visual/branding redesign — this pass fixed concrete
  readability bugs found during review, not a full design-system pass.

---

# Files Modified

Backend:

* `backend/src/modules/chat/model/conversationModel.js`
* `backend/src/modules/chat/model/conversationAuditModel.js` (new)
* `backend/src/modules/chat/constants/chat.js`
* `backend/src/modules/chat/repository/conversationRepository.js`
* `backend/src/modules/chat/repository/conversationAuditRepository.js` (new)
* `backend/src/modules/chat/service/conversationService.js`
* `backend/src/modules/chat/controller/conversationController.js`
* `backend/src/modules/chat/routes/conversationRoutes.js`
* `backend/src/modules/chat/validator/chatValidator.js`
* `backend/src/modules/ticket/service/ticketService.js`
* `backend/src/modules/visitor/controller/visitorController.js`
* `backend/src/socket/events/chatEvents.js`

Frontend:

* `frontend/src/features/executive-workspace/constants/executiveWorkspace.js`
* `frontend/src/features/executive-workspace/components/ActiveChatPanel.jsx`
* `frontend/src/features/chat-widget/constants/chatWidget.js`
* `frontend/src/features/chat-widget/hooks/useChatWidget.js`
* `frontend/src/features/chat-widget/ChatWidget.jsx`
* `frontend/src/features/chat-widget/components/ChatWindow.jsx`

Docs:

* `docs/DATABASE.md`, `docs/API_SPEC.md`, `docs/SOCKET_EVENTS.md`,
  `docs/IMPROVEMENT_STATUS.md` (this file)

## Sprint 1 Extension

Backend:

* `backend/src/modules/ai/service/chatReplyService.js` (new)
* `backend/src/modules/ticket/service/ticketService.js`
  (`createFromAiEscalation`)
* `backend/src/modules/ticket/model/ticketModel.js` (`createdBy` nullable)
* `backend/src/modules/ticket/model/ticketAuditModel.js`
  (`performedBy` nullable)
* `backend/src/modules/ticket/repository/ticketRepository.js`
  (`findOpenByConversationId`)
* `backend/src/modules/executive/model/executiveModel.js`
  (`lastAssignedAt`)
* `backend/src/modules/executive/service/executiveService.js`
  (`pickNextForRoundRobin`)
* `backend/src/socket/events/chatEvents.js` (`triggerAiReply`, wired into
  `chat:message`'s no-assigned-executive branch)

Frontend:

* `frontend/src/pages/TicketDetailPage.jsx` (audit trail: a null
  `performedBy` now reads "System (AI)" instead of "Unknown")

Docs:

* `docs/DATABASE.md`, `docs/API_SPEC.md`, `docs/SOCKET_EVENTS.md`,
  `docs/IMPLEMENTATION_STATUS.md`, `docs/IMPROVEMENT_STATUS.md` (this
  file)

## Sprint 6 (rebuild)

Backend:

* `backend/src/modules/visitor/validator/visitorValidator.js` (new)
* `backend/src/modules/visitor/repository/visitorRepository.js`
* `backend/src/modules/visitor/repository/visitorSessionRepository.js`
* `backend/src/modules/visitor/service/visitorService.js`
* `backend/src/modules/visitor/controller/visitorController.js`
* `backend/src/modules/visitor/routes/visitorRoutes.js`
* `backend/src/modules/chat/constants/chat.js` (`WAITING -> CLOSED`)
* `backend/src/modules/chat/service/conversationService.js`
  (`closeAsVisitor`, `_applyTransition` extraction)
* `backend/src/socket/events/chatEvents.js` (`chat:close` accepts a
  visitor actor)
* `backend/src/middleware/errorHandler.js` (malformed-JSON-body 400 fix)

Frontend:

* `frontend/src/services/visitorService.js`
  (`updateMyProfile`, `endMySession`)
* `frontend/src/features/chat-widget/constants/chatWidget.js`
* `frontend/src/features/chat-widget/hooks/useChatWidget.js`
* `frontend/src/features/chat-widget/ChatWidget.jsx`
* `frontend/src/features/chat-widget/components/ChatWindow.jsx`
* `frontend/src/features/chat-widget/components/ConversationArea.jsx`
* `frontend/src/features/chat-widget/components/VisitorInfoForm.jsx` (new)
* `frontend/src/features/chat-widget/components/MessageBubble.jsx`
* `frontend/src/features/chat-widget/components/TypingIndicator.jsx`
* `frontend/src/features/chat-widget/components/OfflineBanner.jsx`

## Cross-Cutting Bug-List Pass

Frontend (embeddable widget split):

* `frontend/vite.config.js` (multi-entry build: `index.html` + `widget.html`)
* `frontend/widget.html` (new)
* `frontend/src/widgetMain.jsx` (new)
* `frontend/src/WidgetApp.jsx` (new)
* `frontend/src/App.jsx` (`<ChatWidget />` removed — staff app only)
* `frontend/src/pages/HomePage.jsx` (redirects to `/login` or `/dashboard`)
* `frontend/public/embed.js` (new — the third-party embed loader)
* `frontend/public/demo-embed.html` (new — local test harness simulating
  an external site)

Frontend (Executive/Admin conversation visibility):

* `frontend/src/pages/ConversationHistoryPage.jsx` (new)
* `frontend/src/pages/admin/AdminConversationsPage.jsx` (new)
* `frontend/src/components/TranscriptBubble.jsx` (new — shared read-only
  message bubble, extracted so it isn't duplicated across both new pages)
* `frontend/src/pages/LeadsPage.jsx` (reads `location.state.conversationId`
  to pre-fill/open the existing Detect-from-Conversation dialog)
* `frontend/src/constants/routes.js` (`CONVERSATION_HISTORY`,
  `ADMIN_CONVERSATIONS`)
* `frontend/src/routes/AppRoutes.jsx`
* `frontend/src/layouts/MainLayout.jsx` (nav link)
* `frontend/src/features/admin-portal/layouts/AdminLayout.jsx` (nav link)
* `frontend/src/features/executive-workspace/components/ConversationQueue.jsx`
  (shortened visitor label)

Docs:

* `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_SPEC.md`,
  `docs/SOCKET_EVENTS.md`, `docs/IMPLEMENTATION_STATUS.md`,
  `docs/IMPROVEMENT_STATUS.md` (this file)

## Executive Handoff Redesign

Backend:

* `backend/src/modules/ai/service/humanRequestDetector.js` (new)
* `backend/src/modules/ai/prompts/templates/escalation.md` (new)
* `backend/src/modules/ai/prompts/templates/system.md` (no-hallucinated-
  handoff rule)
* `backend/src/modules/ai/prompts/promptBuilder.js` (`getEscalationPrompt`)
* `backend/src/modules/ai/service/promptService.js` (`ESCALATION` seed
  content)
* `backend/src/modules/ai/service/chatReplyService.js` (checks
  `humanRequestDetector` before calling the LLM)
* `backend/src/modules/chat/constants/chat.js` (`ESCALATED` status,
  `ACTIVE -> ESCALATED` transition, `TRANSFERRED` audit action)
* `backend/src/modules/chat/service/conversationService.js` (`escalate`,
  `transfer`; removed `reserveForExecutive`)
* `backend/src/modules/ticket/service/ticketService.js`
  (`createFromAiEscalation` — removed the `assignee` parameter, always
  creates `OPEN`/unassigned)
* `backend/src/modules/executive/model/executiveModel.js` (removed
  `lastAssignedAt`)
* `backend/src/modules/executive/service/executiveService.js` (removed
  `pickNextForRoundRobin`; added `countOnline`)
* `backend/src/socket/constants/socketEvents.js` (`CHAT_TRANSFER`)
* `backend/src/socket/events/chatEvents.js` (`escalateConversation`
  rewritten to broadcast instead of assign; new `chat:transfer` handler)

Frontend:

* `frontend/src/socket/socketEvents.js` (`CHAT_TRANSFER`)
* `frontend/src/features/executive-workspace/hooks/useExecutiveWorkspace.js`
  (`resumeLockedConversation`, `beforeunload` handler,
  `transferConversation`; renamed `NEW_CONVERSATION` handling to
  `CONVERSATION_ESCALATED`)
* `frontend/src/pages/ExecutiveWorkspacePage.jsx` (wires
  `transferConversation` through)
* `frontend/src/features/executive-workspace/components/ActiveChatPanel.jsx`
  ("Locked to you" chip, "Transfer" button + confirmation dialog)
* `frontend/src/features/executive-workspace/components/ConversationQueue.jsx`
  (escalated/transferred highlight border + chip)

Docs:

* `docs/DATABASE.md`, `docs/API_SPEC.md`, `docs/SOCKET_EVENTS.md`,
  `docs/IMPLEMENTATION_STATUS.md`, `docs/IMPROVEMENT_STATUS.md` (this
  file)

---

# Known Issues

* No Admin "Conversations" page exists yet — the backend fully supports
  browsing/filtering all conversations, but there's no UI to drive it.
* No visitor-facing "End Chat" — a visitor still cannot end their own
  conversation; only an executive can (`chat:close`/REST close).
* No structured visitor identification form in the widget — Lead capture
  remains entirely AI-inferred from free text (a visitor's name, if ever
  captured, still comes from this AI inference — used directly in the
  escalation ticket's subject).
* `executive_joined`/`executive_left`/`session_ended` remain unimplemented
  (see Socket.io Changes → Pending above for the full reconciliation).
* The server-side rejection of messages into a `CLOSED`/`ARCHIVED`
  conversation (`assertOpenForMessaging`) was verified by direct code
  review, not a raw-socket-level test bypassing the UI — no
  `socket.io-client` tooling was available in this environment to script
  one; the client-side guard (disabled composer) *was* verified live and
  confirmed working end-to-end.
* Broadcast-and-claim allocation (Executive Handoff Redesign v2,
  superseding the round-robin note this bullet originally described) has
  no department/skill/priority-aware routing — every `ONLINE` executive
  is notified equally regardless of specialty, and there's no visibility
  into *why* a conversation stays unclaimed when nobody is `ONLINE` at
  all (it just sits `ESCALATED`, unassigned, until someone connects).
* `beforeunload`'s native "leave site?" prompt is a deterrent, not a
  guarantee — an executive can still dismiss it and close the tab,
  leaving their conversation `ACTIVE` and locked until they (or an
  admin) reconnect and either resume or transfer it. There is no
  server-side timeout that auto-transfers an abandoned `ACTIVE`
  conversation back to the queue.
* No Admin/Executive UI shows a one-click "Join this conversation" link
  from a ticket's detail page — the ticket and conversation already share
  the same `conversationId`, so an executive can always reach it via the
  Conversation Queue, but there's no direct shortcut yet.
* Intent Detection, Query Expansion, and Re-ranking remain unbuilt
  (`RAG.md` §6/§18, explicitly "Future") — the Retriever always runs with
  no category filter.
* No `socket.io-client` tooling exists in this environment to script a
  raw-socket-level test — every socket-level fix in this project has
  been verified through the real UI via Playwright instead, which covers
  the client-visible behavior but not, e.g., a hand-crafted malicious
  socket payload bypassing the widget entirely.
* The new Admin Conversations page has no pagination UI yet — it fetches
  up to 100 conversations at a time with no "load more"/page control, so
  a company with a very large conversation volume would only see its
  most recent 100 there.
* No one-click "resend/retry" for a visitor message that never got an
  ack (e.g. a dropped connection mid-send) — the message just stays
  visibly "Sending…" until the widget reconnects and the outbox flushes.

---

# Architectural Decisions

* **Conversation is the single source of truth** — Tickets/Leads only
  ever reference it (`conversationId`), never copy or mutate its content;
  `getContext()` aggregates on read. This was already true before this
  sprint and remained the guiding principle throughout.
* **Conversations get a shared-queue access rule, not Tickets'
  strict-ownership rule.** Tickets/Leads restrict non-admins to only
  their own assignments, full stop. Conversations additionally allow any
  non-admin to see/act on `WAITING` (unclaimed) conversations — that's
  the whole point of the shared Conversation Queue — before narrowing to
  "own assignment only" once a conversation is claimed. Copying Ticket's
  stricter rule verbatim would have broken the live Conversation Queue,
  which was caught by checking the actual frontend caller
  (`useExecutiveWorkspace.js`) before writing the scoping logic, not
  after.
* **Reused the existing `notification:new`/executives-room mechanism for
  every new conversation event, instead of the `snake_case` event names
  this document originally planned.** Two of those planned names
  (`ticket_created`, `conversation_closed`) already had a working
  equivalent under the established convention; introducing parallel names
  would have split the event vocabulary in two for no behavioral gain.
* **Admin-only actions (reassign/archive/restore) are enforced inside the
  service method itself, not as a separate route-level permission** —
  identical to how Lead's `ARCHIVED` entry/exit is already gated, since
  `VIEW_OWN_CONVERSATION` is shared by both roles and the distinction is
  finer-grained than a route can express.
* **The `conversation:closed` broadcast now lives in one place**
  (`conversationService.updateStatus`) rather than being emitted
  separately by each caller — the exact bug this sprint caught (REST
  close silently not notifying the visitor) is the kind of gap that
  reappears when the same side effect is duplicated across multiple call
  sites instead of centralized.

## Sprint 1 Extension

* **The AI reply pipeline was rebuilt rather than assumed present** — the
  docs (`API_SPEC.md`) already described it as wired in; the code did
  not have it. Verifying the actual `chat:message` handler before writing
  anything, per instruction, is what surfaced this — a reminder that this
  document (and any doc) can drift ahead of the code it describes.
* **`chatReplyService` lives in the `ai` module and reuses
  `aiEngine.generateResponse` completely unmodified** — the pipeline
  itself (Context Builder/Retriever/Prompt Builder/Provider) already
  worked; the only missing piece was a caller. No changes were made to
  the AI Engine, Context Builder, Prompt Builder, Retriever, or Knowledge
  Service.
* **Round-robin is "least-recently-assigned `ONLINE` executive with spare
  capacity," not a separate rotating-index counter document.** Sorting
  candidates by `lastAssignedAt` ascending (a never-assigned executive's
  `null` sorts first) is simpler than maintaining a counter that has to
  stay in sync with a changing set of online executives, and degrades
  gracefully (skips overloaded/offline executives instead of erroring).
* **`Ticket.createdBy`/`TicketAudit.performedBy` were relaxed to nullable
  rather than inventing a placeholder "system user."** `TICKET_SOURCE.AI`
  already existed specifically for this case; a null value is more
  honest than a fake user account that doesn't otherwise exist in this
  project (same reasoning as Sprint 6's visitor-initiated-close audit
  entries, which skip recording entirely rather than fabricate a
  performer — here, the entry is worth keeping since it's the ticket's
  own creation record, so nullable was chosen over skipping).
* **The AI only escalates once per conversation** — `findOpenByConversationId`
  prevents a second ticket from being created every time the AI falls
  back again in the same still-open conversation; only closing that
  ticket allows a fresh one to be created later.

## Sprint 6 (rebuild)

* **This entire sprint had already been built once and was lost from
  the working tree before this pass began** (an uncommitted revert, not
  a code regression) — rebuilt from the same design rather than
  re-deriving it from scratch, and re-verified end-to-end rather than
  assumed correct just because it matched a remembered design.
* **`endChat()` now also sets `isOpen` to `false`** — the one genuine new
  bug this rebuild caught: without it, ending the chat cleared all
  conversation/session state but left the `ChatWindow` rendered (an
  empty, disconnected panel) instead of reverting to the launcher.

## Cross-Cutting Bug-List Pass

* **The embeddable widget uses a dynamically-resized iframe, not a
  full-viewport click-through one.** The first implementation attempt
  set `pointer-events: none` on the iframe element itself so clicks
  would "pass through" to the host page except where the widget drew
  something — this does not work: browsers treat an iframe as one
  opaque hit-test target from the parent page's point of view regardless
  of what's transparent inside its own document (confirmed by testing,
  not assumed). The working approach — and the one real chat-widget
  products use — is to resize the iframe itself to match the widget's
  actual footprint (a small box around the launcher, the full chat
  window when open, fullscreen on mobile), driven by a `postMessage`
  the widget sends whenever its own `isOpen`/`position` changes.
* **The iframe loads this platform's own `/widget.html`, not the host
  page's origin** — every request the widget makes (REST + Socket.io) is
  therefore same-origin from the widget's own point of view, regardless
  of what site embeds it. No CORS configuration was needed on the
  backend to support third-party embedding.
* **The staff app (`index.html`) and the widget (`widget.html`) are two
  entries in one Vite project/one repo, not two separate projects.**
  They already share components/services/constants; splitting the repo
  itself would have meant either duplicating that shared code or
  extracting a separate shared package — disproportionate for what was
  needed (two independent *bundles*, not two independent *codebases*).
* **`TranscriptBubble` was extracted into a shared component** used by
  both the new Executive Conversation History page and the new Admin
  Conversations page, rather than copy-pasting the same read-only
  message-bubble markup into both — the two pages differ in scope/
  actions, not in how a single message should render.
* **Admin's "Find Leads" reuses the existing Leads page's
  Detect-from-Conversation dialog via a router-state deep link
  (`navigate(ROUTES.LEADS, { state: { conversationId } })`)** rather than
  rebuilding lead-detection UI a second time inside the new Conversations
  page.

## Executive Handoff Redesign

* **Round-robin was replaced, not kept as a fallback.** The follow-up
  request changed the actual requirement ("notify all employees; whoever
  accepts locks it") rather than pointing out a bug in round-robin — so
  round-robin's code was removed outright instead of left dormant behind
  a flag. See `docs/IMPLEMENTATION_STATUS.md` Architecture Decisions
  102/103 for the full before/after.
* **No new locking primitive was built for "first to claim locks it."**
  `joinAsExecutive`'s pre-existing rejection of a `chat:join` on an
  already-assigned conversation was already required regardless (to stop
  two executives claiming one chat) — removing the pre-assignment step
  that used to race against it is what turned "reject a double-claim"
  into "first claim wins," with no separate mechanism needed.
* **Transfer reuses the escalation broadcast verbatim**, rather than
  being a distinct "reassignment" event — unlocking a conversation puts
  it back in exactly the same claimable state a fresh escalation
  produces, so the same `chat:join`/broadcast machinery handles both.
* **Refresh-redirect reuses the ordinary claim path** (`chat:join` on the
  executive's own already-`ACTIVE` conversation) rather than a dedicated
  "resume session" endpoint — rejoining an already-assigned conversation
  was already a no-op success case, so no new server-side concept was
  needed, just a client-side call to it on every reconnect.

---

# Manual Testing Checklist

Conversation

* [x] New visitor starts chat — creates one `WAITING` conversation
* [x] Executive claims from the real Conversation Queue UI — conversation
      becomes `ACTIVE`, `ASSIGNED` audit entry recorded
* [x] Invalid direct transition (`ACTIVE → ARCHIVED`) rejected with `400`
* [x] Valid transition (`ACTIVE → RESOLVED`) succeeds
* [x] Visitor message on a `RESOLVED` conversation reopens it to `ACTIVE`
* [x] Executive closes (REST) — conversation becomes `CLOSED`, and the
      visitor's widget now shows the closed state and disables its
      composer (this specific check failed on the first run, was fixed,
      and passed on re-run — see Notes in the phase's own session log for
      the exact bug)
* [x] Admin archives a `CLOSED` conversation — becomes `ARCHIVED`
* [x] A non-admin executive's archive attempt is rejected with `403`
* [x] Admin restores an `ARCHIVED` conversation — becomes `CLOSED` again
* [x] Full audit trail reflects every transition in order
* [ ] Visitor "End Chat" — not applicable, feature not built this sprint

Executive

* [x] Login
* [x] View assigned/claimed conversation in the queue and active panel
* [ ] View AI history — not applicable, no AI messages exist in the live
      system yet (verified the code path that would show them doesn't
      filter anything, but there is nothing to render yet)
* [x] Continue conversation after claiming

Admin

* [ ] View all conversations — no UI page exists yet; verified via direct
      API call instead (`GET /conversations` as Admin correctly returns
      every conversation, including ones assigned to other executives)
* [ ] Search/filter conversations — no UI page exists yet

## Sprint 1 Extension

* [x] A visitor message on a fresh, unclaimed conversation gets a real,
      knowledge-backed AI reply (verified live against the running app)
* [x] `chat:typing`/`chat:stop-typing` fire with `senderType: "AI"`
      around generation
* [x] AI-escalation ticket creation, called directly against the real
      database: creates a `source: AI`, `status: ASSIGNED` ticket with
      `createdBy: null`, subject built from the visitor's name
* [x] A second escalation call for the *same* conversation returns the
      existing ticket — no duplicate created
* [x] Two escalations for two *different* conversations were assigned to
      two *different* executives — round robin rotates rather than
      always picking the same one
* [x] An `ONLINE` executive already at/over `maxChats` is correctly
      excluded from round-robin candidates
* [x] Audit entries (`CREATED`, `ASSIGNED`) recorded with `performedBy:
      null` — no crash from the relaxed schema
* [x] Real executive/ticket state was fully restored after the direct-DB
      verification — no leftover test data, no altered `currentChats`/
      `lastAssignedAt` on the real, currently-connected executive

## Sprint 6 (rebuild)

* [x] Fresh visitor sees the optional name/email capture form; submitting
      it hides it and it does not reappear
* [x] A message containing a bare URL renders as a real, clickable link;
      sent messages show a real timestamp
* [x] Clicking "End Chat" shows a confirm dialog; confirming closes the
      conversation, ends the visitor session, and resets the widget all
      the way back to the launcher (the bug this rebuild caught)
* [x] Reopening after End Chat starts a genuinely fresh session (no
      leftover messages, name/email form appears again)
* [x] At a 375×667 mobile viewport, the widget fills the screen correctly
* [x] No console/page errors beyond the expected anonymous-session-refresh
      `401`

## Cross-Cutting Bug-List Pass

* [x] `/demo-embed.html` (simulating a third-party site) loads the widget
      via a single `<script src="/embed.js">` tag
* [x] The rest of the host page remains clickable around the widget
      (iframe resizes to the widget's footprint rather than covering the
      page)
* [x] Opening the widget inside the iframe grows it to the chat window's
      size; sending a message and getting an AI reply both work inside
      the iframe exactly as outside it
* [x] Ending the chat inside the iframe shrinks it back down to the
      launcher's small footprint
* [x] On a 375×667 mobile viewport, the widget goes fullscreen inside the
      iframe when opened
* [x] The staff app's `/` and `/dashboard` render no chat widget/launcher
      anywhere
* [x] Executive: `/conversations` lists the logged-in executive's own
      conversations (any status), and selecting one shows its full
      transcript
* [x] Admin: `/admin/conversations` lists every conversation company-wide,
      labels AI-only ones, and "Find Leads" deep-links into the Leads
      page with the Detect-from-Conversation dialog pre-filled and open
* [x] Conversation Queue now shows a short, readable visitor label
      instead of a wrapping raw UUID

## Executive Handoff Redesign

* [x] A normal question still gets a plain AI reply, no escalation
* [x] "I want to talk to a human" escalates immediately via
      `humanRequestDetector`, without waiting on/calling the LLM
* [x] Escalation broadcasts to two real, separately-logged-in executive
      sessions at once — both see the conversation appear in their queue,
      highlighted
* [x] The first executive to claim it sees "Locked to you"; the second
      executive's queue item disappears before they can also claim it —
      no double-claim possible
* [x] "Transfer" (with its confirmation dialog) unlocks the conversation,
      clears the first executive's lock, and re-broadcasts it with a
      "Transferred" highlight to the remaining executive
* [x] The second executive claims the transferred conversation
* [x] Refreshing the second executive's page after claiming redirects
      them straight back into the same locked, `ACTIVE` conversation
      (`resumeLockedConversation`)
* [x] A temporary, throwaway executive account was used for the second
      session and deleted afterward — the project owner's own real,
      already-online executive session was never touched or interfered
      with during verification

---

# Quality Gate

* [x] Project builds successfully (backend + frontend lint both clean)
* [x] No compilation errors
* [x] No TODO or placeholder code
* [x] Documentation updated (`DATABASE.md`, `API_SPEC.md`,
      `SOCKET_EVENTS.md`, this file)
* [x] APIs documented
* [x] Database documentation updated
* [x] Socket events documented
* [x] Manual testing completed (see checklist above — two items
      explicitly marked not-applicable since their features weren't in
      this sprint's scope, not because they were skipped)
* [x] Acceptance criteria satisfied (all nine of Sprint 1's original
      objectives addressed — three were already true and verified, six
      required real changes; see "What this sprint actually found and
      built" above)

Sprint 1 is **Complete**.

## Sprint 1 Extension

* [x] Project builds successfully (backend + frontend lint both clean)
* [x] No compilation errors
* [x] No TODO or placeholder code
* [x] Documentation updated (`DATABASE.md`, `API_SPEC.md`,
      `SOCKET_EVENTS.md`, `IMPLEMENTATION_STATUS.md`, this file)
* [x] Root cause (missing AI-reply caller, doc/code drift) identified and
      explained before any code was written
* [x] Manual testing completed (live Playwright run + direct-DB
      escalation/round-robin verification, both passing)
* [x] Acceptance criteria satisfied (all required lifecycle behaviors
      either already true from Sprint 1 or built this pass)
* [x] No unrelated modules refactored — AI Engine/Context Builder/Prompt
      Builder/Retriever/Knowledge Service untouched

This extension is **Complete**.

## Sprint 6 (rebuild)

* [x] Project builds successfully (backend + frontend lint both clean)
* [x] No compilation errors
* [x] No TODO or placeholder code
* [x] Documentation updated
* [x] Manual testing completed (Playwright, full flow including the
      `endChat`/`isOpen` bug found and fixed)
* [x] Acceptance criteria satisfied

Sprint 6 is **Complete** (again).

## Cross-Cutting Bug-List Pass

* [x] Project builds successfully (backend + frontend lint both clean)
* [x] No compilation errors
* [x] No TODO or placeholder code
* [x] Documentation updated
* [x] Root cause investigated for every item before building anything
      (including discovering the prior revert) rather than assuming the
      bug list described new problems
* [x] Manual testing completed (Playwright: embed/iframe resize, full
      chat+AI-reply flow inside the iframe, mobile fullscreen, staff-app
      isolation, both new conversation-visibility pages)
* [x] Acceptance criteria satisfied — all 10 reported items addressed,
      either fixed, confirmed already working, or explicitly scoped as a
      known limitation (see Known Issues)

This pass is **Complete**.

## Executive Handoff Redesign

* [x] Project builds successfully (backend + frontend lint both clean)
* [x] No compilation errors
* [x] No TODO or placeholder code
* [x] Documentation updated (`DATABASE.md`, `API_SPEC.md`,
      `SOCKET_EVENTS.md`, `IMPLEMENTATION_STATUS.md`, this file)
* [x] Manual testing completed (live Playwright run with two real
      executive sessions plus a visitor widget session — see Manual
      Testing Checklist above)
* [x] Acceptance criteria satisfied — every item in this section's Task
      Checklist above addressed
* [x] Temporary test data (throwaway executive account) created for
      verification was deleted afterward; no leftover test data or
      altered state on any real account

This redesign is **Complete**.

---

# Changelog

## Sprint 1 — 2026-07-07

* Redesigned the Conversation status lifecycle: removed the dead
  `HANDOFF` value, made `RESOLVED` a real wired state, added `ARCHIVED`,
  with explicit transition validation (`VALID_STATUS_TRANSITIONS`).
* Added `conversation_audit_logs` — full assignment/status history,
  mirroring `ticket_audit_logs`.
* Added `reassign`/`archive`/`restore` (admin-only) and a corrected
  `assertAccessible` scoping rule (shared-queue-aware, unlike Tickets'
  strict-ownership rule) to close a real, previously-unscoped-by-default
  REST access gap.
* Fixed two real bugs: `chat:message` never checked conversation status
  before persisting (could send into a `CLOSED` conversation forever),
  and the REST close path never broadcast `conversation:closed` to the
  visitor at all (only the socket path did) — both caught via this
  sprint's own end-to-end verification, not assumed from a code read.
* Chat Widget now shows a real closed-conversation state instead of
  silently accepting further input with no feedback.
* Added a conversation-existence check to ticket creation.

## Sprint 1 Extension — 2026-07-08

* Rebuilt the AI reply pipeline: `chatReplyService.generateReply()`
  (new, `ai` module) is now the real caller of the previously-unwired
  `aiEngine.generateResponse` — visitor messages on an unclaimed
  conversation get a genuine, knowledge-backed AI reply. Corrects a
  doc/implementation mismatch where `API_SPEC.md` already described this
  as built when it wasn't.
* Added automatic ticket escalation: when the AI can't resolve a
  question, `ticketService.createFromAiEscalation()` opens a `source: AI`
  ticket linked to the same conversation (skipping duplicates for an
  already-open one), named from the visitor's stated name when known.
* Added round-robin executive allocation:
  `executiveService.pickNextForRoundRobin()` assigns the escalation
  ticket to the least-recently-assigned `ONLINE` executive with spare
  capacity, and that executive gets a targeted notification instead of
  the whole room being blindly broadcast to.
* Relaxed `Ticket.createdBy`/`TicketAudit.performedBy` to nullable — a
  system/AI-created ticket has no human creator or performer.

## Sprint 6 (rebuild) — 2026-07-08

* Rebuilt Sprint 6 in full after discovering it (and the AI Reply
  Pipeline) had been lost from the working tree by an uncommitted
  revert — same design as before, re-verified end-to-end.
* Found and fixed one genuinely new bug during the rebuild: `endChat()`
  never reset `isOpen`, so ending the chat left an empty, disconnected
  `ChatWindow` on screen instead of reverting to the launcher.

## Cross-Cutting Bug-List Pass — 2026-07-08

* Split the frontend into two independent Vite bundles: the staff app
  (`index.html`/`App.jsx` — Login/Executive/Admin, no chat widget ever
  rendered) and the embeddable widget (`widget.html`/`WidgetApp.jsx`).
* Added `public/embed.js`, a vanilla-JS loader any external website can
  include via one `<script>` tag — it loads the widget in an iframe
  resized (via `postMessage`) to match the widget's own footprint,
  rather than covering the whole host page.
* Added `ConversationHistoryPage.jsx` (Executive: view all of one's own
  handled conversations, any status) and `AdminConversationsPage.jsx`
  (Admin: view every conversation company-wide, AI-only or
  executive-handled, with a "Find Leads" deep link into the existing
  Leads detection flow) — both reused existing, already-correctly-scoped
  backend endpoints with no backend changes.
* Fixed a real readability bug in `ConversationQueue.jsx`: it showed a
  visitor's full raw UUID, which wrapped awkwardly; now shows a short,
  readable label.

## Executive Handoff Redesign — 2026-07-08

* Added `humanRequestDetector` (deterministic, pre-LLM) and a new
  `ESCALATED` conversation status — a conversation is never claimable
  until the AI fails or the visitor explicitly asks for a human.
* Fixed the chatbot's hallucinated email/link handoff by constraining
  `system.md` (file default and the live published database override)
  to only ever promise an in-chat handoff.
* Built, then same-day replaced, round-robin executive allocation with
  broadcast-and-claim: escalation now notifies every `ONLINE` executive
  with no pre-assignment; whichever executive's `chat:join` arrives
  first locks the conversation.
* Added "Transfer" (`chat:transfer` + a confirmation-guarded button) —
  unlocks an `ACTIVE` conversation and re-broadcasts it exactly like a
  fresh escalation.
* Added refresh-redirect (`resumeLockedConversation`, run on every
  socket reconnect) and a `beforeunload` warning, so an executive can't
  casually abandon a locked conversation.
* Added dashboard highlighting: persistent sound-accompanied toasts,
  colored/chip-tagged queue items for new and transferred conversations,
  and a "Locked to you" indicator on the active chat panel.
* Removed `executiveService.pickNextForRoundRobin()`,
  `executive.lastAssignedAt`, and `conversationService.reserveForExecutive()`
  as dead code under the new model; `ticketService.createFromAiEscalation`
  no longer takes an assignee and always creates the ticket unassigned.

---

# Next Sprint

Sprint 2 – Executive Workspace Improvements (remaining scope) and
Sprint 3 – Admin Portal Improvements (remaining scope)

Sprint 2 remaining focus areas

* Chat search
* Richer filters
* Chat timeline view (`GET /conversations/:id/audit` is already
  available to power this directly)

Sprint 3 remaining focus areas

* Pagination on the new Admin Conversations page (currently capped at
  100 results with no page control)
* Broader Admin Portal conversation-management tooling beyond
  view/search

---

**Last Updated**

2026-07-08 (Cross-Cutting Bug-List Pass complete — Sprint 6 rebuilt, embeddable widget architecture and Executive/Admin conversation visibility added; Sprint 2 and Sprint 3 remain partially open)
