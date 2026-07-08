import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// "Fix visitor information collection" — a small, optional, non-blocking
// form. Skipping it (or dismissing it) never blocks the visitor from
// chatting; it just means their name stays unknown to staff/tickets.
function VisitorInfoForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (isDismissed) return null;

  const handleSave = async () => {
    if (!name.trim() && !email.trim()) {
      setIsDismissed(true);
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({ name: name.trim() || undefined, email: email.trim() || undefined });
    } finally {
      setIsSaving(false);
      setIsDismissed(true);
    }
  };

  return (
    <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Mind sharing your name so we can help you better?
      </Typography>
      <Stack spacing={1}>
        <TextField
          size="small"
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          fullWidth
        />
        <TextField
          size="small"
          label="Email (optional)"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          fullWidth
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button size="small" onClick={() => setIsDismissed(true)} disabled={isSaving}>
            Skip
          </Button>
          <Button size="small" variant="contained" onClick={handleSave} disabled={isSaving}>
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default VisitorInfoForm;
