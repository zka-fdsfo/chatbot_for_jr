# Prompt Engineering

# AI Customer Engagement Platform

## 1. Purpose

This document defines how prompts are built, managed, versioned, and sent to the AI provider.

Prompts are not hardcoded.

They are dynamically assembled from reusable components.

The Prompt Engine ensures:

- Consistency
- Low token usage
- Easy maintenance
- Version control
- Provider independence

---

# 2. Prompt Architecture

```
Visitor Message

↓

Intent Detection

↓

Knowledge Retrieval

↓

Conversation Context

↓

Prompt Builder

↓

Prompt Validation

↓

AI Provider
```

---

# 3. Prompt Components

Every AI request is built using the following components.

```
System Prompt

+

Developer Prompt

+

Company Context

+

Conversation History

+

Visitor Context

+

Current User Message

=

Final Prompt
```

---

# 4. System Prompt

The System Prompt defines permanent AI behavior.

It should include:

- AI identity
- Company assistant role
- Response rules
- Safety rules
- Escalation rules

This prompt rarely changes.

Example responsibilities

- Never hallucinate
- Never invent pricing
- Use only company knowledge
- Be professional
- Escalate when unsure

---

# 5. Developer Prompt

The Developer Prompt controls runtime behavior.

Examples

- Response length
- Markdown formatting
- Lead collection
- Current feature flags
- Business logic instructions

This prompt may change between releases.

---

# 6. Company Context

The Company Context is retrieved from the Knowledge Service.

It may include

- Services
- FAQs
- Policies
- Locations
- Business Hours
- Contact Information

Only relevant knowledge should be included.

---

# 7. Conversation Context

Conversation context includes recent messages.

Default recommendation

Last

```
10–20 messages
```

Older conversations should be summarized instead of sent entirely.

---

# 8. Visitor Context

Visitor context may include

- Name
- Email
- Phone
- Preferred Language
- Current Conversation
- Previous Summary

Do not include unnecessary personal information.

---

# 9. Current Message

Always append the visitor's latest message as the final user input.

This is the only uncontrolled input in the prompt.

It should be sanitized before use.

---

# 10. Prompt Assembly

The Prompt Builder assembles the prompt in this order.

```
System Prompt

↓

Developer Prompt

↓

Company Knowledge

↓

Conversation Summary

↓

Recent Messages

↓

Visitor Context

↓

Current Message
```

This order must remain consistent.

---

# 11. Prompt Templates

Prompts should be stored as templates.

Examples

```
system.md

developer.md

lead.md

summary.md

escalation.md

fallback.md
```

Avoid embedding large prompts inside application code.

---

# 12. Intent-Based Prompting

Different intents may require different prompt templates.

Examples

```
General Question

↓

General Prompt

--------------------

Lead Collection

↓

Lead Prompt

--------------------

Complaint

↓

Escalation Prompt

--------------------

Conversation End

↓

Summary Prompt
```

---

# 13. Context Size

Always minimize token usage.

Priority

1. Current Message
2. Relevant Knowledge
3. Recent Messages
4. Conversation Summary

Never send the full database.

---

# 14. Knowledge Rules

Only include knowledge that is relevant.

Bad

```
Entire company database
```

Good

```
Relevant FAQ

+

Business Hours

+

Requested Service
```

---

# 15. AI Rules

Every prompt must include rules such as

- Use only supplied knowledge.
- Never hallucinate.
- Never invent pricing.
- Never invent policies.
- Never expose internal information.
- Escalate when necessary.
- Admit when information is unavailable.

---

# 16. Lead Collection Prompt

When appropriate the AI may collect

- Name
- Email
- Phone
- Company

The AI should collect information naturally.

Never aggressively ask for contact information.

---

# 17. Escalation Prompt

Escalation prompt should be used when

- Human requested
- Complaint detected
- Legal issue
- Refund request
- Low confidence
- Missing knowledge

The AI should explain why escalation is occurring.

---

# 18. Summary Prompt

At conversation completion

Generate

- Summary
- Visitor Intent
- Lead Status
- Outcome
- Follow-up Recommendation

Summaries should be concise and factual.

---

# 19. Fallback Prompt

If knowledge is unavailable

The AI should

- State it does not have the information.
- Offer human assistance.
- Create a ticket if appropriate.

The AI must never guess.

---

# 20. Prompt Versioning

Every prompt should have a version.

Example

```
v1

v2

v3
```

Version changes should be tracked in the project history.

---

# 21. Prompt Testing

Test prompts using

- Greeting
- FAQ
- Pricing
- Complaint
- Booking
- Human Request
- Unknown Question

Each prompt version should be validated before deployment.

---

# 22. Prompt Performance

Track

- Prompt Size
- Completion Tokens
- Response Time
- Success Rate
- Escalation Rate
- Hallucination Rate

Use metrics to improve prompts over time.

---

# 23. Provider Independence

The Prompt Engine must not depend on a specific provider.

Supported providers

- Groq
- OpenAI
- Anthropic
- Gemini
- Azure OpenAI

Switching providers must not require prompt redesign.

---

# 24. Security

Never include

- Passwords
- API Keys
- Internal IDs
- Database Queries
- Sensitive Configuration

Sanitize all user input before adding it to prompts.

---

# 25. Future Enhancements

The Prompt Engine should support

- Function Calling
- Tool Calling
- Structured JSON Output
- Multi-language Prompts
- Voice Prompts
- OCR Context
- Image Understanding
- Prompt Caching
- Dynamic Prompt Optimization

---

# 26. Implementation Rules

- Prompts must be assembled dynamically.
- Prompt templates should be stored separately from application logic.
- The Prompt Builder is the only component responsible for prompt assembly.
- Knowledge must always come from the Knowledge Service.
- Conversation history should be summarized when it becomes large.
- Every prompt should be versioned and testable.
- Prompt changes should not require changes to business logic.