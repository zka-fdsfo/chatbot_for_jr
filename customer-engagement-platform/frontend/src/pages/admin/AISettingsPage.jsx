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
import Slider from '@mui/material/Slider';
import settingsService from '../../services/settingsService';
import useNotification from '../../hooks/useNotification';
import { RESPONSE_LENGTH_OPTIONS } from '../../features/admin-portal/constants/adminPortal';

function AISettingsPage() {
  const [form, setForm] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    settingsService.getAISettings().then((result) => setForm(result.settings));
  }, []);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleSave = async () => {
    try {
      const result = await settingsService.updateAISettings({
        provider: form.provider,
        model: form.model,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        responseLength: form.responseLength,
        confidenceThreshold: form.confidenceThreshold,
        escalationRules: form.escalationRules,
      });
      setForm(result.settings);
      notify('AI settings saved.', { severity: 'success' });
    } catch (error) {
      notify(error.message ?? 'Failed to save AI settings.', { severity: 'error' });
    }
  };

  if (!form) return null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">AI Settings</Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={3}>
          <FormControl size="small">
            <InputLabel>Provider</InputLabel>
            <Select label="Provider" value={form.provider} onChange={handleChange('provider')}>
              <MenuItem value="groq">Groq</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Active Model" value={form.model} onChange={handleChange('model')} size="small" />

          <Stack>
            <Typography gutterBottom>Temperature: {form.temperature}</Typography>
            <Slider
              value={form.temperature}
              onChange={(_e, value) => setForm({ ...form, temperature: value })}
              min={0}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Stack>

          <TextField
            label="Max Tokens"
            type="number"
            value={form.maxTokens}
            onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
            size="small"
          />

          <FormControl size="small">
            <InputLabel>Response Length</InputLabel>
            <Select label="Response Length" value={form.responseLength} onChange={handleChange('responseLength')}>
              {RESPONSE_LENGTH_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack>
            <Typography gutterBottom>Confidence Threshold: {form.confidenceThreshold}</Typography>
            <Slider
              value={form.confidenceThreshold}
              onChange={(_e, value) => setForm({ ...form, confidenceThreshold: value })}
              min={0}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
            />
          </Stack>

          <TextField
            label="Escalation Rules (one per line)"
            multiline
            minRows={3}
            value={form.escalationRules.join('\n')}
            onChange={(e) =>
              setForm({ ...form, escalationRules: e.target.value.split('\n').filter(Boolean) })
            }
            size="small"
          />

          <Typography variant="caption" color="text.secondary">
            Response Length, Confidence Threshold, and Escalation Rules are stored but not yet consumed by
            the AI Engine — no response-length post-processing, confidence scoring, or Escalation Detection
            exists yet.
          </Typography>

          <Button variant="contained" onClick={handleSave} sx={{ alignSelf: 'flex-start' }}>
            Save AI Settings
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default AISettingsPage;
