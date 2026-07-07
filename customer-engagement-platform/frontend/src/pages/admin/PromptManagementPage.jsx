import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import promptService from '../../services/promptService';
import useNotification from '../../hooks/useNotification';
import { PROMPT_TYPES, PROMPT_TYPE_LABELS } from '../../features/admin-portal/constants/adminPortal';

function PromptManagementPage() {
  const [activeType, setActiveType] = useState(PROMPT_TYPES[0]);
  const [prompt, setPrompt] = useState(null);
  const [content, setContent] = useState('');
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const { notify } = useNotification();

  useEffect(() => {
    promptService.getByType(activeType).then((result) => {
      setPrompt(result.prompt);
      setContent(result.prompt.content);
    });
  }, [activeType]);

  const handleSave = async () => {
    try {
      const result = await promptService.update(activeType, content);
      setPrompt(result.prompt);
      notify('Prompt saved as a draft.', { severity: 'success' });
    } catch (error) {
      notify(error.message ?? 'Failed to save prompt.', { severity: 'error' });
    }
  };

  const handlePublish = async () => {
    const result = await promptService.publish(activeType);
    setPrompt(result.prompt);
    notify('Prompt published.', { severity: 'success' });
  };

  const openVersions = async () => {
    const result = await promptService.listVersions(activeType);
    setVersions(result.versions);
    setIsVersionsOpen(true);
  };

  const handleRestore = async (version) => {
    const result = await promptService.restoreVersion(activeType, version);
    setPrompt(result.prompt);
    setContent(result.prompt.content);
    setIsVersionsOpen(false);
    notify(`Restored version ${version}.`, { severity: 'success' });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Prompt Management</Typography>

      <Tabs value={activeType} onChange={(_e, value) => setActiveType(value)} variant="scrollable">
        {PROMPT_TYPES.map((type) => (
          <Tab key={type} value={type} label={PROMPT_TYPE_LABELS[type]} />
        ))}
      </Tabs>

      {prompt && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Chip
              size="small"
              label={`${prompt.status} · v${prompt.version}`}
              color={prompt.status === 'PUBLISHED' ? 'success' : 'default'}
            />
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={openVersions}>
                Version History
              </Button>
              <Button size="small" variant="outlined" onClick={handleSave}>
                Save Draft
              </Button>
              <Button size="small" variant="contained" onClick={handlePublish}>
                Publish
              </Button>
            </Stack>
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="No content configured for this prompt type yet."
          />
        </Paper>
      )}

      <Dialog open={isVersionsOpen} onClose={() => setIsVersionsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Version History — {PROMPT_TYPE_LABELS[activeType]}</DialogTitle>
        <DialogContent>
          <List>
            {versions.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No prior versions.
              </Typography>
            )}
            {versions.map((v) => (
              <ListItem
                key={v.version}
                secondaryAction={
                  <Button size="small" onClick={() => handleRestore(v.version)}>
                    Restore
                  </Button>
                }
              >
                <ListItemText
                  primary={`Version ${v.version}`}
                  secondary={v.content.slice(0, 120) + (v.content.length > 120 ? '…' : '')}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsVersionsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default PromptManagementPage;
