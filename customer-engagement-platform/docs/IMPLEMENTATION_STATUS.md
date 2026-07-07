Implementation Status
Project: AI Customer Engagement Platform

Current Phase: Phase 17 – Production

Last Updated: 2026-07-07 (Phase 16 complete)

---

Overall Progress
| Phase | Status | Progress |
|--------|--------|----------|
| Documentation | ✅ Complete | 100% |
| Phase 1 – Project Initialization | 🟩 Complete | 100% |
| Phase 2 – Backend Foundation | 🟩 Complete | 100% |
| Phase 3 – Frontend Foundation | 🟩 Complete | 100% |
| Phase 4 – Authentication | 🟩 Complete | 100% |
| Phase 5 – Visitor Sessions | 🟩 Complete | 100% |
| Phase 6 – Knowledge Base | 🟩 Complete | 100% |
| Phase 7 – AI Engine | 🟩 Complete | 100% |
| Phase 8 – Conversation System | 🟩 Complete | 100% |
| Phase 9 – Chat Widget | 🟩 Complete | 100% |
| Phase 10 – Executive Workspace | 🟩 Complete | 100% |
| Phase 11 – Admin Portal | 🟩 Complete | 100% |
| Phase 12 – Ticket System | 🟩 Complete | 100% |
| Phase 13 – Lead Management | 🟩 Complete | 100% |
| Phase 14 – Business Hours | 🟩 Complete | 100% |
| Phase 15 – Analytics | 🟩 Complete | 100% |
| Phase 16 – RAG | 🟩 Complete | 100% |
| Phase 17 – Production | ⬜ Not Started | 0% |

---

Current Sprint
Current Goal
Phase 16 – RAG (complete)

Tasks
[x] Embedding Service (`embeddingService.js` — chunks a knowledge
    document's flattened content into 500-word/75-word-overlap chunks,
    then generates a 256-dimension "hashing trick" vector per chunk; no
    embedding model/API exists anywhere in this project — Groq is
    chat-completion only — so this is a deterministic, dependency-free
    stand-in, not a true ML embedding)
[x] Vector Store Integration (a new `knowledge_embeddings` collection —
    `knowledgeEmbeddingModel.js`/`Repository.js`/`Service.js` — chunks are
    (re)generated when a document is published, edited while published,
    or restored to a prior published version, and removed entirely on
    archive; generation is fire-and-forget, never awaited by the request
    that triggered it)
[x] Retriever (`retrieverService.retrieve()` — fetches category-
    pre-filtered candidate chunks and scores them; MongoDB Community 7
    — this project's self-hosted database, confirmed via
    `docker-compose.yml` — has no native vector index, so cosine
    similarity is computed in application code)
[x] Hybrid Search (`retrieverService`'s internal `hybridSearch()` step —
    combines vector cosine-similarity with keyword-overlap scoring on top
    of the category metadata pre-filter, per `RAG.md` §13 Phase 3's exact
    three factors: vector similarity, keyword search, metadata filtering)
[x] Context Ranking (`retrieverService`'s internal `rankAndSelect()` step
    — combines the hybrid score with a Freshness factor, dedupes to one
    result per parent document, and truncates to the top-K; Popularity
    and Business Priority, also listed in `RAG.md` §14, are omitted since
    no data source exists for either)

