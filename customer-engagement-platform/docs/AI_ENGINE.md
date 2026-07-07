# AI Engine

# AI Customer Engagement Platform

## 1. Purpose

The AI Engine is responsible for orchestrating all AI-related operations within the platform.

It does not contain business data.

It does not communicate directly with MongoDB.

It receives structured context from the Knowledge Service and generates intelligent responses using the configured AI provider.

---

# 2. Responsibilities

The AI Engine is responsible for:

- Intent Detection
- Context Building
- Prompt Generation
- AI Response Generation
- Lead Detection
- Escalation Detection
- Conversation Summary
- Confidence Evaluation
- AI Provider Management

---

# 3. High-Level Architecture

```
Visitor Message

↓

Chat Module

↓

AI Engine

↓

Knowledge Service

↓

Context Builder

↓

Prompt Builder

↓

AI Provider

↓

AI Response

↓

Chat Service

↓

Visitor
```

Business logic remains outside the AI provider.

---

# 4. AI Components

```
AI Engine

├── Intent Detector
├── Context Builder
├── Prompt Builder
├── Provider Manager
├── Lead Detector
├── Escalation Detector
├── Confidence Evaluator
├── Summary Generator
└── Response Validator
```

Each component has a single responsibility.

---

# 5. AI Request Flow

```
Visitor Message

↓

Conversation Loaded

↓

Detect Intent

↓

Retrieve Knowledge

↓

Build Context

↓

Generate Prompt

↓

Call AI Provider

↓

Validate Response

↓

Store Message

↓

Return Response
```

---

# 6. Intent Detection

The AI should classify every message.

Supported intents include:

- General Question
- Service Inquiry
- Booking Request
- Pricing Inquiry
- Complaint
- Human Request
- Ticket Request
- Greeting
- Goodbye
- Unknown

Intent detection should occur before response generation.

---

# 7. Knowledge Retrieval

The AI Engine never queries MongoDB directly.

Instead:

```
AI Engine

↓

Knowledge Service

↓

Relevant Documents

↓

Context Builder
```

Only relevant documents should be used.

---

# 8. Context Builder

The Context Builder combines:

- Company Knowledge
- Conversation History
- Visitor Information
- Business Hours
- Active Settings

Only the minimum required context should be sent to the AI provider.

---

# 9. Prompt Builder

The Prompt Builder creates a structured prompt.

Sections:

- System Instructions
- Company Knowledge
- Conversation History
- Current Visitor Message
- Response Rules

Prompt generation should be deterministic and reusable.

---

# 10. AI Provider

The AI Engine communicates through a provider interface.

```
AIProvider

↓

GroqProvider

↓

Future Providers

- OpenAI
- Anthropic
- Gemini
- Azure OpenAI
```

Business logic must never depend on a specific provider.

---

# 11. Current AI Provider

Provider

```
Groq
```

Model

```
openai/gpt-oss-120b
```

Changing providers should not affect the rest of the application.

---

# 12. AI Response Validation

Every generated response should be validated.

Validation checks:

- Response exists
- No hallucination indicators
- No restricted content
- No fabricated pricing
- No fabricated policies

Invalid responses should trigger fallback handling.

---

# 13. Lead Detection

The AI should naturally collect:

- Name
- Email
- Phone
- Company (Optional)
- Interested Service

The AI should never aggressively request information.

Lead collection should occur only when appropriate.

---

# 14. Escalation Detection

Escalation should occur when:

- Visitor requests a human
- Visitor requests a manager
- Complaint detected
- Refund request
- Legal inquiry
- AI confidence is low
- Knowledge unavailable

Escalation should be handled by the Chat Service.

---

# 15. Confidence Evaluation

Each AI response should be evaluated.

Possible confidence levels:

```
HIGH

MEDIUM

LOW
```

Low confidence responses should trigger escalation or fallback.

---

# 16. Conversation Summary

After conversation completion, the AI generates:

- Summary
- Visitor Intent
- Outcome
- Lead Information
- Follow-up Recommendation

Summaries are stored separately from conversation messages.

---

# 17. AI Response Rules

The AI must:

- Answer only using company knowledge
- Never hallucinate
- Never invent pricing
- Never invent policies
- Never disclose internal information
- Remain polite and professional
- Ask follow-up questions when needed

---

# 18. Fallback Strategy

If the AI cannot answer:

1. Inform the visitor honestly.
2. Offer to connect with a human.
3. Create a ticket if no executive is available.
4. Continue assisting where possible.

The AI must never guess.

---

# 19. Business Hours Awareness

Before requesting a human:

```
Business Hours Service

↓

Currently Open?

↓

Yes → Human Handoff

No → Ticket / Callback
```

The AI should adapt responses based on business hours.

---

# 20. Conversation Memory

The AI receives:

- Recent conversation history
- Relevant visitor information
- Current context

Do not send the complete conversation unless required.

Context should be limited to control token usage.

---

# 21. AI Safety

The AI must reject:

- Requests outside company knowledge
- Fabricated information
- Internal system data
- Administrative actions
- Unauthorized operations

Safety rules are always enforced.

---

# 22. Performance Goals

The AI Engine should:

- Minimize token usage
- Minimize latency
- Reuse prompts where possible
- Retrieve only relevant knowledge
- Support asynchronous processing

---

# 23. Monitoring

Track:

- Response Time
- Token Usage
- AI Errors
- Escalation Rate
- Lead Conversion
- AI Resolution Rate
- Provider Failures

These metrics feed the Analytics module.

---

# 24. Future Enhancements

The AI Engine should support:

- Multiple AI Providers
- RAG
- Vector Search
- Function Calling
- Voice AI
- OCR
- Multilingual Support
- AI Workflows
- Sentiment Analysis

These enhancements should not require changes to business modules.

---

# 25. Implementation Rules

- The AI Engine is orchestration, not business logic.
- Knowledge is retrieved only through the Knowledge Service.
- AI providers implement a common interface.
- Prompts are generated by the Prompt Builder.
- Every AI response is validated before delivery.
- Low-confidence responses should trigger fallback or escalation.
- The AI Engine must remain provider-independent.