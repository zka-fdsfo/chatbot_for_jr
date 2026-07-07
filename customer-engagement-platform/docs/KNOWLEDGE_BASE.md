# Knowledge Base

# AI Customer Engagement Platform

## 1. Purpose

The Knowledge Base is the single source of truth for all company information used throughout the platform.

It is consumed by:

- AI Assistant
- Website
- Admin Dashboard
- Executive Dashboard
- Public APIs
- Future Mobile Applications

The AI must answer only from this knowledge.

---

# 2. Design Goals

The Knowledge Base must be:

- Structured
- Searchable
- Versioned
- Extensible
- AI-Friendly
- Human Editable
- RAG Ready

---

# 3. Architecture

```
                Admin Dashboard

                       │

                       ▼

               Knowledge Service

                       │

                       ▼

              MongoDB Knowledge Base

                       │

         ┌─────────────┼─────────────┐

         ▼             ▼             ▼

      Website         AI       Executive Portal
```

The AI never reads MongoDB directly.

All knowledge passes through the Knowledge Service.

---

# 4. Collection

MongoDB Collection

```
knowledge_base
```

Each document represents a single knowledge category.

Example

```
Company

Services

FAQ

Business Hours

Privacy Policy
```

Do not store the entire company in a single document.

---

# 5. Document Structure

Every document follows the same structure.

```json
{
    "_id": "...",
    "category": "services",
    "title": "Services",
    "slug": "services",
    "version": 1,
    "status": "PUBLISHED",
    "keywords": [],
    "content": {},
    "createdAt": "",
    "updatedAt": ""
}
```

---

# 6. Knowledge Categories

The platform supports the following categories.

## Company

- Name
- Description
- Vision
- Mission
- About

---

## Services

- Service List
- Descriptions
- Features
- Duration
- Requirements

---

## FAQs

- Questions
- Answers

---

## Locations

- Offices
- Address
- Contact
- Maps

---

## Contact Information

- Email
- Phone
- Emergency Contact
- Website

---

## Business Hours

- Weekly Schedule
- Holidays
- Special Hours

---

## Pricing

Optional.

Contains public pricing only.

The AI must never invent pricing.

---

## Policies

Includes

- Refund Policy
- Cancellation Policy
- Booking Policy

---

## Privacy Policy

Company privacy information.

---

## Terms & Conditions

Legal information.

---

## Departments

Available departments.

Used for AI routing.

---

## Executives

Public executive information.

Not authentication data.

---

## Lead Collection

Fields AI should collect.

Example

- Name
- Email
- Phone
- Company

---

## Greeting Messages

Default greetings.

---

## Escalation Rules

Defines

- Human keywords
- Manager keywords
- Complaint keywords

---

## Chatbot Settings

AI configuration.

---

# 7. Content Rules

Knowledge must always be:

- Accurate
- Verified
- Up to date
- Human readable

Avoid storing HTML whenever possible.

Prefer structured JSON.

---

# 8. Metadata

Each document contains metadata.

```
category

slug

version

status

keywords

createdAt

updatedAt
```

Status values

```
DRAFT

PUBLISHED

ARCHIVED
```

Only published documents are used by the AI.

---

# 9. Versioning

Knowledge should never be overwritten without tracking versions.

Example

```
Version 1

↓

Version 2

↓

Version 3
```

This allows rollback if incorrect information is published.

---

# 10. Knowledge Retrieval

```
Visitor Question

↓

Knowledge Service

↓

Determine Categories

↓

Retrieve Documents

↓

Build AI Context

↓

Send Context to AI

↓

Generate Response
```

Only relevant knowledge should be retrieved.

---

# 11. Search Strategy

Initial implementation

- Category Search
- Keyword Search
- Exact Match

Future implementation

- Semantic Search
- Vector Search
- Embeddings
- Hybrid Search

The retrieval interface should remain unchanged.

---

# 12. AI Context Building

The AI should never receive the full database.

Instead

```
User Question

↓

Retrieve Matching Documents

↓

Merge Relevant Content

↓

Build Context

↓

Groq
```

This reduces token usage and improves response quality.

---

# 13. Prompt Rules

The system prompt must instruct the AI to:

- Use only supplied knowledge
- Never hallucinate
- Never invent pricing
- Never invent company policies
- Escalate when information is unavailable

---

# 14. Administration

Administrators can:

- Create documents
- Update documents
- Publish documents
- Archive documents
- Search documents
- Restore previous versions

All changes should be auditable.

---

# 15. Validation Rules

Before publishing:

- Required fields validated
- Duplicate slugs prevented
- Valid category
- Valid status
- Content schema verified

Invalid documents cannot be published.

---

# 16. Security

Only Administrators may:

- Create
- Edit
- Publish
- Archive

Executives have read-only access where required.

Visitors cannot access internal knowledge.

---

# 17. Future RAG Support

The Knowledge Base is designed for Retrieval-Augmented Generation.

Future architecture

```
Knowledge Base

↓

Embedding Generator

↓

knowledge_embeddings

↓

MongoDB Vector Search

↓

Top Documents

↓

Context Builder

↓

Groq
```

No architectural changes should be required when embeddings are introduced.

---

# 18. Embedding Strategy

Future embedding unit

One knowledge document.

Not the entire database.

Large documents may later be divided into logical chunks.

Embedding generation should occur automatically after publishing.

---

# 19. Knowledge Lifecycle

```
Draft

↓

Review

↓

Publish

↓

Used by AI

↓

Archive

↓

Restore (Optional)
```

Only published content is searchable.

---

# 20. Implementation Rules

- Every knowledge category is an independent document.
- The Knowledge Service is the only component that accesses the repository.
- AI providers must never query MongoDB directly.
- The AI receives only the relevant context for each request.
- Every published change should create a new version.
- The Knowledge Base is the single source of truth for all company information.
- Future RAG features must reuse the existing Knowledge Service interface.