Integrate with AI Engine: `knowledgeService.retrieveForQuery(query,
{category, limit})` is the new single retrieval entry point — the AI
Engine's Context Builder calls this instead of its previous direct
`knowledgeService.search(...)` call, with no change to Context Builder's
own external interface (`RAG.md` §25: "RAG should be introduced by
replacing the Retrieval Engine, not redesigning the application").
Automatically falls back to the original category/keyword search when
the knowledge base has no embeddings at all yet. A new operational
script, `npm run reindex:knowledge`, backfills embeddings for documents
published before this phase existed.

Explicitly out of scope this phase (per instruction — the roadmap's RAG
items beyond these five, all explicitly "Future" in `RAG.md` itself):
Re-ranking (§18), Query Expansion (§6), Intent Detection feeding the
Retriever, and a true ML embedding model/provider.

---

Previous Sprint
Phase 15 – Analytics (complete)

Tasks
[x] Event Collection (a new immutable `analytics_events` collection;
    14 real event types wired into 9 existing hook points across
    Conversation/Executive/Ticket/Lead as authenticated/internal side
    effects, plus 4 client-reported Widget event types via a public
    `POST /analytics/events` endpoint — no fabricated event types for
    features that don't exist, e.g. no AI_RESPONSE/AI_HANDOFF since no
    live AI chat-reply pipeline exists yet)
[x] Dashboard APIs (`GET /analytics/dashboard` — the same live KPI set
    as `ANALYTICS.md` §5, deliberately sourced the same way as the
    Phase 11 Admin Dashboard rather than unified with it)
[x] Metrics (8 domain endpoints — Conversation/AI/Executive/Lead/
    Ticket/Visitor/Widget/Business Hours — each a real aggregation over
    `analytics_events` and/or the owning module's own collection, not a
    hardcoded stub)
[x] Reports (every Metrics domain endpoint accepts the same
    `range`/`from`/`to` query params — `TODAY`/`YESTERDAY`/
    `LAST_7_DAYS`/`LAST_30_DAYS`/`THIS_MONTH`/`CUSTOM` — per
    `ANALYTICS.md` §14; "Reports" was interpreted as this date-range
    layer rather than a second, separate concept from Metrics)
[x] Aggregations (real MongoDB aggregation pipelines — `$group`,
    `$lookup`, `$dateToString`/`$hour` bucketing — in each module's
    repository, not naive JS loops over `.find()` results, per
    `ANALYTICS.md` §22's performance rule)

`GET /analytics/executives` is the one metrics endpoint reachable by an
`EXECUTIVE` token (self-scoped, no `VIEW_ANALYTICS` permission needed) —
every other domain plus the Dashboard is `ADMIN`-only, per `ANALYTICS.md`
§18. The Admin Analytics page renders every domain as plain numbers and
compact tables — no charting library was added (Charts, Export, and
Real-Time Updates were not in the explicit task list). The Chat Widget
now reports its own usage (opens/closes/suggested-question/quick-reply
clicks) via the public event endpoint, verified end-to-end through a
real browser session.

Explicitly out of scope this phase (per instruction — the roadmap's
Analytics items beyond these five): Charts, Export (CSV/Excel/PDF),
Real-Time Updates (Socket.io-pushed dashboard changes), and Data
Retention/archival policy.

---

(Earlier sprints: Phase 14 – Business Hours, Phase 13 – Lead Management,
Phase 12 – Ticket System, Phase 11 – Admin Portal, Phase 10 – Executive
Workspace, Phase 9 – Chat Widget, Phase 8 – Conversation System, Phase 7
– AI Engine, Phase 6 – Knowledge Base, Phase 5 – Visitor Sessions, Phase
4 – Authentication, Phase 3 – Frontend Foundation, Phase 2 – Backend
Foundation, Phase 1 –
Project Initialization — see Session Log below for what each one
covered.)

---

Files Created

Backend (`backend/`) — Session 2 (Phase 2)
```
src/app.js (rewired: rate limiter, versioned routes, notFoundHandler, errorHandler)
server.js (rewired: named db connect/disconnect, logger, graceful shutdown)
src/config/env.js (env validation, API_VERSION, LOG_LEVEL, rate-limit config)
src/config/database.js (connection event logging, disconnectDatabase)
src/shared/logger/logger.js
src/shared/errors/appError.js
src/shared/errors/notFoundError.js
src/shared/errors/validationError.js
src/shared/errors/index.js
src/shared/responses/apiResponse.js
src/shared/database/baseRepository.js
src/shared/database/baseService.js
src/middleware/errorHandler.js
src/middleware/notFoundHandler.js
src/middleware/validate.js
src/utils/catchAsync.js
src/modules/health/healthController.js
src/modules/health/healthRoutes.js
src/routes/index.js
src/routes/v1/index.js
```

New backend dependencies: `winston`, `joi`, `express-rate-limit`.

Removed: now-redundant `.gitkeep` placeholders in `src/middleware/`, `src/shared/`,
`src/modules/`, `src/utils/` (each directory now has real content). `src/jobs/`
and `src/socket/` remain untouched (`.gitkeep` still in place — still empty,
scheduled for later phases).

Frontend (`frontend/`) — Session 3 (Phase 3)
```
src/theme/theme.js
src/contexts/notificationContext.js
src/contexts/NotificationProvider.jsx
src/contexts/uiContext.js
src/contexts/UIProvider.jsx
src/hooks/useNotification.js
src/hooks/useUI.js
src/components/ErrorBoundary/ErrorBoundary.jsx
src/components/Loader/Loader.jsx
src/layouts/MainLayout.jsx
src/pages/HomePage.jsx
src/pages/NotFoundPage.jsx
src/routes/AppRoutes.jsx
src/constants/routes.js
src/services/apiClient.js
src/socket/socketClient.js
src/App.jsx (rewritten: composes ErrorBoundary > ThemeProvider > BrowserRouter >
  UIProvider > NotificationProvider > AppRoutes)
src/index.css (replaced Vite template CSS with a minimal reset)
vite.config.js (added envDir: '../' so Vite reads the shared root .env)
```

Removed: default Vite template demo content no longer referenced —
`src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`.
Added `src/assets/.gitkeep` and `src/features/.gitkeep` to preserve the
documented-but-currently-empty folders (`features/` has no content until the
first real feature module is built).

Root `.env.example` — added `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.

Backend (`backend/`) — Session 4 (Phase 4)
```
src/shared/constants/roles.js (ROLES, ACCOUNT_STATUS)
src/shared/constants/permissions.js (PERMISSIONS, ROLE_PERMISSIONS, hasPermission)
src/shared/helpers/password.js (hashPassword, comparePassword — bcryptjs)
src/shared/helpers/jwt.js (sign/verify access+refresh, hashToken, parseDurationToMs)
src/modules/auth/model/userModel.js
src/modules/auth/repository/userRepository.js
src/modules/auth/service/authService.js
src/modules/auth/validator/authValidator.js (Joi loginSchema)
src/modules/auth/controller/authController.js
src/modules/auth/routes/authRoutes.js
src/middleware/authenticate.js
src/middleware/authorize.js (requireRole, requirePermission)
src/routes/v1/index.js (mounts /auth)
src/app.js (added cookie-parser)
src/config/env.js (JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN, SEED_ADMIN_* — JWT_SECRET/JWT_REFRESH_SECRET now
  required at startup)
scripts/seedAdmin.js (bootstraps the first ADMIN user; new "seed:admin" script)
```

New backend dependencies: `jsonwebtoken`, `bcryptjs`, `cookie-parser`.

Frontend (`frontend/`) — Session 4 (Phase 4)
```
src/contexts/authContext.js
src/contexts/AuthProvider.jsx (silent refresh on mount, login/logout, exposes
  user/isAuthenticated/isLoading)
src/hooks/useAuth.js
src/services/authService.js (login, refresh, logout, getCurrentUser)
src/services/apiClient.js (withCredentials, Authorization header injection,
  requestTokenRefresh() — deduped refresh — and 401 refresh-and-retry)
src/pages/LoginPage.jsx
src/pages/DashboardPage.jsx (minimal protected placeholder)
src/routes/ProtectedRoute.jsx
src/routes/AppRoutes.jsx (added /login, protected /dashboard)
src/constants/routes.js (added LOGIN, DASHBOARD)
src/layouts/MainLayout.jsx (AppBar shows Login or user name + Logout)
src/App.jsx (added AuthProvider to the provider tree)
```

Root `.env.example` — added `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`,
`JWT_REFRESH_EXPIRES_IN`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`,
`SEED_ADMIN_PASSWORD`.

`docs/API_SPEC.md` — created (did not exist before this phase; see
Architecture Decision below). Documents health-check and all auth endpoints.

Backend (`backend/`) — Session 5 (Phase 5)
```
src/modules/visitor/model/visitorModel.js
src/modules/visitor/model/visitorSessionModel.js
src/modules/visitor/repository/visitorRepository.js
src/modules/visitor/repository/visitorSessionRepository.js
src/modules/visitor/service/visitorService.js (createSession, restoreSession)
src/modules/visitor/controller/visitorController.js
src/modules/visitor/routes/visitorRoutes.js
src/middleware/visitorSession.js (requireVisitorSession, attachVisitorSession)
src/shared/helpers/jwt.js (added signVisitorToken/verifyVisitorToken, reusing
  the existing parseDurationToMs)
src/routes/v1/index.js (mounts /visitors)
src/config/env.js (VISITOR_TOKEN_SECRET — now required at startup —
  and VISITOR_SESSION_TIMEOUT)
```

No new dependencies (reuses `jsonwebtoken`, already installed for admin JWTs).

Root `.env.example` — added `VISITOR_TOKEN_SECRET`, `VISITOR_SESSION_TIMEOUT`.

`docs/API_SPEC.md` — added §6 Visitor Sessions (endpoints + middleware
reference); fixed a stale line in §5 left over from Session 4 (see Architecture
Decisions).

Frontend: untouched this phase — see Architecture Decision below.

Backend (`backend/`) — Session 6 (Phase 6)
```
src/modules/knowledge/constants/knowledge.js (KNOWLEDGE_CATEGORIES, KNOWLEDGE_STATUS)
src/modules/knowledge/model/knowledgeModel.js
src/modules/knowledge/model/knowledgeVersionModel.js
src/modules/knowledge/repository/knowledgeRepository.js
src/modules/knowledge/repository/knowledgeVersionRepository.js
src/modules/knowledge/service/knowledgeService.js (create, update, publish,
  archive, search, listVersions, restoreVersion, snapshotVersion)
src/modules/knowledge/validator/knowledgeValidator.js (create/update/search
  Joi schemas)
src/modules/knowledge/controller/knowledgeController.js
src/modules/knowledge/routes/knowledgeRoutes.js
src/routes/v1/index.js (mounts /knowledge)
src/shared/constants/permissions.js (added VIEW_KNOWLEDGE_BASE, granted to
  both ADMIN and EXECUTIVE)
```

No new dependencies.

`docs/DATABASE.md` — updated §13 (Knowledge Base): `status` enum replaces
the old `isPublished` boolean (kept as a derived virtual), added
`publishedAt`, expanded the categories list to match `KNOWLEDGE_BASE.md`
§6 in full; added a new "Versions Collection (`knowledge_base_versions`)"
subsection and a row in the Collection Ownership table (§3).

`docs/API_SPEC.md` — added §7 Knowledge Base (every endpoint, permissions
required, versioning behavior); renumbered "Not Yet Implemented" to §8 and
added Knowledge/RAG-specific entries to it.

Frontend: untouched this phase — no UI consumes this yet (Admin Portal is
Phase 11); see Architecture Decision below.

Backend (`backend/`) — Session 7 (Phase 7)
```
src/modules/ai/providers/aiProvider.js (abstract base — generateCompletion)
src/modules/ai/providers/groqProvider.js (native fetch, no new dependency)
src/modules/ai/providers/providerManager.js (getProvider(), keyed by AI_PROVIDER)
src/modules/ai/prompts/templates/system.md
src/modules/ai/prompts/templates/developer.md
src/modules/ai/prompts/templates/fallback.md
src/modules/ai/prompts/promptBuilder.js (build(), sanitizeMessage(), FALLBACK_PROMPT)
src/modules/ai/service/contextBuilder.js (build() — retrieves PUBLISHED
  knowledge via knowledgeService.search)
src/modules/ai/service/responseParser.js (parse())
src/modules/ai/service/aiEngine.js (generateResponse() — orchestrator)
src/config/env.js (AI_PROVIDER, GROQ_API_KEY, GROQ_MODEL, AI_TEMPERATURE,
  AI_MAX_TOKENS, AI_KNOWLEDGE_LIMIT — GROQ_API_KEY intentionally NOT
  required at startup, see Architecture Decisions)
```

No new dependencies (uses Node's native `fetch`, available since Node 18).

Root `.env.example` — added `AI_PROVIDER`, `AI_TEMPERATURE`, `AI_MAX_TOKENS`,
`AI_KNOWLEDGE_LIMIT` alongside the existing `GROQ_API_KEY`/`GROQ_MODEL`
placeholders from Phase 1.

`docs/API_SPEC.md` — added §8 "AI Engine (internal — no HTTP surface yet)"
documenting the module's internal interface as a reference (not an API
contract, since there are no routes); renumbered "Not Yet Implemented" to
§9 and added RAG/intent/escalation/lead/summary/confidence entries.

Frontend: untouched — no consumer exists (Chat, Phase 8, is the intended
first caller).

Backend (`backend/`) — Session 8 (Phase 8)
```
src/modules/chat/constants/chat.js (CONVERSATION_STATUS, SENDER_TYPE, MESSAGE_TYPE)
src/modules/chat/model/conversationModel.js
src/modules/chat/model/messageModel.js
src/modules/chat/repository/conversationRepository.js (findByConversationId,
  findOpenByVisitorId, search)
src/modules/chat/repository/messageRepository.js (findByConversationId,
  markReadUpTo)
src/modules/chat/service/conversationService.js (getOrCreateActiveForVisitor,
  getByConversationId, assertVisitorOwnsConversation, list, getById)
src/modules/chat/service/messageService.js (send, listByConversation, markRead)
src/modules/chat/validator/chatValidator.js
src/modules/chat/controller/conversationController.js (list, getById, listMessages)
src/modules/chat/routes/conversationRoutes.js (read-only REST)
src/socket/index.js (initializeSocket(httpServer))
src/socket/middleware/socketAuthenticate.js (accessToken OR visitorToken —
  never both accepted as the same identity)
src/socket/events/chatEvents.js (chat:join, chat:message, chat:typing,
  chat:stop-typing, chat:read)
src/socket/constants/socketEvents.js
server.js (wires initializeSocket(server) — socket.io was installed since
  Phase 1 but never actually used until now)
src/routes/v1/index.js (mounts /conversations)
```

No new backend dependencies (`socket.io` was already installed, unused,
since Phase 1).

`docs/SOCKET_EVENTS.md` — created (didn't exist before this phase; user
confirmed creating it, same as `API_SPEC.md` in Phase 4). Documents the
connection/auth handshake, rooms, and every event.

`docs/DATABASE.md` — updated §9 (Messages): added `readAt` (not in the
original field list, needed for read receipts) and an explicit Message
Types list.

`docs/API_SPEC.md` — added §9 Conversations (the three read-only REST
routes); renumbered "Not Yet Implemented" to §10 and updated its
Chat/AI-response entries now that Conversations/Messages exist.

Frontend: untouched — the socket-consuming client is the Chat Widget
(Phase 9).

Frontend (`frontend/`) — Session 9 (Phase 9)
```
src/services/visitorService.js (createSession, getMySession)
src/socket/socketClient.js (connectSocket now accepts a dynamic auth
  parameter — object or callback — instead of assuming a static object)
src/socket/socketEvents.js (mirrors the backend's socket event name constants)
src/features/chat-widget/constants/chatWidget.js (SENDER_TYPE, MESSAGE_TYPE,
  CONNECTION_STATUS, VISITOR_TOKEN_STORAGE_KEY, SUGGESTED_QUESTIONS,
  QUICK_REPLIES, DEFAULT_GREETING, TYPING_STOP_TIMEOUT_MS)
src/features/chat-widget/hooks/useChatWidget.js (the core stateful hook:
  session resolution, socket lifecycle, optimistic send + ack reconciliation,
  offline outbox, typing debounce, read receipts)
src/features/chat-widget/components/MessageBubble.jsx
src/features/chat-widget/components/TypingIndicator.jsx
src/features/chat-widget/components/SuggestedQuestions.jsx
src/features/chat-widget/components/QuickReplies.jsx
src/features/chat-widget/components/OfflineBanner.jsx
src/features/chat-widget/components/ConversationArea.jsx
src/features/chat-widget/components/ChatWindow.jsx (responsive: fixed panel
  on desktop, full-screen on mobile via useMediaQuery)
src/features/chat-widget/components/Launcher.jsx
src/features/chat-widget/ChatWidget.jsx (root — composes Launcher/ChatWindow,
  auto-marks-read while open)
src/App.jsx (mounts <ChatWidget /> globally, alongside <AppRoutes />)
```

No new dependencies (`socket.io-client` already installed since Phase 3;
`@mui/icons-material` already installed since Phase 3).

Backend (`backend/`) — Session 10 (Phase 10)
```
src/modules/executive/constants/executive.js (EXECUTIVE_STATUS, DEFAULT_MAX_CHATS)
src/modules/executive/model/executiveModel.js (executives collection)
src/modules/executive/repository/executiveRepository.js (findByUserId,
  incrementCurrentChats)
src/modules/executive/service/executiveService.js (getOrCreateForUser,
  getByUserId, list, setStatus, markOnline, markOffline, incrementChats,
  decrementChats)
src/modules/executive/validator/executiveValidator.js
src/modules/executive/controller/executiveController.js (getMe,
  updateMyStatus, list)
src/modules/executive/routes/executiveRoutes.js (GET /me, PATCH
  /me/status, GET / — mounted at /api/v1/executives)
src/modules/chat/service/conversationService.js (added
  joinAsExecutive — claim-on-join, one executive per conversation — and
  close; getOrCreateActiveForVisitor now starts conversations WAITING
  instead of ACTIVE, so there's an actual queue before a claim)
src/modules/chat/repository/conversationRepository.js (search now accepts
  assignedExecutiveId)
src/modules/chat/controller/conversationController.js (added close,
  generateSummary, getSummary; list accepts ?mine=true → assignedExecutiveId:
  req.user.id)
src/modules/chat/validator/chatValidator.js (listConversationsQuerySchema
  gained mine)
src/modules/chat/routes/conversationRoutes.js (added POST /:id/close,
  POST /:id/summary, GET /:id/summary)
src/modules/ai/model/conversationSummaryModel.js (conversation_summaries
  collection)
src/modules/ai/repository/conversationSummaryRepository.js
  (findLatestByConversationId)
src/modules/ai/prompts/templates/summary.md (strict-JSON summary prompt)
src/modules/ai/service/summaryService.js (generate — transcript → AI
  Engine's provider → JSON-parse-with-fallback → persist; getLatest)
src/modules/visitor/service/visitorService.js (added getByVisitorId)
src/modules/visitor/controller/visitorController.js (added
  getByVisitorId, getConversationHistory — staff-facing, cross-module
  call into conversationService)
src/modules/visitor/routes/visitorRoutes.js (added GET /:visitorId, GET
  /:visitorId/conversations — authenticate + requirePermission, a
  distinct middleware chain from the visitor-token routes above them in
  the same file)
src/socket/constants/socketEvents.js (now exports { SOCKET_EVENTS,
  EXECUTIVES_ROOM } instead of the events object directly; added
  CHAT_CLOSE, CONVERSATION_ASSIGNED, CONVERSATION_CLOSED,
  NOTIFICATION_NEW, EXECUTIVE_STATUS_UPDATED)
src/socket/events/chatEvents.js (chat:join now claims/assigns for
  executives and broadcasts conversation:assigned; visitor chat:join
  with no conversationId broadcasts notification:new NEW_CONVERSATION;
  chat:message broadcasts notification:new VISITOR_REPLY when the
  sender is a visitor and the conversation has an assigned executive;
  new chat:close handler)
src/socket/index.js (executives join a shared EXECUTIVES_ROOM on
  connect; calls executiveService.markOnline/markOffline on
  connect/disconnect; emits executive:status-updated back to the
  connecting socket once markOnline resolves)
src/routes/v1/index.js (mounts /executives)
```

No new backend dependencies.

Frontend (`frontend/`) — Session 10 (Phase 10)
```
src/socket/socketEvents.js (added CHAT_CLOSE, CONVERSATION_ASSIGNED,
  CONVERSATION_CLOSED, NOTIFICATION_NEW, EXECUTIVE_STATUS_UPDATED)
src/services/apiClient.js (added getAccessToken() — a getter alongside
  the existing setAccessToken/clearAccessToken — so socket auth can read
  the current token dynamically)
src/services/conversationService.js (list, getById, listMessages, close,
  generateSummary, getSummary)
src/services/executiveService.js (getMe, updateMyStatus, list)
src/services/visitorService.js (added getByVisitorId,
  getConversationHistory — staff-facing, alongside the existing
  visitor-token createSession/getMySession)
src/features/executive-workspace/constants/executiveWorkspace.js
  (SENDER_TYPE, EXECUTIVE_STATUS, CONVERSATION_STATUS,
  TYPING_STOP_TIMEOUT_MS)
src/features/executive-workspace/hooks/useExecutiveWorkspace.js (the
  core stateful hook: dynamic-auth socket connection, queue state, active
  conversation + messages, typing, join/claim, send, close, and
  liveExecutiveStatus fed by executive:status-updated)
src/features/executive-workspace/components/ConversationQueue.jsx
src/features/executive-workspace/components/ActiveChatPanel.jsx
src/features/executive-workspace/components/VisitorPanel.jsx (visitor
  profile + conversation history, excluding the currently active
  conversation from "Previous Conversations")
src/features/executive-workspace/components/SummaryPanel.jsx
  (generate/display AI summary)
src/features/executive-workspace/components/AvailabilityControl.jsx
  (status selector; reconciles the socket-driven ONLINE transition via a
  liveStatus prop applied during render, not an effect)
src/pages/ExecutiveWorkspacePage.jsx (composes all of the above per
  EXECUTIVE_DASHBOARD.md §6's layout; replaces the old DashboardPage
  placeholder at the existing /dashboard route)
src/routes/AppRoutes.jsx (DashboardPage → ExecutiveWorkspacePage)
```

Removed: `src/pages/DashboardPage.jsx` (superseded placeholder). No new
frontend dependencies.

Backend (`backend/`) — Session 11 (Phase 11)
```
shared/constants/permissions.js (added MANAGE_WIDGET_SETTINGS, VIEW_DASHBOARD)
src/modules/settings/constants/settings.js (AI_PROVIDERS, RESPONSE_LENGTH,
  WIDGET_THEME, WIDGET_POSITION)
src/modules/settings/model/aiSettingsModel.js (ai_settings — singleton)
src/modules/settings/model/widgetSettingsModel.js (widget_settings — singleton)
src/modules/settings/repository/aiSettingsRepository.js (getSingleton)
src/modules/settings/repository/widgetSettingsRepository.js (getSingleton)
src/modules/settings/service/aiSettingsService.js (get — lazy-create,
  update)
src/modules/settings/service/widgetSettingsService.js (get, update — merges
  featureToggles keys rather than replacing the whole object)
src/modules/settings/validator/settingsValidator.js
src/modules/settings/controller/settingsController.js
src/modules/settings/routes/settingsRoutes.js (GET /widget is public — no
  authenticate — the anonymous Chat Widget needs it; everything else
  admin-only)
src/modules/ai/constants/prompt.js (PROMPT_TYPES, PROMPT_STATUS)
src/modules/ai/model/promptModel.js (prompts — one document per type)
src/modules/ai/model/promptVersionModel.js (prompt_versions)
src/modules/ai/repository/promptRepository.js (findByType, listAll)
src/modules/ai/repository/promptVersionRepository.js
src/modules/ai/service/promptService.js (ensureDefaults — lazy-seeds all
  six types from the Phase 7/10 file templates; listAll, getByType,
  getPublishedContent, update, publish, listVersions, restoreVersion)
src/modules/ai/validator/promptValidator.js
src/modules/ai/controller/promptController.js
src/modules/ai/routes/promptRoutes.js
src/modules/ai/prompts/promptBuilder.js (build() is now async — resolves
  a published Prompt override for SYSTEM/DEVELOPER before falling back to
  the file constants; added getFallbackPrompt())
src/modules/ai/service/aiEngine.js (awaits the now-async promptBuilder.build
  and getFallbackPrompt; reads temperature/maxTokens/model from
  aiSettingsService instead of always using env defaults)
src/modules/ai/service/summaryService.js (checks for a published SUMMARY
  prompt override before using its file-based default)
src/modules/ai/providers/groqProvider.js (generateCompletion now accepts
  a model param instead of always using env.GROQ_MODEL)
src/modules/executive/repository/executiveRepository.js (added
  listWithUser — populates the linked User for the admin table)
src/modules/executive/service/executiveService.js (added adminList,
  getByIdOrThrow, createExecutive, updateProfile, setActive, resetPassword
  — all admin-only, distinct from the existing self-service methods)
src/modules/executive/validator/executiveValidator.js (added
  createExecutiveSchema, updateExecutiveSchema, resetPasswordSchema)
src/modules/executive/controller/executiveController.js (list now calls
  adminList; added create, update, activate, deactivate, resetPassword)
src/modules/executive/routes/executiveRoutes.js (added the five admin
  routes, all requiring MANAGE_EXECUTIVES)
src/modules/auth/service/authService.js (added createUser, setActive,
  resetPassword — backs Executive Management's user-record side)
src/modules/chat/repository/conversationRepository.js (added
  countByStatus, countDistinctVisitorsByStatuses)
src/modules/chat/service/conversationService.js (added countByStatus,
  countActiveVisitors)
src/modules/chat/repository/messageRepository.js (added
  listRecentConversationsMessagesForResponseTime — aggregation grouping
  each conversation's messages, capped to the 200 most recent)
src/modules/chat/service/messageService.js (added
  getAverageFirstResponseSeconds — average time from a conversation's
  first visitor message to the first executive reply after it)
src/modules/admin/service/dashboardService.js (aggregates the above into
  one metrics object)
src/modules/admin/controller/dashboardController.js
src/modules/admin/routes/dashboardRoutes.js
src/routes/v1/index.js (mounts /prompts, /settings, /admin/dashboard)
```

No new backend dependencies.

Frontend (`frontend/`) — Session 11 (Phase 11)
```
src/constants/roles.js (ROLES — mirrors the backend's role constants,
  didn't exist on the frontend before this phase)
src/constants/routes.js (added the six /admin/* route constants)
src/routes/ProtectedRoute.jsx (added an optional allowedRoles prop —
  redirects to /dashboard instead of rendering when the role doesn't match)
src/routes/AppRoutes.jsx (mounts AdminLayout + the six admin pages behind
  ProtectedRoute allowedRoles=[ADMIN])
src/layouts/MainLayout.jsx (the previously-empty nav Drawer now links to
  Executive Workspace and, for ADMIN, Admin Portal)
src/services/knowledgeService.js (new — Phase 6's backend had no frontend
  consumer until now)
src/services/promptService.js
src/services/settingsService.js
src/services/dashboardService.js
src/services/executiveService.js (added create, update, activate,
  deactivate, resetPassword)
src/features/admin-portal/constants/adminPortal.js (mirrors backend enums:
  knowledge categories/status, prompt types + labels, response length,
  widget theme/position options)
src/features/admin-portal/layouts/AdminLayout.jsx (side nav + Outlet)
src/pages/admin/AdminDashboardPage.jsx (polls metrics every 15s)
src/pages/admin/KnowledgeManagementPage.jsx
src/pages/admin/PromptManagementPage.jsx
src/pages/admin/AISettingsPage.jsx
src/pages/admin/WidgetSettingsPage.jsx
src/pages/admin/ExecutiveManagementPage.jsx
src/features/chat-widget/contexts/widgetSettingsContext.js
src/features/chat-widget/contexts/WidgetSettingsProvider.jsx (fetches
  Widget Settings once on mount; falls back to built-in defaults matching
  the backend model's own defaults if the fetch fails, so the widget is
  never blocked on Settings being reachable)
src/features/chat-widget/hooks/useWidgetSettings.js
src/features/chat-widget/constants/chatWidget.js (added OFFLINE_MESSAGE,
  extracted from OfflineBanner's hardcoded string so it can be the
  fallback default)
src/features/chat-widget/ChatWidget.jsx (wraps in WidgetSettingsProvider;
  passes settings into useChatWidget and position into Launcher)
src/features/chat-widget/hooks/useChatWidget.js (accepts settings; plays a
  Web-Audio-generated notification tone on an incoming non-visitor message
  when soundNotificationsEnabled)
src/features/chat-widget/components/Launcher.jsx (position-aware:
  BOTTOM_LEFT vs BOTTOM_RIGHT)
src/features/chat-widget/components/ChatWindow.jsx (nested ThemeProvider
  for LIGHT/DARK + primaryColor; brand logo in the header; position-aware;
  quickRepliesEnabled toggle)
src/features/chat-widget/components/OfflineBanner.jsx (offlineMessage
  from settings instead of a hardcoded string)
src/features/chat-widget/components/ConversationArea.jsx (welcomeMessage
  from settings instead of DEFAULT_GREETING; typingIndicatorEnabled toggle)
src/features/chat-widget/components/SuggestedQuestions.jsx
  (settings.suggestedQuestions instead of the hardcoded constant)
```

No new frontend dependencies.

Backend (`backend/`) — Session 12 (Phase 12)
```
src/socket/ioRegistry.js (a small module-level registry so a plain REST
  controller can reach the same `io` instance the socket layer uses —
  the `ticket` module needs to broadcast notification:new from an HTTP
  request, not just from within a socket event handler)
src/socket/index.js (calls setIO(io) once, at initialization)
src/modules/ticket/constants/ticket.js (TICKET_CATEGORIES,
  TICKET_PRIORITY, TICKET_STATUS, TICKET_SOURCE,
  VALID_STATUS_TRANSITIONS, TICKET_AUDIT_ACTIONS)
src/modules/ticket/model/ticketModel.js (tickets)
src/modules/ticket/model/ticketNoteModel.js (ticket_notes)
src/modules/ticket/model/ticketAuditModel.js (ticket_audit_logs)
src/modules/ticket/model/ticketCounterModel.js (ticket_counters — a
  single document atomically $inc'd for sequential ticketNumbers)
src/modules/ticket/repository/ticketRepository.js (search with
  status/priority/category/assignedExecutiveId/visitorId/ticketNumber/
  date-range filters, isDeleted exclusion by default; findByIdWithRelations)
src/modules/ticket/repository/ticketNoteRepository.js
src/modules/ticket/repository/ticketAuditRepository.js
src/modules/ticket/repository/ticketCounterRepository.js
  (getNextSequence)
src/modules/ticket/service/ticketService.js (create, getById,
  assertAccessible — role-based scoping, search, update, updateStatus —
  validated transitions, assign — auto-transitions OPEN/REOPENED to
  ASSIGNED, addNote, listNotes, listAudit, softDelete, restore,
  getContext — cross-module aggregation of conversation/transcript/
  summary/visitor, recordAudit)
src/modules/ticket/validator/ticketValidator.js
src/modules/ticket/controller/ticketController.js
src/modules/ticket/routes/ticketRoutes.js (MANAGE_TICKETS for most
  routes — shared by ADMIN and EXECUTIVE; requireRole(ADMIN) additionally
  on delete/restore)
src/routes/v1/index.js (mounts /tickets)
```

No new backend dependencies.

Frontend (`frontend/`) — Session 12 (Phase 12)
```
src/services/ticketService.js
src/features/tickets/constants/tickets.js (mirrors the backend enums,
  including VALID_STATUS_TRANSITIONS so the status dropdown only ever
  offers a transition the API will accept)
src/constants/routes.js (added TICKETS)
src/routes/AppRoutes.jsx (mounts /tickets and /tickets/:id behind the
  existing ProtectedRoute — no role restriction, same as /dashboard,
  since MANAGE_TICKETS is shared by ADMIN and EXECUTIVE)
src/layouts/MainLayout.jsx (added a Tickets link to the nav Drawer)
src/pages/TicketsPage.jsx (list, status/priority filters, create dialog)
src/pages/TicketDetailPage.jsx (status transition control scoped to
  valid next statuses, assignment control, internal notes, audit trail,
  conversation context panel, Admin-only Delete button)
src/features/executive-workspace/hooks/useExecutiveWorkspace.js
  (extended the existing notification:new handler with the seven new
  TICKET_* types, reusing the same socket connection rather than opening
  a second one for a Tickets page)
```

No new frontend dependencies.

Backend (`backend/`) — Session 13 (Phase 13)
```
backend/src/modules/ai/prompts/templates/lead.md (shared system framing
  for both AI Lead Detection and the AI Qualification Summary — the
  "LEAD" Prompt Management slot seeded empty in Phase 11 now has a real
  file-based default, same fallback pattern as SYSTEM/DEVELOPER/FALLBACK/
  SUMMARY)
src/modules/ai/service/promptService.js (LEAD's SEED_CONTENT now loads
  lead.md instead of seeding empty — only affects fresh installs; the
  already-existing empty DB document from Phase 11 needed no migration
  since `ensureDefaults` only seeds missing types)
src/modules/ai/service/leadAiService.js (detectFromConversation —
  qualifies + extracts contact info from a transcript, never persisted;
  generateQualificationSummary — the §11 AI Qualification Summary for an
  existing lead; both resolve the LEAD prompt via promptService first,
  falling back to lead.md, fixed low temperature like summaryService)
src/modules/lead/constants/lead.js (LEAD_SOURCE, LEAD_SCORE, LEAD_STATUS,
  VALID_STATUS_TRANSITIONS)
src/modules/lead/model/leadModel.js (leads — embeds aiSummary and
  followUp as sub-documents rather than separate collections; no version
  history or audit trail, per this phase's narrower explicit scope)
src/modules/lead/repository/leadRepository.js (search with status/
  leadScore/assignedExecutiveId filters; findByIdWithRelations;
  countCreatedSince — powers the Dashboard's todaysLeads)
src/modules/lead/service/leadService.js (detect, create, getById,
  assertAccessible — role-based scoping identical to Tickets, search,
  update, updateStatus — validated transitions + ADMIN-only
  archive/restore, assign — auto-transitions NEW to ASSIGNED,
  generateSummary, scheduleFollowUp — auto-transitions CONTACTED to
  FOLLOW_UP, convert, markLost, getContext — cross-module aggregation of
  conversation/transcript/linked ticket, countCreatedToday)
src/modules/lead/validator/leadValidator.js
src/modules/lead/controller/leadController.js
src/modules/lead/routes/leadRoutes.js (MANAGE_LEADS — shared by ADMIN
  and EXECUTIVE; archive/restore enforcement lives inside
  updateStatus itself, not a separate admin-only route)
src/modules/ticket/repository/ticketRepository.js (added countOpen —
  powers the Dashboard's openTickets, which should have been wired in
  Phase 12 but wasn't — fixed now alongside Lead's equivalent)
src/modules/ticket/service/ticketService.js (added countOpen)
src/modules/admin/service/dashboardService.js (openTickets and
  todaysLeads are now real counts instead of null)
shared/constants/permissions.js (added MANAGE_LEADS)
src/routes/v1/index.js (mounts /leads)
```

No new backend dependencies.

Frontend (`frontend/`) — Session 13 (Phase 13)
```
src/services/leadService.js
src/features/leads/constants/leads.js (mirrors the backend enums,
  including VALID_STATUS_TRANSITIONS for the status dropdown)
src/constants/routes.js (added LEADS)
src/routes/AppRoutes.jsx (mounts /leads and /leads/:id behind the
  existing ProtectedRoute, same as Tickets — MANAGE_LEADS is shared by
  both roles)
src/layouts/MainLayout.jsx (added a Leads link to the nav Drawer)
src/pages/LeadsPage.jsx (list, status/score filters, a manual create
  dialog, and a "Detect from Conversation" dialog that runs AI Lead
  Detection and offers a one-click "Create Lead from This Suggestion"
  pre-filling the create form)
src/pages/LeadDetailPage.jsx (status control scoped to valid next
  statuses, assignment control, AI Qualification Summary panel with a
  Generate button, follow-up scheduling form, Mark Converted/Mark Lost
  buttons gated by whether that transition is currently valid,
  conversation context panel)
src/features/executive-workspace/hooks/useExecutiveWorkspace.js
  (extended the same notification:new handler with the five new LEAD_*
  types)
```

No new frontend dependencies.

Backend (`backend/`) — Session 14 (Phase 14)
```
src/modules/settings/constants/settings.js (added DAYS_OF_WEEK,
  HOLIDAY_TYPE, BUSINESS_STATUS)
src/modules/settings/model/businessHoursModel.js (singleton
  business_hours — timezone default 'UTC', weeklySchedule default
  Mon-Fri 09:00-17:30 enabled/Sat-Sun disabled, holidays sub-documents)
src/modules/settings/repository/businessHoursRepository.js
src/modules/settings/service/businessHoursService.js (getStatus,
  isOpen, getCallbackAvailability, addHoliday/removeHoliday,
  assertValidTimezone/assertValidWeeklySchedule/assertValidHolidayDate —
  timezone math done entirely via Intl.DateTimeFormat, a
  "guess-then-correct" technique for the local-wall-clock -> UTC-instant
  direction)
src/modules/settings/validator/businessHoursValidator.js
src/modules/settings/controller/businessHoursController.js
src/modules/settings/routes/businessHoursRoutes.js (status and
  callback-availability are public; everything else requires
  MANAGE_BUSINESS_HOURS)
src/routes/v1/index.js (mounts /business-hours)
```

No new backend dependencies.

Frontend (`frontend/`) — Session 14 (Phase 14)
```
src/services/businessHoursService.js
src/features/admin-portal/constants/adminPortal.js (added
  DAYS_OF_WEEK, HOLIDAY_TYPES, BUSINESS_STATUS_COLOR)
src/pages/admin/BusinessHoursPage.jsx (timezone select, 7-row weekly
  schedule table, holidays table with add/remove, a live status chip)
src/constants/routes.js (added ADMIN_BUSINESS_HOURS)
src/routes/AppRoutes.jsx (mounts /admin/business-hours, ADMIN-only)
src/features/admin-portal/layouts/AdminLayout.jsx (added a Business
  Hours nav item)
src/features/chat-widget/hooks/useBusinessStatus.js (polls
  GET /business-hours/status every 5 minutes; when CLOSED/HOLIDAY,
  also fetches up to 3 callback-availability slots)
src/features/chat-widget/components/ChatWindow.jsx (a status Chip in
  the header next to "Chat with us"; passes businessStatus/
  callbackSlots down to ConversationArea)
src/features/chat-widget/components/ConversationArea.jsx (shows
  offlineMessage instead of welcomeMessage, plus the next available
  callback slots in the visitor's own local time, when closed)
```

No new frontend dependencies.

Backend (`backend/`) — Session 15 (Phase 15)
```
src/modules/analytics/constants/analytics.js (EVENT_TYPE — 14 types;
  CLIENT_EVENT_TYPES — the 4 a visitor's browser may submit directly;
  DATE_RANGE)
src/modules/analytics/model/analyticsEventModel.js (analytics_events —
  type/payload/createdAt only, no updatedAt; immutable by construction,
  no update/delete path exists anywhere in the module)
src/modules/analytics/repository/analyticsEventRepository.js (record,
  countByTypeInRange, countByTypeGroupedByPayloadField, groupByDay,
  groupByHour, avgPayloadField, avgPayloadFieldGroupedByPayloadField,
  listTimestampsInRange)
src/modules/analytics/service/analyticsEventService.js (fire-and-forget
  `record()` — a DB write failure here is only logged, never thrown,
  so recording an event can never break the business operation that
  triggered it)
src/modules/analytics/service/analyticsService.js (resolveDateRange —
  the shared Reports date-range resolver; classifyUserAgent — a small
  built-in device/browser regex classifier, no new dependency;
  getDashboardMetrics, getConversationMetrics, getAiMetrics,
  getExecutiveMetrics — role-scoped like Tickets'/Leads'
  assertAccessible, getLeadMetrics, getTicketMetrics, getVisitorMetrics,
  getWidgetMetrics, getBusinessHoursMetrics — reuses Phase 14's
  businessHoursService.computeStatus)
src/modules/analytics/validator/analyticsValidator.js
src/modules/analytics/controller/analyticsController.js
src/modules/analytics/routes/analyticsRoutes.js (all metrics routes
  ADMIN-only via VIEW_ANALYTICS except /executives, which is
  self-scoped for an EXECUTIVE caller; /events is public)
src/routes/v1/index.js (mounts /analytics)
src/modules/settings/service/businessHoursService.js (extracted a pure
  `computeStatus(businessHours, atDate)` out of `getStatus` so Business
  Hours Analytics can classify many timestamps against one already-
  loaded singleton instead of re-querying the database per timestamp)
src/modules/chat/service/conversationService.js (fires
  CONVERSATION_STARTED/CONVERSATION_CLOSED/CONVERSATION_HANDOFF)
src/modules/chat/repository/conversationRepository.js (added
  getAverageDurationSeconds)
src/modules/chat/repository/messageRepository.js (added countInRange)
src/modules/executive/service/executiveService.js (fires
  EXECUTIVE_ONLINE/EXECUTIVE_OFFLINE from markOnline/markOffline and
  from the manual self-service setStatus route)
src/modules/ticket/service/ticketService.js (fires TICKET_CREATED/
  TICKET_CLOSED/TICKET_REOPENED; TICKET_CLOSED's payload includes a
  real resolutionTimeSeconds computed at fire time)
src/modules/ticket/repository/ticketRepository.js (added
  countByStatusInRange, countByAssigneeInRange, groupByFieldInRange)
src/modules/lead/service/leadService.js (fires LEAD_CREATED/
  LEAD_CONVERTED)
src/modules/lead/repository/leadRepository.js (added
  countByStatusInRange, countCreatedInRange, groupByFieldInRange)
src/modules/visitor/repository/visitorRepository.js (added
  countCreatedInRange, groupByPreferredLanguage)
src/modules/visitor/repository/visitorSessionRepository.js (added
  countDistinctVisitorsInRange, countReturningVisitorsInRange,
  listUserAgentsInRange)
```

No new backend dependencies.

Frontend (`frontend/`) — Session 15 (Phase 15)
```
src/services/analyticsService.js
src/constants/analytics.js (EVENT_TYPE — mirrors the backend's
  CLIENT_EVENT_TYPES)
src/features/admin-portal/constants/adminPortal.js (added
  ANALYTICS_DATE_RANGES)
src/pages/admin/AnalyticsPage.jsx (a date-range selector, the Dashboard
  KPI tiles, and all 8 Metrics domains rendered as plain stat rows and
  compact distribution tables — no charting library, per this phase's
  explicit scope)
src/constants/routes.js (added ADMIN_ANALYTICS)
src/routes/AppRoutes.jsx (mounts /admin/analytics, ADMIN-only)
src/features/admin-portal/layouts/AdminLayout.jsx (added an Analytics
  nav item)
src/features/chat-widget/hooks/useChatWidget.js (open/close now record
  WIDGET_OPENED/WIDGET_CLOSED via the public event endpoint)
src/features/chat-widget/components/SuggestedQuestions.jsx (records
  SUGGESTED_QUESTION_USED before forwarding the click)
src/features/chat-widget/components/QuickReplies.jsx (records
  QUICK_REPLY_USED before forwarding the click)
```

No new frontend dependencies.

Backend (`backend/`) — Session 16 (Phase 16)
```
src/shared/helpers/tokenize.js (extracted from ai/service/contextBuilder.js
  — tokenize(), toKeywordPattern(), STOPWORDS — now shared by the Context
  Builder's keyword matching and the Embedding Service's hashing-trick
  vectors/keyword-overlap scoring, instead of two independently-drifting
  copies)
src/modules/knowledge/constants/rag.js (CHUNK_SIZE_WORDS,
  CHUNK_OVERLAP_WORDS, EMBEDDING_DIMENSIONS, RANKING_WEIGHTS,
  MAX_CANDIDATE_CHUNKS, FRESHNESS_HALF_LIFE_DAYS)
src/modules/knowledge/model/knowledgeEmbeddingModel.js (knowledge_embeddings
  — one document per chunk; knowledgeId/category/title/keywords
  denormalized from the parent doc, chunkId, text, embedding, version)
src/modules/knowledge/repository/knowledgeEmbeddingRepository.js
  (createMany, deleteByKnowledgeId, findCandidates — category-pre-filtered
  and capped at MAX_CANDIDATE_CHUNKS, countAll)
src/modules/knowledge/service/embeddingService.js (the Embedding Service —
  flattenValue: recursively flattens the Mixed content field to text;
  chunkText: 500-word chunks with 75-word overlap; embed: a 256-dimension
  hashing-trick vector, L2-normalized; cosineSimilarity)
src/modules/knowledge/service/knowledgeEmbeddingService.js (the Vector
  Store Integration orchestrator — regenerateForKnowledge, removeForKnowledge,
  and fire-and-forget regenerateInBackground/removeInBackground wrappers)
src/modules/knowledge/service/retrieverService.js (the Retriever — fetches
  category-pre-filtered candidates; hybridSearch(): vector cosine-similarity
  + keyword-overlap scoring (Hybrid Search); rankAndSelect(): combines those
  with a Freshness factor, dedupes to one result per parent document, and
  truncates to top-K (Context Ranking); hasEmbeddings())
src/modules/knowledge/service/knowledgeService.js (publish/update/
  restoreVersion now trigger regenerateInBackground when the doc is
  PUBLISHED; archive triggers removeInBackground; new reindexAll() and
  retrieveForQuery() — the new single retrieval entry point the AI Engine
  calls, with an automatic fallback to the original category/keyword
  search when the knowledge base has no embeddings at all yet)
src/modules/ai/service/contextBuilder.js (now calls
  knowledgeService.retrieveForQuery(...) instead of knowledgeService.
  search(...) — its own external interface is unchanged; also lost its
  local extractKeywordPattern/escapeRegExp/STOPWORDS, now using the
  shared tokenize helper)
scripts/reindexKnowledgeEmbeddings.js (backfills embeddings for every
  currently-PUBLISHED document — a one-time catch-up for knowledge
  published before this phase existed; new/edited documents auto-embed
  going forward via the hooks above)
package.json (added "reindex:knowledge" script)
```

No new backend dependencies.

No frontend changes this phase — Phase 16's five task items (Embedding
Service, Vector Store Integration, Retriever, Context Ranking, Hybrid
Search) plus AI Engine integration are entirely internal to the backend;
no new REST endpoints or UI surface were introduced.

---

Architecture Decisions

1. **Repository root mismatch (backend/frontend/docs vs. actual git root).**
   `docs/FOLDER_STRUCTURE.md` depicts `customer-engagement-platform/` as the
   repository root (with `.github/`, `README.md`, `CLAUDE.md` directly inside
   it). In practice, the actual git repository root is the parent folder
   (`chatbot for jr websiter`), one level above `customer-engagement-platform/`.
   Decision (confirmed with user): keep the nested layout as-is; do not move
   files. Tooling that binds to the real `.git` location is scoped explicitly:
   - Husky: `.husky/` lives inside `customer-engagement-platform/`, and
     `core.hooksPath` is set (via the root `prepare` script) to
     `customer-engagement-platform/.husky`, relative to the true git root.
   - GitHub Actions: `.github/workflows/ci.yml` was placed at the **true**
     repository root (GitHub Actions only discovers workflows there), with
     `defaults.run.working-directory: customer-engagement-platform` so job
     steps execute inside the project folder.
   Revisit if the project is ever extracted into its own repository — at that
   point `.github/` and `.husky` path assumptions can be simplified.

2. **npm workspaces at the project root.** `customer-engagement-platform/package.json`
   declares `backend` and `frontend` as npm workspaces so a single `npm install`
   hoists shared devDependencies (`eslint`, `prettier`, `lint-staged`, `husky`,
   `concurrently`) to the root `node_modules/.bin`, which `lint-staged` and
   root `npm run lint`/`npm run dev` scripts depend on. `backend/` and
   `frontend/` retain their own `package.json` per `FOLDER_STRUCTURE.md`.

3. **ESLint over the Vite-default oxlint.** The current Vite React template
   scaffolds with `oxlint` by default. Since `IMPLEMENTATION_STATUS.md` and
   the coding-standards docs explicitly call for ESLint, `oxlint` was removed
   and replaced with a flat-config ESLint setup (`eslint.config.js`) using
   `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`, matching the
   pre-oxlint Vite template convention. Backend uses a separate CommonJS/Node
   flat config. Both defer stylistic rules to Prettier via
   `eslint-config-prettier`.

4. **File naming: camelCase over kebab-case.** `docs/CONVENTIONS.md` (files:
   kebab-case) conflicts with `docs/CODING_STANDARDS.md` (files: camelCase).
   Confirmed with user: camelCase wins for all backend/frontend filenames
   (e.g. `apiResponse.js`, `baseRepository.js`, `healthController.js`). Applies
   project-wide going forward, not just this phase.

5. **Health check placed as a minimal "module" (`src/modules/health/`).**
   Neither `FOLDER_STRUCTURE.md` nor `ARCHITECTURE.md` names a home for a
   system-level (non-business) endpoint like health checks, and
   `FOLDER_STRUCTURE.md` explicitly forbids controller logic inside
   `src/routes/` ("This folder only combines module routes... must not contain
   controllers"). Rather than break that rule for convenience, health check
   was implemented as a small module (`healthController.js` + `healthRoutes.js`,
   no service/repository needed) following the same controller/routes shape
   every other module uses. `src/routes/v1/index.js` mounts it like any other
   module route.

6. **`BaseRepository`/`BaseService` live under `shared/database/`.** The
   documented `shared/` subfolders (`constants`, `database`, `errors`, `helpers`,
   `logger`, `responses`, `types`, `validators`) don't include a dedicated slot
   for repository/service base classes. `database/` was judged the closest fit
   since both classes exist purely to standardize data-access plumbing (no
   business logic); `BaseService` takes a repository instance via constructor
   injection and stays model-agnostic. Both are unused until a real module
   (e.g. `auth`, `knowledge`) extends them.

7. **API versioning via `src/routes/index.js` → `src/routes/v1/index.js`.**
   All routes are mounted at `/api/v1/...` (`env.API_VERSION` controls the
   segment, defaulting to `v1`). Adding `v2` later means adding a sibling
   `src/routes/v2/` and mounting it alongside `v1` in `src/routes/index.js`,
   without touching existing module code.

8. **Rate limiting included as global middleware, not deferred to Auth.**
   `CLAUDE.md`'s Security Rules unconditionally require Rate Limiting, Helmet,
   and CORS (these are listed separately from JWT Authentication). Since the
   instruction was "do not implement Authentication," not "do not implement
   security middleware," `express-rate-limit` was added as global middleware
   in `app.js` (window/max configurable via `RATE_LIMIT_WINDOW_MS` /
   `RATE_LIMIT_MAX`). No login/JWT/password logic was touched.

9. **Error handling: operational vs. programmer errors.** `AppError` (and its
   subclasses `NotFoundError`, `ValidationError`) marks expected, "safe to show
   the client" errors. The centralized `errorHandler` middleware logs
   operational errors at `warn` and everything else at `error` (with stack
   trace, server-side only — never sent in the response body, per
   `CODING_STANDARDS.md` #11). All responses follow the documented envelope:
   `{ success, message, data?, meta? }` / `{ success: false, message, errors }`.

10. **`morgan` piped through the winston logger** (`logger.stream`) instead of
    logging straight to stdout, so all HTTP access logs go through the same
    structured logger as the rest of the app (JSON in production, colorized
    text in development).

11. **Vite reads env from the project root, not `frontend/`.** `vite.config.js`
    sets `envDir: '../'` so both backend and frontend share the single root
    `.env`/`.env.example` (consistent with Architecture Decision 1's approach
    of keeping one root file rather than per-package env files). Only
    `VITE_`-prefixed vars (`VITE_API_BASE_URL`, `VITE_SOCKET_URL`) are exposed
    to client-side code, per Vite's security model.

12. **Global state kept minimal and auth-free.** The roadmap's Phase 3 item
    "Authentication Context" was skipped entirely per this task's explicit
    "no authentication" instruction — no placeholder/stub auth context was
    created. "Global State" is instead demonstrated by `UIProvider` (sidebar
    open/close) and `NotificationProvider` (toast queue), both plain Context
    API per the documented stack (no Redux/Zustand introduced).

13. **Notification system: single active toast with a queue, not a stack.**
    MUI doesn't stack multiple simultaneous `Snackbar`s out of the box (that
    needs a library like `notistack`, which isn't in the documented stack).
    `NotificationProvider` shows one notification at a time and advances
    through a queue as each is dismissed (`queue[0]` drives `open`, dismissing
    shifts the queue) — avoids adding a new dependency for a foundation-level
    concern, and sidesteps a `react-hooks/set-state-in-effect` lint error the
    initial effect-driven version tripped.

14. **MUI style shorthand props: use `sx`, not bare props — found via runtime
    verification, not just lint.** Initial layout code (`ErrorBoundary`,
    `Loader`, `MainLayout`, `NotFoundPage`) used top-level shorthand props
    like `<Box display="flex" flexDirection="column" alignItems="center"
    minHeight="100vh" textAlign="center">`. ESLint and `vite build` both
    passed, but running the actual app in a headless browser (Playwright)
    surfaced React console errors — `flexDirection`, `alignItems`,
    `minHeight`, and `textAlign` were being forwarded straight to the DOM as
    invalid attributes instead of being applied as styles (this MUI version's
    `Box`/`Stack` system-prop coverage doesn't include all of them), which
    also visibly broke the layout (footer not centered, no full-height flex
    column). Fixed by moving all such props into `sx={{ ... }}`. Going
    forward, prefer `sx` over bare style-shorthand props on MUI layout
    components rather than relying on which specific prop names happen to be
    wired up in the installed MUI version.

15. **`docs/API_SPEC.md` created — it didn't exist.** It's referenced
    throughout `CLAUDE.md`, `FOLDER_STRUCTURE.md`, `ARCHITECTURE.md`,
    `CODING_STANDARDS.md`, and `AUTHENTICATION.md` as the API contract source
    of truth, but was never created in the initial doc set (same gap exists
    for `SOCKET_EVENTS.md`, `PROJECT_MEMORY.md`, and `TASKS.md` — not created,
    out of scope for this phase; flagged for awareness). Confirmed with user
    before proceeding: created it now, seeded with the health-check and full
    auth endpoint contracts. Keep appending to it every phase from here on.

16. **Refresh tokens implemented now, ahead of `AUTHENTICATION.md`'s stated
    scope.** The doc says "Refresh tokens are not required in the initial
    release" and recommends a flat 24-hour JWT lifetime for that no-refresh
    model. The user's instruction explicitly listed "Refresh Token" as a
    Phase 4 deliverable, pulling forward a documented "Future Enhancement."
    Implemented as the standard secure pairing instead: short-lived access
    token (`JWT_ACCESS_EXPIRES_IN=15m`) + long-lived rotating refresh token
    (`JWT_REFRESH_EXPIRES_IN=30d`), not a 24h single token. The refresh token
    itself is never exposed to JS — httpOnly/secure/sameSite=lax cookie,
    scoped to the `/api/v1/auth` path — and only its SHA-256 hash is stored
    on the user document (fields `refreshTokenHash`, `refreshTokenExpiresAt`,
    `sessionId`), none of which `DATABASE.md`'s `users` fields list mentions;
    documented here since that doc wasn't asked to be updated this phase.
    Every refresh call rotates the token (old one is invalidated), and
    `sessionId` is regenerated each time — a stolen refresh token has one
    shot before the legitimate client's next refresh invalidates it.

17. **Refresh-token rotation requires de-duplicating concurrent refresh
    calls — found via runtime verification, not lint/build.** React
    StrictMode double-invokes effects in development. `AuthProvider`'s
    mount-time silent-refresh effect fired the refresh call twice
    concurrently; the first rotated the token server-side, so the second
    (racing) call got rejected with the now-invalidated token and
    immediately logged the user back out — a real bug, only visible when
    actually driving the app (Playwright: login → reload → session lost).
    Fixed by adding `requestTokenRefresh()` in `apiClient.js`: a single
    shared in-flight-promise cache that both the mount-time refresh and the
    401-triggered auto-refresh-and-retry use, so concurrent callers always
    get the same result from one network call instead of each spending the
    single-use refresh token. This same class of bug (rotating/single-use
    tokens + any concurrent-caller path) is worth remembering for anything
    similar later.

18. **Login/session UI kept to the minimum needed to prove auth works.**
    `LoginPage` and a placeholder `DashboardPage` (protected via
    `ProtectedRoute`) were added — real dashboards are Phase 10/11 (Executive
    Workspace / Admin Portal). `MainLayout`'s AppBar conditionally shows
    "Login" or the user's name + "Logout", matching how Health was treated
    as a minimal module in Phase 2: just enough surface to demonstrate the
    infrastructure end-to-end without building ahead of scope.

19. **`authenticate` middleware re-fetches the user on every request rather
    than trusting the JWT payload's role.** `AUTHENTICATION.md` #16 says
    "Never trust client-provided role information" — while the role in a
    server-issued JWT isn't client-provided, a stale token could still carry
    a role/status an admin has since revoked. `authenticate.js` calls
    `authService.getById` (re-fetching from MongoDB) on every authenticated
    request and rejects if the account is no longer `ACTIVE`/`isActive`,
    trading one extra DB read per request for immediate effect of role/status
    changes — no separate token-blacklist mechanism needed for that case.

20. **No user-creation endpoint — `scripts/seedAdmin.js` is the only way a
    user exists today.** Registering/managing executives is Admin Portal
    territory (Phase 11, not yet built). The seed script (using the
    documented `scripts/` folder's stated purpose — "Seed database") reads
    `SEED_ADMIN_NAME`/`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from env
    (defaulted for local dev) and is idempotent — running it again when the
    email already exists is a no-op.

21. **Visitor tokens use a header, not a cookie — deliberately different
    from the admin refresh token.** `AUTHENTICATION.md` #6 explicitly says
    "The visitor token is not a replacement for JWT," and its purpose
    (identify anonymous users across an embeddable chat widget, Phase 9) is
    different enough from the admin refresh token's purpose (invisible to
    JS, single origin) to warrant a different transport: the visitor token
    is returned in the JSON response body and sent back via a custom
    `X-Visitor-Token` header, not `Authorization` (reserved for admin/exec
    JWTs) and not a cookie (a widget embedded on the business's own website
    would be cross-origin from our API, where third-party cookies are
    increasingly blocked by browsers by default — a header has no such
    restriction). The client is expected to persist it (e.g. `localStorage`)
    — that piece isn't built yet since there's no consuming UI (Phase 9).

22. **Visitor tokens are signed with their own secret
    (`VISITOR_TOKEN_SECRET`), never `JWT_SECRET`/`JWT_REFRESH_SECRET`.**
    This isn't just naming hygiene: it guarantees a visitor token can never
    be replayed against `authenticate`/`authorize` (wrong signature, fails
    verification outright) and an admin access/refresh token can never be
    replayed against `requireVisitorSession` — the two authentication
    systems in `AUTHENTICATION.md` §2 are fully cryptographically isolated,
    not just logically separated by convention.

23. **`visitor_sessions` fields reconcile two docs that don't fully agree.**
    `DATABASE.md` §7 lists `sessionId, visitorId, ipAddress, userAgent,
    startedAt, endedAt` for the collection; `AUTHENTICATION.md` §14's
    "Executive/Visitor Sessions" description separately calls for "Last
    Activity" but omits `startedAt`/`endedAt`. Neither doc says "only these
    fields." Implemented the union — added `lastActivityAt` — since
    session recovery genuinely needs it (sliding-expiration renewal touches
    it on every restore) and dropping `startedAt`/`endedAt` would contradict
    `DATABASE.md`'s explicit collection definition.

24. **`GET /visitors/sessions/me` delegates entirely to
    `requireVisitorSession` middleware, mirroring `GET /auth/me`.** The
    middleware calls `visitorService.restoreSession` (verify token → look up
    session → look up visitor → touch activity → re-sign a token) and
    attaches `req.visitor`/`req.visitorSession`/`req.visitorToken`; the
    controller just echoes them back. No duplicate DB-touching logic split
    between middleware and controller. `attachVisitorSession` (the
    non-throwing sibling) reuses the exact same service call, catching its
    error instead of propagating it — same core logic, two failure
    behaviors, matching `AUTHENTICATION.md` #19's requirement for both a
    "Visitor Authentication" and an "Optional Authentication" middleware.

25. **This phase touched backend only — no frontend changes.** Unlike
    Phase 4's prompt, which explicitly listed separate Backend/Frontend
    deliverables, this phase's instruction and `IMPLEMENTATION_ROADMAP.md`'s
    Phase 5 entry both describe only backend-shaped concerns (visitor ID,
    session token, session storage, session recovery) with no UI/consumer
    named — and "No Chat yet" rules out the one place a visitor session
    would currently be used (the chat widget, Phase 9). A frontend
    `visitorService.js` API wrapper would have no consumer and no way to be
    verified end-to-end, so it's deferred to Phase 9, built alongside the
    widget that actually calls it.

26. **`status` enum (not `isPublished` boolean) — reconciling `DATABASE.md`
    and `KNOWLEDGE_BASE.md`.** `DATABASE.md` §13 originally listed a boolean
    `isPublished` field; `KNOWLEDGE_BASE.md` §8 and §14 require a three-state
    lifecycle (`DRAFT`/`PUBLISHED`/`ARCHIVED`, with "Archive documents" as
    its own admin action distinct from un-publishing). A boolean can't
    represent `ARCHIVED` as different from "never published." Implemented
    `status` as the real field and added `isPublished` back as a Mongoose
    virtual (`status === 'PUBLISHED'`) so nothing depending on that exact
    field name breaks. Updated `DATABASE.md` §13 to match rather than
    silently diverging from it.

27. **Version history lives in a new `knowledge_base_versions` collection,
    not embedded on the document.** Neither doc explicitly says how
    "restore previous versions" (`KNOWLEDGE_BASE.md` §14) should be stored.
    Embedding a growing history array on the live document would violate
    `DATABASE.md` §22's "prefer references over deep document embedding"
    and §2's "avoid deeply nested documents." A separate collection
    (referenced by `knowledgeId`) is more consistent with those stated
    principles and with how the rest of the schema is designed. Added it to
    `DATABASE.md`'s Collection Ownership table rather than introducing an
    undocumented collection silently.

28. **A version snapshot is written only when editing a `PUBLISHED`
    document, not on every edit.** `KNOWLEDGE_BASE.md` §20 says "every
    *published* change should create a new version" — read literally, draft
    edits (never live) have nothing worth preserving. `update()` snapshots
    the pre-edit state and bumps `version` only if `status === PUBLISHED`
    at the time of the call; editing a `DRAFT` just applies in place.
    `publish()` itself does not snapshot (there's nothing yet to roll back
    to — the initial `version: 1` document already covers "the first live
    state").

29. **`publish`/`archive` are dedicated status-transition endpoints with no
    request body — content changes go through `PATCH` first.** Keeps CRUD,
    Publishing, and Versioning cleanly separable (this phase's three
    explicitly distinct deliverables) instead of one endpoint doing
    "update-and-publish" as a combined action.

30. **No `DELETE` endpoint.** `DATABASE.md` §21 states "Knowledge Base uses
    versioning instead of deletion," and neither doc's admin capability list
    (`KNOWLEDGE_BASE.md` §14) includes deleting — only archiving. Archiving
    is the only "removal" mechanism; nothing hard-deletes a knowledge
    document.

31. **Read access (`VIEW_KNOWLEDGE_BASE`) extended to Executives; write
    access (`MANAGE_KNOWLEDGE_BASE`) stays Admin-only.** `AUTHENTICATION.md`
    §18's permission matrix only lists "Manage Knowledge Base: Admin only"
    (no read row), but `KNOWLEDGE_BASE.md` §16 is more specific here:
    "Executives have read-only access where required." Added a new
    `VIEW_KNOWLEDGE_BASE` permission (both roles) alongside the existing
    `MANAGE_KNOWLEDGE_BASE` (Admin only) rather than reusing one permission
    for both, since they now need different role sets. No public/visitor
    route exists at all — §16: "Visitors cannot access internal knowledge."

32. **No HTTP surface for the `ai` module — it's a pure orchestration layer
    called by other backend code, not an API.** The explicit request list
    this phase (Provider Interface, Groq Provider, Prompt Builder, Context
    Builder, AI Engine, Response Parser) has no Controller/Routes item,
    unlike every other phase so far, and "Do not implement Chat" rules out
    the only thing that would currently call it. `AI_ENGINE.md` §1 itself
    frames it as orchestration ("receives structured context... generates
    responses") consumed by the Chat module, not a client-facing API.
    Documented in `API_SPEC.md` §8 as an internal reference, not an
    endpoint contract.

33. **`GROQ_API_KEY` is not a required startup env var, unlike `JWT_SECRET`/
    `VISITOR_TOKEN_SECRET`.** Those are security secrets where an
    undefined/weak value is a real risk; `GROQ_API_KEY` is a third-party
    paid API credential that has no bearing on whether the rest of the
    backend (auth, visitors, knowledge) can run and be tested. Requiring it
    at boot would block the entire server over an unconfigured *feature*,
    not a security gap. `GroqProvider.generateCompletion` throws a clear
    `503 AppError` at call-time instead if the key is missing.

34. **Provider selection is only mockable because `aiEngine.js` calls
    `providerManager.getProvider()` through the module object, not a
    destructured import.** Initially wrote `const { getProvider } =
    require(...)`, which froze the reference at require-time — a test that
    reassigned `providerManager.getProvider` to a fake had no effect on the
    already-bound local `getProvider`. Only caught by actually running an
    orchestration test with a mocked provider (see Session 7 notes), not by
    lint/build. Switched to calling `providerManager.getProvider()` so
    monkey-patching (tests, and potentially future provider hot-swapping)
    works as expected.

35. **Context Builder extracts significant keywords from the visitor's
    message rather than passing it through verbatim — a real bug caught
    only by testing with a real MongoDB document.** The Knowledge module's
    `search(keyword)` does a substring `$regex` match of `keyword` against
    `title`/`keywords` fields. Passing an entire raw message like "what are
    your hours" as that regex essentially never matches a short field like
    the title `"Business Hours"` (the field would have to *contain* the
    whole phrase, not the other way around) — every real query would have
    silently returned zero knowledge. Fixed by extracting words longer than
    2 characters, dropping a small stopword list (what/your/the/is/etc.),
    escaping regex metacharacters, and joining the rest into a regex
    alternation (`hours|open|...`) passed as the `keyword`. This is exactly
    `RAG.md` §13's "Phase 1: Category Search, Keyword Search" strategy —
    deliberately not semantic/vector search, which is future work.

36. **Response validity is a concrete, checkable condition (non-empty
    content), not a hallucination/fabricated-pricing detector.**
    `AI_ENGINE.md` §12 lists "no hallucination indicators," "no fabricated
    pricing," etc. as validation goals, but doesn't specify how to detect
    them, and inventing unreliable regex/heuristic guesses for these would
    be worse than not having them (`CLAUDE.md`: no placeholder
    implementations). `responseParser.isValid` checks only that content is
    non-empty; `isTruncated` flags `finish_reason: "length"` responses.
    Deeper validation is a documented gap, not a silent omission.

37. **`docs/SOCKET_EVENTS.md` created — it didn't exist.** Same category of
    gap as the missing `API_SPEC.md` in Phase 4 (referenced throughout the
    other docs, never created). Confirmed with the user before proceeding:
    created it now, seeded with every event this phase built. Keep
    appending to it, same as `API_SPEC.md`.

38. **Conversations are created via the socket (`chat:join`), never via
    REST — no `POST /conversations` route exists.** `CHAT_WIDGET.md` §7's
    lifecycle is Socket Connected → ... → Conversation Started; nothing in
    any doc describes a REST conversation-creation step, and a visitor
    reconnecting should resume their existing open conversation rather than
    create a new one — exactly what `chat:join`'s get-or-create behavior
    does. The REST routes this phase (`GET /conversations`,
    `GET /conversations/:id`, `GET /conversations/:id/messages`) are
    read-only, for staff browsing history (Executive Workspace, Phase 10).

39. **Message `senderType`/`senderId` are always derived server-side from
    the authenticated socket, never accepted from the client.**
    `AUTHENTICATION.md` §16: "Never trust client-provided role
    information." A malicious `chat:message` payload claiming
    `senderType: "EXECUTIVE"` is simply ignored — the handler computes it
    from `socket.data.user`/`socket.data.visitor`, which were themselves
    set by verified tokens at connection time.

40. **Visitor and Executive/Admin sockets authenticate via different
    `socket.handshake.auth` keys (`visitorToken` vs. `accessToken`), never
    a shared one.** Mirrors Architecture Decision 22 (separate signing
    secrets for the two REST token types) at the socket layer — a visitor
    token can't be passed as `accessToken` and vice versa, so the two
    authentication systems stay cryptographically isolated in real-time
    connections too, not just REST.

41. **Executives can currently join *any* conversation — there's no
    assignment check yet.** `AUTHENTICATION.md`'s permission matrix and
    `ARCHITECTURE.md`'s Executive module ownership describe assignment as
    an Executive-module concern, which doesn't exist until Phase 10.
    Rather than invent a placeholder assignment system now, `chat:join`
    only enforces the check that's actually specified today (a visitor may
    only join their own conversation); broad executive access is a
    documented, deliberate gap, not an oversight.

42. **`readAt` added to the `messages` schema — not in `DATABASE.md`'s
    original field list.** Read receipts (`CHAT_WIDGET.md` §14) need
    somewhere to record "read"; `DATABASE.md` didn't have a field for it.
    Added `readAt` (null until read) and updated `DATABASE.md` §9 to match,
    same reconciliation pattern as `visitor_sessions.lastActivityAt` in
    Phase 5. "Delivered" (also listed in §14) was not implemented as a
    separate persisted state — in a real-time socket connection, delivery
    is implicit in receiving the `chat:message` event, and a second
    tracked state wasn't judged worth the complexity this phase.

43. **A real bug — passing `{status: undefined, visitorId: undefined}`
    directly to Mongoose silently returns zero results, not "no filter."**
    `conversationController.list` originally destructured `req.query` and
    passed it straight through as the repository filter. When neither query
    param was supplied, `Conversation.find({status: undefined, visitorId:
    undefined})` matched **nothing** — confirmed directly (`find({...
    undefined})` → 0 results vs. `find({})` → 1 on the same data) once
    `GET /conversations` came back empty in exactly the case it should have
    returned everything. Lint and the earlier socket tests never exercised
    this path. Fixed by adding `conversationRepository.search()`
    (conditionally including only truthy filter keys), mirroring the
    pattern `knowledgeRepository.search` already used in Phase 6 — which
    argues for auditing whether any other list/filter endpoint has the same
    latent bug rather than assuming Knowledge was a one-off.

44. **The widget is mounted globally in `App.jsx` (visible on every route),
    not restricted to public-only pages.** This project doesn't have a
    separate public marketing site distinct from the admin/executive
    frontend built in Phases 3-4 — `HomePage` is the closest analog to "the
    public site" a real embeddable widget would sit on. Rather than invent
    a route-based restriction not asked for, the widget renders everywhere;
    it doesn't interfere with Login/Dashboard, just floats above them. If a
    separate marketing site is introduced later, this is the first thing
    to revisit.

45. **The visitor session connects lazily (on first launcher click), not
    eagerly on page load.** `CHAT_WIDGET.md` §5's lifecycle diagram shows
    session creation happening automatically before the greeting displays.
    Eagerly creating a `Visitor`/`VisitorSession` document (Phase 5) for
    every anonymous page view — including ones who never open the chat —
    has real write-load implications and didn't seem worth it for a
    judgment call the docs don't mandate explicitly. The tradeoff: the
    greeting isn't pre-loaded before the visitor clicks the launcher (a
    brief "Connecting…" banner shows instead).

46. **Optimistic sends are reconciled via the socket emit's ack callback,
    not by matching broadcast content.** A message is added locally with a
    `tempId` and `pending: true` immediately on send; the ack callback
    (which carries the real persisted document, including `_id`) replaces
    that entry in place. This is more robust than trying to match an
    incoming broadcast to a pending optimistic entry by comparing text —
    doubly so because of Architecture Decision 47's bug, which taught this
    the hard way.

47. **Found via runtime testing, not lint/build: the visitor's own sent
    messages were rendered twice.** `chat:message` broadcasts to the whole
    room via `io.to(...)` (Phase 8), which includes the sender — so a
    visitor's own message arrived twice: once through the optimistic-UI +
    ack-confirm path, and again through the room broadcast listener, and
    the two couldn't be matched (the broadcast has no `tempId`, and the
    optimistic entry has no real `_id` yet if the broadcast happens to
    arrive before the ack). Confirmed visually — every sent bubble appeared
    twice in a screenshot before the fix. Fixed by having the broadcast
    listener simply ignore any message with `senderType: VISITOR`, since in
    a conversation with exactly one visitor, any such broadcast reaching
    this client is always self-originated and already handled via the ack.

48. **Found via runtime testing, not lint/build: reconnection after a real
    backend outage silently failed forever.** Initially wired
    `connectSocket({ visitorToken })` — a static object captured once.
    Socket.io-client resends that *exact* object on every reconnection
    attempt. But the visitor token rotates on every successful
    authentication (Phase 5's sliding-expiration design), so the very first
    connection's token was already invalidated server-side by the time a
    reconnect was attempted after an outage — every retry got rejected with
    an already-rotated token, forever. Only surfaced by actually killing and
    restarting the real backend process mid-session and watching the
    reconnect fail (mocked providers/sockets wouldn't have caught this).
    Fixed by passing `auth` as a callback (`(cb) => cb({ visitorToken:
    localStorage.getItem(...) })`), which socket.io-client re-invokes before
    every connection attempt, always sending the latest rotated token.

49. **A conversation now starts `WAITING`, not `ACTIVE` — the Conversation
    Queue is what's `WAITING` and unclaimed.** Phase 8 had visitors create
    conversations directly into `ACTIVE`, which made sense before any
    concept of assignment existed. With `joinAsExecutive` (claim-on-join)
    now the only way a conversation gets an `assignedExecutiveId`, a
    conversation with no executive yet needs its own distinct status so
    `GET /conversations?status=WAITING` (the queue) and "claimed" are
    actually different states, per `EXECUTIVE_DASHBOARD.md` §8.

50. **Claim-on-join, not a separate "assign" action.** An executive's
    `chat:join` on an unassigned conversation *is* the claim — it sets
    `assignedExecutiveId`, flips status to `ACTIVE`, increments
    `currentChats`, and broadcasts `conversation:assigned` to the
    `executives` room in one atomic step. No separate REST/socket
    "assign to me" action was added since `chat:join` already has to
    happen to view the conversation at all; a second explicit action
    would just be redundant ceremony. Joining an *already*-assigned
    conversation (e.g. reopening it, or the assigned executive
    reconnecting) is a no-op re-join, not a re-assignment — enforced by
    `joinAsExecutive` throwing a 403 if a *different* executive tries.

51. **AI Summary is on-demand (a "Generate" button), never automatic.**
    `EXECUTIVE_DASHBOARD.md` §11 is explicit: "AI suggestions should never
    be sent automatically... Executives remain in control." There's also
    no AI Handoff/Escalation trigger yet (§10 — no Escalation Detection
    module exists) that could plausibly fire it automatically. Matches
    `docs/API_SPEC.md`'s existing framing of `POST .../summary` as
    executive-triggered.

52. **`notification:new` is broadcast to the whole `executives` room with
    an `executiveId`/`type` the client filters by, not targeted to one
    socket.** Socket.io rooms don't have a built-in per-user filter
    without a server-side registry mapping user id → socket id(s) (which
    doesn't exist — see the long-standing logout/socket gap in Known
    Issues), and an executive could plausibly have multiple tabs open.
    Simpler and just as correct to broadcast room-wide and let each
    client compare `executiveId` against its own user id, same pattern
    `VISITOR_REPLY` already uses.

53. **Found via runtime testing, not lint/build: `closeConversation`'s ack
    callback and the `conversation:closed` broadcast listener both tried
    to update `activeConversation` state, and raced.** The closing
    executive is in the conversation room, so they receive their own
    `conversation:closed` broadcast (which correctly merges in
    `status: CLOSED`) *in addition to* the `chat:close` emit's ack
    callback firing on the same action. The ack callback originally set
    `activeConversation` to `null` on success — whichever of the two
    arrived last won, so the closed conversation sometimes vanished from
    the UI entirely (reverting to the "claim a conversation" placeholder)
    instead of showing the disabled, closed chat. Only visible by
    actually closing a conversation in a real browser and watching which
    outcome won the race, not by unit-testing either handler in
    isolation. Fixed by making the broadcast listener the single source
    of truth for the resulting state; the ack callback now only surfaces
    an error toast on failure.

54. **Found via runtime testing, not lint/build: the Availability control
    could get stuck showing a stale pre-connection status.** Opening the
    workspace does two things at once: `AvailabilityControl` fetches the
    executive's status once via `GET /executives/me` on mount, and the
    same page's socket connects, which server-side calls
    `executiveService.markOnline` (an async DB write) and flips status to
    `ONLINE`. These two race — if the REST fetch resolves first (or the
    write hadn't landed yet), the control shows whatever was in the DB
    *before* this session (e.g. `OFFLINE`) and had no way to learn it
    later became `ONLINE`, since nothing re-fetches after mount. Confirmed
    via a real Playwright run: the control sat on `OFFLINE` indefinitely
    even though the DB was correctly `ONLINE` moments later. Fixed with a
    new server→client event, `executive:status-updated`, emitted to the
    connecting socket once `markOnline` actually resolves (the same
    pattern `VISITOR_TOKEN_RENEWED` already established for "tell this
    one socket about a side effect of its own connection"); the frontend
    hook exposes it as `liveExecutiveStatus`, applied in
    `AvailabilityControl` during render (React's documented pattern for
    adjusting state from a prop, since a `useEffect` doing the same
    `setState` trips the `react-hooks/set-state-in-effect` lint rule).

55. **Found via runtime testing, not lint/build: two sibling panels with
    an identical literal `key`.** `VisitorPanel` and `SummaryPanel` were
    both keyed by `activeConversation?.conversationId` (to force a full
    remount — and a clean loading state — whenever the claimed
    conversation changes) but that gave them the *same* key value as
    siblings under the same parent, which React flagged as "two children
    with the same key." Harmless in this exact case (they're different
    component types, so no reconciliation actually mixed them up) but
    still a real console warning. Fixed by prefixing each (`visitor-${id}`
    / `summary-${id}`) so they're unique even when derived from the same
    underlying id.

56. **Found via runtime testing, not lint/build: two REST routes hit the
    wrong identifier and returned a raw 500 instead of a clean error.**
    `GET/POST .../conversations/:id/summary` expect the Mongo `_id` (per
    `docs/API_SPEC.md`'s existing "Fetch one conversation by Mongo id"
    framing, consistent with `conversationService.getById` using
    `findById`) — but the frontend's `SummaryPanel` was passing
    `conversation.conversationId` (the UUID field the *socket* layer uses)
    instead. Mongoose's `findById` throws a `CastError` on a non-ObjectId
    string, which isn't an `AppError`, so the centralized error handler
    treated it as an unclassified `500` rather than a `404`/`400`. Only
    caught by driving the real UI in a browser and watching the network
    tab — a curl test against the correct id alone wouldn't have
    surfaced the frontend's wrong-field bug. Fixed by passing
    `activeConversation._id` (renamed the prop to `mongoConversationId`
    to make the distinction explicit) while every socket-based action
    keeps using `conversationId` as before.

57. **Executive Management logic lives in the `executive` module, not a
    new `admin` module, despite `FOLDER_STRUCTURE.md` §8 explicitly
    listing "Executive management" under `admin`.** The resource and its
    logic (create/update/activate/deactivate/reset-password) belong with
    the rest of the `Executive` model's concerns; splitting them into a
    separate module would mean the same `executives` REST resource is
    served from two different route prefixes for no functional reason.
    The Dashboard aggregation, which has no natural single owning module,
    *does* get the new `admin` module — `FOLDER_STRUCTURE.md`'s ownership
    notes are a useful default, not a rule to force a split that doesn't
    serve the resource boundary.

58. **Password reset and account activation are `authService` methods
    (`createUser`, `setActive`, `resetPassword`), called from
    `executiveService`, not duplicated into the `executive` module.** An
    executive *is* a `users` document (`role: EXECUTIVE`) plus a linked
    `executives` profile — creating/deactivating/resetting the login
    itself is inherently a `users`-collection concern. Deactivating clears
    the refresh session too (forces re-login), and reset-password does
    the same — both are real, if minor, security-relevant behaviors, not
    just a status flip.

59. **AI Settings' `temperature`/`maxTokens`/`model` are wired into
    `aiEngine.generateResponse` for real; `provider`, `responseLength`,
    `confidenceThreshold`, and `escalationRules` are stored but
    unconsumed.** Only Groq is implemented (so switching `provider` has
    nothing to switch to yet — stored for a future multi-provider add,
    matching `ADMIN_PANEL.md` §9's "Provider changes should not affect
    business logic"); there's no response-length post-processing,
    confidence scoring, or Escalation Detection module to consume the
    other three. Documented rather than silently dropped, so a future
    phase knows exactly what's still wiring work versus already done.

60. **Prompt Management stores exactly one document per `type` (unique
    index), not many documents like Knowledge's per-category model.**
    There are six fixed, named prompt "slots" (`ADMIN_PANEL.md` §8) —
    edit-in-place with version history per slot is the right shape, not
    an open collection with create/delete. `SYSTEM`/`DEVELOPER`/
    `FALLBACK`/`SUMMARY` are lazily seeded from their Phase 7/10 file
    templates and start `PUBLISHED` (identical content to what was
    already live — seeding changes nothing observable); `LEAD` and
    `ESCALATION` seed empty and `DRAFT` since neither has a current file
    or a runtime consumer (no Lead module — Phase 13; no Escalation
    Detection — deferred since Phase 7). `promptBuilder`/`summaryService`
    check for a `PUBLISHED` override first, falling back to the file
    constant — the files are never deleted, they remain the permanent
    default.

61. **Widget Settings' `brandLogoUrl` is a plain URL string field, not a
    file upload.** Real file-upload infrastructure (`multer`, storage,
    a static-serving route) is a meaningfully separate concern with its
    own security surface (file-type/size validation, storage location,
    cleanup of orphaned files) that this phase's six named modules didn't
    call for. An admin pastes a hosted image URL instead. Revisit if file
    upload becomes an explicit requirement.

62. **Widget Settings is publicly readable (`GET /api/v1/settings/widget`
    has no `authenticate`) but admin-only to write.** The Chat Widget is
    anonymous-visitor-facing and needs its display config *before* a
    visitor session exists — the same reasoning that makes
    `POST /visitors/sessions` public. Nothing in the response is
    sensitive (display strings, a color, toggles); the write side is
    still fully gated behind `MANAGE_WIDGET_SETTINGS`.

63. **The Chat Widget is a real, live consumer of Widget Settings, not
    just an admin-side form with no effect.** Every field with a clear,
    already-existing behavior to gate was wired: `welcomeMessage`/
    `suggestedQuestions` replace the old hardcoded constants,
    `primaryColor`/`theme` apply via a nested `ThemeProvider` scoped to
    just the widget, `position` flips the Launcher/window between
    bottom-left/bottom-right, `offlineMessage` replaces the banner's
    hardcoded string, and `typingIndicatorEnabled`/
    `soundNotificationsEnabled`/`quickRepliesEnabled` gate real behavior
    (the last of these plays a Web-Audio-generated tone — no audio asset
    file needed). `humanHandoffEnabled` is the one toggle stored but not
    wired — there's no single clean gate point for "disable human
    handoff" without deeper Chat Widget changes (any conversation can
    already be claimed by any available executive; there's no per-widget
    handoff flag to check). `brandLogoUrl` renders as a small avatar in
    the chat window header when set.

64. **The Admin Dashboard is frontend-polled REST
    (`GET /admin/dashboard/metrics` every 15s), not a new Socket.io event**
    despite `ADMIN_PANEL.md` §21 listing "Dashboard Metrics" as a
    real-time socket update. Polling is simpler, sufficient for a metrics
    view (not a live chat), and keeps this already-large phase bounded —
    noted in `docs/SOCKET_EVENTS.md`'s Not Yet Implemented section rather
    than silently diverging from the doc.

65. **`averageResponseTimeSeconds` is a real, computed metric (first
    visitor message → first executive reply, per conversation, capped to
    the 200 most recent), not a stub.** `openTickets`, `todaysLeads`, and
    `aiResolutionRate` are `null` rather than `0` — the Ticket (Phase 12)
    and Lead (Phase 13) modules don't exist yet, and there's no
    resolution-tracking concept anywhere, so there's no data to be zero
    *of*. `null` renders as "N/A" on the dashboard; a real `0` would
    misleadingly imply "checked, and the answer is zero."

66. **Found via runtime testing, not lint/build: Mongoose's `required`
    validator on the `Prompt.content` String path rejected the
    intentionally-empty `LEAD`/`ESCALATION` seed content.** Mongoose's
    built-in required-checker for Strings treats `''` as "absent"
    (`v != null && v !== ''`), so `{ required: true, default: '' }`
    is a self-contradicting combination whenever the default is actually
    used — every attempt to seed an empty-content prompt threw a
    `ValidationError` (surfaced as a raw `500` on `GET /prompts`, the
    first endpoint that triggered lazy-seeding). Only caught by actually
    calling the endpoint, not by reading the schema — `required: true`
    reads correctly at a glance. Fixed by dropping `required` (the
    `default: ''` already expresses "empty is the valid unset state").

67. **Found via runtime testing, not lint/build: the prompt-version
    restore route lost its `:version` param entirely.** The `validate`
    middleware's `stripUnknown: true` (existing behavior from Phase 2's
    validation middleware) rewrites `req.params` to *only* the keys a
    given Joi schema declares — `promptTypeParamSchema` only declares
    `type`, so validating `/:type/versions/:version/restore`'s params
    with it silently deleted `version` from `req.params`, turning
    `Number(req.params.version)` into `NaN` and crashing Mongoose's query
    cast downstream. The equivalent Knowledge restore route
    (`knowledgeRoutes.js`) never hit this because it doesn't run its
    params through `validate(...)` at all — this was a new mistake in
    Phase 11's own route, not a latent pre-existing bug. Fixed with a
    second schema, `promptVersionParamSchema`, declaring both `type` and
    `version`, used only on that one route.

68. **Found via runtime testing, not lint/build: the new
    `executiveService.adminList` reintroduced the exact Phase 8
    undefined-filter bug** (`docs/IMPLEMENTATION_STATUS.md` Architecture
    Decision 43) **in a brand-new method.** `adminList` passed
    `{ status }` straight through to `executiveRepository.listWithUser`
    as a MongoDB filter without checking truthiness first — with no
    `?status=` query param, `{ status: undefined }` matched zero
    documents instead of "no filter," so the Executive Management table
    loaded empty immediately after successfully creating an executive.
    The *existing* `executiveService.list` (self-service) already had the
    correct conditional-filter guard right next to it in the same file —
    this was a fresh instance of a known lesson, not a novel discovery,
    which is exactly why it's worth re-flagging: an established pattern
    living two methods away didn't stop it from being reintroduced. Fixed
    by applying the same guard.

69. **A new `socket/ioRegistry.js` — a tiny module-level `{ setIO, getIO }`
    pair — lets REST controllers broadcast Socket.io events, instead of
    threading `io` through every layer or building a pub/sub system.**
    Every real-time event before Phase 12 was emitted from inside a
    socket event handler (`chatEvents.js`), which already has `io` in
    scope. Ticket mutations happen over REST, which never touches the
    socket layer — `initializeSocket` is called exactly once
    (`server.js`), so a single module-level reference set at startup and
    read anywhere is sufficient; no DI container or event bus needed for
    one Socket.io server instance.

70. **Ticket notifications reuse the existing `notification:new` event
    and `executives` room rather than adding `ticket:created` etc. as new
    socket events.** Established in Phase 10 for conversation events and
    extended in the same shape here — a `type` field distinguishes the
    seven ticket notification kinds, and the same client-side
    `assignedExecutiveId`-vs-own-id filtering convention applies. Keeps
    the socket event surface from growing one bespoke event per module.

71. **Prompt Management's `PromptManagementPage` is not the model for
    Tickets — Tickets got a list page *and* a separate detail page
    (`/tickets/:id`), not a dialog-based single-page CRUD like Knowledge
    Management or Executive Management (Phase 11).** A ticket accumulates
    meaningfully more on-screen material per item (notes, an audit trail,
    optional conversation context) than a knowledge document or an
    executive's profile fields — a modal would be cramped, and the audit
    trail in particular reads better as a permanent, scrollable page
    section than something that closes when you click away.

72. **The status control only ever offers the ticket's current status's
    valid next statuses (`VALID_STATUS_TRANSITIONS`), computed
    client-side from a constant mirroring the backend's own transition
    map.** This is a UX improvement, not a security boundary — the
    backend independently re-validates every transition and would reject
    an invalid one regardless of what the UI offered. Duplicating the
    map on the frontend (rather than fetching it) is a deliberate,
    low-risk redundancy: it's static data with no legitimate reason to
    drift from the backend within a single deployed version.

73. **Ticket System notifications only arrive live while the Executive
    Workspace (Phase 10) happens to be mounted — not while viewing
    `/tickets` itself.** The single Socket.io connection is opened by
    `useExecutiveWorkspace`, scoped to the `/dashboard` route; extending
    its existing `notification:new` handler with ticket types (rather
    than opening a second socket connection scoped to the Tickets page)
    was the pragmatic, low-risk choice consistent with the existing
    architecture, at the cost of ticket toasts not appearing if the user
    is on `/tickets` without also having `/dashboard` open in the same
    session. Revisit if/when the socket connection becomes app-wide
    rather than page-scoped.

74. **The "LEAD" Prompt Management slot (seeded empty in Phase 11,
    explicitly noted then as "administered ahead of the consumer") is a
    single shared system-level prompt for *both* AI Lead Detection and
    the AI Qualification Summary, not two separate prompt types.** Both
    are lead-related AI analysis tasks; `leadAiService` builds two
    different user-role messages (one asking for qualification +
    extraction JSON, one asking for a qualification-summary JSON) on top
    of the same admin-editable system framing — mirroring how `SYSTEM`+
    `DEVELOPER` prompts already serve as shared framing across every
    regular chat completion, with per-call specifics handled in code
    rather than in the admin-editable prompt. Avoided proposing a new
    seventh prompt type for a one-phase, closely-related pair of calls.

75. **Lead's `aiSummary` and `followUp` are embedded sub-documents on the
    lead itself, not separate collections (unlike Tickets' notes/audit,
    which are their own collections).** Each lead has at most one current
    AI summary and one current follow-up — there's no "many summaries
    per lead" or "many follow-ups per lead" concept in
    `LEAD_MANAGEMENT.md`, so a sub-document (regenerated/updated in
    place) is the right shape; a join-requiring separate collection would
    be unjustified complexity for a 1:1 relationship.

76. **No dedicated Lead audit-trail collection, unlike `ticket_audit_logs`
    (Phase 12).** "Audit" was explicitly in Ticket System's task list and
    explicitly *absent* from Lead Management's (`Lead Detection, Lead
    CRUD, AI Summary, Assignment, Follow-up, Conversion`) — a deliberate
    scope difference between the two phases' instructions, not an
    oversight or an inconsistency to reconcile.

77. **Archiving/restoring a lead reuses the existing status-transition
    endpoint (`ARCHIVED` is just another value in the status enum), not
    a separate `DELETE`/`POST .../restore` pair like Tickets.** Tickets
    have a genuinely separate concept — `isDeleted` (soft delete) is
    orthogonal to `status` (a ticket can be `CLOSED` without being
    deleted). Leads' lifecycle diagram (`LEAD_MANAGEMENT.md` §4)
    explicitly ends in `Archived` as a pipeline stage, and `ARCHIVED ->
    NEW` cleanly expresses "Restore" (re-enter the pipeline fresh) — so
    modeling it as a status transition (with an extra ADMIN-only guard
    inside `updateStatus` for entering/leaving `ARCHIVED` specifically)
    is more faithful to the source doc than inventing a second,
    ticket-style soft-delete flag that isn't described anywhere in
    `LEAD_MANAGEMENT.md`.

78. **`LEAD_UPDATED` is one notification type covering general edits,
    every status change (including `LOST`), and anything else without a
    more specific type — not one type per status like Tickets'
    `TICKET_STATUS_CHANGED`/`TICKET_CLOSED`/`TICKET_REOPENED` split.**
    Lead Management's explicit scope this phase didn't call for the same
    fine-grained per-status notification detail as Tickets; consolidating
    avoided inventing distinctions the source doc doesn't ask for.
    `LEAD_CREATED`, `LEAD_ASSIGNED`, `LEAD_CONVERTED`, and
    `FOLLOW_UP_SCHEDULED` remain distinct since each has an obviously
    different meaning to an executive glancing at a toast.

79. **Fixed a Phase 11 gap while it was in scope: the Admin Dashboard's
    `openTickets` metric was still hardcoded `null` after Phase 12 built
    the Ticket module — it should have been wired then but wasn't
    noticed until Lead's own `todaysLeads` metric was being wired here,
    prompting a check of the sibling metric.** `ticketService.countOpen`
    and `leadService.countCreatedToday` were added together and both
    metrics now return real numbers; `aiResolutionRate` is the one
    remaining `null` (no resolution-tracking concept exists anywhere to
    compute it from).

80. **Business Hours lives inside the existing `settings` module, not a
    new top-level module, and reuses the existing `MANAGE_BUSINESS_HOURS`
    permission rather than adding a new one.** `FOLDER_STRUCTURE.md`
    explicitly lists "Business hours" under the `settings` module's
    ownership, and `MANAGE_BUSINESS_HOURS` (added in Phase 4, ADMIN-only)
    already matched the requirement ("Only administrators may modify")
    exactly — inventing a second permission constant with identical
    semantics would have been pure duplication.

81. **`GET /business-hours/status` and `GET /business-hours/callback-
    availability` are the only two public (unauthenticated) endpoints in
    the whole module.** The Chat Widget is a visitor-facing surface that
    has no login, so a status chip and callback suggestions have to be
    reachable without a token — same reasoning as the existing public
    Widget Settings endpoint (Phase 9). Everything that mutates
    configuration (`PATCH /`, holiday add/remove) stays behind
    `authenticate` + `MANAGE_BUSINESS_HOURS`.

82. **Callback Availability was built as a read/computation feature
    (status check + upcoming-slot suggestions) and wired into the Chat
    Widget as a real display consumer, but no new visitor-facing "submit
    a callback request" write endpoint was added, and nothing in the AI
    Engine, Ticket module, or Lead module was wired to trigger off
    business-hours state.** None of the three were in the explicit task
    list (Weekly Schedule, Holidays, Availability Service, Timezone
    Support, Callback Availability), and Phase 13 already established the
    precedent that visitor-facing Lead/Ticket creation is out of scope
    unless explicitly asked for — reversing that here without
    instruction would have been scope creep in the other direction.

83. **The Chat Widget's `useBusinessStatus` hook polls
    `GET /business-hours/status` on a 5-minute interval rather than
    receiving it over the socket.** Every other real-time feature in this
    project (notifications, chat messages, typing indicators) reacts to
    a discrete server-side action; business-hours status changes purely
    because a clock ticked past a boundary, so there is no natural event
    to push, and a public REST call cheap enough to poll was simpler than
    inventing a server-side scheduler just to emit one.

84. **`Intl.supportedValuesOf('timeZone')` does not include `'UTC'` in
    this project's Node/ICU build, even though `'UTC'` is the
    `BusinessHours` model's own default timezone — caught during
    Playwright verification, not the earlier `curl` pass, because the
    curl testing only ever changed the timezone away from `'UTC'` and
    never re-submitted the default value itself.** Left as originally
    written, `assertValidTimezone`'s allow-list check would have rejected
    the model's own default the first time an admin saved the Business
    Hours form without changing the timezone, and the admin UI's
    `<Select>` (populated from the same list) would never have offered
    `'UTC'` as a choice at all. Fixed on both sides: the backend
    validator now checks validity by constructing
    `new Intl.DateTimeFormat(undefined, { timeZone })` in a try/catch
    (which does accept `'UTC'`) instead of the allow-list, and the
    frontend's `TIMEZONES` list explicitly prepends `'UTC'` before
    deduplicating.

85. **`analytics_events`' `EVENT_TYPE` enum only includes event types with
    a real, wireable trigger somewhere in the codebase — there is no
    `AI_RESPONSE`, `AI_HANDOFF`, `AI_FAILED`, or `AI_FALLBACK` type.**
    Nothing in this project generates a live AI chat reply during a real
    conversation (confirmed by grepping the entire codebase for
    `aiEngine.generateResponse` — the only two places any AI provider is
    actually called are `summaryService` and `leadAiService`, both
    on-demand and unrelated to live chat). Inventing those event types
    and never firing them would have produced a Metrics/Reports surface
    that looks complete but is silently fake; returning honest zeros/
    nulls for `aiResolutionRate`/`aiConfidence`/`failedResponses`/
    `fallbackResponses` (same pattern as the Admin Dashboard's existing
    `aiResolutionRate: null`) was judged more honest than fabricating
    instrumentation for a pipeline that doesn't exist yet.

86. **"Human Handoffs" under AI Analytics (`ANALYTICS.md` §7) is counted
    from a real `CONVERSATION_HANDOFF` event — fired whenever an
    executive claims a `WAITING` conversation — even though, today,
    *every* conversation goes straight to a human with no AI-first
    triage stage at all.** This means the current number effectively
    equals total conversations claimed, not a narrower "escalated from
    AI" count. Documented rather than hidden: once/if a live AI-reply
    stage exists, this same event and metric become meaningful in the
    doc's originally-intended sense without any schema change.

87. **"Reports" (`ANALYTICS.md` §14) was not built as a second concept
    separate from "Metrics" — every domain Metrics endpoint accepts the
    same `range`/`from`/`to` query params, and that date-range filtering
    layer *is* the Reports feature.** The two task-list items describe
    the same underlying need (metrics, filterable by date range) rather
    than two different surfaces; inventing a parallel `/reports/*` route
    set that just re-exposed the same aggregations under a different
    path would have been duplication with no behavioral difference.

88. **The Phase 11 Admin Dashboard (`GET /admin/dashboard/metrics`) and
    the new `GET /analytics/dashboard` were deliberately left as two
    separate endpoints with overlapping metric sets, not unified into
    one.** The Admin Dashboard queries business-module repositories
    directly on every request — exactly what `ANALYTICS.md` §23 says a
    *proper* Analytics dashboard should avoid ("Business collections
    should not be queried directly for dashboard metrics"). Rebuilding
    Phase 11's dashboard on top of `analytics_events` now would have
    meant redesigning a completed, working module outside this phase's
    instructed scope ("Do not redesign completed modules unless
    explicitly instructed," CLAUDE.md) for a cosmetic-only behavior
    change (same live-current-state numbers, whichever way they're
    sourced, since both compute "right now," not a historical range).

89. **Business Hours Analytics' "Chats During/Outside Business Hours"
    and "Tickets Created After Hours" classify each real event's own
    timestamp against the Business Hours schedule by fetching the
    `business_hours` singleton once and reusing a new, pure
    `businessHoursService.computeStatus(businessHours, atDate)` — not by
    calling the existing `getStatus(atDate)` once per event.** The
    original `getStatus` re-fetches the singleton from the database on
    every call; classifying up to 2,000 event timestamps that way would
    have meant up to 2,000 sequential database round-trips per request,
    directly violating `ANALYTICS.md` §22 ("Analytics must not affect
    application performance"). `getStatus` itself is unchanged in
    behavior — it now just delegates to the extracted pure function.

90. **Device/browser classification for Visitor Analytics uses a small,
    dependency-free regex classifier reading `visitor_sessions`' existing
    `userAgent` field, capped at a 1,000-session sample — no UA-parsing
    library was added.** Same "no new dependency" precedent as Phase
    14's Intl-only timezone math. The classifier is deliberately coarse
    (`DESKTOP`/`MOBILE`/`TABLET`, `CHROME`/`FIREFOX`/`SAFARI`/`EDGE`/
    `OTHER`) since `ANALYTICS.md` §11 only asks for broad buckets, not
    precise device/browser/version detection.

91. **"Language" under Visitor Analytics is grouped by the visitor's own
    `preferredLanguage` field, not a detected browser `Accept-Language`
    value.** No code path anywhere captures the visitor's browser
    language at session-creation time — `preferredLanguage` (a Visitor
    field that already existed) is the closest real, already-collected
    signal, so it was reused rather than adding new capture
    infrastructure for a field this phase's task list didn't explicitly
    call for.

92. **Callback Requests under Business Hours Analytics is hardcoded `0`,
    not `null`.** This is a definite fact, not a missing data source:
    Phase 14 explicitly decided not to build a visitor-facing "submit a
    callback request" endpoint (Architecture Decision 82), so zero
    callback requests have ever been possible to make — `0` is the
    correct count, whereas `null` is reserved elsewhere in this phase for
    metrics with genuinely no way to compute them at all (e.g.
    `aiConfidence`).

93. **RAG's embedding vectors are a deterministic, dependency-free
    "hashing trick" (term-frequency counts hashed into 256 fixed buckets,
    L2-normalized) rather than a real ML embedding model, and no new
    embeddings provider/library was added.** Confirmed by direct
    inspection that this project's only configured AI provider (Groq) has
    no embeddings endpoint anywhere in its integration here — `aiProvider.js`'s
    entire contract is `generateCompletion`, and `groqProvider.js` only
    ever calls Groq's chat-completions endpoint. Adding a second, unrelated
    embeddings provider (a different API, or a local model library) would
    have been a real new dependency for a phase whose explicit task list
    didn't name one, and would have broken `RAG.md` §2's "remain provider
    independent" goal in the opposite direction — coupling retrieval
    quality to a second external service. The hashing-trick vector
    captures real lexical/token-overlap similarity (verified end-to-end: a
    business-hours query correctly ranked a business-hours document above
    an unrelated pricing document, and vice versa) — an honest, documented
    limitation (not true semantic similarity), not a hidden shortcut.

94. **Vector similarity is computed in application code (a plain dot
    product over pre-normalized vectors), not via MongoDB's native
    `$vectorSearch`.** Confirmed via `docker-compose.yml`: this project
    runs self-hosted MongoDB Community 7, and `$vectorSearch` is an
    Atlas-only aggregation stage, unusable here regardless of embedding
    quality. `RAG.md` §24 itself lists "MongoDB Vector Search" under
    Future Enhancements, confirming brute-force in-app scoring is the
    correct choice for the current phase, not a workaround for a missing
    feature.

95. **The RAG pipeline (Embedding Service, Vector Store, Retriever, Hybrid
    Search, Context Ranking) was built as new files inside the existing
    `knowledge` module, not a new top-level `rag` module.** `RAG.md` §8's
    own Collections list places `knowledge_embeddings` alongside
    `knowledge_base`/`knowledge_base_versions` as a natural extension of
    Knowledge's existing collections (the version-history sub-resource
    already lives there as precedent), and `RAG.md` §25's explicit rule —
    "The AI Engine never queries MongoDB directly. All retrieval occurs
    through the Knowledge Service" — is satisfied literally by keeping
    retrieval behind `knowledgeService.retrieveForQuery(...)`, a method on
    the module the AI Engine already depended on, rather than introducing
    a new module the AI Engine would need to learn about directly.

96. **`retrieverService.js` implements the Retriever, Hybrid Search, and
    Context Ranking as three clearly-named steps in one file
    (`retrieve()` → `hybridSearch()` → `rankAndSelect()`), not three
    separate files/modules.** All three are tight, sequential steps of one
    pipeline that nothing else in the codebase calls independently —
    splitting them into separate files would have been a premature
    abstraction with no reuse benefit. Each concept named in the task list
    is still identifiable and separately testable as its own named
    function, just not its own file.

97. **`knowledgeService.retrieveForQuery()` automatically falls back to
    the original category/keyword search (this project's pre-existing
    Phase 1 retrieval strategy) whenever the knowledge base has zero
    embeddings at all** — checked via a cheap `countDocuments({})` on
    `knowledge_embeddings`, not by treating an empty *ranked* result as a
    signal (a query that legitimately matches nothing shouldn't trigger a
    fallback that would also return nothing). This matters concretely: at
    the moment this phase shipped, the live system's `knowledge_embeddings`
    collection was genuinely empty (no knowledge had ever been published
    since the embedding hooks didn't exist before now) — without this
    fallback, the AI Engine's Context Builder would have silently stopped
    retrieving any knowledge at all until someone ran
    `npm run reindex:knowledge` or republished something.

98. **`knowledgeService.archive()` now deletes that document's embeddings
    outright (fire-and-forget), rather than leaving them in place with a
    status flag.** `RAG.md` §25 states plainly: "Published knowledge is
    the only source for embeddings" — an archived document is no longer
    published, so its chunks have no reason to remain retrievable, and
    leaving stale vectors around would let an archived (potentially
    incorrect or outdated) document keep influencing AI responses
    indefinitely. Verified directly: archiving a test document reduced its
    embedding-chunk count to exactly 0.

99. **A new shared `tokenize()`/`toKeywordPattern()` helper
    (`shared/helpers/tokenize.js`) was extracted from
    `ai/service/contextBuilder.js`'s pre-existing keyword-matching logic,
    rather than writing a second, separate tokenizer for the Embedding
    Service.** Both the Context Builder's keyword-regex generation and the
    new Embedding Service's hashing-trick vectors/keyword-overlap scoring
    need identical tokenization (lowercase, split, stopword/length
    filtering) — CLAUDE.md's "Reuse existing modules. Avoid duplicate
    logic" ruled out copy-pasting the stopword list and filter a second
    time into the `knowledge` module. `contextBuilder.js`'s own behavior is
    unchanged; it now imports the same logic from a shared location.

---

Known Issues

- No local MongoDB is documented/provisioned by the team yet; verification
  relied on a MongoDB instance already reachable on `localhost:27017` on the
  dev machine. `docker-compose.yml` provisions `mongo:7` for anyone without a
  local instance, but Docker Desktop was not running during Phase 1's session,
  so compose itself has still not been exercised end-to-end.
- `docs/PROJECT_MEMORY.md` and `docs/TASKS.md` are referenced throughout the
  other docs but still don't exist (`docs/SOCKET_EVENTS.md` and
  `docs/API_SPEC.md`, the other two long-standing gaps, were created in
  Phase 8 and Phase 4 respectively). Not addressed here — out of this
  phase's scope — but worth the user's attention.
- Logout still does not disconnect an active socket connection or update
  executive availability (`AUTHENTICATION.md` #12). Socket authentication
  now exists (this phase), so the missing piece is narrower than before:
  there's no server-side registry mapping a user id to their active
  socket(s), so `POST /auth/logout` has no way to reach into Socket.io and
  force-disconnect them. Executive availability doesn't exist at all yet
  (Phase 10). Tracked in `API_SPEC.md` §4 as a known gap.
- No explicit "end session" route exists — `visitor_sessions.endedAt` is
  defined in the schema but nothing sets it yet, and Phase 8 didn't add one
  either (a conversation ending doesn't currently end the visitor's
  session — they're independent lifecycles). Sessions currently only become
  unusable via token expiry (`VISITOR_SESSION_TIMEOUT`).
- No frontend consumes the visitor session endpoints yet (see Architecture
  Decision 25) — untestable in a browser until Phase 9's Chat Widget exists
  to call them. Verified via direct `curl` + a raw MongoDB read instead.
- No frontend consumes the Knowledge Base endpoints either — that's the
  Admin Portal's Knowledge Management screen, Phase 11. Verified entirely
  via `curl` (full lifecycle: create → publish → edit-while-published →
  version history → restore → archive → search/filter → permission
  boundaries for an Executive test user).
- Per-category `content` shape is unvalidated beyond "must be an object."
  `KNOWLEDGE_BASE.md` §6 describes very different expected shapes per
  category (Company vs. FAQs vs. Business Hours, etc.) but doesn't specify
  exact per-category JSON schemas, so none were invented. Revisit if a
  category's consumer (AI Engine, Phase 7) needs a stricter contract.
- **No live Groq API call was verified — no `GROQ_API_KEY` is configured in
  this environment.** Everything up to the actual network call was
  verified: `GroqProvider`'s request construction, response parsing, and
  error handling (non-200, network failure) were tested against a mocked
  `fetch`, and the full orchestration (`aiEngine.generateResponse`) was
  tested with a mocked provider. The one thing not exercised is a real
  round-trip to `https://api.groq.com/openai/v1/chat/completions`. Once a
  real key is set in `.env`, worth a manual smoke test — the implementation
  matches Groq's documented OpenAI-compatible chat-completions contract, but
  that's not the same as having actually called it.
- Context Builder's business-hours/active-settings context (`AI_ENGINE.md`
  §8: "Company Knowledge, Conversation History, Visitor Information,
  Business Hours, Active Settings") only includes Company Knowledge and
  Visitor Information right now — Business Hours and Chatbot Settings don't
  exist yet (Settings module, Phase 14). Nothing was stubbed/faked for
  them; the builder simply doesn't reference fields that don't exist yet.
- Conversation history is accepted as a parameter throughout the AI Engine
  pipeline (`contextBuilder`, `promptBuilder`, `aiEngine`) but is still
  always empty in practice — Chat now exists (Phase 8) and has real
  message history in MongoDB, but nothing calls `aiEngine.generateResponse`
  from the `chat:message` handler yet (see Phase 8's own scope note). The
  parameter is ready for whenever that wiring happens.
- `chat:message` does not yet call the AI Engine — a visitor sending a
  message gets it persisted and relayed to anyone else in the room, but no
  automatic AI reply. This was a deliberate scope line for Phase 8 (the
  user's explicit task list swapped the roadmap's "AI Responses" item for
  "Conversation Persistence" instead), not an oversight.
- Executives can join any conversation over the socket — no
  assignment/ownership check like the one visitors get. Deliberate (see
  Architecture Decision 41); revisit once Executive assignment exists
  (Phase 10).
- The Chat Widget (Phase 9) is now the first real frontend consumer of all
  of this — see its own Known Issues entries below for what it did and
  didn't cover.
- No AI reply appears in the widget when a visitor sends a message — see
  the two entries above (`chat:message` doesn't call the AI Engine yet).
  The widget itself has nothing to fix here; this is purely a backend
  wiring gap for a future phase.
- No Human Handoff UI (`CHAT_WIDGET.md` §15), no Business Hours awareness
  (§16 — Settings module doesn't exist, Phase 14), no Notifications (§18),
  no Theme Configuration (§19 — explicitly "No Admin UI" this phase). None
  of these were requested; noted so they aren't mistaken for oversights.
- The widget's Widget States (`CHAT_WIDGET.md` §6: `WAITING_AI`,
  `WAITING_EXECUTIVE`, `MINIMIZED`, `ENDED`) were deliberately reduced to
  what's actually backed by real behavior (`CONNECTING`/`CONNECTED`/
  `DISCONNECTED` plus an `isOpen` toggle) rather than adding states with no
  real trigger behind them (no AI wiring means no real "waiting for AI"
  moment; no executive assignment means no real handoff moment).
- `MessageBubble` styles an `AI`-sender message distinctly from `EXECUTIVE`
  (labeled "AI Assistant" vs. "Support"), but since nothing produces an
  `AI`-sender message yet, this was verified by code inspection only, not
  by actually seeing one rendered.
- The assignment-aware `chat:join` authorization gap noted since Phase 8
  is now resolved: `joinAsExecutive` rejects a second executive trying to
  claim an already-assigned conversation (403). Executives can still
  `chat:join` *any* unassigned (`WAITING`) conversation — there's no
  department/skill-based routing (`EXECUTIVE_DASHBOARD.md` §8 lists
  Department and Skills as factors, explicitly deferred there as
  "Future" for Skills) — any available executive can claim any queued
  conversation, which matches the doc's current, non-Future scope.
- No Ticket Management (`EXECUTIVE_DASHBOARD.md` §13), no Transfer/
  Escalate on a live conversation (§9 — the model has no fields for
  either), no Search (§16), no Performance Metrics (§17 — that's
  Analytics, explicitly excluded this phase), and no AI Handoff trigger
  (§10 — there's still no Escalation Detection anywhere in the AI Engine,
  so "Accept AI handoffs" has nothing to accept from). None of these were
  requested; noted so they aren't mistaken for oversights.
- No department/skill-based executive-to-conversation routing —
  `executiveModel` has `department`/`skills` fields (carried over from
  the original module design) but nothing reads them yet; any `ONLINE`
  executive can claim any `WAITING` conversation regardless of
  `maxChats`/`currentChats` (the fields are tracked and incremented/
  decremented correctly, but nothing blocks a claim once `currentChats`
  reaches `maxChats` — there's no capacity-based queue routing yet,
  matches `EXECUTIVE_DASHBOARD.md` §8's Skills item being marked
  "Future").
- Executive presence (`ONLINE`/`OFFLINE`) is still not reachable from
  logout (`AUTHENTICATION.md` #12, tracked since Phase 4/8) — logging out
  clears the frontend's access token and stops the socket being able to
  authenticate on its *next* reconnect, but doesn't actively disconnect
  an already-open socket, so `markOffline` only fires on an actual
  disconnect (browser close/reload/tab close), not on a same-tab logout
  button click. Same underlying gap as before: no server-side registry
  mapping user id → active socket(s).
- `notification:new` has no persistence/badge-count — it's a live toast
  only (`NotificationProvider`, Phase 3); a notification missed while the
  tab isn't focused (or arriving before the workspace has mounted) is
  simply gone, there's no notification inbox/history. Not requested;
  `EXECUTIVE_DASHBOARD.md` §14 doesn't specify persistence either.
- No User Management (`ADMIN_PANEL.md` §12 — roles/permissions/account
  status beyond what Executive Management covers), no Business Settings
  (§13), no Ticket Management (§14 — the Ticket module doesn't exist,
  Phase 12), no Analytics (§15, explicitly excluded this phase), no Audit
  Logs (§16 — no administrative action is logged anywhere), no admin
  Notifications (§17 — only executive-facing `notification:new` exists),
  no System Settings (§18), no Search (§20). None of these were
  requested; noted so they aren't mistaken for oversights.
- No department/skill-based routing for Executive Management either —
  Executive Management can *set* `department`/`maxChats` per executive,
  but nothing in the Conversation Queue reads `department` to route a
  waiting conversation to a specific department's executives (same gap
  noted in Phase 10's Known Issues, now with an actual admin UI to set
  the field that still isn't consumed).
- AI Settings' `responseLength`, `confidenceThreshold`, and
  `escalationRules`, and Widget Settings' `humanHandoffEnabled`, are
  stored and editable but not consumed by any runtime behavior yet — see
  Architecture Decisions 59 and 63 for exactly what's wired versus not,
  and why.
- No brand logo file upload — `brandLogoUrl` is a URL field; see
  Architecture Decision 61.
- Admin actions outside the `ticket` module (create/deactivate/
  reset-password, publishing a prompt, changing AI/Widget Settings) are
  still not audited anywhere — no system-wide `audit_logs` collection
  exists (`ADMIN_PANEL.md` §16). Tickets are the one exception now
  (`ticket_audit_logs`, Phase 12) — that audit trail is scoped to ticket
  actions only, not a general-purpose admin audit log. §23's "Sensitive
  operations should require confirmation" also isn't implemented at the
  UI level anywhere — these remain direct one-click actions, no
  confirmation dialog.
- The Executive Management, Prompt Management, and Settings pages have no
  optimistic UI or loading skeletons beyond a blank render while the
  initial fetch resolves — consistent with this codebase's existing
  simple loading patterns (e.g. `AvailabilityControl`), not a regression.
- No visitor-facing ticket creation or viewing exists — a visitor can't
  see the status of a ticket raised on their behalf, and there's no
  "Visitor Request" self-service flow; staff create every ticket. See
  Architecture Decision list in `API_SPEC.md` §15's Not Yet Implemented.
- No AI Ticket Creation (`TICKET_SYSTEM.md` §11) — there's no Escalation
  Detection or AI-driven trigger anywhere in the AI Engine to recommend
  one from, same underlying gap noted since Phase 7.
- Ticket category/priority lists are fixed enums, not admin-configurable
  (`ADMIN_PANEL.md` §13's "Configure Categories"/"Configure Priorities")
  — same scope line as Knowledge's fixed category list since Phase 6.
- No SLA tracking, export, or Reporting for tickets (`TICKET_SYSTEM.md`
  §19-20) — explicitly "Future" in the source doc; Reporting also feeds
  Analytics, out of scope.
- Ticket notifications only arrive live while the Executive Workspace is
  mounted, not while only `/tickets` is open — see Architecture
  Decision 73.
- Assignment has no availability/workload/department/skill-based
  auto-assignment (`TICKET_SYSTEM.md` §10) — every assignment is manual,
  to any user with an Executive profile regardless of their current
  ticket count or department. Same underlying gap as the Conversation
  Queue's lack of routing (Phase 10/11 Known Issues).
- No dedicated Lead audit-trail collection or full Search & Filters
  (`LEAD_MANAGEMENT.md` §16, §18) — deliberate scope difference from
  Tickets; see Architecture Decision 76.
- No visitor-facing lead visibility (`LEAD_MANAGEMENT.md` §20 — matches
  the doc: "Visitors cannot access leads").
- Lead scoring is a fixed AI-assigned `HOT`/`WARM`/`COLD` enum, not an
  admin-configurable rules engine (`LEAD_MANAGEMENT.md` §13's "configure
  lead scoring rules"), and there's no Export.
- No automated "Follow-up Due" reminders (`LEAD_MANAGEMENT.md` §17) — no
  scheduler/cron infrastructure exists in this project; only
  directly-triggered lead events broadcast in real time.
- No Lead Analytics/Reporting (`LEAD_MANAGEMENT.md` §19) — feeds the
  Analytics module, explicitly out of scope, same as Tickets'.
- Assignment for leads has the same lack of availability/workload/
  department-based auto-assignment as Tickets — every assignment is
  manual, to any user with an Executive profile.
- Lead notifications only arrive live while the Executive Workspace is
  mounted, same limitation as Tickets (Architecture Decision 73) — the
  socket connection is still page-scoped, not app-wide.
- `Conversion` links an existing ticket if one is provided but never
  creates one — an executive who wants a ticket out of a converted lead
  still has to create it separately via the Ticket module and pass its id
  back into `POST /leads/:id/convert`. No "convert and also open a
  ticket" one-click flow exists.
- No Special Hours (`BUSINESS_HOURS.md` §9 — one-off date/time overrides
  distinct from recurring Holidays, e.g. "open late this one Friday") —
  only the recurring Weekly Schedule and named Holidays exist.
- Business-hours state has no trigger anywhere else in the app yet: the
  AI Engine's Context Builder still doesn't populate its long-anticipated
  "Business Hours" context field (noted since Phase 7), and neither the
  Ticket nor Lead module reacts to open/closed state in any way (e.g. no
  "created outside business hours" flag). None of these were requested.
- No visitor-facing "submit a callback request" write endpoint — Callback
  Availability's read/computation side (status + upcoming-slot
  suggestions) is wired into the Chat Widget, but a visitor can't
  actually book one; see Architecture Decision 82.
- No Executive-level working hours, multiple business locations/hours
  per location, or calendar sync (`BUSINESS_HOURS.md` §20-22) — all
  explicitly "Future" in the source doc; a single company-wide schedule
  is all that exists.
- The known DST edge case in the timezone conversion: `localToUtcDate`'s
  guess-then-correct technique is accurate for virtually every real
  case, but the ambiguous/skipped local hour during a DST transition
  itself (e.g. 2:30 AM on a "spring forward" day, which doesn't exist)
  is not specially handled — it will resolve to *some* UTC instant, just
  not necessarily the one a human would expect for that specific hour.
- No Charts (`ANALYTICS.md` §15), Export (§16), or Real-Time Updates
  (§17) — the Admin Analytics page renders every metric as plain numbers
  and compact tables; nothing pushes dashboard changes over Socket.io,
  and there's no CSV/Excel/PDF download anywhere. None of these were
  requested (the explicit task list was `Event Collection, Dashboard
  APIs, Metrics, Reports, Aggregations`).
- No Data Retention/archival policy (`ANALYTICS.md` §19) — every
  `analytics_events` document is kept forever; there's no TTL index and
  no archival job.
- Analytics only reflects activity from Phase 15 onward — the
  `analytics_events` collection didn't exist before this phase, so nothing
  that happened earlier in the project's history (every conversation,
  ticket, and lead created in Phases 8-13) appears in any Metrics/Reports
  endpoint. Only the live Dashboard (§5, current-state snapshots) is
  unaffected by this gap.
- AI Analytics is mostly honest zeros/nulls — no live AI chat-reply
  pipeline exists anywhere in the codebase (tracked since Phase 8), so
  `aiResolutionRate`, `aiConfidence`, `failedResponses`, and
  `fallbackResponses` all have no real data source to compute from; see
  Architecture Decision 85.
- Executive Analytics' `averageResponseTimeSeconds` and `activeTime` are
  always `null` — no per-executive first-response-time tracking or
  active-time/session-duration tracking exists anywhere (presence only
  has a point-in-time `lastSeen`, not an accumulated duration).
- No Executive-facing "My Analytics" view — the backend's
  `GET /analytics/executives` genuinely supports an `EXECUTIVE`-role
  token self-scoping to their own metrics (verified directly against the
  API), but nothing in the frontend consumes it; the Admin Analytics
  page is Admin-only, matching every other Admin Portal page so far.
- Visitor Analytics' Device Type/Browser classification is a small,
  coarse, dependency-free regex reading each session's stored
  `userAgent` (capped at a 1,000-session sample) — not a proper UA-
  parsing library. "Language" is the visitor's own stated
  `preferredLanguage` preference, not a detected browser language (no
  code path captures `Accept-Language` anywhere). Geographic
  Distribution (`ANALYTICS.md` §11) is explicitly "(Future)" in the
  source doc and not built.
- Widget Analytics' `averageSessionDurationSeconds` is always `null` —
  `WIDGET_OPENED`/`WIDGET_CLOSED` events aren't correlated by a shared
  session id, so an open/close pair can't be matched up to compute a
  real duration from the data collected.
- No true semantic embeddings — RAG's vectors are a dependency-free
  hashing-trick (lexical/token-overlap similarity), not a real ML
  embedding model; see Architecture Decision 93. Upgrading to a real
  embedding provider would be a drop-in replacement of `embeddingService.
  embed()` alone (the rest of the pipeline — chunking, storage,
  retrieval, ranking — doesn't assume anything about how the vector was
  produced).
- No MongoDB Atlas `$vectorSearch` — this project's self-hosted MongoDB
  Community 7 doesn't support it; similarity is scored in application
  code (brute-force cosine similarity over a capped candidate pool). Fine
  at this project's realistic content volume; would need revisiting if
  the knowledge base grows far beyond `MAX_CANDIDATE_CHUNKS` (500).
- No Re-ranking (`RAG.md` §18 — cross-encoder/LLM re-ranking/business
  rules), Query Expansion (§6), or Intent Detection feeding the
  Retriever — all explicitly "Future" in the source doc.
- No live AI chat-reply pipeline exists anywhere (tracked since Phase 8),
  so the new Retriever/Hybrid Search/Context Ranking pipeline is
  currently only exercised by the two places `aiEngine.generateResponse`
  is actually called today (on-demand conversation summaries and Lead
  Detection/Qualification Summary) — not by a real, in-conversation AI
  reply to a visitor. Verified directly via the Knowledge Service's
  `retrieveForQuery()` and the Context Builder's `build()` in isolation,
  not via an actual chat message producing an AI response, since no such
  code path exists yet.
- Documents published before Phase 16 existed have no embeddings until
  `npm run reindex:knowledge` is run once, or until they're next
  edited/republished — `retrieveForQuery()`'s fallback to category/
  keyword search covers this gap automatically (see Architecture
  Decision 97), but ranked hybrid retrieval specifically won't apply to
  such documents until one of those two things happens.
- No admin-facing UI/endpoint to trigger a manual reindex or inspect
  embedding-generation status — `npm run reindex:knowledge` is a CLI-only
  operational script, not exposed via the Admin Portal; not requested
  (the explicit task list was Embedding Service, Vector Store
  Integration, Retriever, Context Ranking, Hybrid Search, and AI Engine
  integration — no UI/API surface item was named).

---

Next Task
Phase 17 – Production (per `docs/IMPLEMENTATION_ROADMAP.md` and
`docs/DEPLOYMENT.md`) — the final phase on the roadmap; every business
feature module (Chat, Tickets, Leads, Business Hours, Analytics, RAG) is
now built, leaving deployment hardening, environment/secrets review, and
production readiness as the remaining work.

---

Session Log
Session 1
Date: 2026-07-03

Completed:
- Initialized `backend/` (Express app, Mongoose connection config, env config,
  documented `src/` folder skeleton) and `frontend/` (Vite React app with
  router/UI/socket dependencies installed).
- Configured ESLint (flat config, both packages) and Prettier (shared root
  config).
- Configured npm workspaces at the project root; added `concurrently` for
  running both dev servers together.
- Configured Husky + lint-staged, scoped to the actual git repository root
  (see Architecture Decision 1).
- Added `Dockerfile`s for backend and frontend, and a root `docker-compose.yml`
  wiring backend + frontend + MongoDB.
- Added root `.env.example`, updated root `README.md` with setup/dev/docker/
  lint instructions.
- Added `.github/workflows/ci.yml` (install, lint, frontend build) at the true
  repository root.
- Verified: `npm run lint` passes clean on both packages; the backend module
  loads and, when run standalone, connects to MongoDB and serves `GET /`
  successfully; the frontend Vite dev server boots and serves the app shell.

Files Created: see Session 1 entry in git history / prior revision of this
document.

Notes:
- Flagged and resolved a documentation/reality conflict before coding: the
  documented project root (`customer-engagement-platform/`) is not the actual
  git repository root. User chose to keep the nested layout and scope
  Husky/CI tooling to work around it (Architecture Decision 1).
- Docker Compose was not run end-to-end this session (Docker Desktop wasn't
  running and the user asked to skip that verification path); Dockerfiles and
  compose config were written but should be smoke-tested before relying on
  them.
- No `.env` was committed; only `.env.example` at the project root, per
  `.gitignore`.

Session 2
Date: 2026-07-03

Completed:
- Built the backend foundation: config loader (env validation), winston-based
  logger, centralized error handling (`AppError`/`NotFoundError`/`ValidationError`
  + `errorHandler`/`notFoundHandler` middleware), standard response wrapper
  (`sendSuccess`/`sendError`), Joi-based generic validation middleware,
  hardened MongoDB connection (event logging + graceful shutdown), generic
  `BaseRepository`/`BaseService`, a health-check module, and API versioning
  (`/api/v1/...`).
- Rewired `app.js` (helmet, cors, json, rate limiter, morgan→logger, versioned
  routes, notFoundHandler, errorHandler in the correct order) and `server.js`
  (graceful shutdown on SIGINT/SIGTERM).
- Explicitly did not implement Authentication or AI, per instruction.
- Removed redundant `.gitkeep` placeholders in directories that now have real
  files.

Files Created: see "Files Created" section above.

Notes:
- Surfaced and resolved a second documentation conflict before coding
  (CONVENTIONS.md kebab-case vs. CODING_STANDARDS.md camelCase file naming) —
  user chose camelCase (Architecture Decision 4).
- Verified end-to-end: `npm run lint` clean; server boots, connects to
  MongoDB, `GET /api/v1/health` returns the documented success envelope with
  `database: "connected"`; an unmatched route returns the documented error
  envelope via the centralized error handler; a throwaway Joi schema
  confirmed the validation middleware rejects invalid input with clear
  messages.
- No routes, models, or logic for `auth`, `visitor`, `chat`, `knowledge`, `ai`,
  `executive`, `ticket`, `admin`, `analytics`, or `settings` modules were
  created — `src/modules/` only contains `health/`.

Session 3
Date: 2026-07-03

Completed:
- Built the frontend foundation: MUI theme + `ThemeProvider`/`CssBaseline`,
  `MainLayout` (AppBar with menu toggle, temporary Drawer, footer, `Outlet`),
  routing (`AppRoutes` with `HomePage` + catch-all `NotFoundPage`, route path
  constants), global state via Context API (`UIProvider` for sidebar state,
  `NotificationProvider` for a queued toast system with a `useNotification`
  hook), a centralized axios API client with response-envelope error mapping,
  and a Socket.io client wrapper (`connectSocket`/`disconnectSocket`/`getSocket`,
  not auto-connected — no live socket server exists yet on the backend).
- Composed it all in `App.jsx`: `ErrorBoundary` > `ThemeProvider` >
  `BrowserRouter` > `UIProvider` > `NotificationProvider` > `AppRoutes`.
- Replaced the default Vite template demo (App.css, react/vite/hero images,
  boilerplate markup) with the real app shell; updated `index.html` title.
- Configured Vite (`envDir: '../'`) to read the shared root `.env`, and added
  `VITE_API_BASE_URL`/`VITE_SOCKET_URL` to the root `.env.example`.
- No business pages, no Authentication (no auth context/login UI), no AI —
  per instruction.

Files Created: see "Files Created" section above.

Notes:
- `npm run lint` and `vite build` both passed on the first layout/component
  draft, but didn't catch a real bug: several components used MUI `Box`/`Stack`
  shorthand props (`flexDirection`, `alignItems`, `minHeight`, `textAlign`)
  that this MUI version doesn't apply as styles — they leaked through as
  invalid DOM attributes and visibly broke centering/full-height layout. Only
  caught by actually running the app: installed Playwright + Chromium,
  drove the dev server headlessly (home page → open drawer → 404 route →
  back-to-home link), checked `console --errors` equivalent (page `console`/
  `pageerror` listeners), and screenshotted each step. Fixed by moving those
  props into `sx={{ ... }}` everywhere (Architecture Decision 14); re-verified
  with the same script until console was clean and screenshots looked right.
- Chromium (headless shell) was downloaded via `npx playwright install
  chromium` for this verification since `chromium-cli` wasn't available in
  this environment; browser binaries now live in the user's Playwright cache,
  not in the repo.
- No routes/pages for any business module (`auth`, `visitor`, `chat`,
  `knowledge`, `ai`, `executive`, `ticket`, `admin`, `analytics`, `settings`)
  were created — `src/pages/` only contains `HomePage` and `NotFoundPage`,
  and `src/features/` remains an empty placeholder.

Session 4
Date: 2026-07-03

Completed:
- Backend: JWT access/refresh tokens (`shared/helpers/jwt.js`), password
  hashing (`shared/helpers/password.js`), roles + a full permission matrix
  (`shared/constants/`), the `auth` module (model/repository/service/
  validator/controller/routes) covering login, refresh (rotating), logout,
  and `/me`, plus reusable `authenticate`/`authorize` (`requireRole`,
  `requirePermission`) middleware and an idempotent `seedAdmin.js` script.
- Frontend: `AuthProvider` (silent session restore on load, login, logout),
  `useAuth`, a frontend `authService`, an `apiClient` upgraded with
  credentialed requests, Authorization header injection, and deduped
  refresh-and-retry on 401, a `LoginPage`, a `ProtectedRoute`, a minimal
  `DashboardPage` placeholder, and login/logout wired into `MainLayout`'s
  AppBar.
- Created `docs/API_SPEC.md` (didn't exist before this phase — confirmed with
  user first) documenting the health-check and every auth endpoint.
- No AI code touched, per instruction.

Files Created: see "Files Created" section above.

Notes:
- Flagged a third documentation gap before coding (missing `API_SPEC.md`,
  despite being referenced everywhere as the API source of truth) and asked
  the user how to handle it — they chose to have it created now rather than
  skipped (Architecture Decision 15).
- Found and fixed two real runtime bugs neither lint nor build caught:
  (1) `authController.me` read `req.user.userId`, but `authenticate` attaches
  the full safe-user object under `.id`, not `.userId` — every `/me` call
  returned a spurious 404 "User not found" until caught by an actual `curl`
  request with a real token (Architecture Decision — folded into the `me`
  handler simplification, since `req.user` already has everything needed,
  no second DB round-trip required). (2) React StrictMode's double-invoked
  mount effect fired two concurrent `/auth/refresh` calls; because refresh
  tokens rotate (single-use), the second call always failed with the token
  the first had just invalidated, silently logging the user back out
  immediately after login-persisted-across-reload — only visible by actually
  reloading the page in a browser and watching the session vanish
  (Architecture Decision 17, fixed via a shared `requestTokenRefresh()`
  dedup in `apiClient.js`).
- Verified end-to-end with Playwright end-to-end: (1) unauthenticated visit
  to `/dashboard` redirects to `/login`; (2) wrong password shows a generic
  "Invalid email or password" toast; (3) correct login lands on `/dashboard`
  with the seeded admin's name and role; (4) a full page reload preserves
  the session (silent refresh via the httpOnly cookie); (5) logout returns
  the AppBar to a "Login" state; (6) `/dashboard` redirects to `/login`
  again post-logout. Also verified directly with `curl`: wrong-password
  rejection, successful login + `Set-Cookie`, `/me` with and without a
  token, `/refresh`, `/logout`, and that `/refresh` correctly fails after
  logout (session fully invalidated server-side, not just cookie-cleared
  client-side).
- No visitor/anonymous session logic, no socket authentication, and no
  user-management (create/update/list users) endpoints were built — all
  explicitly out of scope for this phase (see Architecture Decisions 16, 20
  and the Known Issues entry on logout's socket/presence gap).

Session 5
Date: 2026-07-03

Completed:
- Built the `visitor` module: `Visitor`/`VisitorSession` models
  (`visitors`/`visitor_sessions` collections), their repositories (extending
  `BaseRepository`), and a `visitorService` with `createSession` (generates
  `visitorId`/`sessionId` via `crypto.randomUUID()`, records `ipAddress`/
  `userAgent`, signs a visitor token) and `restoreSession` (verify → look up
  session → look up visitor → touch `lastActivityAt` → re-sign a fresh
  token — sliding expiration).
- Added `signVisitorToken`/`verifyVisitorToken` to the existing
  `shared/helpers/jwt.js` (own secret, own claims, reusing the existing
  `parseDurationToMs`).
- Built `middleware/visitorSession.js` (`requireVisitorSession`,
  `attachVisitorSession`) and wired `POST /api/v1/visitors/sessions` +
  `GET /api/v1/visitors/sessions/me` behind it.
- Updated `docs/API_SPEC.md`: added §6 Visitor Sessions, fixed a stale
  `req.user.userId` reference left over from Session 4's `me`-handler
  simplification (should have said `.id`), and updated §4's "not yet
  implemented" note now that visitor sessions exist.
- No Chat/conversation code touched, per instruction. No frontend changes —
  see Architecture Decision 25.

Files Created: see "Files Created" section above.

Notes:
- Verified via `curl` end-to-end: `POST /sessions` creates a visitor +
  session and returns a token; `GET /sessions/me` with that token succeeds
  and its `lastActivityAt` visibly advances between calls; the same
  endpoint with no token or a garbage token returns the documented 401.
  Cross-checked directly against MongoDB (`visitors`/`visitor_sessions`
  collections) that the persisted documents match the schema exactly
  (`ipAddress`, `userAgent`, `startedAt`, `lastActivityAt`, `endedAt: null`).
- Confirmed by construction (distinct signing secrets) rather than by a
  clean end-to-end token-swap test that visitor and admin tokens can't be
  used interchangeably — a `curl` test meant to demonstrate this concretely
  didn't carry the token variable across separate tool calls (shell state
  doesn't persist between tool invocations in this environment) and produced
  an inconclusive result; not treated as a real gap since the mechanism
  (different `JWT_SECRET`/`VISITOR_TOKEN_SECRET`) makes cross-use
  cryptographically impossible regardless.
- No routes/UI for Chat, Socket auth, or any visitor-facing frontend were
  built — all explicitly out of scope (see Architecture Decisions 21, 25 and
  the new Known Issues entries on `endedAt` and frontend consumption).

Session 6
Date: 2026-07-03

Completed:
- Built the `knowledge` module: `Knowledge`/`KnowledgeVersion` models
  (`knowledge_base`/`knowledge_base_versions` collections), their
  repositories (`search` with category/status/keyword filtering built on
  `BaseRepository.findAll`'s pagination), and `knowledgeService` covering
  create, get by id/slug, search, update (with conditional version
  snapshotting), publish, archive, list versions, and restore a version.
- Added Joi validation (create/update/search schemas, slug pattern,
  category/status enum checks) and wired everything behind `authenticate`
  + `requirePermission` (new `VIEW_KNOWLEDGE_BASE` for reads, existing
  `MANAGE_KNOWLEDGE_BASE` for writes).
- Updated `docs/DATABASE.md` (§13: `status` enum, `publishedAt`, full
  category list, new versions-collection subsection + Collection Ownership
  row) and `docs/API_SPEC.md` (new §7 Knowledge Base; §8 Not Yet
  Implemented gained AI/RAG and advanced-search entries).
- No AI/RAG code touched, per instruction — this module only stores and
  versions content; nothing reads it for AI context yet.

Files Created: see "Files Created" section above.

Notes:
- Reconciled two doc conflicts before coding rather than blocking on them
  (both logged as Architecture Decisions 26-27): `DATABASE.md`'s boolean
  `isPublished` vs. `KNOWLEDGE_BASE.md`'s three-state `status` enum, and
  where version history should live (new collection vs. embedding) — both
  resolved in favor of the more specific/detailed doc and `DATABASE.md`'s
  own stated principles (prefer references over embedding), then folded
  back into `DATABASE.md` itself so it no longer contradicts the code.
- Verified the full lifecycle via `curl` end-to-end: create (rejects
  duplicate slugs and invalid categories with clean 400s, not raw Mongo
  errors) → publish → edit-while-published (confirmed it snapshots version 1
  and bumps to version 2) → list versions → restore version 1 (confirmed it
  snapshots version 2, bumps to version 3, and content actually reverts) →
  archive → search by `status=ARCHIVED` → get by slug. Also created a
  throwaway Executive-role test user and confirmed permission boundaries:
  Executive can `GET` (200) but gets a clean 403 on create/update; no token
  at all gets 401. Cleaned up all test data (documents, versions, the test
  user) afterward.
- No frontend work — see Architecture Decision 31 note in Known Issues; the
  consumer is the Admin Portal's Knowledge Management screen (Phase 11).

Session 7
Date: 2026-07-03

Completed:
- Built the `ai` module: `AIProvider` abstract base + `GroqProvider` (native
  `fetch`, no new dependency) + `providerManager.getProvider()`; a
  `promptBuilder` assembling chat-completions messages from file-based
  templates (`system.md`/`developer.md`/`fallback.md`) in the documented
  order, with input sanitization; a `contextBuilder` retrieving
  `PUBLISHED`-only knowledge through the existing `knowledgeService`; a
  `responseParser` checking validity/truncation; and `aiEngine.
  generateResponse` orchestrating all of it with fallback-on-invalid-response
  handling.
- Added AI-related env vars (`AI_PROVIDER`, `AI_TEMPERATURE`,
  `AI_MAX_TOKENS`, `AI_KNOWLEDGE_LIMIT`) alongside the existing
  `GROQ_API_KEY`/`GROQ_MODEL` from Phase 1.
- Updated `docs/API_SPEC.md` with an internal-reference section for this
  module (no routes exist) and expanded "Not Yet Implemented."
- No Chat code touched, no HTTP endpoints added, per instruction — and no
  Intent/Lead/Escalation/Confidence/Summary components, since none were
  requested and none are meaningful without a real conversation to act on.

Files Created: see "Files Created" section above.

Notes:
- Found and fixed two real bugs that lint/build did not catch (both logged
  as Architecture Decisions 34-35): (1) `aiEngine.js` originally destructured
  `const { getProvider } = require(...)`, which froze the reference at
  require-time and silently made the provider unmockable in tests — switched
  to calling `providerManager.getProvider()` through the module object.
  (2) `contextBuilder` originally passed the visitor's entire raw message as
  a literal substring `$regex` against `title`/`keywords` — a real query
  like "what are your hours" can never substring-match a field like
  `"Business Hours"`, so every real call would have silently retrieved zero
  knowledge. Fixed with keyword extraction (strip stopwords/short words,
  escape regex metacharacters, join as an alternation) — this is exactly
  `RAG.md` §13's documented "Phase 1: Category Search, Keyword Search"
  strategy, not a shortcut around it.
- Verified without any HTTP endpoint to hit: (1) a Node script created a
  real `PUBLISHED` knowledge document and confirmed `contextBuilder`
  retrieves it for a matching message and excludes it once switched to
  `DRAFT`; (2) `responseParser` tested against valid/empty/truncated raw
  responses; (3) `promptBuilder` output shape and ordering; (4) `aiEngine`'s
  full orchestration with a mocked provider, covering both the successful
  path and the empty-response-triggers-fallback path; (5) `GroqProvider`
  against a mocked `fetch`, covering a non-200 response (mapped to a clean
  502, raw error body not leaked), a network failure (also 502), and a
  successful response's content/finish_reason/usage parsing. All test data
  cleaned up afterward.
- Did not verify an actual live call to the Groq API — no `GROQ_API_KEY` is
  configured in this environment (confirmed absent, did not ask the user to
  paste a key into chat). Logged as a Known Issue; the implementation
  follows Groq's documented OpenAI-compatible contract but that's not the
  same as having exercised it.

Session 8
Date: 2026-07-03

Completed:
- Built the `chat` module: `Conversation`/`Message` models
  (`conversations`/`messages` collections), their repositories, and
  services (`getOrCreateActiveForVisitor`, ownership checks, `send`,
  `listByConversation`, `markRead`). Read-only REST
  (`GET /conversations`, `/:id`, `/:id/messages`) for staff.
- Built `src/socket/`: `initializeSocket` (Socket.io attached to the
  existing HTTP server — installed since Phase 1, never used until now),
  `socketAuthenticate` middleware (accepts either an admin `accessToken`
  or a visitor `visitorToken` at the handshake, never both as the same
  identity), and `chatEvents` (`chat:join`, `chat:message`, `chat:typing`,
  `chat:stop-typing`, `chat:read`).
- Created `docs/SOCKET_EVENTS.md` (user confirmed creating it, mirroring
  the `API_SPEC.md` gap from Phase 4) and updated `docs/DATABASE.md`
  (added `readAt`, a Message Types list) and `docs/API_SPEC.md` (§9
  Conversations).
- No Chat Widget UI, no AI-response wiring into `chat:message`, per
  instruction/explicit scope (see Architecture Decisions and Phase 8's
  task list above).

Files Created: see "Files Created" section above.

Notes:
- Found and fixed a real bug that lint and the initial socket tests didn't
  catch (Architecture Decision 43): `conversationController.list` passed
  `req.query` straight through as a Mongoose filter. With no query params
  supplied, `{status: undefined, visitorId: undefined}` matched **zero**
  documents instead of "no filter" — confirmed directly
  (`find({...undefined})` → 0 vs. `find({})` → 1 on identical data) when
  `GET /conversations` came back empty right after a conversation had just
  been created and messaged in during the socket test. Fixed by adding
  `conversationRepository.search()` that only includes truthy filter keys,
  the same pattern `knowledgeRepository.search` already used — checked that
  no other module's list endpoint has the same latent bug (auth and
  visitor modules have no filterable list endpoints; Knowledge was already
  safe).
- Verified end-to-end with a real `socket.io-client` (not mocked) against a
  live backend + MongoDB: an unauthenticated connection is rejected with
  the documented error; a visitor connects, `chat:join`s with no
  `conversationId` (gets a brand-new conversation, zero messages); an
  Executive (admin token) connects and joins the *same* conversation by id;
  the visitor's message is received by the executive via `chat:message`
  broadcast with server-derived `senderType: "VISITOR"`; the executive's
  reply is received by the visitor with `senderType: "EXECUTIVE"`;
  `chat:typing` relays to the other party (and not back to the sender)
  with the correct `senderType`; an empty message is rejected via the ack
  callback rather than silently accepted; `chat:read` marks the visitor's
  message `readAt` (confirmed via a direct MongoDB read) while leaving the
  executive's own message unread, and broadcasts who read it. Two more
  edge cases: a second, unrelated visitor cannot `chat:join` the first
  visitor's conversation (403-equivalent socket error); an Executive
  `chat:join` without a `conversationId` is rejected (required for staff,
  since they must pick a conversation). All test data — conversations,
  messages, visitors, sessions — cleaned up afterward.
- Confirmed the `X-Visitor-Token`/`Authorization` separation established in
  Phase 4/5 extends cleanly to sockets: the two auth systems use different
  `socket.handshake.auth` keys and different signing secrets, so there's no
  path for a visitor token to be accepted as staff auth or vice versa at
  the socket layer either.

Session 9
Date: 2026-07-04

Completed:
- Built the Chat Widget: `Launcher` (floating FAB), `ChatWindow`
  (responsive — fixed panel on desktop, full-screen on mobile via
  `useMediaQuery`), `ConversationArea` (auto-scroll, empty-state greeting +
  suggested questions), `MessageBubble` (sender-based styling),
  `TypingIndicator` (animated dots), `SuggestedQuestions`, `QuickReplies`,
  `OfflineBanner`, and the `useChatWidget` hook tying visitor session
  resolution, the socket lifecycle, optimistic sending, an offline outbox,
  typing debounce, and read receipts together.
- Added `frontend/src/services/visitorService.js` (the frontend API
  wrapper deferred back in Phase 5 — see that phase's Architecture Decision
  25 — now built alongside its first real consumer) and generalized
  `socketClient.js` to accept a dynamic `auth` (object or callback) instead
  of assuming a static one.
- Mounted `<ChatWidget />` globally in `App.jsx`, per Architecture
  Decision 44.
- No Admin UI, per instruction.

Files Created: see "Files Created" section above.

Notes:
- First real verification of this MERN stack's browser-testing setup hit a
  concrete environment gotcha worth remembering: initial testing used
  backend port 5060, which Chromium refuses to connect to at all
  (`ERR_UNSAFE_PORT` — 5060 is SIP, on Chromium's blocked-ports list). Every
  "passing" assertion up to that point was a false positive from the
  optimistic-UI update alone; the actual network calls never fired
  (confirmed: no visitor token ever reached `localStorage`). Switched to
  ports 4100/4190 for all widget testing. Worth remembering for any future
  browser-based verification in this project — pick ports outside common
  blocked-list ranges (avoid low well-known ports and anything
  service-associated like 5060).
- Found and fixed two real bugs via runtime testing that lint/build/mocked
  tests did not and could not catch (logged as Architecture Decisions 47
  and 48): (1) every visitor-sent message rendered twice, because the room
  broadcast (which includes the sender) collided with the optimistic-UI +
  ack-confirm path with no way to match them before the ack attaches a real
  `_id` — caught by literally looking at a screenshot and seeing doubled
  message bubbles. (2) reconnection after a genuine backend outage failed
  silently forever, because the visitor token rotates on every successful
  auth but `connectSocket({ visitorToken })` captured a static snapshot
  that socket.io-client kept resending unchanged on every reconnect attempt
  — only caught by actually killing and restarting the real backend process
  mid-test and watching the "offline" banner never clear, then adding
  console instrumentation to isolate cause. Both required literally running
  the app and watching it misbehave; no amount of static review would have
  surfaced either.
- Verified with Playwright end-to-end against a live backend + MongoDB:
  launcher visible on load; opening shows the greeting + suggested
  questions; clicking a suggested question, typing + Enter, and clicking a
  quick reply all send correctly-typed messages with no duplicates (after
  the fix); a second, real `socket.io-client` connected as an executive
  (admin token), joined the same conversation, and its `chat:typing` made
  the `TypingIndicator` appear/disappear in the browser, its `chat:message`
  rendered labeled "Support", and the widget's auto-mark-read-while-open
  behavior set `readAt` on that message (confirmed via the read-only REST
  endpoint); a mobile viewport (390×844) rendered the chat window
  full-screen; and the full offline-mode cycle — banner appears on a real
  backend kill, a message sent while offline is preserved (not lost),
  banner clears once the backend is back and the socket actually
  reconnects, and the queued message flushes and confirms — all passed
  after the reconnect-auth fix. All test data cleaned up afterward.
- One test-script false alarm worth recording so it isn't repeated: an
  early version of the offline-mode test used the regex `/offline|
  Reconnecting/i` to detect the banner, which also matched the literal chat
  message text sent during the test ("Sent while offline") — since that
  message never disappears, the "wait for banner to clear" check could
  never pass regardless of whether the app was actually working correctly.
  Narrowed the match to `/Reconnecting/i` alone (unique to the banner) once
  this was traced via added console instrumentation showing the reconnect
  actually succeeding at the socket and React-state level.

Session 10
Date: 2026-07-04

Completed:
- Built the `executive` module end to end (constants, model, repository,
  service, controller, routes) — `GET /me` (lazy-creates a profile),
  `PATCH /me/status`, `GET /`.
- Extended the `chat` module: conversations now start `WAITING` instead of
  `ACTIVE`; `joinAsExecutive` (claim-on-join, one executive per
  conversation, 403 if already claimed by someone else); `close`;
  `list`/`search` gained `assignedExecutiveId` filtering (`?mine=true`).
- Added AI Conversation Summary: a dedicated `conversation_summaries`
  collection, a strict-JSON summary prompt with a plain-text fallback, and
  `POST`/`GET .../conversations/:id/summary` — executive-triggered, never
  automatic.
- Added staff-facing visitor endpoints (`GET /visitors/:visitorId`,
  `GET /visitors/:visitorId/conversations`) — authenticated, distinct from
  the visitor-token routes in the same file.
- Wired executive presence, `conversation:assigned`/`conversation:closed`,
  `notification:new` (NEW_CONVERSATION / VISITOR_REPLY), and (added mid-
  session once a real bug surfaced) `executive:status-updated` into the
  socket layer.
- Updated `docs/SOCKET_EVENTS.md`, `docs/API_SPEC.md`, and
  `docs/DATABASE.md` to match.
- Built the frontend Executive Workspace: `useExecutiveWorkspace` (the
  core stateful hook — dynamic-auth socket connection, applying the exact
  Phase 9 lesson preemptively via a new `getAccessToken()` getter),
  `ConversationQueue`, `ActiveChatPanel`, `VisitorPanel`, `SummaryPanel`,
  `AvailabilityControl`, composed in `ExecutiveWorkspacePage` per
  `EXECUTIVE_DASHBOARD.md` §6's layout, replacing the old `DashboardPage`
  placeholder at the existing `/dashboard` route.
- No Analytics, per instruction.

Files Created: see "Files Created" section above.

Notes:
- Verified the backend first, in isolation, via a real `socket.io-client`
  script (not mocked) plus `curl`: the full queue → claim → chat → close
  lifecycle (a conversation starts `WAITING`, appears in the queue,
  claiming flips it to `ACTIVE` and broadcasts `conversation:assigned` to
  every other connected executive, a second executive cannot double-claim
  it); notifications reach the assigned executive on a visitor reply;
  closing broadcasts to both the conversation room and the executives
  room. AI summary generation was confirmed to fail cleanly (a `503`, not
  a crash) with no `GROQ_API_KEY` configured, and separately, a mocked-
  provider test confirmed the JSON-parse/fallback logic for both
  well-formed and malformed model output.
- Found and fixed four real bugs — all via driving the actual frontend in
  a real browser with Playwright against the live backend, none of which
  lint, the build, or the earlier backend-only socket.io-client testing
  caught (logged as Architecture Decisions 53-56): (1) `closeConversation`'s
  ack callback and the `conversation:closed` broadcast listener raced to
  update the same state, sometimes making a just-closed conversation
  vanish from the UI instead of showing it closed; (2) the Availability
  control could get stuck showing a stale status because its one-time REST
  fetch on mount raced the socket-driven `markOnline` write, with nothing
  to tell it later that the write had landed — fixed with a new
  `executive:status-updated` event, mirroring the `VISITOR_TOKEN_RENEWED`
  pattern already established in Phase 8; (3) `VisitorPanel` and
  `SummaryPanel` shared an identical literal `key`, triggering a real React
  "two children with the same key" warning; (4) the AI summary REST routes
  expect the conversation's Mongo `_id`, but the frontend was passing the
  UUID `conversationId` field instead (the identifier the *socket* layer
  uses), which Mongoose's `findById` rejected with an uncaught `CastError`
  that the centralized error handler surfaced as a raw `500` instead of a
  clean `404`/`400`. Also caught and fixed, via the same real-browser pass,
  two bare MUI style-shorthand props (`alignItems`/`justifyContent`) that
  needed to move into `sx={{ ... }}` — the same gotcha first documented in
  Phase 3 (Architecture Decision 14), recurring because it's easy to
  forget when writing new components quickly.
- Full Playwright pass, end to end, against the live backend + MongoDB +
  a real second `socket.io-client` acting as the visitor: login as an
  executive; Availability control settles to `ONLINE` (via the socket
  connecting) and can be manually changed to `BUSY`; the queue starts
  empty; a simulated visitor starting a conversation makes it appear in
  the queue live via `notification:new`, with a toast; claiming it from
  the queue removes it from the queue and opens the active chat panel;
  the Visitor Panel loads (no previous conversations for a brand-new
  visitor); the visitor's message appears live in the executive's chat;
  the visitor's typing indicator appears and disappears correctly; the
  executive's reply reaches the visitor's raw socket in real time;
  clicking "Generate" on the AI Summary panel surfaces the expected
  "AI provider is not configured" error as a toast rather than crashing;
  closing the conversation disables the input and shows the closed
  placeholder. All test data (executives' status/chat counters,
  conversations, messages, summaries) reset/cleaned up afterward.
- The backend dev server needed restarting mid-session twice: once
  because it had been started on the wrong port (`5000`, from `.env`'s
  default) after an unrelated restart, and once to clear
  `express-rate-limit`'s in-memory counters after repeated Playwright
  runs against the same process started tripping `429`s that were never a
  real app bug — worth remembering that rapid repeated end-to-end runs
  against one long-lived dev backend can self-trigger rate limiting.
- Executive/Admin department- and skill-based routing, ticket management,
  conversation transfer/escalation, search, and performance metrics are
  all explicitly not built — see the new Known Issues entries; none were
  requested and `EXECUTIVE_DASHBOARD.md` marks several of them "Future"
  itself.

Session 11
Date: 2026-07-04

Completed:
- Built the new `settings` module: AI Settings and Widget Settings, both
  singleton documents with a lazy-create-with-defaults pattern (same
  pattern `executiveService.getOrCreateForUser` established in Phase 10).
  Widget Settings' `GET` is public (the anonymous Chat Widget needs it);
  everything else is admin-only.
- Extended the `ai` module with Prompt Management: six fixed prompt
  "slots" (`SYSTEM`/`DEVELOPER`/`LEAD`/`SUMMARY`/`ESCALATION`/`FALLBACK`),
  each with edit/publish/version-history/rollback, mirroring Knowledge's
  (Phase 6) versioning pattern. Wired `promptBuilder.build()` (now async)
  and `summaryService.generate()` to prefer a published Prompt override
  over the Phase 7/10 file templates, and wired `aiEngine.generateResponse`
  to read `temperature`/`maxTokens`/`model` from AI Settings instead of
  always using `.env` defaults.
- Extended the `executive` module with admin-only Executive Management:
  create (bridges into a new `authService.createUser`), update profile,
  activate/deactivate, reset password; enriched the existing self-service
  `GET /executives` list with populated user info for the admin table.
- Built a new, deliberately minimal `admin` module for one endpoint:
  `GET /admin/dashboard/metrics`, aggregating real counts/averages from
  the `chat` and `executive` modules (added small count/aggregation
  helpers to their repositories/services rather than reaching into their
  models directly) — Ticket/Lead-backed fields render `null` since those
  modules don't exist.
- Updated `docs/DATABASE.md` (restructured §14 from the original
  single "Chatbot Settings" concept into the two collections actually
  built, added §16b Prompts, a Collection Ownership table update, and an
  Executive Management note in §10) and `docs/API_SPEC.md` (extended §10
  Executives with the five admin routes, added new §11 Prompts, §12
  Settings, §13 Admin Dashboard, renumbered Not Yet Implemented to §14)
  and `docs/SOCKET_EVENTS.md` (Not Yet Implemented notes for real-time
  Dashboard Metrics and admin AI-error notifications, neither built this
  phase).
- Built the frontend Admin Portal: role-aware routing (`ProtectedRoute`
  gained an `allowedRoles` prop), an `AdminLayout` with side nav, and all
  six pages (Dashboard, Knowledge Management, Prompt Management,
  AI Settings, Widget Settings, Executive Management) — including a new
  `knowledgeService.js` frontend wrapper, since Phase 6's backend had no
  frontend consumer until now.
- Wired the Chat Widget (Phase 9) as a real, live consumer of Widget
  Settings via a new `WidgetSettingsProvider`/`useWidgetSettings` — not
  just an admin-side form with no effect. See Architecture Decision 63
  for exactly which fields are wired to real behavior versus stored-only.

Files Created: see "Files Created" section above.

Notes:
- Found and fixed three real backend bugs via `curl`, none caught by
  lint/build (logged as Architecture Decisions 66-68): (1) Mongoose's
  `required: true` on `Prompt.content` rejected the intentionally-empty
  `LEAD`/`ESCALATION` seed content (`required` and a default of `''` are
  self-contradicting for Mongoose's String required-checker) — surfaced
  as a raw `500` on the very first `GET /prompts` call; (2) the prompt
  version-restore route's `validate(promptTypeParamSchema, 'params')`
  silently stripped `:version` out of `req.params` (that schema only
  declares `type`, and the validation middleware's `stripUnknown: true`
  drops anything else), turning `Number(req.params.version)` into `NaN`
  — fixed with a second schema declaring both params; (3) the brand-new
  `executiveService.adminList` reintroduced the exact Phase 8
  undefined-filter bug in a fresh method sitting right next to the
  already-correctly-guarded `list` method in the same file — a good
  reminder that an established lesson elsewhere in a file doesn't
  automatically prevent a new instance of the same mistake.
- Verified the full backend surface via `curl` before touching the
  frontend: settings get/update (both singletons), the complete prompt
  lifecycle (create-by-first-access → edit-while-published snapshots a
  version and bumps → publish → edit again → list versions → restore →
  content matches the restored version exactly), the complete executive
  lifecycle (create → appears correctly in the enriched list → update
  department/maxChats → reset password → login with the new password
  succeeds → deactivate → login now fails with the existing 403 "Account
  is not active" → reactivate), and permission boundaries (an `EXECUTIVE`
  token gets a clean `403` from the dashboard, executive-create, AI
  Settings, and Prompts endpoints). All test data cleaned up after each
  round.
- Full Playwright pass against the live backend + MongoDB + frontend:
  logged in as admin, navigated every one of the six Admin Portal pages;
  created/published/edited-while-published/restored a Knowledge document
  (confirming the version bump and content match after restore); edited,
  published, and version-checked a Prompt; saved AI Settings and Widget
  Settings and confirmed persistence via a full page reload (not just
  the toast — see the note below on why); created, deactivated,
  reactivated an executive through the real UI; confirmed an `EXECUTIVE`
  hitting `/admin/dashboard` gets redirected to `/dashboard` by the new
  `allowedRoles` guard; and — the strongest single check — opened the
  Chat Widget on the public home page (logged out) and confirmed it
  rendered the exact welcome message just configured moments earlier in
  Widget Settings, proving the settings → widget wiring is real and live,
  not just persisted data nobody reads.
- One test-script false alarm worth recording: `NotificationProvider`
  (Phase 3) shows exactly one toast at a time, FIFO, each with a ~5s
  auto-hide. This Playwright script fires many notify()-producing admin
  actions back to back with no human-paced gaps between them, so toasts
  queue several deep — checking for a *specific* toast's text shortly
  after an action often still shows an earlier, unrelated one still
  sitting in the queue. Real, correct behavior at actual human usage
  pace; not a bug. Adjusted the AI Settings and Widget Settings
  verification steps to check persistence via a page reload instead of
  toast text, which is a strictly stronger check anyway.
- The backend needed a mid-session restart once more to clear
  `express-rate-limit` counters after another round of repeated
  Playwright runs — same recurring note as Phase 10's session log.

Session 12
Date: 2026-07-04

Completed:
- Built the new `ticket` module end to end: CRUD, assignment (with
  auto-transition on first assignment), the full validated status
  workflow (`TICKET_SYSTEM.md` §4/§9), internal notes, an immutable audit
  trail, and role-scoped search (Executive sees only their assigned
  tickets, Admin sees all). Soft delete/restore are Admin-only. A
  `GET /:id/context` endpoint aggregates the linked conversation,
  transcript, AI summary, and visitor info on demand rather than
  duplicating that data onto the ticket.
- Added `socket/ioRegistry.js` — a small module-level `{ setIO, getIO }`
  pair — so the ticket module's REST controllers can broadcast
  `notification:new` to the `executives` room (reusing Phase 10's
  real-time infrastructure) from an HTTP request handler, which has no
  natural access to the `io` instance the way a socket event handler
  does.
- Updated `docs/DATABASE.md` (§11 Tickets — reconciled the original
  `PENDING`/no-`REOPENED` status list with `TICKET_SYSTEM.md`'s more
  detailed one; added Ticket Notes, Ticket Audit Logs, and Ticket
  Counters sub-collections; Collection Ownership table), `docs/API_SPEC.md`
  (new §14 Tickets, renumbered Not Yet Implemented to §15), and
  `docs/SOCKET_EVENTS.md` (documented the seven new `notification:new`
  ticket types under §12; removed the now-resolved "Ticket events" Not
  Yet Implemented bullet).
- Built the frontend: a `TicketsPage` (list, status/priority filters,
  create dialog) and a separate `TicketDetailPage` (status control
  scoped to valid next transitions only, assignment control, notes,
  audit trail, conversation context panel, Admin-only delete) — two
  pages rather than Phase 11's dialog-based CRUD, since a ticket carries
  meaningfully more on-screen material per item. Extended
  `useExecutiveWorkspace`'s existing `notification:new` handler with the
  seven ticket types rather than opening a second socket connection.
- No AI Ticket Creation, no visitor-facing ticket creation/viewing, no
  SLA/export/category-configuration/Reporting, per instruction (the
  explicit task list was CRUD, Assignment, Workflow, Notes, Audit,
  Search).

Files Created: see "Files Created" section above.

Notes:
- Verified the full backend surface via `curl` before touching the
  frontend: create → list (admin sees all) → assign (confirmed the
  auto-transition `OPEN → ASSIGNED`) → an invalid transition attempt
  (`ASSIGNED → RESOLVED`) correctly rejected with `400` → the valid next
  step (`ASSIGNED → IN_PROGRESS`) succeeds → add a note → audit trail
  shows all four actions in order → an `EXECUTIVE` token's `GET /tickets`
  is scoped to only their assigned ticket → the same token gets a clean
  `403` attempting to soft-delete (admin-only) → admin soft-delete
  excludes it from the default list → restore brings it back. Separately
  verified `GET /:id/context` against a real fixture (a visitor,
  conversation, and two messages inserted directly for the test) —
  correctly returned the transcript and visitor info, `summary: null`
  since none had been generated. All test data cleaned up after each
  round.
- While verifying, noticed the executive test account (`exec@example.com`)
  had a password different from the known test value, and an Executive
  document showing `status: "ONLINE"`, a live `socketId`, and
  `currentChats: 1` — strong signs of real, concurrent usage against the
  dev servers left running at the end of Phase 11 (most likely the user
  trying out the Admin Portal's Executive Management "Reset Password"
  feature on the live app). Reset the password back to the known test
  value to continue verification, but left everything else alone and
  avoided further destructive actions on that account. Separately, a
  stale `currentChats: 1` was found to be a byproduct of this session's
  own `Conversation.deleteMany({})` test-cleanup calls (in this and prior
  phases) bypassing `conversationService.close()`'s decrement — reset
  manually; not a code bug, since normal usage always goes through the
  service layer.
- Full Playwright pass against the live backend + MongoDB + frontend:
  logged in as admin, created a ticket from the Tickets list, opened its
  detail page, assigned it to the Test Executive (confirmed the status
  chip auto-updated to `ASSIGNED`), confirmed the status dropdown never
  offered `RESOLVED`/`WAITING_CUSTOMER` directly from `ASSIGNED` (only
  the valid `IN_PROGRESS`), transitioned to `IN_PROGRESS`, added an
  internal note, confirmed the audit trail listed all four actions,
  filtered the ticket list by status (present under `IN_PROGRESS`,
  absent under `CLOSED`), then logged in as the assigned `EXECUTIVE` and
  confirmed they see the ticket in their own list and have no Delete
  button on its detail page. One test-script bug caught and fixed before
  the run passed: the script tried clicking a "Tickets" nav link that
  lives inside `MainLayout`'s collapsible Drawer (closed by default) —
  fixed by navigating directly via `page.goto()` instead of simulating
  the drawer-open-then-click sequence, which wasn't the point of this
  test anyway.

Session 13
Date: 2026-07-04

Completed:
- Built the new `lead` module: CRUD, assignment (auto-transitioning a
  `NEW` lead to `ASSIGNED`), the full validated status workflow
  (`LEAD_MANAGEMENT.md` §4/§9, with `ARCHIVED` entry/exit gated to
  `ADMIN`), follow-up scheduling (auto-transitioning `CONTACTED` to
  `FOLLOW_UP`), and conversion (optionally linking an existing ticket).
  Role-scoped search identical to Tickets' pattern.
- Added `ai/service/leadAiService.js`: AI Lead Detection (analyzes a
  conversation transcript, returns a qualification/extraction suggestion,
  persists nothing) and the AI Qualification Summary (regenerates
  `aiSummary` on an existing lead, on-demand). Both resolve the "LEAD"
  Prompt Management slot (seeded empty since Phase 11, now with a real
  `lead.md` file default) as their shared system framing.
- Wired the Admin Dashboard's `openTickets` and `todaysLeads` metrics to
  real counts — `todaysLeads` is this phase's natural addition;
  `openTickets` should have been wired in Phase 12 but was missed, and
  got fixed alongside it once the omission was noticed.
- Updated `docs/DATABASE.md` (§12 Leads — reconciled the original
  shorter field/status list with `LEAD_MANAGEMENT.md`'s more detailed
  one; Collection Ownership table), `docs/API_SPEC.md` (new §15 Leads,
  updated §13's Dashboard example to show real `openTickets`/
  `todaysLeads`, renumbered Not Yet Implemented to §16), and
  `docs/SOCKET_EVENTS.md` (documented the five new `notification:new`
  lead types under §12).
- Built the frontend: a `LeadsPage` (list, status/score filters, a
  manual create dialog, and a "Detect from Conversation" dialog wiring
  AI Lead Detection to a one-click "Create Lead from This Suggestion")
  and a `LeadDetailPage` (status control scoped to valid transitions,
  assignment, an AI Qualification Summary panel with a Generate button,
  a follow-up scheduling form, Mark Converted/Mark Lost buttons gated by
  transition validity, conversation context panel). Extended
  `useExecutiveWorkspace`'s existing notification handler with the five
  lead types.
- No dedicated lead audit-trail collection, no full Search & Filters, no
  lead-scoring-rule configuration, no Export, no automated Follow-up-Due
  reminders, and no Analytics/Reporting, per instruction (the explicit
  task list was Lead Detection, Lead CRUD, AI Summary, Assignment,
  Follow-up, Conversion).

Files Created: see "Files Created" section above.

Notes:
- Verified the full backend surface via `curl` before touching the
  frontend, and was careful about it: the live dev servers left running
  since Phase 11 showed clear signs of real, concurrent usage this
  session (an active visitor conversation, a connected executive socket,
  a live `exec@example.com` session) — likely the user trying the app out
  directly. All test data used a clearly-tagged name/email so it could be
  identified and removed without touching anything real, and no
  destructive actions were taken on the real session beyond what
  verification required.
- Verified: create → assign (confirmed auto-transition `NEW -> ASSIGNED`)
  → a status transition (`ASSIGNED -> CONTACTED`) → an invalid one
  correctly rejected → scheduling a follow-up (confirmed auto-transition
  `CONTACTED -> FOLLOW_UP`) → convert (confirmed `FOLLOW_UP -> CONVERTED`
  is a valid transition) → an `EXECUTIVE` token's `GET /leads` scoped to
  only their assigned lead → the same token getting a clean `403`
  attempting to archive (admin-only, enforced inside `updateStatus`
  itself, not a separate route) → admin archiving successfully.
  Separately verified AI Lead Detection and `GET /:id/context` against a
  real fixture conversation (a visitor, conversation, and three messages
  inserted directly for the test): detection failed cleanly with the
  expected `503` (no `GROQ_API_KEY`, same graceful-failure pattern as
  every other AI-consuming feature in this project), and context
  correctly returned the transcript when a lead was linked to that
  conversation. All test data cleaned up afterward, including a fixture
  visitor/conversation/messages created solely for this test.
- Full Playwright pass against the live backend + MongoDB + frontend:
  created a lead from the Leads list, opened its detail page, assigned it
  to the Test Executive (confirmed auto-transition to `ASSIGNED`),
  confirmed `CONVERTED` was never offered directly from `ASSIGNED`,
  transitioned to `CONTACTED`, scheduled a follow-up (confirmed
  auto-transition to `FOLLOW_UP`), clicked Generate on the AI summary
  panel and confirmed the expected failure surfaced as a toast rather
  than a crash, confirmed "Mark Converted" was enabled once `FOLLOW_UP`
  made it a valid transition and used it, then logged in as the assigned
  `EXECUTIVE` and confirmed they see the lead in their own list and get
  an "administrator" error toast attempting to archive it (rejected, not
  silently applied).
- The backend needed a restart to pick up the new `lead` module's routes
  — same routine restart pattern as every previous phase, no new issue.

Session 14
Date: 2026-07-04

Completed:
- Built the new `businessHours` singleton inside the existing `settings`
  module: a 7-day Weekly Schedule (default Mon-Fri 09:00-17:30 enabled,
  Sat/Sun disabled), a Holidays array (name/date/type, overrides the
  weekly schedule for that date), an Availability Service (`getStatus`/
  `isOpen` — holiday override, then weekly schedule, then a 30-minute
  `OPENING_SOON`/`CLOSING_SOON` window), full Timezone Support (a single
  configured IANA zone, all math done via `Intl.DateTimeFormat` — no new
  date-library dependency), and Callback Availability (validates a
  proposed instant, or suggests up to `count` upcoming open windows as
  real UTC instants, searching up to 14 days ahead).
- `GET /business-hours/status` and `GET /business-hours/callback-
  availability` are public; everything else requires `authenticate` +
  the existing `MANAGE_BUSINESS_HOURS` permission.
- Built the Admin `BusinessHoursPage` (timezone select, weekly schedule
  table, holidays table with add/remove, a live status chip) and wired
  the Chat Widget to a new `useBusinessStatus` hook: a status `Chip` in
  the header, and — when `CLOSED`/`HOLIDAY` — the next few callback
  slots rendered in the visitor's own local time via `toLocaleString()`.
- Updated `docs/DATABASE.md` (§15, reconciling the original brief field
  list with the more detailed spec) and `docs/API_SPEC.md` (new §16
  Business Hours, renumbered Not Yet Implemented to §17).
- No Special Hours, no AI/Ticket/Lead trigger off business-hours state,
  and no visitor-facing callback-request submission endpoint, per
  instruction (the explicit task list was Weekly Schedule, Holidays,
  Availability Service, Timezone Support, Callback Availability) — see
  Architecture Decision 82.

Notes:
- Verified the full backend surface via `curl` first: lazy-create
  defaults, a real Saturday correctly reporting `CLOSED`, an invalid
  schedule (open after close) and an invalid timezone both rejected with
  400, a holiday correctly overriding an otherwise-`OPEN` day (and
  correctly rejecting a callback proposed on that date), callback slot
  suggestions correctly skipping both the holiday and a disabled Sunday,
  and — switching to `Australia/Melbourne` (the doc's own example
  timezone) — both the status computation and the UTC-instant slot
  conversion hand-verified against the real UTC+10 offset. All test
  mutations reset via a direct `BusinessHours.deleteMany({})` afterward.
- Found and fixed a real bug during Playwright verification (not caught
  by the earlier curl pass): `assertValidTimezone` rejected `'UTC'`
  itself, because `Intl.supportedValuesOf('timeZone')` omits it in this
  Node/ICU build — meaning the model's own default value could never be
  re-saved, and the admin timezone dropdown (built from the same list)
  had no way to select it. Fixed by validating via constructing
  `Intl.DateTimeFormat` in a try/catch instead of an allow-list, and by
  explicitly prepending `'UTC'` to the frontend's `TIMEZONES` array. See
  Architecture Decision 84.
- Also caught and fixed two bugs in the verification script itself
  (not the app): a Playwright locator for the status `Chip` was
  originally too broad (`.first()` matched a Suggested Questions chip
  instead of the header status chip) — narrowed by scoping to the
  element adjacent to the "Chat with us" heading; and the script's
  "restore original config" step was capturing the *result of its own
  force-closed PATCH* as "original" instead of `GET`-ing the true prior
  state first, which left Business Hours stuck in an all-days-disabled
  state after the first run — fixed by adding a `getBusinessHours` call
  before the first mutation and restoring from that snapshot instead.
- Separately discovered mid-session that the backend the frontend
  actually talks to runs on port 4100 (started with a `PORT=4100`
  override), not the `backend/.env` default of `5000` — an early `curl`
  health-check against port 5000 gave a false "it's up" reading from a
  since-restarted process, leading to briefly killing the real live
  backend on port 4100 by mistake while chasing a stale rate-limiter.
  Restarted correctly on port 4100 (via `nodemon`, matching the
  auto-restart behavior already observed) with no data loss — MongoDB
  state is independent of which port Express listens on.
- Full Playwright pass against the live backend + MongoDB + frontend:
  forced all seven days disabled and confirmed the widget's header chip
  read "Offline" and the empty-state message switched to
  `offlineMessage`; forced all seven days enabled (00:00-23:59) and
  confirmed the chip read "Online"; then, using the real restored
  default schedule on an actual Saturday (naturally `CLOSED`), confirmed
  the widget rendered a genuine "Next available" list with the correct
  upcoming Monday/Tuesday/Wednesday 09:00 UTC windows, converted
  correctly to the browser's local time. No console/page errors observed
  beyond an expected 401 from an anonymous visitor's session-refresh
  attempt. Business Hours reset to its true Mon-Fri 09:00-17:30 defaults
  afterward; all temporary `.cjs` verification scripts deleted.

Session 15
Date: 2026-07-07

Completed:
- Built the new `analytics` module: a real, immutable `analytics_events`
  collection (Event Collection); wired 14 event types into 9 existing
  hook points across Conversation (`started`/`closed`/`handoff`),
  Executive (`online`/`offline`, both the socket-driven path and the
  manual self-service status route), Ticket (`created`/`closed`/
  `reopened`), and Lead (`created`/`converted`) as authenticated/internal
  side effects, plus 4 client-reported Widget event types via a new
  public `POST /analytics/events` endpoint (opens/closes/suggested-
  question/quick-reply usage).
- Built Dashboard APIs (`GET /analytics/dashboard`, the same live KPI
  set as the Phase 11 Admin Dashboard, deliberately not unified with it
  — Architecture Decision 88) and 8 Metrics domain endpoints
  (Conversation/AI/Executive/Lead/Ticket/Visitor/Widget/Business Hours),
  each backed by real MongoDB aggregation pipelines (Aggregations) in
  the owning module's repository — `$group`, `$lookup`,
  `$dateToString`/`$hour` bucketing — not naive JS loops.
- Built Reports as a shared `range`/`from`/`to` query-param layer
  (`TODAY`/`YESTERDAY`/`LAST_7_DAYS`/`LAST_30_DAYS`/`THIS_MONTH`/
  `CUSTOM`) on top of every Metrics endpoint, rather than a second,
  separate concept from Metrics (Architecture Decision 87).
- `GET /analytics/executives` is the one metrics endpoint an `EXECUTIVE`
  token can reach — self-scoped to their own id regardless of any
  `executiveUserId` query param, mirroring Tickets'/Leads'
  `assertAccessible` pattern; every other domain plus the Dashboard
  requires the existing `VIEW_ANALYTICS` permission (ADMIN-only).
- Extracted a pure `businessHoursService.computeStatus(businessHours,
  atDate)` out of the existing `getStatus` (Phase 14) so Business Hours
  Analytics could classify up to 2,000 event timestamps against one
  already-loaded singleton instead of re-querying the database on every
  single timestamp — a real performance fix caught before it ever
  shipped (Architecture Decision 89).
- Built the frontend: `analyticsService.js`, a plain-data (no charting
  library) Admin `AnalyticsPage` with a date-range selector, the
  Dashboard KPI tiles, and all 8 Metrics domains as stat rows and
  compact distribution tables; instrumented the Chat Widget's open/
  close handlers and the Suggested Questions/Quick Replies click
  handlers to report their own usage via the public event endpoint.
- No Charts, Export, Real-Time Updates, or Data Retention/archival
  policy, per instruction (the explicit task list was `Event Collection,
  Dashboard APIs, Metrics, Reports, Aggregations`).

Files Created: see "Files Created" section above.

Notes:
- Before writing any code, spawned a research pass over the existing
  codebase (Conversation/Executive/Ticket/Lead services, the existing
  Admin Dashboard, and every repository's existing count/aggregate
  helpers) to find the exact, real hook points to wire events into
  rather than guessing — this surfaced the important finding that no
  live AI chat-reply pipeline exists anywhere (confirmed by grepping for
  `aiEngine.generateResponse`), which directly shaped the decision not
  to fabricate `AI_RESPONSE`/`AI_HANDOFF` event types (Architecture
  Decision 85).
- Verified the full backend surface via `curl`: all 8 Metrics domains
  plus the Dashboard returned real, correct numbers against the live
  system's actual data (8 active visitors, a real average response time,
  19 unique visitors classified into device/browser buckets from real
  `userAgent` strings); confirmed an `EXECUTIVE` token is force-scoped to
  its own id on `/analytics/executives` regardless of a spoofed
  `executiveUserId` query param, and correctly gets a `403` from every
  other domain; confirmed the public `/analytics/events` endpoint
  accepts all 4 client event types and correctly rejects a server-only
  type (`EXECUTIVE_ONLINE`) with `400`; confirmed `range=CUSTOM` without
  `from`/`to` fails cleanly with `400`, and an invalid `range` value is
  rejected by the Joi validator before it ever reaches the service.
  Used the project's existing "Test Executive" (`exec@example.com`)
  fixture account for the role-scoping test, resetting its password to
  a fresh test value since the previously-known value wasn't recorded
  anywhere accessible this session.
- Mid-session tooling mishap, caught and corrected: an early `curl`
  health-check against port 4100 returned a stale "success" from a
  leftover process, which led to briefly restarting the backend on port
  4100 (matching a convention assumed from a stale memory of an earlier
  session) instead of its actual configured default of port 5000
  (`backend/.env`'s `PORT=5000`, which is what the frontend's
  `apiClient.js` fallback and a freshly-started Vite dev server both
  actually expect with no override file present anywhere in the repo).
  This caused the first full Playwright pass to fail at the login step
  with `ERR_CONNECTION_REFUSED`. Root-caused by checking `apiClient.js`'s
  default and the frontend's env-loading chain directly rather than
  continuing to guess; resolved by restarting the backend on its real
  default port 5000 and re-pointing the verification script there. No
  data was lost — MongoDB state is independent of which port Express
  listens on.
- Two bugs caught and fixed in the verification script itself (not the
  app), both instances of the same underlying mistake as a Phase 14
  verification bug: a Playwright locator for a clickable Suggested
  Question chip was originally too broad (`.MuiChip-root` matched the
  non-clickable header status chip first) — fixed by scoping to
  `[role="button"].MuiChip-root`, since only the clickable chip variant
  carries that role.
- One real bug caught and fixed in application code during
  implementation (not verification): the executive-scoped average-
  resolution-time lookup in `getExecutiveMetrics` originally destructured
  the *first* element of an aggregation's grouped results array
  (`const [avgResolution] = await ...`), silently assuming the requested
  executive's group would always be first — since MongoDB's `$group`
  makes no ordering guarantee across distinct group keys, this would
  have silently attributed the wrong executive's average to whichever
  executive happened to be requested. Fixed by `.find()`-ing the group
  matching the target executive's id explicitly instead of trusting
  array position.
- Full Playwright pass against the live backend + MongoDB + frontend:
  logged in as admin, navigated to `/admin/analytics`, and confirmed all
  8 domain sections plus the Dashboard KPI tiles rendered with real data
  and no console/page errors beyond an expected 401 from an anonymous
  visitor's session-refresh attempt (the same benign pattern noted in
  Phase 14). Separately opened the real Chat Widget, clicked a genuine
  Suggested Question chip (which also sends a real message), and closed
  the widget — then re-fetched Widget Analytics via the API and
  confirmed `widgetOpens`, `widgetCloses`, `messagesSent`, and
  `suggestedQuestionUsage` had all incremented by exactly the expected
  amount, proving the full Event Collection → Aggregation → Metrics
  pipeline works end-to-end through a real browser session, not just
  synthetic `curl` calls. All temporary `.cjs` verification/debug
  scripts deleted afterward.

Session 16
Date: 2026-07-07

Completed:
- Built the full RAG pipeline inside the existing `knowledge` module: an
  Embedding Service (chunks a document's flattened content into
  500-word/75-word-overlap pieces, then generates a 256-dimension
  hashing-trick vector per chunk — no ML embedding model/API exists
  anywhere in this project, confirmed by inspecting the AI provider
  abstraction directly), a Vector Store (`knowledge_embeddings`,
  regenerated on publish/update-while-published/restore, removed on
  archive, fire-and-forget), a Retriever (category-pre-filtered
  candidate fetch, cosine similarity scored in application code — no
  native vector index exists on this project's self-hosted MongoDB
  Community 7), Hybrid Search (vector + keyword-overlap + metadata
  filtering combined), and Context Ranking (adds a Freshness factor,
  dedupes to one result per document, truncates to top-K).
- Integrated with the AI Engine: `knowledgeService.retrieveForQuery(...)`
  is the new single retrieval entry point the Context Builder calls,
  replacing its previous direct `knowledgeService.search(...)` call with
  no change to the Context Builder's own external interface — satisfying
  `RAG.md` §25's rule to replace the Retrieval Engine, not redesign the
  application. Falls back automatically to the original category/keyword
  search when the knowledge base has no embeddings at all yet.
- Extracted a shared `tokenize()`/`toKeywordPattern()` helper out of the
  Context Builder's pre-existing keyword-matching logic so the new
  Embedding Service didn't need a second, independent tokenizer/stopword
  list.
- Added `backend/scripts/reindexKnowledgeEmbeddings.js`
  (`npm run reindex:knowledge`) — a one-time backfill for knowledge
  published before this phase existed.
- Updated `docs/DATABASE.md` (a new Knowledge Embeddings Collection
  subsection under §13 Knowledge Base) and `docs/API_SPEC.md` (new §18
  RAG — no new endpoints, documents the internal pipeline; renumbered
  Not Yet Implemented to §19; fixed several now-stale self-referencing
  section numbers left over from Phase 15's insertion that had never
  been updated).
- No Re-ranking, Query Expansion, or Intent Detection feeding the
  Retriever, and no real ML embedding provider, per instruction (the
  explicit task list was Embedding Service, Vector Store Integration,
  Retriever, Context Ranking, Hybrid Search, plus AI Engine integration)
  — all of these are explicitly "Future" in `RAG.md` itself.

Files Created: see "Files Created" section above.

Notes:
- Before writing any code, spawned a research pass over the existing
  Knowledge module, the AI Engine's Context Builder/prompt flow, the
  existing knowledge search implementation, module conventions, the
  MongoDB setup (`docker-compose.yml`), and the AI provider abstraction —
  this surfaced two load-bearing facts that shaped the whole design: (1)
  no embeddings capability or endpoint exists anywhere in this codebase's
  Groq integration (confirmed by reading `aiProvider.js`/`groqProvider.js`
  directly — the sole contract method is `generateCompletion`), and (2)
  this project's MongoDB is self-hosted Community 7 via `docker-compose.yml`,
  so Atlas-only `$vectorSearch` is not usable. Both facts are cited
  directly in Architecture Decisions 93-94 rather than discovered
  mid-implementation.
- Verified the full pipeline end-to-end via direct backend calls (no
  frontend/UI surface was added this phase, so Playwright wasn't
  applicable — verified instead by calling `knowledgeService`/
  `retrieverService`/`contextBuilder` directly against the live database):
  created and published two clearly-tagged test knowledge documents (one
  about business hours, one about pricing) via real `curl` calls against
  the live API; confirmed exactly one embedding chunk was generated per
  document with a correctly flattened text and a properly L2-normalized
  256-dimension vector; confirmed a business-hours-phrased query
  correctly ranked the business-hours document first (and vice versa for
  a pricing-phrased query) — direct proof Hybrid Search + Context Ranking
  reorder by actual relevance, not by insertion order; confirmed a
  category-filtered query for `PRICING` correctly excluded the
  hours document even though the query text was about hours (metadata
  filtering); confirmed `contextBuilder.build()` end-to-end returns the
  same ranked knowledge the Retriever produces, proving the AI Engine
  integration point actually works; confirmed archiving a document
  reduced its embedding-chunk count to exactly 0; confirmed updating an
  already-published document's content correctly regenerated its
  embedding with the new text and bumped its stored `version`; confirmed
  the fallback path (re-verified once both test documents were archived,
  genuinely leaving zero embeddings in the collection) ran the original
  keyword search without throwing; ran `npm run reindex:knowledge`
  against the real, live database and confirmed it completed cleanly (0
  documents were currently published at that moment — an honest result,
  not a test artifact). All test documents archived afterward (this
  module has no hard-delete endpoint, matching its pre-existing
  lifecycle — archived is a normal terminal state, not something
  requiring special cleanup); all temporary `.cjs` verification scripts
  deleted.
- The backend needed a restart to pick up the new `knowledge` module
  files and the modified `contextBuilder.js` — same routine restart
  pattern as every previous phase, no new issue.

# Post Implementation Improvement Phase

The original implementation roadmap (Phase 1–16) has been completed.

Future work will follow an iterative improvement process rather than introducing additional implementation phases.

All new development must be tracked under the Improvement Roadmap.

Current Status:

✅ Core Platform Completed

Current Focus:

- Feature Improvements
- Bug Fixes
- UI/UX Enhancements
- AI Improvements
- Performance Improvements

Reference:

docs/IMPROVEMENT_ROADMAP.md