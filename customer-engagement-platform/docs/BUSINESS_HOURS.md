# Business Hours

# AI Customer Engagement Platform

## 1. Purpose

The Business Hours module manages company operating hours and determines when live support is available.

It is used throughout the platform to:

- Display business hours
- Determine executive availability
- Control AI handoff
- Schedule callbacks
- Handle holidays
- Support future appointment booking

Business Hours are a shared business service.

---

# 2. Design Goals

The Business Hours module must be

- Configurable
- Timezone Aware
- Extensible
- Reusable
- Accurate
- Holiday Aware

---

# 3. High-Level Architecture

```
Administrator

↓

Business Hours Service

↓

MongoDB

↓

AI Engine

↓

Chat Widget

↓

Executive Dashboard

↓

Ticket System
```

Every module uses the Business Hours Service instead of reading the database directly.

---

# 4. Weekly Schedule

Default schedule

```
Monday

Tuesday

Wednesday

Thursday

Friday

Saturday

Sunday
```

Each day can have independent operating hours.

---

# 5. Daily Configuration

Each day contains

- Enabled
- Opening Time
- Closing Time
- Breaks (Optional)

Example

```json
{
    "day": "MONDAY",
    "enabled": true,
    "open": "09:00",
    "close": "17:30"
}
```

---

# 6. Time Zone

Every schedule must include a timezone.

Example

```
Australia/Melbourne
```

All calculations should use the configured timezone.

The server timezone should never be assumed.

---

# 7. Business Status

Supported statuses

```
OPEN

CLOSED

OPENING_SOON

CLOSING_SOON

HOLIDAY
```

The status should be calculated automatically.

---

# 8. Holidays

Administrators can configure

- Public Holidays
- Company Holidays
- Emergency Closures

Holiday information overrides weekly schedules.

Example

```
Christmas

New Year

Company Retreat
```

---

# 9. Special Hours

Special schedules may be defined for

- Public Holidays
- Special Events
- Seasonal Hours

Special schedules override normal operating hours.

---

# 10. Availability Check

Business Hours Service exposes

```
Is Business Open?

↓

Yes

↓

Allow Human Handoff

-------------------

No

↓

Offer Ticket

↓

Offer Callback

↓

Continue AI Support
```

The AI should always use this service before offering live support.

---

# 11. Callback Scheduling

When the business is closed

Visitors may request

- Callback
- Follow-up
- Ticket

Callbacks should be scheduled within future business hours.

---

# 12. Executive Availability

Business Hours determine whether executives can receive new conversations.

Business hours do not override individual executive status.

Example

Business Open

↓

Executive Offline

↓

No Assignment

---

# 13. AI Integration

Before escalating

```
Business Open?

↓

Yes

↓

Find Executive

↓

Assign

-------------------

No

↓

Offer Callback

↓

Create Ticket
```

The AI must never promise immediate human assistance outside business hours.

---

# 14. Chat Widget Integration

The widget should display

- Online
- Offline
- Opening Soon
- Closing Soon

Offline greetings may differ from online greetings.

---

# 15. Ticket Integration

When closed

The AI should encourage

- Ticket Creation
- Callback Request

Instead of waiting for a live executive.

---

# 16. Lead Management Integration

Leads generated outside business hours

- Remain in queue
- Notify executives when business opens

Future versions may support automatic assignment.

---

# 17. Administration

Administrators can

- Configure weekly schedule
- Configure holidays
- Configure timezone
- Configure special hours
- Preview business status

Changes should apply immediately.

---

# 18. Validation Rules

Validation includes

- Opening time before closing time
- Valid timezone
- No overlapping special schedules
- Valid holiday dates

Invalid schedules cannot be saved.

---

# 19. Security

Only administrators may modify

- Business Hours
- Holidays
- Timezone
- Special Hours

Read access is available to all business modules.

---

# 20. Performance

Business status should be

- Cached
- Recalculated when required
- Fast to evaluate

Availability checks should not require expensive database queries.

---

# 21. Future Enhancements

Planned features

- Multiple Locations
- Department Hours
- Executive Working Hours
- Appointment Scheduling
- Calendar Integration
- Google Calendar Sync
- Outlook Calendar Sync
- Automatic Holiday Import

Future enhancements should not require changes to existing integrations.

---

# 22. Implementation Rules

- Business Hours are managed only through the Business Hours Service.
- All modules must use the service instead of querying the database directly.
- Holiday schedules override weekly schedules.
- Special schedules override normal schedules.
- Business status is calculated dynamically.
- The configured timezone must always be respected.
- The AI Engine should check business availability before any human handoff.