# Chat Widget

# AI Customer Engagement Platform

## 1. Purpose

The Chat Widget is the primary customer interaction interface.

It enables visitors to communicate with the AI assistant and, when necessary, seamlessly transition to a human executive.

The widget should be lightweight, responsive, accessible, and embeddable into any website.

---

# 2. Design Goals

The widget should be:

- Responsive
- Mobile Friendly
- Accessible
- Fast
- Themeable
- Configurable
- Framework Independent
- Real-time
- AI-first

---

# 3. High-Level Architecture

```
Visitor

↓

Chat Widget

↓

REST API

↓

Socket.io

↓

Chat Service

↓

AI Engine

↓

Knowledge Service

↓

Groq AI
```

When escalation occurs

```
AI

↓

Executive

↓

Visitor
```

The visitor should experience a seamless transition.

---

# 4. Widget Components

```
Chat Widget

├── Launcher
├── Header
├── Conversation Area
├── Message List
├── Message Bubble
├── Input Box
├── Typing Indicator
├── Attachment Button (Future)
├── Suggested Questions
├── Quick Replies
├── Footer
└── Status Indicator
```

Each component should have a single responsibility.

---

# 5. Widget Lifecycle

```
Page Load

↓

Widget Initialized

↓

Visitor Session Created

↓

Socket Connected

↓

Greeting Displayed

↓

Conversation Started

↓

AI Responses

↓

Executive Handoff (Optional)

↓

Conversation Closed
```

---

# 6. Widget States

Supported states

```
CLOSED

OPEN

LOADING

CONNECTED

DISCONNECTED

WAITING_AI

WAITING_EXECUTIVE

CHAT_ACTIVE

MINIMIZED

ENDED
```

Only one state should be active at a time.

---

# 7. Visitor Session

When the widget loads

- Create Visitor Session
- Generate Visitor Token
- Restore Previous Conversation (if available)
- Establish Socket Connection

The visitor should not be required to log in.

---

# 8. Initial Greeting

The greeting should come from the Knowledge Base.

Example

```
Hello 👋

How can I help you today?
```

Administrators should be able to change greetings without redeployment.

---

# 9. Conversation Flow

```
Visitor Message

↓

Validation

↓

Send to Backend

↓

AI Processing

↓

Receive Response

↓

Render Response
```

Messages should appear instantly with optimistic UI updates where appropriate.

---

# 10. Message Types

Supported types

```
TEXT

SYSTEM

AI

EXECUTIVE

IMAGE (Future)

FILE (Future)

LINK

QUICK_REPLY
```

The UI should render each message type appropriately.

---

# 11. Suggested Questions

The widget may display suggested questions.

Examples

- What services do you offer?
- What are your business hours?
- How do I contact support?
- I want to speak with someone.

Suggestions should be configurable.

---

# 12. Quick Replies

Quick replies provide predefined actions.

Examples

```
Book Appointment

Business Hours

Pricing

Talk to Human

Contact Us
```

Selecting a quick reply sends a normal chat message.

---

# 13. Typing Indicator

Display typing indicators for

- AI
- Executive

Events

```
chat:typing

chat:stop-typing
```

Typing indicators should disappear automatically after a timeout.

---

# 14. Read Receipts

Support

- Delivered
- Read

Future support

- Seen by Executive

---

# 15. Human Handoff

The widget should support seamless escalation.

Flow

```
Visitor

↓

AI

↓

Escalation

↓

Executive Assigned

↓

Executive Joins Chat

↓

Conversation Continues
```

Conversation history remains available.

---

# 16. Business Hours

When outside business hours

The widget should

- Inform the visitor
- Continue AI support
- Offer callback or ticket creation

Business hours come from the Settings module.

---

# 17. Offline Mode

If the backend is unavailable

The widget should

- Display connection status
- Retry automatically
- Preserve unsent messages
- Recover gracefully

---

# 18. Notifications

The widget may notify visitors about

- New Message
- Executive Joined
- Ticket Created
- Callback Confirmed

Notifications should not interrupt typing.

---

# 19. Theme Configuration

Configurable settings

- Primary Color
- Secondary Color
- Logo
- Widget Position
- Welcome Message
- Border Radius
- Font Family
- Avatar
- Dark Mode

Themes should be configurable through the Admin Dashboard.

---

# 20. Accessibility

The widget should support

- Keyboard Navigation
- Screen Readers
- Focus Management
- High Contrast
- Accessible Labels

Accessibility should comply with WCAG guidelines where practical.

---

# 21. Mobile Support

The widget must support

- Responsive Layout
- Touch Gestures
- Virtual Keyboard
- Small Screens
- Portrait Mode

The experience should remain consistent across devices.

---

# 22. Security

The widget must never expose

- API Keys
- JWT Secrets
- Internal IDs
- Administrative Endpoints

All requests must be validated by the backend.

---

# 23. Performance Goals

The widget should

- Load quickly
- Minimize bundle size
- Lazy load non-critical assets
- Reconnect automatically
- Cache static resources

Real-time interactions should feel immediate.

---

# 24. Future Enhancements

Planned features

- File Uploads
- Image Sharing
- Voice Messages
- Video Calls
- Screen Sharing
- Emoji Picker
- Rich Cards
- Carousel Messages
- AI Suggestions
- Co-browsing

These should integrate without changing the core widget architecture.

---

# 25. Implementation Rules

- The widget is responsible only for presentation and interaction.
- Business logic belongs in backend services.
- All communication uses documented REST APIs and Socket events.
- Configuration should come from the backend.
- The widget should remain framework-independent wherever possible.
- New UI features should not require changes to the AI Engine.

# Chat Widget Improvements

The website chat widget must remain lightweight, responsive, and independent from the Admin and Executive portals.

## Functional Requirements

The widget shall support:

* Start a new conversation.
* Continue an existing conversation.
* Display AI responses.
* Display executive responses.
* Show typing indicators.
* Show connection status.
* Display loading states.
* Display friendly error messages.
* Allow visitors to end the chat.
* Automatically restore conversations after reconnecting.
* Reset the session after the conversation has ended.

## End Chat

Visitors must be able to manually end the conversation.

When the visitor selects **End Chat**, the system shall:

1. Confirm the action.
2. Generate the AI conversation summary.
3. Save the complete conversation.
4. Update analytics.
5. Close the conversation.
6. Clear the current session.
7. Reset the widget to its initial state.

## Mobile Experience

The widget must be fully responsive and optimized for desktop, tablet, and mobile devices.

## User Experience

The widget should provide:

* Smooth scrolling
* Better spacing
* Message timestamps
* Typing indicators
* Loading indicators
* Error handling
* Accessible controls
* Modern Material UI styling