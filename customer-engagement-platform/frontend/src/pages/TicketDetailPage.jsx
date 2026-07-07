import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import ticketService from '../services/ticketService';
import executiveService from '../services/executiveService';
import useAuth from '../hooks/useAuth';
import useNotification from '../hooks/useNotification';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';
import { VALID_STATUS_TRANSITIONS, PRIORITY_COLOR, STATUS_COLOR } from '../features/tickets/constants/tickets';

function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();

  const [ticket, setTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [audit, setAudit] = useState([]);
  const [context, setContext] = useState(null);
  const [executives, setExecutives] = useState([]);
  const [draftNote, setDraftNote] = useState('');

  const refreshTicket = () => {
    ticketService.getById(id).then((result) => setTicket(result.ticket));
    ticketService.listNotes(id).then((result) => setNotes(result.notes));
    ticketService.listAudit(id).then((result) => setAudit(result.audit));
  };

  useEffect(refreshTicket, [id]);

  useEffect(() => {
    executiveService.list({ limit: 100 }).then((result) => setExecutives(result.data.executives));
  }, []);

  useEffect(() => {
    if (!ticket?.conversationId && !ticket?.visitorId) return;
    ticketService.getContext(id).then((result) => setContext(result.context));
  }, [id, ticket?.conversationId, ticket?.visitorId]);

  const handleStatusChange = async (event) => {
    try {
      const result = await ticketService.updateStatus(id, event.target.value);
      setTicket(result.ticket);
      refreshTicket();
    } catch (error) {
      notify(error.message ?? 'Failed to update status.', { severity: 'error' });
    }
  };

  const handleAssign = async (event) => {
    try {
      const result = await ticketService.assign(id, event.target.value);
      setTicket(result.ticket);
      refreshTicket();
    } catch (error) {
      notify(error.message ?? 'Failed to assign ticket.', { severity: 'error' });
    }
  };

  const handleAddNote = async () => {
    if (!draftNote.trim()) return;
    try {
      await ticketService.addNote(id, draftNote);
      setDraftNote('');
      refreshTicket();
    } catch (error) {
      notify(error.message ?? 'Failed to add note.', { severity: 'error' });
    }
  };

  const handleDelete = async () => {
    await ticketService.softDelete(id);
    notify('Ticket deleted.', { severity: 'success' });
    navigate(ROUTES.TICKETS);
  };

  if (!ticket) return null;

  const nextStatuses = VALID_STATUS_TRANSITIONS[ticket.status] ?? [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">
          {ticket.ticketNumber} — {ticket.subject}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={ticket.priority} color={PRIORITY_COLOR[ticket.priority]} />
          <Chip label={ticket.status} color={STATUS_COLOR[ticket.status]} />
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="body2">{ticket.description || 'No description provided.'}</Typography>

          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={ticket.status} onChange={handleStatusChange}>
                <MenuItem value={ticket.status}>{ticket.status} (current)</MenuItem>
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
                value={ticket.assignedExecutiveId?._id ?? ''}
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

          {user?.role === ROLES.ADMIN && (
            <Button size="small" color="error" variant="outlined" onClick={handleDelete} sx={{ alignSelf: 'flex-start' }}>
              Delete Ticket
            </Button>
          )}
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Internal Notes
          </Typography>
          <List dense>
            {notes.map((note) => (
              <ListItem key={note._id} disableGutters>
                <ListItemText
                  primary={note.content}
                  secondary={`${note.authorId?.name ?? 'Unknown'} · ${new Date(note.createdAt).toLocaleString()}`}
                />
              </ListItem>
            ))}
            {notes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No notes yet.
              </Typography>
            )}
          </List>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Add an internal note…"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
            <Button variant="outlined" onClick={handleAddNote}>
              Add
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Audit Trail
          </Typography>
          <List dense>
            {audit.map((entry) => (
              <ListItem key={entry._id} disableGutters>
                <ListItemText
                  primary={entry.action}
                  secondary={`${entry.performedBy?.name ?? 'Unknown'} · ${new Date(entry.createdAt).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      {(ticket.conversationId || ticket.visitorId) && (
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
              {context.visitor && (
                <Typography variant="body2">
                  Visitor: {context.visitor.name ?? 'Unknown'} ({context.visitor.email ?? 'no email'})
                </Typography>
              )}
              {context.summary && <Typography variant="body2">Summary: {context.summary.summary}</Typography>}
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
              {!context.conversation && !context.visitor && (
                <Typography variant="body2" color="text.secondary">
                  No linked conversation/visitor data found.
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}

export default TicketDetailPage;
