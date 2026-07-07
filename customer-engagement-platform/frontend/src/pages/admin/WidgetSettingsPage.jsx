import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import settingsService from '../../services/settingsService';
import useNotification from '../../hooks/useNotification';
import { WIDGET_THEME_OPTIONS, WIDGET_POSITION_OPTIONS } from '../../features/admin-portal/constants/adminPortal';

const TOGGLE_LABELS = {
  typingIndicatorEnabled: 'Typing Indicator',
  soundNotificationsEnabled: 'Sound Notifications',
  quickRepliesEnabled: 'Quick Replies',
  humanHandoffEnabled: 'Human Handoff (not yet wired to widget behavior)',
};

function WidgetSettingsPage() {
  const [form, setForm] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    settingsService.getWidgetSettings().then((result) => setForm(result.settings));
  }, []);

  const handleToggle = (key) => (event) => {
    setForm({ ...form, featureToggles: { ...form.featureToggles, [key]: event.target.checked } });
  };

  const handleSave = async () => {
    try {
      const result = await settingsService.updateWidgetSettings({
        brandLogoUrl: form.brandLogoUrl || null,
        primaryColor: form.primaryColor,
        theme: form.theme,
        position: form.position,
        welcomeMessage: form.welcomeMessage,
        suggestedQuestions: form.suggestedQuestions,
        offlineMessage: form.offlineMessage,
        featureToggles: form.featureToggles,
      });
      setForm(result.settings);
      notify('Widget settings saved.', { severity: 'success' });
    } catch (error) {
      notify(error.message ?? 'Failed to save widget settings.', { severity: 'error' });
    }
  };

  if (!form) return null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Widget Settings</Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={3}>
          <TextField
            label="Brand Logo URL"
            value={form.brandLogoUrl ?? ''}
            onChange={(e) => setForm({ ...form, brandLogoUrl: e.target.value })}
            size="small"
            helperText="A hosted image URL — file upload isn't supported yet."
          />

          <TextField
            label="Primary Color"
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            size="small"
            type="color"
            sx={{ width: 120 }}
          />

          <FormControl size="small">
            <InputLabel>Theme</InputLabel>
            <Select label="Theme" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              {WIDGET_THEME_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Widget Position</InputLabel>
            <Select
              label="Widget Position"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            >
              {WIDGET_POSITION_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Welcome Message"
            value={form.welcomeMessage}
            onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
            size="small"
          />

          <TextField
            label="Suggested Questions (one per line)"
            multiline
            minRows={3}
            value={form.suggestedQuestions.join('\n')}
            onChange={(e) =>
              setForm({ ...form, suggestedQuestions: e.target.value.split('\n').filter(Boolean) })
            }
            size="small"
          />

          <TextField
            label="Offline Message"
            value={form.offlineMessage}
            onChange={(e) => setForm({ ...form, offlineMessage: e.target.value })}
            size="small"
          />

          <Divider />

          <Typography variant="subtitle2">Feature Toggles</Typography>
          {Object.keys(form.featureToggles).map((key) => (
            <FormControlLabel
              key={key}
              control={<Switch checked={form.featureToggles[key]} onChange={handleToggle(key)} />}
              label={TOGGLE_LABELS[key] ?? key}
            />
          ))}

          <Button variant="contained" onClick={handleSave} sx={{ alignSelf: 'flex-start' }}>
            Save Widget Settings
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default WidgetSettingsPage;
