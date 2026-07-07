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
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import knowledgeService from '../../services/knowledgeService';
import useNotification from '../../hooks/useNotification';
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_STATUS } from '../../features/admin-portal/constants/adminPortal';

const STATUS_COLOR = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
};

const EMPTY_FORM = { category: KNOWLEDGE_CATEGORIES[0], title: '', slug: '', content: '{}', keywords: '' };

function KnowledgeManagementPage() {
  const [documents, setDocuments] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [versionsFor, setVersionsFor] = useState(null);
  const [versions, setVersions] = useState([]);
  const { notify } = useNotification();

  const refresh = () => {
    knowledgeService
      .search({ category: filterCategory || undefined, status: filterStatus || undefined, limit: 100 })
      .then((result) => setDocuments(result.data.knowledge));
  };

  useEffect(refresh, [filterCategory, filterStatus]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (doc) => {
    setEditingId(doc._id);
    setForm({
      category: doc.category,
      title: doc.title,
      slug: doc.slug,
      content: JSON.stringify(doc.content, null, 2),
      keywords: doc.keywords.join(', '),
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    let parsedContent;
    try {
      parsedContent = JSON.parse(form.content || '{}');
    } catch {
      notify('Content must be valid JSON.', { severity: 'error' });
      return;
    }

    const payload = {
      category: form.category,
      title: form.title,
      slug: form.slug,
      content: parsedContent,
      keywords: form.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await knowledgeService.update(editingId, payload);
        notify('Knowledge document updated.', { severity: 'success' });
      } else {
        await knowledgeService.create(payload);
        notify('Knowledge document created.', { severity: 'success' });
      }
      setIsFormOpen(false);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to save document.', { severity: 'error' });
    }
  };

  const handlePublish = async (id) => {
    await knowledgeService.publish(id);
    notify('Document published.', { severity: 'success' });
    refresh();
  };

  const handleArchive = async (id) => {
    await knowledgeService.archive(id);
    notify('Document archived.', { severity: 'success' });
    refresh();
  };

  const openVersions = async (id) => {
    const result = await knowledgeService.listVersions(id);
    setVersions(result.versions);
    setVersionsFor(id);
  };

  const handleRestore = async (version) => {
    await knowledgeService.restoreVersion(versionsFor, version);
    notify(`Restored version ${version}.`, { severity: 'success' });
    setVersionsFor(null);
    refresh();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Knowledge Management</Typography>
        <Button variant="contained" onClick={openCreateForm}>
          New Document
        </Button>
      </Stack>

      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {KNOWLEDGE_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {Object.values(KNOWLEDGE_STATUS).map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Version</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc._id}>
                <TableCell>{doc.title}</TableCell>
                <TableCell>{doc.category}</TableCell>
                <TableCell>
                  <Chip size="small" label={doc.status} color={STATUS_COLOR[doc.status]} />
                </TableCell>
                <TableCell>{doc.version}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEditForm(doc)}>
                    Edit
                  </Button>
                  <Button size="small" onClick={() => openVersions(doc._id)}>
                    Versions
                  </Button>
                  {doc.status !== KNOWLEDGE_STATUS.PUBLISHED && (
                    <Button size="small" onClick={() => handlePublish(doc._id)}>
                      Publish
                    </Button>
                  )}
                  {doc.status !== KNOWLEDGE_STATUS.ARCHIVED && (
                    <Button size="small" color="warning" onClick={() => handleArchive(doc._id)}>
                      Archive
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Knowledge Document' : 'New Knowledge Document'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl size="small">
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {KNOWLEDGE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              size="small"
            />
            <TextField
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              size="small"
              disabled={Boolean(editingId)}
              helperText="lowercase-with-hyphens"
            />
            <TextField
              label="Content (JSON)"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              multiline
              minRows={4}
              size="small"
            />
            <TextField
              label="Keywords (comma-separated)"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(versionsFor)} onClose={() => setVersionsFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Version History</DialogTitle>
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
                <ListItemText primary={`Version ${v.version} — ${v.title}`} secondary={v.status} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default KnowledgeManagementPage;
