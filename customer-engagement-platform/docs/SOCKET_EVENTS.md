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
  conversation (`status` in `ACTIVE`/`WAITING`/`HANDOFF`) or creates a new
  one (`status: WAITING` as of Phase 10 — see §11 Conversation Queue). This
  is "Restore Previous Conversation" from `CHAT_WIDGET.md` §7 — a visitor
  reconnecting resumes the same conversation rather than starting a new one
  every time.
- **Visitor**, `conversationId` provided: joins only if
  `conversation.visitorId` matches the connected visitor — otherwise
  errors (see `chat:error`).
- **Executive/Admin**: `conversationId` is required (staff must pick which
  conversation to join). If the conversation is unassigned, joining
  **claims** it (`assignedExecutiveId` is set, `status` becomes `ACTIVE`,
  the executive's `currentChats` increments, an `ASSIGNED` entry is
  recorded in the conversation's audit trail — Sprint 2, "Preserve
  executive assignment history" — and `conversation:assigned` is
  broadcast — see §11). If already assigned to a *different* executive, the
  join is rejected (`403`-equivalent socket error) — per
  `EXECUTIVE_DASHBOARD.md` §18, "Executives may access only assigned
  conversations." Rejoining a conversation already assigned to the same
  executive is a no-op (just re-joins the room).

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

Note: no AI response is generated yet. This phase persists and relays
visitor/executive messages only — wiring `aiEngine.generateResponse` (built
in Phase 7) into this flow was explicitly out of scope this phase; a
visitor message currently gets no automatic reply.

A visitor message on a conversation that has an assigned executive also
triggers a `notification:new` event (§12) targeted at that executive, in
addition to the room broadcast above — so the executive finds out even if
they aren't currently viewing that specific conversation.

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
(`CHAT_WIDGET.md` §13); the server does not auto-emit `chat:stop-typing`.

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

Client → Server. Executive-only — closes a conversation assigned to them.

```json
{ "conversationId": "..." }
```

Sets `status: CLOSED` and `endedAt`, decrements the executive's
`currentChats`. Broadcasts `conversation:closed` (§11) to both the
conversation room and the shared executives room. Rejected (via the ack
callback) if the caller isn't the assigned executive, or isn't an
executive at all.

**Sprint 2 fix:** the conversation-room broadcast is now emitted
centrally from `conversationService.updateStatus` (whichever path reaches
`CLOSED` — this socket event, or the REST `POST /conversations/:id/close`
/ `PATCH /conversations/:id/status` endpoints, all go through the same
method). Caught during this sprint's own verification: the REST close
path previously never notified the visitor's client at all — only this
socket event did — so a conversation closed via REST left the visitor's
widget silently accepting (and losing) further input.

---

# 11. Executive Presence and the Conversation Queue

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

# 12. notification:new (Server → a specific executive, or the `executives` room)

Structured notifications, distinct from raw `chat:message`/`conversation:*`
events, so a client can show a notification badge/toast without needing to
be watching every room. Per `EXECUTIVE_DASHBOARD.md` §14, notifications
should not interrupt an active conversation — this is left to the client
(e.g. suppress the toast if `conversationId` matches the one currently
open).

Two `type`s exist so far:

```json
{ "type": "NEW_CONVERSATION", "conversation": { "...": "..." } }
```

Broadcast to the whole `executives` room whenever a visitor starts (or
resumes) a conversation via `chat:join` with no `conversationId` — lets
every connected executive's queue update live.

```json
{ "type": "VISITOR_REPLY", "conversationId": "...", "executiveId": "...", "message": { "...": "..." } }
```

Broadcast to the whole `executives` room (not targeted to a single
socket — Socket.io rooms don't have a built-in per-user filter without
tracking socket IDs per user, and an executive may have multiple tabs
open) whenever a visitor sends a message on a conversation that already
has an assigned executive. Clients should compare `executiveId` against
their own user id and ignore notifications meant for someone else.

Not implemented: `AI_HANDOFF` and `ASSIGNMENT_CHANGES` notification types
(`EXECUTIVE_DASHBOARD.md` §14) — there's no automatic AI handoff yet (no
Escalation Detection, no AI Responses in `chat:message`), and assignment
only ever changes via `chat:join`'s claim, which already has its own
`conversation:assigned` event.

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

# 13. Not Yet Implemented

- AI-generated responses within a conversation (see §5 note) — the AI
  Engine (Phase 7) still has no caller in `chat:message`.
- "Seen by Executive" read-receipt granularity beyond the single `readAt`
  timestamp (`CHAT_WIDGET.md` §14's "Future support").
- Department/skill/priority-based queue routing (`EXECUTIVE_DASHBOARD.md`
  §8 lists these alongside Availability/Workload) — any available
  executive can currently claim any waiting conversation; there's no
  routing logic beyond "first to join wins."
- `notification:new` targeted delivery to a single executive's socket(s)
  specifically (currently broadcast to the whole `executives` room with a
  client-side `executiveId` filter — see §12).
- Real-time Admin Dashboard metrics (`ADMIN_PANEL.md` §21 lists "Dashboard
  Metrics" as a socket update) — Phase 11 built
  `GET /api/v1/admin/dashboard/metrics` (`API_SPEC.md` §13) as a
  frontend-polled REST endpoint instead, to keep the phase bounded; no
  `dashboard:metrics` (or similar) event exists.
- AI Errors and Failed Jobs notifications to admins (`ADMIN_PANEL.md`
  §17) — no admin-facing error/notification channel exists; only
  executive-facing `notification:new` (§12).

# 14. Reconciled: "Additional Socket Events" (Sprint 2)

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