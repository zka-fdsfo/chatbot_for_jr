const mongoose = require('mongoose');
const { WIDGET_THEME, WIDGET_POSITION } = require('../constants/settings');

const widgetSettingsSchema = new mongoose.Schema(
  {
    brandLogoUrl: {
      type: String,
      default: null,
      trim: true,
    },
    primaryColor: {
      type: String,
      default: '#1976d2',
      trim: true,
    },
    theme: {
      type: String,
      enum: Object.values(WIDGET_THEME),
      default: WIDGET_THEME.LIGHT,
    },
    position: {
      type: String,
      enum: Object.values(WIDGET_POSITION),
      default: WIDGET_POSITION.BOTTOM_RIGHT,
    },
    welcomeMessage: {
      type: String,
      default: 'Hello 👋 How can I help you today?',
      trim: true,
    },
    suggestedQuestions: {
      type: [String],
      default: [
        'What services do you offer?',
        'What are your business hours?',
        'How do I contact support?',
        'I want to speak with someone.',
      ],
    },
    offlineMessage: {
      type: String,
      default: "You're offline. Reconnecting…",
      trim: true,
    },
    featureToggles: {
      typingIndicatorEnabled: { type: Boolean, default: true },
      soundNotificationsEnabled: { type: Boolean, default: true },
      quickRepliesEnabled: { type: Boolean, default: true },
      humanHandoffEnabled: { type: Boolean, default: true },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

// Singleton document — only one Widget Settings record should ever exist.
// Publicly readable (the anonymous Chat Widget needs it), only ADMINs write.
const WidgetSettings = mongoose.model('WidgetSettings', widgetSettingsSchema, 'widget_settings');

module.exports = WidgetSettings;
