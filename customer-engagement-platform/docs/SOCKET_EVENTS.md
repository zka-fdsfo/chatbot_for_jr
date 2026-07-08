# Socket Events

# AI Customer Engagement Platform

## 1. Purpose

This document is the source of truth for the platform's Socket.io event
contract, mirroring how `API_SPEC.md` documents the REST contract. It did
not exist before Phase 8 (Conversation System) — created then, seeded with
the chat events built in that phase. Update it whenever an event is added,
changed, or removed, per `CODING_STANDARDS.md` and `ARCHITECTURE.md`.

Socket.io is infrastructure (`src/socket/`), not a business module — per
`ARCHITECTURE.md` §12, it only handles connection, rooms, and event
relay/persistence orchestration. The actual business logic (creating
conversations, saving messages, marking things read) lives in the `chat`
module's services (`backend/src/modules/chat/service/`), called from the
event handlers in `src/socket/events/chatEvents.js`.

---

# 2. Connecting

Both visitor and staff (Executive/Admin) clients connect to the same
Socket.io server, authenticating differently. Auth happens once, at the
handshake — there's no re-authentication per event — via
`socket.handshake.auth`, per `AUTHENTICATION.md` §13:

```js
// Visitor client
io(SOCKET_URL, { auth: { visitorToken: '<jwt from POST /api/v1/visitors/sessions>' } });

// Executive/Admin client
io(SOCKET_URL, { auth: { accessToken: '<jwt from POST /api/v1/auth/login>' } });
```

`src/socket/middleware/socketAuthenticate.js` runs on every connection
attempt:

- `accessToken` present → verified the same way as `middleware/authenticate.js`
  (re-fetches the user, rejects `INACTIVE`/`LOCKED` accounts); sets
  `socket.data.user`.
- `visitorToken` present → delegates to `visitorService.restoreSession`
  (the same function `GET /api/v1/visitors/sessions/me` uses) — this also
  **rotates** the visitor token, same as the REST endpoint. Sets
  `socket.data.visitor` and `socket.data.visitorSession`.
- Neither present, or verification fails → the connection is rejected
  (`next(new Error(...))`); the client never reaches `connection`.

If the visitor token was rotated during authentication, the server emits
`visitor:token-renewed` (see §7) immediately after connection so the client
can update its stored token — exactly like the REST endpoint returning a
new token on every call.

---

# 3. Rooms

One room per conversation: `conversation:{conversationId}`. Clients join by
emitting `chat:join` (§4); all subsequent `chat:message`/`chat:typing`/
`chat:stop-typing`/`chat:read` events for that conversation are broadcast to
that room only.

---

# 4. chat:join

Client → Server. Joins (or starts) a conversation.

```json
{ "conversationId": "optional-uuid" }
```

- **Visitor**, `conversationId` omitted: finds the visitor's open
  conversation (`status` in `ACTIVE`/`ESCALATED`/`WAITING`/`RESOLVED`) or
  creates a new one (`status: WAITING` as of Phase 10 — see §12
  Conversation Queue). This is "Restore Previous Conversation" from
  `CHAT_WIDGET.md` §7 — a visitor reconnecting resumes the same
  conversation rather than starting a new one every time.
- **Visitor**, `conversationId` provided: joins only if
  `conversation.visitorId` matches the connected visitor — otherwise
  errors (see `chat:error`).
