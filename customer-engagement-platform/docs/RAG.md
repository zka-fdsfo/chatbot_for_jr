# Retrieval-Augmented Generation (RAG)

# AI Customer Engagement Platform

## 1. Purpose

This document defines the Retrieval-Augmented Generation (RAG) architecture for the platform.

RAG is **not implemented in Phase 1**, but the system is designed so it can be introduced without changing business logic.

The AI Engine must retrieve relevant business knowledge instead of relying on the LLM's internal knowledge.

---

# 2. Goals

The RAG architecture should:

- Improve answer accuracy
- Reduce hallucinations
- Minimize token usage
- Support semantic search
- Support hybrid search
- Keep company knowledge up to date
- Remain provider independent

---

# 3. High-Level Architecture

```
Visitor Question

↓

Intent Detection

↓

Knowledge Service

↓

Retrieval Engine

↓

Relevant Documents

↓

Context Builder

↓

Prompt Builder

↓

AI Provider

↓

Response
```

The AI provider never accesses MongoDB directly.

---

# 4. RAG Components

```
Knowledge Base

↓

Embedding Generator

↓

Embedding Store

↓

Vector Search

↓

Retriever

↓

Re-ranker (Future)

↓

Context Builder

↓

Prompt Builder

↓

AI Provider
```

Each component has a single responsibility.

---

# 5. Knowledge Sources

The retriever may search:

- Company Information
- Services
- FAQs
- Policies
- Business Hours
- Locations
- Contact Information
- Pricing
- Public Documents

Future sources

- PDFs
- Product Catalogues
- Documentation
- CRM
- External APIs

---

# 6. Retrieval Flow

```
Visitor Message

↓

Intent Detection

↓

Query Expansion (Future)

↓

Vector Search

↓

Top Matching Documents

↓

Context Builder

↓

Prompt Generation

↓

AI Response
```

Only relevant knowledge is included.

---

# 7. Embedding Strategy

Every published knowledge document generates an embedding.

```
Knowledge Document

↓

Embedding Model

↓

Vector

↓

knowledge_embeddings
```

Embeddings are regenerated whenever published content changes.

---

# 8. Collections

Current

```
knowledge_base
```

Future

```
knowledge_versions

knowledge_embeddings
```

The business layer should not depend on embedding storage.

---

# 9. Embedding Document

Example

```json
{
    "_id": "...",
    "knowledgeId": "...",
    "category": "services",
    "chunkId": 1,
    "embedding": [],
    "version": 1,
    "createdAt": ""
}
```

---

# 10. Chunking Strategy

Large documents should be divided into logical chunks.

Examples

Good

```
Service A

Service B

Service C
```

Avoid

```
Entire company handbook
```

Chunks should be:

- Small
- Self-contained
- Meaningful

---

# 11. Chunk Size

Recommended

```
300–800 words
```

Overlap

```
50–100 words
```

Chunk sizes may evolve based on retrieval performance.

---

# 12. Metadata

Every chunk should include metadata.

Example

```
knowledgeId

category

title

keywords

version

language

publishedAt
```

Metadata improves retrieval quality.

---

# 13. Retrieval Strategy

Phase 1

- Category Search
- Keyword Search

Phase 2

- Semantic Search

Phase 3

- Hybrid Search

Hybrid Search combines:

- Vector similarity
- Keyword search
- Metadata filtering

---

# 14. Ranking

Retriever returns the most relevant documents.

Future ranking factors

- Similarity Score
- Category Match
- Freshness
- Popularity
- Business Priority

---

# 15. Context Building

The Context Builder receives:

- Top retrieved chunks
- Conversation summary
- Recent messages
- Visitor information
- Business settings

The final context should remain concise.

---

# 16. Token Optimization

Always minimize prompt size.

Priority

1. Retrieved knowledge
2. Conversation summary
3. Recent messages
4. Visitor context

Avoid sending unnecessary information.

---

# 17. Prompt Integration

The Prompt Builder combines

```
System Prompt

↓

Developer Prompt

↓

Retrieved Knowledge

↓

Conversation Context

↓

Visitor Message
```

Retrieved knowledge is the only business context provided to the AI.

---

# 18. Re-ranking (Future)

Future versions may re-rank retrieved results.

Possible methods

- Cross Encoder
- LLM Re-ranking
- Business Rules

Only the highest-quality documents should reach the AI.

---

# 19. Embedding Generation

Embeddings should be generated when:

- Knowledge is published
- Knowledge is updated
- Documents are imported

Embeddings should not be generated during visitor requests.

---

# 20. Background Processing

Embedding generation should run asynchronously.

Example workflow

```
Publish Knowledge

↓

Queue Job

↓

Generate Embeddings

↓

Store Embeddings

↓

Ready for Search
```

Visitors should never wait for embedding generation.

---

# 21. Caching

Future caching may include

- Frequent queries
- Popular documents
- Embedding cache
- Search cache

Caching must not compromise data freshness.

---

# 22. AI Rules

The AI must:

- Use retrieved knowledge only
- Never answer from memory
- Never invent pricing
- Never invent policies
- Escalate when no relevant knowledge exists

---

# 23. Monitoring

Track

- Retrieval Time
- Embedding Generation Time
- Search Accuracy
- Token Usage
- Top Retrieved Documents
- Empty Search Rate
- Escalation Rate

These metrics support continuous improvement.

---

# 24. Future Enhancements

The RAG architecture should support

- MongoDB Vector Search
- Multi-language embeddings
- Image embeddings
- PDF ingestion
- OCR
- Voice transcripts
- Hybrid retrieval
- Knowledge graph integration

These enhancements should not require changes to the AI Engine interface.

---

# 25. Implementation Rules

- The AI Engine never queries MongoDB directly.
- All retrieval occurs through the Knowledge Service.
- Embeddings are generated asynchronously.
- Published knowledge is the only source for embeddings.
- Retrieval logic remains independent of the AI provider.
- Business modules remain unaware of vector search implementation.
- RAG should be introduced by replacing the Retrieval Engine, not redesigning the application.