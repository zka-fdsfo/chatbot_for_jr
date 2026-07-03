# CLAUDE.md

# AI Customer Engagement Platform

## Purpose

This repository contains a production-grade AI Customer Engagement Platform built using the MERN stack.

The platform provides:

- AI Chat Assistant
- Human Live Chat
- Executive Dashboard
- Admin Dashboard
- Ticket Management
- Lead Management
- Knowledge Base (RAG Ready)
- Analytics
- Business Hours
- AI Conversation Summaries

This project is for a **single company** and is **not multi-tenant**.

---

# Primary Objective

Build a scalable, maintainable, production-ready application using clean architecture and modern engineering practices.

Always prioritize code quality over speed.

---

# Technology Stack

Frontend
- React (Vite)
- Material UI
- React Router
- Context API
- Socket.io Client

Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.io
- JWT Authentication

AI
- Groq API
- Model: openai/gpt-oss-120b

---

# Architecture Rules

Always follow:

- Modular Architecture
- SOLID Principles
- Repository Pattern
- Service Layer
- Controller Layer
- Validation Layer
- Dependency Injection where appropriate
- Centralized Error Handling
- Reusable Components
- Environment Variables
- Consistent Naming Conventions

Business logic must NEVER exist inside controllers.

---

# Coding Standards

Always write:

- Production-ready code
- Strong typing where possible
- Small reusable functions
- Clean folder structure
- Proper validation
- Proper error handling
- Secure authentication
- Consistent API responses

Never generate placeholder or TODO code unless explicitly requested.

---

# Project Documentation

Before implementing any feature, consult the relevant document.

- docs/PROJECT_OVERVIEW.md
- docs/ARCHITECTURE.md
- docs/FOLDER_STRUCTURE.md
- docs/DATABASE.md
- docs/API_SPEC.md
- docs/SOCKET_EVENTS.md
- docs/AUTHENTICATION.md
- docs/KNOWLEDGE_BASE.md
- docs/AI_ENGINE.md
- docs/PROMPT_ENGINEERING.md
- docs/RAG.md
- docs/CHAT_WIDGET.md
- docs/EXECUTIVE_DASHBOARD.md
- docs/ADMIN_PANEL.md
- docs/TICKET_SYSTEM.md
- docs/LEAD_MANAGEMENT.md
- docs/BUSINESS_HOURS.md
- docs/ANALYTICS.md
- docs/CODING_STANDARDS.md
- docs/ERROR_HANDLING.md
- docs/TESTING.md
- docs/DEPLOYMENT.md

---

# Development Workflow

Before writing code:

1. Understand the requested feature.
2. Review the related documentation.
3. Check PROJECT_MEMORY.md.
4. Design before implementation.
5. Reuse existing modules.
6. Avoid duplicate logic.

---

# Response Rules

For every implementation:

1. Explain design decisions.
2. List affected files.
3. Keep architecture consistent.
4. Avoid breaking existing modules.
5. Update API documentation if needed.
6. Update database documentation if needed.
7. Update PROJECT_MEMORY.md after completing the feature.

---

# AI Rules

The AI must:

- Answer only using company knowledge.
- Never hallucinate.
- Never invent pricing or policies.
- Escalate to a human when required.
- Support future RAG integration.
- Keep prompts modular and maintainable.

---

# Security Rules

Always implement:

- JWT Authentication
- Password Hashing
- Input Validation
- Rate Limiting
- Helmet
- CORS
- Secure Environment Variables

Never expose secrets.

---

# Project Memory

The current project state is maintained in:

docs/PROJECT_MEMORY.md

Always review and update this document after completing a task.

---

# Task Tracking

Current implementation roadmap:

docs/TASKS.md

Always complete one task at a time unless instructed otherwise.

---

# Source of Truth

Architecture decisions, APIs, database schemas, socket events, and AI behavior are defined exclusively in the documentation under the `docs/` directory.

Do not redesign completed modules unless explicitly instructed.

Maintain backward compatibility and consistency across the project.