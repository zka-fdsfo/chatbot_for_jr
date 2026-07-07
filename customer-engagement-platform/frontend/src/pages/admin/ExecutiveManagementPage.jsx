import { useEffect, useState } from 'react';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import executiveService from '../../services/executiveService';
import useNotification from '../../hooks/useNotification';

const EMPTY_CREATE_FORM = { name: '', email: '', password: '', department: '', maxChats: 5 };

function ExecutiveManagementPage() {
  const [executives, setExecutives] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editingExecutive, setEditingExecutive] = useState(null);
  const [editForm, setEditForm] = useState({ department: '', maxChats: 5 });
  const [resetPasswordFor, setResetPasswordFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const { notify } = useNotification();

  const refresh = () => {
    executiveService.list({ limit: 100 }).then((result) => setExecutives(result.data.executives));
  };

  useEffect(refresh, []);

  const handleCreate = async () => {
    try {
      await executiveService.create({
        ...createForm,
        maxChats: Number(createForm.maxChats),
        department: createForm.department || undefined,
      });
      notify('Executive created.', { severity: 'success' });
      setIsCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to create executive.', { severity: 'error' });
    }
  };

  const openEdit = (executive) => {
    setEditingExecutive(executive);
    setEditForm({ department: executive.department ?? '', maxChats: executive.maxChats });
  };

  const handleUpdate = async () => {
    try {
      await executiveService.update(editingExecutive._id, {
        department: editForm.department || null,
        maxChats: Number(editForm.maxChats),
      });
      notify('Executive updated.', { severity: 'success' });
      setEditingExecutive(null);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to update executive.', { severity: 'error' });
    }
  };

  const handleToggleActive = async (executive) => {
    const isActive = executive.userId?.isActive;
    if (isActive) {
      await executiveService.deactivate(executive._id);
      notify('Executive deactivated.', { severity: 'success' });
    } else {
      await executiveService.activate(executive._id);
      notify('Executive activated.', { severity: 'success' });
    }
    refresh();
  };

  const handleResetPassword = async () => {
    try {
      await executiveService.resetPassword(resetPasswordFor._id, newPassword);
      notify('Password reset.', { severity: 'success' });
      setResetPasswordFor(null);
      setNewPassword('');
    } catch (error) {
      notify(error.message ?? 'Failed to reset password.', { severity: 'error' });
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Executive Management</Typography>
        <Button variant="contained" onClick={() => setIsCreateOpen(true)}>
          New Executive
        </Button>
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Presence</TableCell>
              <TableCell>Chats</TableCell>
              <TableCell>Account</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {executives.map((executive) => (
              <TableRow key={executive._id}>
                <TableCell>{executive.userId?.name}</TableCell>
                <TableCell>{executive.userId?.email}</TableCell>
                <TableCell>{executive.department ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={executive.status} />
                </TableCell>
                <TableCell>
                  {executive.currentChats}/{executive.maxChats}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={executive.userId?.isActive ? 'ACTIVE' : 'INACTIVE'}
                    color={executive.userId?.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(executive)}>
                    Edit
                  </Button>
                  <Button size="small" onClick={() => handleToggleActive(executive)}>
                    {executive.userId?.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="small" onClick={() => setResetPasswordFor(executive)}>
                    Reset Password
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Executive</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              size="small"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
            <TextField
              label="Email"
              size="small"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <TextField
              label="Temporary Password"
              size="small"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
            <TextField
              label="Department"
              size="small"
              value={createForm.department}
              onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
            />
            <TextField
              label="Max Chats"
              size="small"
              type="number"
              value={createForm.maxChats}
              onChange={(e) => setCreateForm({ ...createForm, maxChats: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingExecutive)} onClose={() => setEditingExecutive(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Executive</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Department"
              size="small"
              value={editForm.department}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            />
            <TextField
              label="Max Chats"
              size="small"
              type="number"
              value={editForm.maxChats}
              onChange={(e) => setEditForm({ ...editForm, maxChats: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExecutive(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetPasswordFor)} onClose={() => setResetPasswordFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password — {resetPasswordFor?.userId?.name}</DialogTitle>
        <DialogContent>
          <TextField
            label="New Password"
            size="small"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword}>
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default ExecutiveManagementPage;
