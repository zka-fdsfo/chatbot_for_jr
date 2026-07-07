import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import visitorService from '../../../services/visitorService';

function VisitorPanel({ visitorId, currentConversationId }) {
  const [visitor, setVisitor] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!visitorId) return undefined;

    let isMounted = true;

    Promise.all([
      visitorService.getByVisitorId(visitorId),
      visitorService.getConversationHistory(visitorId, { limit: 10 }),
    ])
      .then(([visitorResult, historyResult]) => {
        if (!isMounted) return;
        setVisitor(visitorResult.visitor);
        setHistory(
          historyResult.data.conversations.filter(
            (item) => item.conversationId !== currentConversationId,
          ),
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visitorId, currentConversationId]);

  if (!visitorId) {
    return (
      <Paper variant="outlined" sx={{ height: '100%', p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Visitor details appear once a conversation is active.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Visitor Info
      </Typography>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          <Typography variant="body2">Name: {visitor?.name ?? 'Unknown'}</Typography>
          <Typography variant="body2">Email: {visitor?.email ?? '—'}</Typography>
          <Typography variant="body2">Phone: {visitor?.phone ?? '—'}</Typography>
          <Typography variant="body2">Company: {visitor?.company ?? '—'}</Typography>
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Previous Conversations
      </Typography>

      {history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No previous conversations.
        </Typography>
      ) : (
        <List dense disablePadding>
          {history.map((item) => (
            <ListItem key={item.conversationId} disableGutters>
              <ListItemText
                primary={item.status}
                secondary={new Date(item.startedAt).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default VisitorPanel;
