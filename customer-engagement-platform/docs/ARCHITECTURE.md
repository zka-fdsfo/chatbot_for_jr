# System Architecture

# AI Customer Engagement Platform

## 1. Architecture Goals

The platform must be:

- Modular
- Scalable
- Maintainable
- Testable
- Secure
- Extensible
- AI-first
- Production Ready

Business logic must remain independent from frameworks and infrastructure.

---

# 2. Architectural Principles

The application follows:

- Feature-Based Modular Architecture (Vertical Slice)
- Clean Architecture
- SOLID Principles
- Repository Pattern
- Service Layer Pattern
- Dependency Inversion
- Separation of Concerns
- Single Responsibility Principle

Every feature should be implemented as an independent module.

---

# 3. High-Level Architecture

```
                        Website Visitor
                              │
                              ▼
                     React Chat Widget
                              │
                 REST API + Socket.io
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
        Express REST API                Socket Server
              │
              ▼
      Feature Modules (Business Layer)
              │
     ┌────────┼────────┬────────┬────────┐
     ▼        ▼        ▼        ▼        ▼
   Auth      Chat      AI   Knowledge Ticket
              │
              ▼
        Repository Layer
              │
              ▼
           MongoDB
              │
              ▼
     AI Context Builder
              │
              ▼
      Groq GPT OSS 120B
```

---

# 4. Backend Folder Structure

```
src/

config/
middleware/
shared/
socket/
utils/

modules/

    auth/

    visitor/

    chat/

    ai/

    knowledge/

    executive/

    admin/

    ticket/

    analytics/

    settings/
```

The project is organized around business features rather than technical layers.

---

# 5. Module Structure

Every module must follow the same internal structure.

```
module/

controller/

service/

repository/

model/

validator/

dto/

routes/

types/
```

Optional folders

```
mapper/

constants/

utils/

interfaces/
```

Each module owns its own implementation.

---

# 6. Shared Layer

Reusable code belongs inside the shared directory.

```
shared/

database/

errors/

responses/

middlewares/

constants/

logger/

types/

validators/

helpers/
```

Nothing in shared should contain business logic.

---

# 7. Module Ownership

## Auth

Owns

- Authentication
- JWT
- Roles
- Password Security

---

## Visitor

Owns

- Visitor Sessions
- Anonymous Users
- Visitor Profiles

---

## Chat

Owns

- Conversations
- Messages
- Typing Indicators
- Read Receipts
- Attachments (future)

---

## AI

Owns

- Prompt Builder
- Intent Detection
- Groq Provider
- Conversation Summary
- Escalation Logic

---

## Knowledge

Owns

- Company Knowledge
- FAQs
- Policies
- Retrieval
- Embeddings (future)

---

## Executive

Owns

- Executive Profiles
- Availability
- Assignment
- Presence

---

## Ticket

Owns

- Tickets
- Callback Requests
- Resolution Workflow

---

## Analytics

Owns

- Reports
- Statistics
- Dashboards

---

## Settings

Owns

- Business Hours
- Chat Settings
- AI Configuration
- System Settings

---

## Admin

Owns

- Administrative Operations
- User Management
- Knowledge Management

---

# 8. Dependency Rules

Allowed

```
Controller

↓

Service

↓

Repository

↓

MongoDB
```

Not Allowed

```
Controller

↓

Repository
```

Not Allowed

```
Repository

↓

Repository
```

Not Allowed

```
Controller

↓

Another Controller
```

Modules communicate through Services only.

---

# 9. Request Lifecycle

```
Client

↓

Route

↓

Validation

↓

Authentication

↓

Controller

↓

Service

↓

Repository

↓

MongoDB

↓

Repository

↓

Service

↓

Controller

↓

Response
```

Business logic exists only in Services.

---

# 10. AI Request Lifecycle

```
Visitor Message

↓

Chat Service

↓

Intent Detection

↓

Knowledge Service

↓

Context Builder

↓

AI Provider

↓

AI Response

↓

Save Conversation

↓

Return Response
```

The AI provider must never access MongoDB directly.

---

# 11. Knowledge Flow

```
MongoDB

↓

Knowledge Repository

↓

Knowledge Service

↓

Relevant Documents

↓

Prompt Builder

↓

Groq

↓

AI Response
```

Only relevant knowledge should be sent to the LLM.

---

# 12. Socket Architecture

Socket.io is infrastructure.

It is not a business module.

Socket is responsible for:

- Connection
- Rooms
- Events
- Presence
- Typing
- Read Receipts
- Notifications

Business logic remains inside Services.

---

# 13. Authentication Flow

Visitor

```
Anonymous Session

↓

Visitor Token
```

Executive

```
Login

↓

JWT

↓

Protected APIs
```

Administrator

```
Login

↓

JWT

↓

Admin APIs
```

---

# 14. Error Handling

All errors must use centralized exception handling.

Every API should return the same response format.

Never expose stack traces to clients.

---

# 15. Security Principles

Always implement

- JWT Authentication
- Password Hashing
- Input Validation
- Helmet
- Rate Limiting
- CORS
- Environment Variables

Never hardcode secrets.

---

# 16. AI Design Principles

The AI must

- Answer only from company knowledge
- Never hallucinate
- Never invent pricing
- Detect escalation
- Collect leads naturally
- Generate conversation summaries

The AI provider must be replaceable without changing business logic.

---

# 17. Future Scalability

The architecture must support

- MongoDB Vector Search
- Multiple AI Providers
- Voice Support
- WhatsApp
- Facebook Messenger
- Email
- OCR
- Multi-language
- Workflow Automation

New capabilities should be added as independent modules whenever possible.

---

# 18. Architecture Decision Records

Major architectural decisions must be documented in:

```
docs/PROJECT_MEMORY.md
```

Examples

- New module
- Database redesign
- Authentication changes
- AI provider replacement
- New infrastructure

---

# 19. Implementation Rules

Before implementing any feature

1. Identify the owning module.
2. Reuse existing services where appropriate.
3. Avoid duplicate business logic.
4. Keep modules independent.
5. Update documentation after implementation.
6. Maintain backward compatibility.

Every new feature should strengthen the architecture rather than bypass it.