- **Executive/Admin**: `conversationId` is required (staff must pick which
  conversation to join). **Executive Handoff Redesign:** the conversation
  must already be `ESCALATED` (or later) — joining a plain `WAITING`
  conversation is rejected outright (`403`-equivalent socket error, "This
  conversation has not been escalated to a human yet"); the AI is still
  handling it and no executive may claim it. An `ESCALATED` conversation
  is never pre-assigned — escalation broadcasts to every `ONLINE`
  executive (§5, §13) with no server-side picking, so **whichever
  executive calls `chat:join` first locks it**: `assignedExecutiveId` is
  set, `status` becomes `ACTIVE`, the executive's `currentChats`
  increments, an `ASSIGNED` entry is recorded in the conversation's audit
  trail, and `conversation:assigned` is broadcast — see §12. A `SYSTEM`
  message ("`{name}` has joined the chat and is now assisting you.") is
  persisted and broadcast to the conversation room — "once the executive
  is assigned, mention the executive name is connected and available to
  chat." If already assigned to a *different* executive (someone else won
  the race, or already holds it after a previous claim), the join is
  rejected (`403`-equivalent socket error) — per `EXECUTIVE_DASHBOARD.md`
  §18, "Executives may access only assigned conversations." This
  atomic already-assigned check is the *entire* locking mechanism — there
  is no separate lock primitive. Rejoining a conversation already `ACTIVE`
  for the same executive is a no-op (just re-joins the room, no second
  join message) — this is also how "refresh redirects the executive back
  to their locked chat" is implemented client-side (the workspace re-calls
  `chat:join` for its own `ACTIVE` conversation on every reconnect).

Supports an acknowledgement callback (`socket.emit('chat:join', payload, ack)`)
in addition to the `chat:joined` broadcast below — use whichever fits the
client.

## chat:joined (Server → Client)

```json
{
  "conversation": { "conversationId": "...", "visitorId": "...", "status": "ACTIVE", "channel": "WEB", "startedAt": "..." },
  "messages": [ /* up to the last 50 messages, oldest first */ ]
}
```

---

# 5. chat:message

Bidirectional — same event name for sending and receiving.

Client → Server

```json
{ "conversationId": "...", "message": "Hello", "messageType": "TEXT" }
```

