import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import conversationService from '../../services/conversationService';
import visitorService from '../../services/visitorService';
import TranscriptBubble from '../../components/TranscriptBubble';
import { ROUTES } from '../../constants/routes';

const STATUS_FILTERS = ['ALL', 'WAITING', 'ESCALATED', 'ACTIVE', 'RESOLVED', 'CLOSED', 'ARCHIVED'];

const STATUS_COLOR = {
  WAITING: 'default',
  ESCALATED: 'warning',
  ACTIVE: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
  ARCHIVED: 'default',
};

// "The admin should be able to view all chat histories, including AI
// conversations and support tickets, so that they can also be used for
// lead generation." Admin's GET /conversations is already unscoped (no
// assignedExecutiveId/scopeToUserId restriction — see
// conversationService.assertAccessible) so this needed no backend
// changes, only a page that was never built. A conversation with no
// assignedExecutiveId ever (still WAITING, or resolved by the AI without
// ever being claimed) is exactly an "AI-only" conversation.
function AdminConversationsPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visitorIdFilter, setVisitorIdFilter] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visitor, setVisitor] = useState(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  const fetchConversations = (params) => {
    conversationService
      .list({ limit: 100, ...params })
      .then((response) => {
        setConversations(response.data.conversations);
        setSelected(null);
      })
      .finally(() => setIsLoadingList(false));
  };

  useEffect(() => {
    const params = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (visitorIdFilter.trim()) params.visitorId = visitorIdFilter.trim();
    fetchConversations(params);
    // Only re-runs automatically on statusFilter — visitorIdFilter is
    // applied on demand via the Search button/Enter key (handleSearch),
    // not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleStatusFilterChange = (event) => {
    setIsLoadingList(true);
    setStatusFilter(event.target.value);
  };

  const handleSearch = () => {
    setIsLoadingList(true);
    const params = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (visitorIdFilter.trim()) params.visitorId = visitorIdFilter.trim();
    fetchConversations(params);
  };

  useEffect(() => {
    if (!selected) return undefined;

    let isMounted = true;

    Promise.all([
      conversationService.listMessages(selected._id, { limit: 100 }).catch(() => null),
      visitorService.getByVisitorId(selected.visitorId).catch(() => null),
    ]).then(([messagesResponse, visitorResult]) => {
      if (!isMounted) return;
      setMessages(messagesResponse?.data.messages ?? []);
      setVisitor(visitorResult?.visitor ?? null);
    }).finally(() => {
      if (isMounted) setIsLoadingThread(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selected]);

  const handleSelectConversation = (conversation) => {
    setIsLoadingThread(true);
    setVisitor(null);
    setSelected(conversation);
  };

  const isAiOnly = (conversation) => !conversation.assignedExecutiveId;

  const handleDetectLead = () => {
    if (!selected) return;
    navigate(ROUTES.LEADS, { state: { conversationId: selected.conversationId } });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Conversations</Typography>
      <Typography variant="body2" color="text.secondary">
        Every conversation company-wide — AI-only chats that were never claimed, and ones an executive
        handled. Use "Find Leads" on a conversation to run AI lead detection against it.
      </Typography>

      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel id="admin-conv-status-label">Status</InputLabel>
          <Select
            labelId="admin-conv-status-label"
            label="Status"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            {STATUS_FILTERS.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Visitor ID"
          value={visitorIdFilter}
          onChange={(event) => setVisitorIdFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSearch();
          }}
        />
        <Button variant="outlined" onClick={handleSearch}>
          Search
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, gap: 2, minHeight: 500 }}>
        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          {isLoadingList ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Loading…
            </Typography>
          ) : conversations.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No conversations found for this filter.
            </Typography>
          ) : (
            <List dense disablePadding>
              {conversations.map((conversation) => (
                <ListItemButton
                  key={conversation._id}
                  selected={selected?._id === conversation._id}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={conversation.status}
                          color={STATUS_COLOR[conversation.status] ?? 'default'}
                        />
                        {isAiOnly(conversation) && <Chip size="small" label="AI-only" variant="outlined" />}
                        <Typography variant="caption" color="text.secondary">
                          {new Date(conversation.startedAt).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    }
                    secondary={`Visitor ${conversation.visitorId.slice(0, 8)}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, overflow: 'auto' }}>
          {!selected ? (
            <Typography variant="body2" color="text.secondary">
              Select a conversation on the left to view its full transcript.
            </Typography>
          ) : isLoadingThread ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle1">
                    {visitor?.name ?? `Visitor ${selected.visitorId.slice(0, 8)}`}
                  </Typography>
                  <Chip size="small" label={selected.status} color={STATUS_COLOR[selected.status] ?? 'default'} />
                </Stack>
                <Button size="small" variant="outlined" onClick={handleDetectLead}>
                  Find Leads
                </Button>
              </Stack>
              {(visitor?.email || visitor?.phone || visitor?.company) && (
                <Typography variant="body2" color="text.secondary">
                  {[visitor?.email, visitor?.phone, visitor?.company].filter(Boolean).join(' · ')}
                </Typography>
              )}
              <Divider />
              {messages.map((message) => (
                <TranscriptBubble key={message._id} message={message} />
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Stack>
  );
}

export default AdminConversationsPage;
