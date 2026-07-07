# Authentication & Authorization

# AI Customer Engagement Platform

## 1. Purpose

This document defines the authentication and authorization architecture for the platform.

The system supports two authentication models:

- Anonymous Visitor Authentication
- JWT-based User Authentication

The authentication system must be secure, scalable, and independent of business logic.

---

# 2. Authentication Types

The platform has two types of users.

## Anonymous Visitors

Visitors are not required to register or log in.

They receive:

- Visitor ID
- Session ID
- Conversation ID
- Temporary Visitor Token

Visitors can:

- Chat with AI
- Continue conversations
- Request human support
- Create tickets
- Share contact information

---

## Authenticated Users

Authenticated users include:

- Administrator
- Executive

Authentication is required to access protected APIs and dashboards.

---

# 3. User Roles

## Administrator

Responsibilities

- Manage executives
- Manage knowledge base
- Manage settings
- View analytics
- Manage tickets
- Configure AI

---

## Executive

Responsibilities

- Accept chats
- Reply to visitors
- Manage tickets
- Update availability
- View assigned conversations

---

## Visitor

Anonymous website user.

No password required.

Limited permissions.

---

# 4. Authentication Flow

## Visitor Authentication

```text
Visitor Opens Website

↓

Generate Visitor ID

↓

Create Visitor Session

↓

Issue Temporary Visitor Token

↓

Access Chat Widget
```

The visitor token identifies the browser session but does not grant administrative privileges.

---

## User Authentication

```text
Login

↓

Validate Credentials

↓

Generate JWT

↓

Return Access Token

↓

Access Protected APIs
```

Passwords must never be stored in plain text.

---

# 5. JWT Authentication

Authenticated users receive a JWT after successful login.

JWT contains:

```text
userId

role

email

sessionId
```

JWT is required for:

- Executive Dashboard
- Admin Dashboard
- Protected APIs
- Socket Authentication

---

# 6. Visitor Token

Visitors receive a temporary signed token.

Purpose

- Identify anonymous users
- Restore conversations
- Associate visitor sessions
- Prevent duplicate sessions

The visitor token is not a replacement for JWT.

---

# 7. Authorization

Authorization is role-based.

Administrator

- Full access

Executive

- Assigned conversations
- Executive dashboard
- Ticket management

Visitor

- Own conversations only

Every protected endpoint must verify authorization before executing business logic.

---

# 8. Protected Resources

Authentication required

- Executive Dashboard
- Admin Dashboard
- Knowledge Management
- Analytics
- Settings
- Executive APIs
- Ticket Management

No authentication required

- Chat Widget
- Visitor Session Creation
- AI Chat
- FAQ Retrieval
- Business Hours Lookup

---

# 9. Password Policy

Passwords must:

- Be hashed using bcrypt
- Never be logged
- Never be returned by APIs

Recommended requirements

- Minimum 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Special character

---

# 10. Login Flow

```text
User Login

↓

Validate Input

↓

Find User

↓

Compare Password

↓

Generate JWT

↓

Return Access Token
```

Invalid credentials must return a generic error message.

---

# 11. Token Expiration

JWT

Recommended lifetime

```
24 Hours
```

Refresh tokens are not required in the initial release but the architecture should support them in the future.

Visitor Tokens

Expire after the configured visitor session timeout.

---

# 12. Logout

Logout should:

- Invalidate client session
- Disconnect active socket connection
- Update user availability
- Clear stored authentication tokens

Future implementations may support server-side token blacklisting if required.

---

# 13. Socket Authentication

Every authenticated socket connection must validate its token before joining.

Flow

```text
Socket Connect

↓

Validate Token

↓

Load User

↓

Authorize

↓

Join Rooms

↓

Connection Established
```

Unauthenticated socket connections should be rejected.

---

# 14. Session Management

Visitor Sessions

Store

- Visitor ID
- Session ID
- Browser Information
- IP Address
- Last Activity

Executive Sessions

Store

- User ID
- Login Time
- Last Activity
- Socket ID
- Current Status

---

# 15. Account Status

Users may have the following statuses.

```
ACTIVE

INACTIVE

LOCKED
```

Inactive or locked users cannot authenticate.

---

# 16. Security Rules

Always implement

- Password Hashing
- JWT Verification
- Input Validation
- HTTPS (Production)
- Helmet
- CORS
- Rate Limiting

Never trust client-provided role information.

---

# 17. Route Protection

Public Routes

- Visitor Session
- AI Chat
- Health Check
- Public Knowledge

Executive Routes

Require

- JWT
- Executive Role

Administrator Routes

Require

- JWT
- Administrator Role

---

# 18. Permission Matrix

| Feature | Visitor | Executive | Admin |
|---------|:-------:|:---------:|:-----:|
| AI Chat | ✅ | ❌ | ❌ |
| Create Ticket | ✅ | ❌ | ❌ |
| View Own Conversation | ✅ | ✅ | ✅ |
| Accept Chat | ❌ | ✅ | ❌ |
| Manage Tickets | ❌ | ✅ | ✅ |
| Manage Knowledge Base | ❌ | ❌ | ✅ |
| Manage Business Hours | ❌ | ❌ | ✅ |
| Manage Executives | ❌ | ❌ | ✅ |
| Analytics Dashboard | ❌ | ❌ | ✅ |
| AI Configuration | ❌ | ❌ | ✅ |

---

# 19. Authentication Middleware

The backend should provide reusable middleware for:

- JWT Verification
- Role Authorization
- Visitor Authentication
- Optional Authentication
- Socket Authentication

Business logic must never be implemented inside middleware.

---

# 20. Future Enhancements

The authentication architecture should support:

- Refresh Tokens
- Password Reset
- Email Verification
- Multi-Factor Authentication (MFA)
- OAuth Providers (Google, Microsoft)
- Single Sign-On (SSO)
- Device Management
- Session Revocation

These features should be implemented without changing the existing authentication interfaces.

---

# 21. Implementation Rules

- Every protected request must validate authentication before authorization.
- Controllers must never decode or validate JWTs directly.
- Authentication logic belongs in the Auth module.
- Authorization decisions should be handled through reusable middleware and services.
- Visitor and authenticated user flows must remain independent.
- Socket authentication must follow the same security rules as REST APIs.

Authentication and authorization changes must be reflected in `API_SPEC.md`, `SOCKET_EVENTS.md`, and `PROJECT_MEMORY.md`.