# Coding Standards

# AI Customer Engagement Platform

## 1. Purpose

This document defines the coding standards for the entire project.

All contributors, AI assistants, and future developers must follow these standards.

Goals:

- Maintain consistency
- Improve readability
- Reduce bugs
- Simplify maintenance
- Support scalability

---

# 2. General Principles

Always write code that is

- Simple
- Readable
- Modular
- Testable
- Reusable
- Maintainable

Prefer clarity over cleverness.

---

# 3. Architecture Rules

Always follow

```
Routes

↓

Controllers

↓

Services

↓

Repositories

↓

Database
```

Never skip layers.

Controllers must never access MongoDB directly.

---

# 4. Single Responsibility

Every file should have one responsibility.

Examples

✅ ChatService

❌ ChatServiceAndLeadManager

---

# 5. File Size

Recommended maximum

Component

```
300 lines
```

Service

```
500 lines
```

Controller

```
200 lines
```

Split large files into smaller modules.

---

# 6. Folder Organization

Organize code by feature.

Example

```
modules/

    chat/

    ticket/

    lead/

    knowledge/
```

Avoid organizing only by file type.

---

# 7. Naming Conventions

Folders

```
kebab-case
```

Files

```
camelCase.js
```

React Components

```
PascalCase.jsx
```

Variables

```
camelCase
```

Functions

```
camelCase
```

Constants

```
UPPER_SNAKE_CASE
```

Classes

```
PascalCase
```

---

# 8. Function Design

Functions should

- Perform one task
- Return early
- Avoid deep nesting
- Be easy to test

Prefer

```
return early
```

instead of nested if statements.

---

# 9. Variable Naming

Names should describe purpose.

Good

```
conversationSummary

assignedExecutive

leadScore
```

Avoid

```
x

temp

data

obj
```

---

# 10. Comments

Write comments only when necessary.

Avoid

```javascript
// Increment counter
counter++;
```

Prefer comments that explain *why*, not *what*.

---

# 11. Error Handling

Always

- Catch expected errors
- Return meaningful messages
- Log unexpected errors

Never expose internal stack traces to clients.

---

# 12. Async Code

Always use

```
async / await
```

Avoid chained `.then()` calls.

Always handle rejected promises.

---

# 13. Validation

Validate

- Request body
- Query parameters
- Route parameters
- Environment variables

Never trust client input.

---

# 14. API Responses

Use a consistent response format.

Success

```json
{
  "success": true,
  "data": {}
}
```

Error

```json
{
  "success": false,
  "message": "Error message"
}
```

---

# 15. Logging

Use structured logging.

Log

- Errors
- Warnings
- Important business events

Never log

- Passwords
- Tokens
- API Keys
- Sensitive personal data

---

# 16. React Standards

Components should

- Be functional
- Use hooks
- Be reusable
- Avoid duplicated logic

Extract repeated logic into custom hooks.

---

# 17. State Management

Keep state

- Local when possible
- Shared only when necessary

Avoid unnecessary global state.

---

# 18. Styling

Use a single styling approach throughout the project.

Avoid mixing multiple styling systems.

Design should follow the shared design system.

---

# 19. API Calls

All API requests should pass through a centralized API client.

Never call `fetch()` or `axios` directly inside components.

---

# 20. Socket Usage

Socket logic should be isolated.

Do not emit events directly from UI components.

Use dedicated socket services or hooks.

---

# 21. AI Integration

Only the AI Engine communicates with AI providers.

Business modules must never call Groq or any LLM directly.

---

# 22. Database Access

Repositories own database access.

Services call repositories.

Controllers call services.

Never bypass repositories.

---

# 23. Configuration

Store configuration in environment variables.

Never hardcode

- API Keys
- Secrets
- URLs
- Credentials

---

# 24. Security

Always

- Sanitize inputs
- Validate permissions
- Verify authentication
- Escape untrusted content

Security takes precedence over convenience.

---

# 25. Testing

Every module should support

- Unit Tests
- Integration Tests

Critical business logic should always be tested.

---

# 26. Code Reviews

Before merging

- Remove unused code
- Remove console logs
- Remove commented code
- Check naming
- Check formatting
- Verify tests

---

# 27. Dependencies

Before adding a dependency

Ask

- Is it necessary?
- Can existing code solve this?
- Is it actively maintained?

Prefer fewer dependencies.

---

# 28. Performance

Avoid

- Duplicate database queries
- Unnecessary renders
- Large payloads
- Blocking operations

Optimize only after measuring.

---

# 29. Documentation

Every new feature should update

- API_SPEC.md
- DATABASE.md
- ARCHITECTURE.md (if applicable)
- SOCKET_EVENTS.md (if applicable)

Documentation is part of development.

---

# 30. AI Development Rules

When using Claude Code or AI tools

- Follow project architecture.
- Reuse existing modules.
- Do not duplicate logic.
- Do not introduce unnecessary dependencies.
- Keep implementations consistent with existing patterns.
- Update documentation when architecture changes.

AI-generated code must meet the same quality standards as manually written code.