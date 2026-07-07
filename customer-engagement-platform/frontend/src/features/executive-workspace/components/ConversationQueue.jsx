import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';

function ConversationQueue({ queue, activeConversationId, onClaim }) {
  return (
    <Paper variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
      <Stack sx={{ p: 2 }} spacing={1}>
        <Typography variant="h6">Conversation Queue</Typography>
        <Typography variant="body2" color="text.secondary">
          {queue.length} waiting
        </Typography>
      </Stack>

      {queue.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          No visitors are waiting.
        </Typography>
      ) : (
        <List disablePadding>
          {queue.map((conversation) => (
            <ListItemButton
              key={conversation.conversationId}
              selected={conversation.conversationId === activeConversationId}
              onClick={() => onClaim(conversation.conversationId)}
            >
              <ListItemText
                primary={conversation.visitorId}
                secondary={new Date(conversation.startedAt).toLocaleTimeString()}
              />
              <Chip label="Claim" size="small" color="primary" variant="outlined" />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default ConversationQueue;
