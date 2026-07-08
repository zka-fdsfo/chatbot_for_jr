import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import leadService from '../services/leadService';
import useNotification from '../hooks/useNotification';
import { ROUTES } from '../constants/routes';
import { LEAD_SCORES, LEAD_STATUSES, LEAD_SOURCES, SCORE_COLOR, STATUS_COLOR } from '../features/leads/constants/leads';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  interestedServices: '',
  leadScore: 'WARM',
  source: 'EXECUTIVE',
};

function LeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Arriving from Admin's "Find Leads" action on a specific conversation
  // (Admin Conversations page) pre-fills and opens this dialog directly.
  const [isDetectOpen, setIsDetectOpen] = useState(() => Boolean(location.state?.conversationId));
  const [detectConversationId, setDetectConversationId] = useState(() => location.state?.conversationId ?? '');
  const [suggestion, setSuggestion] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const { notify } = useNotification();

  const refresh = () => {
    leadService
      .search({ status: statusFilter || undefined, leadScore: scoreFilter || undefined, limit: 100 })
      .then((result) => setLeads(result.data.leads));
  };

  useEffect(refresh, [statusFilter, scoreFilter]);

  const openCreateForm = (prefill) => {
    setForm(prefill ?? EMPTY_FORM);
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        interestedServices: Array.isArray(form.interestedServices)
          ? form.interestedServices
          : form.interestedServices
              .split(',')
              .map((service) => service.trim())
              .filter(Boolean),
      };
      const result = await leadService.create(payload);
      notify(`Lead ${result.lead.name ?? ''} created.`, { severity: 'success' });
      setIsCreateOpen(false);
      setIsDetectOpen(false);
      setSuggestion(null);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to create lead.', { severity: 'error' });
    }
  };

  const handleDetect = async () => {
    if (!detectConversationId.trim()) return;
    setIsDetecting(true);
    try {
      const result = await leadService.detect(detectConversationId.trim());
      setSuggestion(result.suggestion);
    } catch (error) {
      notify(error.message ?? 'Lead detection failed.', { severity: 'error' });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUseSuggestion = () => {
    openCreateForm({
      name: suggestion.extractedInfo.name ?? '',
      email: suggestion.extractedInfo.email ?? '',
      phone: suggestion.extractedInfo.phone ?? '',
      company: suggestion.extractedInfo.company ?? '',
      interestedServices: suggestion.interestedServices,
      leadScore: suggestion.leadScore,
      source: 'AI_CONVERSATION',
      conversationId: detectConversationId.trim(),
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Leads</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setIsDetectOpen(true)}>
            Detect from Conversation
          </Button>
          <Button variant="contained" onClick={() => openCreateForm()}>
            New Lead
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {LEAD_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Score</InputLabel>
          <Select value={scoreFilter} label="Score" onChange={(e) => setScoreFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {LEAD_SCORES.map((score) => (
              <MenuItem key={score} value={score}>
                {score}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead._id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`${ROUTES.LEADS}/${lead._id}`)}
              >
                <TableCell>{lead.name ?? '—'}</TableCell>
                <TableCell>{lead.email ?? '—'}</TableCell>
                <TableCell>{lead.company ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={lead.leadScore} color={SCORE_COLOR[lead.leadScore]} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={lead.status} color={STATUS_COLOR[lead.status]} />
                </TableCell>
                <TableCell>{lead.assignedExecutiveId?.name ?? 'Unassigned'}</TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    No leads found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={isDetectOpen}
        onClose={() => {
          setIsDetectOpen(false);
          setSuggestion(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detect Lead from Conversation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Conversation ID"
              size="small"
              value={detectConversationId}
              onChange={(e) => setDetectConversationId(e.target.value)}
              helperText="The conversationId of the chat to analyze."
            />
            <Button variant="outlined" onClick={handleDetect} disabled={isDetecting}>
              {isDetecting ? 'Analyzing…' : 'Analyze'}
            </Button>

            {suggestion && (
              <>
                <Divider />
                <Typography variant="body2">
                  <strong>Qualified lead:</strong> {suggestion.isQualifiedLead ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2">
                  <strong>Score:</strong> {suggestion.leadScore} · <strong>Confidence:</strong>{' '}
                  {suggestion.confidenceLevel}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {suggestion.extractedInfo.name ?? '—'} ·{' '}
                  <strong>Email:</strong> {suggestion.extractedInfo.email ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Interested services:</strong>{' '}
                  {suggestion.interestedServices.join(', ') || 'None mentioned'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {suggestion.reasoning}
                </Typography>
                <Button variant="contained" onClick={handleUseSuggestion}>
                  Create Lead from This Suggestion
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsDetectOpen(false);
              setSuggestion(null);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Lead</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField
              label="Email"
              size="small"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Phone"
              size="small"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              label="Company"
              size="small"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <TextField
              label="Interested Services (comma-separated)"
              size="small"
              value={
                Array.isArray(form.interestedServices) ? form.interestedServices.join(', ') : form.interestedServices
              }
              onChange={(e) => setForm({ ...form, interestedServices: e.target.value })}
            />
            <FormControl size="small">
              <InputLabel>Lead Score</InputLabel>
              <Select
                label="Lead Score"
                value={form.leadScore}
                onChange={(e) => setForm({ ...form, leadScore: e.target.value })}
              >
                {LEAD_SCORES.map((score) => (
                  <MenuItem key={score} value={score}>
                    {score}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Source</InputLabel>
              <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {LEAD_SOURCES.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default LeadsPage;
