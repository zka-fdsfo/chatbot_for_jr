import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import conversationService from '../services/conversationService';
import visitorService from '../services/visitorService';
import TranscriptBubble from '../components/TranscriptBubble';

const STATUS_FILTERS = ['ALL', 'ESCALATED', 'ACTIVE', 'RESOLVED', 'CLOSED', 'ARCHIVED'];

const STATUS_COLOR = {
  WAITING: 'default',
  ESCALATED: 'warning',
  ACTIVE: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
  ARCHIVED: 'default',
};

// "The executive should have the option to view the complete chat history
// of all conversations handled so far." Reuses the existing
// `GET /conversations?mine=true` endpoint (already correctly scoped —
// Sprint 1's assertAccessible allows a non-admin to see their own
// assignment regardless of status) — no backend changes were needed.
function ConversationHistoryPage() {
  const [conversations, setConversations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visitor, setVisitor] = useState(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const params = { mine: true, limit: 50 };
    if (statusFilter !== 'ALL') params.status = statusFilter;

    conversationService
      .list(params)
      .then((response) => {
        if (!isMounted) return;
        setConversations(response.data.conversations);
        setSelected(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingList(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!selected) return undefined;

    let isMounted = true;

    Promise.all([
      // API_SPEC.md's pagination schema caps `limit` at 100.
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

  const handleStatusFilterChange = (event) => {
    setIsLoadingList(true);
    setStatusFilter(event.target.value);
  };

  const handleSelectConversation = (conversation) => {
    setIsLoadingThread(true);
    setVisitor(null);
    setSelected(conversation);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">My Conversation History</Typography>
        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel id="history-status-filter-label">Status</InputLabel>
          <Select
            labelId="history-status-filter-label"
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
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2, minHeight: 500 }}>
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
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1">
                  {visitor?.name ?? `Visitor ${selected.visitorId.slice(0, 8)}`}
                </Typography>
                <Chip size="small" label={selected.status} color={STATUS_COLOR[selected.status] ?? 'default'} />
              </Stack>
              {visitor?.email && (
                <Typography variant="body2" color="text.secondary">
                  {visitor.email}
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

export default ConversationHistoryPage;
