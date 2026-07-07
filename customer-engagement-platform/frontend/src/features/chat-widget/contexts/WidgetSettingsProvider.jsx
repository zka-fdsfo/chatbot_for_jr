import { useEffect, useState } from 'react';
import WidgetSettingsContext from './widgetSettingsContext';
import settingsService from '../../../services/settingsService';
import {
  DEFAULT_GREETING,
  SUGGESTED_QUESTIONS,
  OFFLINE_MESSAGE,
} from '../constants/chatWidget';

// These mirror the Widget Settings model's own defaults (backend
// `widgetSettingsModel.js`) — used until the real fetch resolves (or if it
// fails), so the widget is never blocked on Settings being reachable.
const FALLBACK_SETTINGS = {
  brandLogoUrl: null,
  primaryColor: '#1976d2',
  theme: 'LIGHT',
  position: 'BOTTOM_RIGHT',
  welcomeMessage: DEFAULT_GREETING,
  suggestedQuestions: SUGGESTED_QUESTIONS,
  offlineMessage: OFFLINE_MESSAGE,
  featureToggles: {
    typingIndicatorEnabled: true,
    soundNotificationsEnabled: true,
    quickRepliesEnabled: true,
    humanHandoffEnabled: true,
  },
};

function WidgetSettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);

  useEffect(() => {
    let isMounted = true;

    settingsService
      .getWidgetSettings()
      .then((result) => {
        if (isMounted) setSettings(result.settings);
      })
      .catch(() => {
        // Keep FALLBACK_SETTINGS — a widget that can't reach Settings should
        // still work, just with the built-in defaults.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return <WidgetSettingsContext.Provider value={settings}>{children}</WidgetSettingsContext.Provider>;
}

export default WidgetSettingsProvider;
