import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import leadService from '../services/leadService';
import executiveService from '../services/executiveService';
import useNotification from '../hooks/useNotification';
import { VALID_STATUS_TRANSITIONS, SCORE_COLOR, STATUS_COLOR } from '../features/leads/constants/leads';

function LeadDetailPage() {
  const { id } = useParams();
  const { notify } = useNotification();

  const [lead, setLead] = useState(null);
  const [executives, setExecutives] = useState([]);
  const [context, setContext] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({ scheduledAt: '', notes: '' });
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const refreshLead = () => {
    leadService.getById(id).then((result) => {
      setLead(result.lead);
      setFollowUpForm({
        scheduledAt: result.lead.followUp?.scheduledAt?.slice(0, 16) ?? '',
        notes: result.lead.followUp?.notes ?? '',
      });
    });
  };

  useEffect(refreshLead, [id]);

  useEffect(() => {
    executiveService.list({ limit: 100 }).then((result) => setExecutives(result.data.executives));
  }, []);

  useEffect(() => {
    if (!lead?.conversationId) return;
    leadService.getContext(id).then((result) => setContext(result.context));
  }, [id, lead?.conversationId]);

  const handleStatusChange = async (event) => {
    try {
      const result = await leadService.updateStatus(id, event.target.value);
      setLead(result.lead);
    } catch (error) {
      notify(error.message ?? 'Failed to update status.', { severity: 'error' });
    }
  };

  const handleAssign = async (event) => {
    try {
      const result = await leadService.assign(id, event.target.value);
      setLead(result.lead);
    } catch (error) {
      notify(error.message ?? 'Failed to assign lead.', { severity: 'error' });
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const result = await leadService.generateSummary(id);
      setLead(result.lead);
    } catch (error) {
      notify(error.message ?? 'Failed to generate summary.', { severity: 'error' });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveFollowUp = async () => {
    try {
      const result = await leadService.scheduleFollowUp(id, {
        scheduledAt: followUpForm.scheduledAt ? new Date(followUpForm.scheduledAt).toISOString() : null,
        notes: followUpForm.notes,
      });
      setLead(result.lead);
      notify('Follow-up saved.', { severity: 'success' });
    } catch (error) {
      notify(error.message ?? 'Failed to save follow-up.', { severity: 'error' });
    }
  };

  const handleConvert = async () => {
    try {
      const result = await leadService.convert(id);
      setLead(result.lead);
      notify('Lead marked as converted.', { severity: 'success' });
    } catch (error) {
      notify(error.message ?? 'Failed to convert lead.', { severity: 'error' });
    }
  };

  const handleMarkLost = async () => {
    try {
      const result = await leadService.markLost(id, lostReason);
      setLead(result.lead);
      setIsLostDialogOpen(false);
      setLostReason('');
    } catch (error) {
      notify(error.message ?? 'Failed to mark lead as lost.', { severity: 'error' });
    }
  };

  if (!lead) return null;

  const nextStatuses = VALID_STATUS_TRANSITIONS[lead.status] ?? [];
  const canConvert = nextStatuses.includes('CONVERTED');
  const canMarkLost = nextStatuses.includes('LOST');

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">{lead.name ?? 'Unnamed Lead'}</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={lead.leadScore} color={SCORE_COLOR[lead.leadScore]} />
          <Chip label={lead.status} color={STATUS_COLOR[lead.status]} />
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={4}>
            <Typography variant="body2">Email: {lead.email ?? '—'}</Typography>
            <Typography variant="body2">Phone: {lead.phone ?? '—'}</Typography>
            <Typography variant="body2">Company: {lead.company ?? '—'}</Typography>
          </Stack>
          <Typography variant="body2">
            Interested Services: {lead.interestedServices.join(', ') || 'None'}
          </Typography>

          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={lead.status} onChange={handleStatusChange}>
                <MenuItem value={lead.status}>{lead.status} (current)</MenuItem>
                {nextStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Assigned Executive</InputLabel>
              <Select
                label="Assigned Executive"
                value={lead.assignedExecutiveId?._id ?? ''}
                onChange={handleAssign}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Unassigned
                </MenuItem>
                {executives.map((executive) => (
                  <MenuItem key={executive._id} value={executive.userId?._id}>
                    {executive.userId?.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="success" disabled={!canConvert} onClick={handleConvert}>
              Mark Converted
            </Button>
            <Button variant="outlined" color="error" disabled={!canMarkLost} onClick={() => setIsLostDialogOpen(true)}>
              Mark Lost
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">AI Qualification Summary</Typography>
            <Button size="small" variant="outlined" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
              {isGeneratingSummary ? 'Generating…' : 'Generate'}
            </Button>
          </Stack>
          {lead.aiSummary?.summary ? (
            <Stack spacing={1}>
              <Typography variant="body2">{lead.aiSummary.summary}</Typography>
              <Typography variant="body2">
                <strong>Visitor intent:</strong> {lead.aiSummary.visitorIntent}
              </Typography>
              <Typography variant="body2">
                <strong>Recommended follow-up:</strong> {lead.aiSummary.recommendedFollowUp ?? '—'}
              </Typography>
              <Chip size="small" label={`Confidence: ${lead.aiSummary.confidenceLevel}`} sx={{ alignSelf: 'flex-start' }} />
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No summary generated yet.
            </Typography>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Follow-up
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Scheduled At"
              type="datetime-local"
              size="small"
              value={followUpForm.scheduledAt}
              onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledAt: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Notes"
              size="small"
              multiline
              minRows={2}
              value={followUpForm.notes}
              onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
            />
            {lead.followUp?.outcome && (
              <Typography variant="body2" color="text.secondary">
                Outcome: {lead.followUp.outcome}
              </Typography>
            )}
            <Button variant="outlined" onClick={handleSaveFollowUp} sx={{ alignSelf: 'flex-start' }}>
              Save Follow-up
            </Button>
          </Stack>
        </Paper>
      </Box>

      {lead.conversationId && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Conversation Context
          </Typography>
          {!context ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {context.ticket && (
                <Typography variant="body2">
                  Linked ticket: {context.ticket.ticketNumber} ({context.ticket.status})
                </Typography>
              )}
              {context.messages.length > 0 && (
                <>
                  <Divider />
                  <Stack spacing={0.5} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                    {context.messages.map((message) => (
                      <Typography key={message._id} variant="body2">
                        <strong>{message.senderType}:</strong> {message.message}
                      </Typography>
                    ))}
                  </Stack>
                </>
              )}
              {!context.conversation && (
                <Typography variant="body2" color="text.secondary">
                  No linked conversation found.
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
      )}

      <Dialog open={isLostDialogOpen} onClose={() => setIsLostDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Lead as Lost</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLostDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleMarkLost}>
            Mark Lost
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default LeadDetailPage;
