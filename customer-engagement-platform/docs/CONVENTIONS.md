# Coding Conventions

# AI Customer Engagement Platform

## 1. Purpose

This document defines the coding conventions and naming standards for the project.

All developers and AI coding assistants must follow these conventions to ensure consistency, maintainability, and readability.

---

# 2. General Principles

Always write code that is:

- Clean
- Readable
- Reusable
- Testable
- Modular
- Consistent
- Production Ready

Prefer clarity over cleverness.

Avoid unnecessary complexity.

---

# 3. Naming Conventions

## Files

Use **kebab-case**.

Examples

```
chat-service.js
knowledge-controller.js
visitor-routes.js
```

---

## Folders

Use **kebab-case**.

```
knowledge-base
chat-widget
admin-dashboard
```

---

## Classes

Use **PascalCase**.

```
ChatService
KnowledgeRepository
AuthController
VisitorSession
```

---

## Functions

Use **camelCase**.

```
createConversation()
sendMessage()
assignExecutive()
```

Function names should start with a verb.

---

## Variables

Use **camelCase**.

```
visitorId
conversationId
currentExecutive
```

Avoid abbreviations.

Good

```
conversationHistory
executiveAvailability
```

Bad

```
convHist
execAvail
```

---

## Constants

Use **UPPER_SNAKE_CASE**.

```
MAX_CHAT_LIMIT

JWT_SECRET

DEFAULT_LANGUAGE
```

---

## Environment Variables

Always use

```
UPPER_SNAKE_CASE
```

Example

```
PORT

JWT_SECRET

MONGO_URI

GROQ_API_KEY

GROQ_MODEL
```

---

# 4. Module Naming

Every feature should be singular.

Good

```
chat

ticket

visitor

knowledge

analytics
```

Avoid

```
chats

tickets

users
```

---

# 5. API Naming

Use REST conventions.

Examples

```
GET    /api/chat/:id

POST   /api/chat

PUT    /api/chat/:id

DELETE /api/chat/:id
```

Use nouns instead of verbs.

Good

```
POST /api/tickets
```

Avoid

```
POST /api/createTicket
```

---

# 6. Controller Rules

Controllers should only:

- Receive requests
- Validate input
- Call services
- Return responses

Controllers must never contain business logic.

---

# 7. Service Rules

Services contain business logic.

Services may:

- Call repositories
- Call external APIs
- Communicate with other services
- Apply business rules

Services should remain framework-independent whenever possible.

---

# 8. Repository Rules

Repositories only interact with MongoDB.

Responsibilities:

- CRUD operations
- Aggregations
- Queries

Repositories must never contain business logic.

---

# 9. Model Rules

Each collection has one model.

Model files contain:

- Schema
- Indexes
- Validation
- Virtuals
- Hooks (only if required)

Business logic belongs in services.

---

# 10. DTO Rules

DTOs define request and response contracts.

Never expose database models directly to clients.

Always map database entities to DTOs before returning responses.

---

# 11. Validation Rules

Validate every request.

Validation should occur before the controller executes.

Never trust client input.

---

# 12. API Response Format

Every API must return a consistent structure.

Success

```json
{
  "success": true,
  "message": "Conversation created successfully.",
  "data": {},
  "meta": {}
}
```

Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

Never return inconsistent response formats.

---

# 13. Error Handling

Use centralized error handling.

Create custom error classes.

Never expose:

- Stack traces
- Database errors
- Internal implementation details

---

# 14. Logging

Log:

- Application startup
- Authentication events
- AI requests
- Errors
- Important business events

Never log:

- Passwords
- Tokens
- API keys
- Sensitive personal information

---

# 15. MongoDB Conventions

Collection names use **plural lowercase**.

Examples

```
users

conversations

messages

tickets

knowledge_base

visitor_sessions
```

Document fields use **camelCase**.

```
createdAt

updatedAt

visitorId

conversationId
```

---

# 16. Socket Event Naming

Use **namespace:event** format.

Examples

```
chat:message

chat:typing

chat:read

visitor:joined

executive:online

ticket:created
```

Avoid inconsistent naming.

---

# 17. AI Conventions

The AI layer must:

- Be provider-independent
- Use structured prompts
- Retrieve knowledge before generation
- Never hallucinate
- Never fabricate company information

AI providers must implement a common interface.

---

# 18. Folder Ownership

Every feature owns its own:

- Controller
- Service
- Repository
- Model
- Validator
- DTO
- Routes

Shared code belongs in the `shared` directory.

---

# 19. Code Quality

Prefer:

- Small functions
- Single responsibility
- Early returns
- Composition over inheritance
- Dependency injection where appropriate

Avoid:

- Deep nesting
- Large classes
- Duplicate code
- Magic strings
- Magic numbers

---

# 20. Documentation Rules

Every new feature should update, when applicable:

- DATABASE.md
- API_SPEC.md
- SOCKET_EVENTS.md
- PROJECT_MEMORY.md
- TASKS.md

Documentation is part of the implementation.

---

# 21. Git Conventions

Branch naming

```
feature/chat-widget

feature/knowledge-base

feature/ticket-system

bugfix/socket-reconnect

hotfix/auth-token
```

Commit messages

```
feat(chat): add conversation service

fix(auth): refresh JWT validation

refactor(ai): simplify prompt builder

docs(api): update chat endpoints
```

Follow Conventional Commits whenever possible.

---

# 22. Testing Guidelines

New features should include:

- Unit tests for business logic
- Integration tests for APIs
- Validation tests
- Error handling tests

Critical workflows should be tested before deployment.

---

# 23. AI Coding Assistant Rules

Before generating code:

1. Read `CLAUDE.md`.
2. Review the relevant document in `docs/`.
3. Follow the module ownership defined in `ARCHITECTURE.md`.
4. Reuse existing components and services.
5. Do not duplicate business logic.
6. Keep implementations modular and backward compatible.
7. Update documentation after completing the task.

---

# 24. Definition of Done

A task is complete only when:

- Code compiles successfully.
- Linting passes.
- Naming conventions are followed.
- Validation is implemented.
- Error handling is implemented.
- Documentation is updated.
- No placeholder or TODO code remains.
- The implementation is production-ready.