`messageType` is optional, defaults to `TEXT` (`TEXT`, `SYSTEM`, `LINK`,
`QUICK_REPLY` — see `DATABASE.md` §9). `senderType`/`senderId` are never
accepted from the client — they're derived server-side from the
authenticated socket (`VISITOR` + the visitor's `visitorId`, or `EXECUTIVE`
+ the user's id), so a client can never impersonate a different sender.

Server → Client (broadcast to `conversation:{conversationId}`, including
back to the sender, once persisted)

```json
{
  "_id": "...",
  "conversationId": "...",
  "senderType": "VISITOR",
  "senderId": "5d1f...uuid",
  "message": "Hello",
  "messageType": "TEXT",
  "sentAt": "2026-07-03T12:00:00.000Z",
  "readAt": null
}
```

Errors (empty message, message over 4000 characters, missing
`conversationId`) are reported via `chat:error` (§8) and the ack callback,
not thrown as uncaught exceptions.

**Sprint 2 (Conversation Lifecycle Redesign):** a message is now rejected
(`chat:error`, "This conversation has ended and can no longer receive
messages.") if the conversation's status is `CLOSED` or `ARCHIVED` —
previously there was no check at all, and a message could be sent into a
dead conversation indefinitely. A visitor message arriving on a
`RESOLVED` conversation automatically reopens it to `ACTIVE` (a
`STATUS_CHANGED` audit entry is recorded, attributed to the assigned
executive) — mirrors real support-desk behavior and gives `RESOLVED` a
real exit path back to `ACTIVE` instead of being a dead end.

**Conversation Lifecycle Sprint / Executive Handoff Redesign:** a visitor
message on a `WAITING` conversation (still AI-only, not yet escalated —
the ordinary case for every new visitor) triggers a real AI reply. The
server emits `chat:typing` (`senderType: "AI"`), calls
`chatReplyService.generateReply()` (the existing Phase 7
`aiEngine.generateResponse`, retrieving company knowledge via the Phase
16 Retriever), persists the result as a `SENDER_TYPE.AI` message, and
broadcasts it over this same `chat:message` event — then emits
`chat:stop-typing` (`senderType: "AI"`). This is fire-and-forget relative
to the visitor's own message: their `ack` returns immediately.

The conversation escalates (`WAITING -> ESCALATED`) when either:

- the AI reply falls back (couldn't answer at all — an empty completion
  or a provider error), or
- the visitor's message matches `humanRequestDetector` — a deterministic
  keyword check ("talk to a human", "speak with an agent", "connect me
  with someone", etc.) run *before* ever calling the LLM. In this case
  the AI's own reply is a fixed acknowledgment (the `ESCALATION` prompt
  type, e.g. "Sure — connecting you with a member of our team now.") —
  not a real model call, since there's nothing to answer.

Either way, escalation creates a support ticket (`OPEN`, unassigned — see
§12's `TICKET_CREATED` note) and broadcasts `notification:new`
(`CONVERSATION_ESCALATED`, §12) to every socket in the `executives` room
— it never pre-assigns an executive. A `SYSTEM` message is
persisted/broadcast: "Connecting you with a member of our team. They'll
join this chat shortly." if at least one executive is currently `ONLINE`
(so a claim is possible), or "All of our team members are currently
busy. We'll connect you with someone as soon as they're available." if
none are online at all. Either way the conversation sits `ESCALATED`,
unassigned, in the shared queue until some executive calls `chat:join`
and wins the first-to-claim race (§4).

A visitor message on a conversation that's `ESCALATED` or later, **with**
an assigned executive, instead triggers a `notification:new` event (§12)
targeted at that executive, in addition to the room broadcast above — so
the executive finds out even if they aren't currently viewing that
specific conversation (whether they've actually opened it yet or not). A
visitor message on an `ESCALATED`-but-*unassigned* conversation (nobody
was available at escalation time) gets no further AI reply and no
notification — the AI has already tried and can't help further, and
there's no executive to notify yet. The AI never replies once a
conversation has left `WAITING` — matches `ARCHITECTURE.md`'s
"Executives always continue the existing conversation" principle.

---

# 6. chat:typing / chat:stop-typing

Client → Server and Server → Client (relayed to everyone else in the room —
the sender does not receive their own typing event back).

```json
{ "conversationId": "..." }
```

Server adds `senderType` when relaying:

```json
{ "conversationId": "...", "senderType": "VISITOR" }
```

Not persisted — purely ephemeral relay, per `ARCHITECTURE.md` §12 (Socket
is responsible for Typing as infrastructure, not stored state). The client
is responsible for clearing its own typing indicator after a timeout
(`CHAT_WIDGET.md` §13); the server does not auto-emit `chat:stop-typing`
for a `VISITOR`/`EXECUTIVE` sender.

**Conversation Lifecycle Sprint:** `senderType: "AI"` is now also a real
value here — the server emits it itself (there is no AI "socket") around
AI reply generation in §5, and unlike the visitor/executive case, the
server also auto-emits the matching `chat:stop-typing` once generation
finishes or fails.

---

# 7. chat:read

Client → Server: marks every message in the conversation **not sent by the
reader's own sender type** as read (i.e. a visitor reading marks
Executive/AI/System messages read; an Executive reading marks Visitor
messages read).

```json
{ "conversationId": "..." }
```

Server → Client (broadcast to the room)

```json
{ "conversationId": "...", "readBy": "VISITOR" }
```

Only a "read" state is tracked (`message.readAt`) — `CHAT_WIDGET.md` §14
also mentions a "Delivered" state, but in a real-time socket connection,
delivery is implicit (the client received the `chat:message` event) and
tracking it as a separate persisted state wasn't judged worth the added
complexity this phase.

---

# 8. chat:error (Server → Client only)

Emitted to the socket that caused the error (never broadcast to the room),
in addition to any ack callback's `{ success: false, message }`.

```json
{ "message": "conversationId is required." }
```

---

# 9. visitor:token-renewed (Server → Client only)

Emitted once, immediately after a visitor connects, if their `visitorToken`
was successfully rotated during handshake authentication (see §2).

```json
{ "visitorToken": "<new jwt>" }
```

The client must overwrite its stored visitor token with this value — the
old token is now invalid, exactly like the REST `GET /sessions/me` renewal.

---

# 10. chat:close

Client → Server. Either actor may close their own conversation — an
executive closing one assigned to them, or (Sprint 6) a visitor ending
their own chat ("End Chat"). Same event name for both; the server
branches on which kind of socket sent it (`socket.data.user` vs.
`socket.data.visitor`), rather than introducing a second, visitor-only
event name for the same underlying action.

```json
{ "conversationId": "..." }
```

Sets `status: CLOSED` and `endedAt`. If the caller is an executive,
decrements their `currentChats`. If the caller is the visitor
(`closeAsVisitor`), the conversation must belong to them, and closing
also fire-and-forget generates an AI conversation summary
(`summaryService.generate`) — the visitor never waits on it, and a
failure (e.g. no `GROQ_API_KEY` configured) is only logged, never
surfaced to them. Broadcasts `conversation:closed` (§12) to both the
conversation room and the shared executives room. Rejected (via the ack
callback) if an executive caller isn't the assigned executive, if a
visitor caller doesn't own the conversation, or if the transition itself
is invalid (e.g. an already-`CLOSED` conversation).

**Fix, still true today:** the conversation-room broadcast is emitted
centrally from `conversationService._applyTransition` (whichever path
reaches `CLOSED` — this socket event from either actor, or the REST
`POST /conversations/:id/close` / `PATCH /conversations/:id/status`
endpoints, all go through the same method). Caught during verification:
the REST close path previously never notified the visitor's client at
all — only this socket event did — so a conversation closed via REST
left the visitor's widget silently accepting (and losing) further
input. Centralizing the broadcast here is also what let the later
visitor-close path (`closeAsVisitor`) inherit the fix automatically
instead of needing the same bug fixed a second time.

---

# 11. chat:transfer

Client → Server. **Executive Handoff Redesign.** Executive-only — lets
the executive currently holding an `ACTIVE` conversation hand it back to
the shared queue instead of closing it, e.g. because they're busy or it
needs a different team member.

```json
{ "conversationId": "..." }
```

Requires the caller to be the conversation's `assignedExecutiveId`
(`403`-equivalent socket error otherwise, "You can only transfer
conversations assigned to you.") and the conversation to currently allow
an `ESCALATED` transition (`ACTIVE` only — `400`-equivalent error, "Cannot
transfer a {status} conversation." for anything else, e.g. already
`CLOSED`). On success:

- `assignedExecutiveId` is cleared and `status` returns to `ESCALATED`
  (`conversationService.transfer`).
- A `TRANSFERRED` entry is recorded in the conversation's audit trail
  (`details.from` is the transferring executive's user id).
- The transferring executive's `currentChats` is decremented.
- `notification:new` (`CONVERSATION_ESCALATED`, §13) is re-broadcast to
  the `executives` room with an added `transferredFrom` field, exactly
  like a fresh escalation — so every other `ONLINE` executive sees it
  reappear in their queue and can claim it via `chat:join` (§4), first to
  claim wins the lock, same as any other escalation.
- A `SYSTEM` message ("You're being transferred to another team member.
  Please hold — someone will join shortly.") is persisted and broadcast
  to the conversation room, so the visitor isn't left wondering why their
  executive went quiet.

Supports an acknowledgement callback the same way `chat:join` does
(`{ success: true, data: conversation }` or `{ success: false, message }`).
The transferring executive's own client clears its local "active
conversation" state immediately on a successful ack, rather than waiting
for a broadcast echo — they no longer own the conversation at all once
transfer succeeds.

---

# 12. Executive Presence and the Conversation Queue

Added in Phase 10. Every authenticated Executive/Admin socket
automatically joins a shared room, `executives`, on connection (visitors
never join it). This room is how "Conversation Queue" and "Notifications"
(`EXECUTIVE_DASHBOARD.md` §8, §14) stay live across every connected staff
member, without each of them having to be in a specific conversation's
room.

On connect: `executiveService.markOnline(userId, socket.id)` sets
`status: ONLINE` (`docs/DATABASE.md` §10). On disconnect:
`executiveService.markOffline(userId)` sets `status: OFFLINE`. Manually
setting `BUSY`/`AWAY`/`BREAK` is a REST call
(`PATCH /api/v1/executives/me/status`, see `API_SPEC.md`), not a socket
event — status changes aren't necessarily tied to a connection event.

## executive:status-updated (Server → the connecting socket only)

```json
{ "status": "ONLINE" }
```

Emitted once, right after `markOnline` resolves on connect. The
Executive Dashboard's Availability control fetches its initial status via
`GET /api/v1/executives/me` on mount, which can race the socket's own
`markOnline` write (both happen at page load) — this event tells that
specific client once its own presence transition has actually landed, so
the UI doesn't get stuck showing a stale pre-connection status.

## conversation:assigned (Server → `executives` room)

Emitted when a conversation transitions from unassigned to assigned (i.e.
an executive's `chat:join` claimed it — see §4).

```json
{ "conversation": { "conversationId": "...", "status": "ACTIVE", "assignedExecutiveId": "..." }, "executiveId": "..." }
```

Other executives use this to remove the conversation from their own queue
view in real time.

## conversation:closed (Server → conversation room AND `executives` room)

Emitted when `chat:close` (§10) succeeds.

```json
{ "conversation": { "conversationId": "...", "status": "CLOSED", "endedAt": "..." } }
```

---

# 13. notification:new (Server → a specific executive, or the `executives` room)

Structured notifications, distinct from raw `chat:message`/`conversation:*`
events, so a client can show a notification badge/toast without needing to
be watching every room. Per `EXECUTIVE_DASHBOARD.md` §14, notifications
should not interrupt an active conversation — this is left to the client
(e.g. suppress the toast if `conversationId` matches the one currently
open).

```json
{ "type": "CONVERSATION_ESCALATED", "conversation": { "...": "..." } }
{ "type": "CONVERSATION_ESCALATED", "conversation": { "...": "..." }, "transferredFrom": "executiveUserId" }
```

**Executive Handoff Redesign renamed and repurposed this** (previously
`NEW_CONVERSATION`, and previously fired for *any* visitor starting or
resuming a conversation). It now fires in exactly two cases, both
broadcast to the whole `executives` room since there is deliberately no
server-side picking of a recipient — "notify all employees":

- A fresh escalation (§5) — always, regardless of how many executives are
  `ONLINE`, since the conversation is always created unassigned now.
- A `chat:transfer` (§11) — with `transferredFrom` set to the transferring
  executive's user id, so clients can distinguish "brand-new visitor
  request" from "a colleague just gave this up" in their toast wording.

Every connected executive's queue should treat this as "an escalated,
unclaimed conversation is now waiting — first to `chat:join` locks it"
and prepend it, highlighted, to their queue view.

```json
{ "type": "VISITOR_REPLY", "conversationId": "...", "executiveId": "...", "message": { "...": "..." } }
```

Broadcast to the whole `executives` room (not targeted to a single
socket — Socket.io rooms don't have a built-in per-user filter without
tracking socket IDs per user, and an executive may have multiple tabs
open) whenever a visitor sends a message on a conversation that already
has an assigned executive (`ACTIVE`). Clients should compare
`executiveId` against their own user id and ignore notifications meant
for someone else.

`AI_HANDOFF` (`EXECUTIVE_DASHBOARD.md` §14) is implemented in spirit as
the escalation flow described in §5 — there's no separate notification
type by that exact name, since `TICKET_CREATED` (below) and
`CONVERSATION_ESCALATED` (above) already cover it end to end.
`ASSIGNMENT_CHANGES` is covered by `conversation:assigned` (§12) plus
these same ticket notifications.

Seven more `type`s were added in Phase 12 for Ticket System events
(`TICKET_SYSTEM.md` §16), all broadcast to the whole `executives` room by
the `ticket` module's REST controllers (not a socket event handler — see
`socket/ioRegistry.js`, a small module-level registry that lets a plain
Express request handler reach the same `io` instance the socket layer
uses):

```json
{ "type": "TICKET_CREATED", "ticket": { "...": "..." } }
{ "type": "TICKET_ASSIGNED", "ticket": { "...": "..." }, "assignedExecutiveId": "..." }
{ "type": "TICKET_REASSIGNED", "ticket": { "...": "..." }, "assignedExecutiveId": "..." }
{ "type": "TICKET_STATUS_CHANGED", "ticket": { "...": "..." }, "from": "...", "to": "..." }
{ "type": "TICKET_CLOSED", "ticket": { "...": "..." }, "from": "...", "to": "CLOSED" }
{ "type": "TICKET_REOPENED", "ticket": { "...": "..." }, "from": "...", "to": "REOPENED" }
{ "type": "TICKET_NOTE_ADDED", "ticket": { "...": "..." }, "assignedExecutiveId": "..." }
```

Same client-filtering convention as `VISITOR_REPLY`: types carrying an
`assignedExecutiveId` are meant for that one executive (compare against
the client's own user id); `TICKET_CREATED` has none and is relevant to
every connected executive (a new, likely-unassigned ticket). No new
socket event name or room was introduced — this reuses `notification:new`
and the `executives` room exactly as Phase 10 established, rather than
adding per-domain socket events for every module going forward.

**Conversation Lifecycle Sprint, superseded by the Executive Handoff
Redesign:** when the AI can't resolve a visitor's question (or the
visitor asks for a human), an escalation ticket (`source: AI`) is
auto-created via `ticketService.createFromAiEscalation` — this reuses
the plain `TICKET_CREATED` `type` string above, broadcast room-wide
exactly as a manually-created ticket would be. The ticket is always
`OPEN`/unassigned at creation now — there is no `TICKET_ASSIGNED` emit at
escalation time, and no targeted per-executive `socketId` emit either,
since there's no assignee yet to target (the original round-robin design
had both; both were removed along with `createFromAiEscalation`'s
assignee parameter). An executive only becomes associated with the
underlying *conversation* (not the ticket) once they win the
first-to-claim race via `chat:join` (§4). `TICKET_ASSIGNED` is still
emitted, room-wide only (no targeted socket), by the separate manual
reassignment path (`PATCH /api/v1/tickets/:id/assign`).

Five more `type`s were added in Phase 13 for Lead Management events
(`LEAD_MANAGEMENT.md` §17), same reused event/room, same
`assignedExecutiveId` filtering convention:

```json
{ "type": "LEAD_CREATED", "lead": { "...": "..." } }
{ "type": "LEAD_ASSIGNED", "lead": { "...": "..." }, "assignedExecutiveId": "..." }
{ "type": "LEAD_UPDATED", "lead": { "...": "..." }, "assignedExecutiveId": "..." }
{ "type": "LEAD_CONVERTED", "lead": { "...": "..." }, "assignedExecutiveId": "..." }
{ "type": "FOLLOW_UP_SCHEDULED", "lead": { "...": "..." }, "assignedExecutiveId": "..." }
```

`LEAD_UPDATED` is broadcast for general edits, status changes (including
`LOST`), and any other mutation that doesn't have its own more specific
type — mirroring `TICKET_STATUS_CHANGED`'s role but consolidated into one
type rather than one per status, since Lead Management's explicit scope
this phase didn't include the same fine-grained per-status notification
detail as Tickets. No `LEAD_FOLLOW_UP_DUE` exists — see
`docs/API_SPEC.md` §15's note on why (no scheduler/cron infrastructure).

Four more `type`s were added in Sprint 2 (Conversation Lifecycle
Redesign) for the new `PATCH /:id/status`, `PATCH /:id/assign`,
`POST /:id/archive`, and `POST /:id/restore` REST endpoints — same
reused event/room, deliberately **not** the separate `snake_case` event
names originally sketched in `IMPROVEMENT_STATUS.md`'s Sprint 2 planning
list (`ticket_created`, `conversation_closed`, etc.), to avoid two
parallel, overlapping event vocabularies for the same concepts:

```json
{ "type": "CONVERSATION_STATUS_CHANGED", "conversation": { "...": "..." }, "from": "ACTIVE", "to": "RESOLVED" }
{ "type": "CONVERSATION_REASSIGNED", "conversation": { "...": "..." }, "assignedExecutiveId": "..." }
{ "type": "CONVERSATION_ARCHIVED", "conversation": { "...": "..." } }
{ "type": "CONVERSATION_RESTORED", "conversation": { "...": "..." } }
```

---

# 14. Not Yet Implemented

- ~~AI-generated responses within a conversation~~ — **implemented**; see
  §5's "Conversation Lifecycle Sprint" note.
- "Seen by Executive" read-receipt granularity beyond the single `readAt`
  timestamp (`CHAT_WIDGET.md` §14's "Future support").
- Department/skill/priority-based queue routing (`EXECUTIVE_DASHBOARD.md`
  §8 lists these alongside Availability/Workload) — the Executive Handoff
  Redesign's broadcast-and-claim allocation (§4/§5/§13) notifies every
  `ONLINE` executive equally and lets whoever accepts first lock the
  chat; it is not department/skill/priority-aware, and there's no
  capacity- or fairness-based picking either (that was the earlier,
  superseded round-robin design).
- `notification:new` targeted delivery to a single executive's socket(s)
  specifically — no longer implemented anywhere (the old round-robin
  `TICKET_ASSIGNED` targeted emit was removed along with round-robin
  itself); every notification type is broadcast to the whole `executives`
  room, with a client-side `executiveId`/`assignedExecutiveId` filter
  where relevant.
- Real-time Admin Dashboard metrics (`ADMIN_PANEL.md` §21 lists "Dashboard
  Metrics" as a socket update) — Phase 11 built
  `GET /api/v1/admin/dashboard/metrics` (`API_SPEC.md` §13) as a
  frontend-polled REST endpoint instead, to keep the phase bounded; no
  `dashboard:metrics` (or similar) event exists.
- AI Errors and Failed Jobs notifications to admins (`ADMIN_PANEL.md`
  §17) — no admin-facing error/notification channel exists; only
  executive-facing `notification:new` (§13).

# 15. Reconciled: "Additional Socket Events" (Sprint 2)

`IMPROVEMENT_STATUS.md`'s Sprint 2 planning list sketched seven
`snake_case` events "required to support the complete conversation
lifecycle." Sprint 2 (Conversation Lifecycle Redesign) deliberately did
**not** implement them as new, separate event names — doing so would
have created two parallel, overlapping event vocabularies for the same
concepts (this doc's existing convention is colon-namespaced events plus
`notification:new` `type`s, not `snake_case` event names). Here's what
each one maps to instead:

| Planned event | Resolution |
|---|---|
| `conversation_restored` | Already covered by construction — `chat:join` with no `conversationId` resumes the visitor's existing open conversation (`WAITING`/`ACTIVE`/`RESOLVED`) automatically; no new event needed. |
| `ticket_created` | Already covered — the existing `notification:new` type `TICKET_CREATED` (Phase 12). |
| `conversation_closed` | Already existed, but Sprint 2 fixed a real bug in it: the REST close path never broadcast it at all (see §10's Sprint 2 note) — now centralized so every path that closes a conversation notifies the visitor consistently. |
| `conversation_reopened` | Implicitly satisfied — a `RESOLVED` conversation reopens to `ACTIVE` on the visitor's own next message (§5), and since they're already in that same room, the conversation simply continues working with no separate event needed. |
| `executive_joined` | **Not implemented — a genuine remaining gap.** `conversation:assigned` tells the `executives` room a claim happened, but the *visitor* is never told "an executive has joined your chat" — they'd only infer it once the executive's first message arrives. Worth a small, real addition in a future sprint. |
| `executive_left` | **Not implemented.** Would require presence tracking scoped to a specific conversation (not just global online/offline), which doesn't exist. |
| `session_ended` | **Not implemented — a different concept than conversation closing.** This is about the visitor's `visitor_sessions` record (Phase 5), which still has no "end session" route at all (a Known Issue since Phase 5) — out of this sprint's scope, which was conversation lifecycle specifically. |

## Socket Design Principles

* Socket events must always reference an existing Conversation ID.
* Socket events must never create duplicate conversations.
* Reconnection should restore the previous conversation whenever possible.
* Events should be idempotent where applicable.
* Conversation state must remain synchronized between Visitor, AI, Executive, and Admin clients.