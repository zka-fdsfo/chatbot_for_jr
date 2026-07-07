import { useContext } from 'react';
import WidgetSettingsContext from '../contexts/widgetSettingsContext';

export default function useWidgetSettings() {
  const context = useContext(WidgetSettingsContext);

  if (!context) {
    throw new Error('useWidgetSettings must be used within a WidgetSettingsProvider');
  }

  return context;
}
