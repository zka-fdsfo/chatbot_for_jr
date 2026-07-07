# Folder Structure

# AI Customer Engagement Platform

## 1. Purpose

This document defines the official folder structure for the project.

Every developer and AI coding assistant must follow this structure.

Features should be organized by business domain rather than technical layer.

---

# 2. Repository Structure

```text
project-root/

├── backend/
├── frontend/
├── docs/
├── .github/
├── .env.example
├── README.md
└── CLAUDE.md
```

---

# 3. Backend Structure

```text
backend/

├── src/
├── tests/
├── uploads/
├── scripts/
├── package.json
└── server.js
```

---

# 4. Backend Source Structure

```text
src/

├── config/
├── middleware/
├── shared/
├── socket/
├── utils/
├── modules/
├── routes/
├── jobs/
└── app.js
```

---

# 5. Backend Folder Responsibilities

## config/

Application configuration.

Examples

- Database
- Environment
- AI Provider
- JWT
- Logger

Never place business logic here.

---

## middleware/

Application middleware.

Examples

- Authentication
- Authorization
- Validation
- Error Handler
- Rate Limiter

---

## shared/

Reusable application components.

```text
shared/

constants/

database/

errors/

helpers/

logger/

responses/

types/

validators/
```

Contains reusable code only.

No business logic.

---

## socket/

Socket.io infrastructure.

Contains

- Socket initialization
- Event registration
- Room management
- Socket middleware

Business logic belongs inside Services.

---

## utils/

Utility functions.

Examples

- Date helpers
- String helpers
- File helpers
- Encryption helpers

Utilities must remain stateless.

---

## jobs/

Scheduled background jobs.

Examples

- Reminder notifications
- Ticket follow-up
- Conversation cleanup
- Analytics aggregation

---

## routes/

Application route registration.

This folder only combines module routes.

It must not contain controllers.

---

# 6. Modules

All business features belong inside `modules/`.

```text
modules/

auth/

visitor/

chat/

knowledge/

ai/

executive/

ticket/

admin/

analytics/

settings/
```

Each module owns its own implementation.

---

# 7. Standard Module Structure

Every module follows the same structure.

```text
module/

controller/

service/

repository/

model/

validator/

dto/

routes/

interfaces/

types/

constants/

utils/
```

Optional folders may be added when required.

Do not create folders that are never used.

---

# 8. Module Responsibilities

## auth

Authentication and authorization.

---

## visitor

Anonymous visitor sessions and visitor profiles.

---

## chat

Conversations.

Messages.

Typing indicators.

Read receipts.

Future attachments.

---

## knowledge

Company information.

FAQs.

Policies.

Knowledge retrieval.

Future vector search.

---

## ai

Prompt builder.

Intent detection.

Groq integration.

Conversation summaries.

Escalation logic.

---

## executive

Executive profiles.

Availability.

Assignments.

Presence.

---

## ticket

Support tickets.

Callback requests.

Resolution workflow.

---

## analytics

Reports.

Statistics.

Metrics.

---

## settings

Business hours.

Chat settings.

AI configuration.

System settings.

---

## admin

Administrative operations.

Knowledge management.

Executive management.

---

# 9. Frontend Structure

```text
frontend/

src/

assets/

components/

contexts/

features/

hooks/

layouts/

pages/

routes/

services/

socket/

theme/

utils/

constants/
```

---

# 10. Frontend Feature Structure

Each feature follows a consistent layout.

```text
feature/

components/

pages/

hooks/

services/

types/

utils/
```

Feature-specific code should stay inside the feature.

Reusable code belongs outside.

---

# 11. Components

Reusable UI components.

Examples

- Buttons
- Dialogs
- Tables
- Forms
- Cards

Business logic should not exist here.

---

# 12. Pages

Route-level pages.

Examples

- Login
- Dashboard
- Chat
- Tickets
- Analytics

Pages coordinate components but should not contain business logic.

---

# 13. Services

Frontend API communication.

Responsibilities

- REST requests
- Authentication
- Token refresh
- Error mapping

Never place UI logic inside services.

---

# 14. Socket

Frontend Socket.io client.

Contains

- Socket connection
- Event listeners
- Event emitters

---

# 15. Documentation

```text
docs/

PROJECT_OVERVIEW.md

ARCHITECTURE.md

FOLDER_STRUCTURE.md

DATABASE.md

API_SPEC.md

SOCKET_EVENTS.md

KNOWLEDGE_BASE.md

PROJECT_MEMORY.md

TASKS.md
```

Documentation should always reflect the current implementation.

---

# 16. Tests

```text
tests/

unit/

integration/

fixtures/

mocks/
```

Tests should mirror the project structure whenever possible.

---

# 17. Uploads

Temporary uploaded files.

Do not store permanent files here.

Use cloud storage in future releases if required.

---

# 18. Scripts

Development and maintenance scripts.

Examples

- Seed database
- Generate embeddings
- Migration utilities
- Cleanup scripts

Scripts should never contain business logic.

---

# 19. Folder Rules

Every folder should have a single responsibility.

Avoid creating generic folders like:

```text
misc/

common/

temp/

new/
```

Folder names should clearly describe their purpose.

---

# 20. Import Rules

Import order should be:

1. Node modules
2. Shared modules
3. Internal modules
4. Relative imports

Avoid circular dependencies.

---

# 21. Ownership Rules

Every file should have one clear owner.

Business logic belongs in the owning module.

Shared code must never depend on feature modules.

Modules should communicate through services rather than directly accessing another module's repositories or models.

---

# 22. Future Expansion

New business capabilities should be added as new modules instead of expanding unrelated modules.

Examples

- notification/
- payment/
- workflow/
- integration/
- reporting/

This keeps the architecture modular and maintainable as the project grows.