export const KNOWLEDGE_CATEGORIES = [
  'COMPANY',
  'SERVICES',
  'FAQS',
  'LOCATIONS',
  'CONTACT_INFORMATION',
  'BUSINESS_HOURS',
  'PRICING',
  'POLICIES',
  'PRIVACY_POLICY',
  'TERMS_AND_CONDITIONS',
  'DEPARTMENTS',
  'EXECUTIVES',
  'LEAD_COLLECTION',
  'GREETING_MESSAGES',
  'ESCALATION_RULES',
  'CHATBOT_SETTINGS',
];

export const KNOWLEDGE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
};

export const PROMPT_TYPES = ['SYSTEM', 'DEVELOPER', 'LEAD', 'SUMMARY', 'ESCALATION', 'FALLBACK'];

export const PROMPT_TYPE_LABELS = {
  SYSTEM: 'System Prompt',
  DEVELOPER: 'Developer Prompt',
  LEAD: 'Lead Prompt',
  SUMMARY: 'Summary Prompt',
  ESCALATION: 'Escalation Prompt',
  FALLBACK: 'Fallback Prompt',
};

export const RESPONSE_LENGTH_OPTIONS = ['SHORT', 'MEDIUM', 'LONG'];

export const WIDGET_THEME_OPTIONS = ['LIGHT', 'DARK'];

export const WIDGET_POSITION_OPTIONS = ['BOTTOM_RIGHT', 'BOTTOM_LEFT'];

export const EXECUTIVE_STATUS_OPTIONS = ['ONLINE', 'OFFLINE', 'BUSY', 'AWAY', 'BREAK'];

export const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const HOLIDAY_TYPES = ['PUBLIC', 'COMPANY', 'EMERGENCY'];

export const BUSINESS_STATUS_COLOR = {
  OPEN: 'success',
  OPENING_SOON: 'info',
  CLOSING_SOON: 'warning',
  CLOSED: 'default',
  HOLIDAY: 'warning',
};

export const ANALYTICS_DATE_RANGES = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
  { value: 'THIS_MONTH', label: 'This Month' },
];
