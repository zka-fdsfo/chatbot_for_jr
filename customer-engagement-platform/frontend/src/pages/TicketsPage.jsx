import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ticketService from '../services/ticketService';
import useNotification from '../hooks/useNotification';
import { ROUTES } from '../constants/routes';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_SOURCES,
  PRIORITY_COLOR,
  STATUS_COLOR,
} from '../features/tickets/constants/tickets';

const EMPTY_FORM = {
  subject: '',
  description: '',
  category: 'GENERAL',
  priority: 'MEDIUM',
  source: 'EXECUTIVE',
};

function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { notify } = useNotification();

  const refresh = () => {
    ticketService
      .search({ status: statusFilter || undefined, priority: priorityFilter || undefined, limit: 100 })
      .then((result) => setTickets(result.data.tickets));
  };

  useEffect(refresh, [statusFilter, priorityFilter]);

  const handleCreate = async () => {
    try {
      const result = await ticketService.create(form);
      notify(`Ticket ${result.ticket.ticketNumber} created.`, { severity: 'success' });
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to create ticket.', { severity: 'error' });
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Tickets</Typography>
        <Button variant="contained" onClick={() => setIsCreateOpen(true)}>
          New Ticket
        </Button>
      </Stack>

      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {TICKET_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {TICKET_PRIORITIES.map((priority) => (
              <MenuItem key={priority} value={priority}>
                {priority}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket._id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`${ROUTES.TICKETS}/${ticket._id}`)}
              >
                <TableCell>{ticket.ticketNumber}</TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{ticket.category}</TableCell>
                <TableCell>
                  <Chip size="small" label={ticket.priority} color={PRIORITY_COLOR[ticket.priority]} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={ticket.status} color={STATUS_COLOR[ticket.status]} />
                </TableCell>
                <TableCell>{ticket.assignedExecutiveId?.name ?? 'Unassigned'}</TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    No tickets found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Subject"
              size="small"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <TextField
              label="Description"
              size="small"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <FormControl size="small">
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {TICKET_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {TICKET_PRIORITIES.map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Source</InputLabel>
              <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {TICKET_SOURCES.map((source) => (
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

export default TicketsPage;
