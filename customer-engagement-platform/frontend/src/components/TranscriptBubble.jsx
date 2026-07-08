import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { SENDER_TYPE } from '../features/executive-workspace/constants/executiveWorkspace';

// A read-only message bubble shared by every staff-facing conversation
// transcript view (Executive's own Conversation History, Admin's
// all-conversations view) — distinct from the Chat Widget's own
// MessageBubble, which is styled for a narrow floating panel rather than
// a full-page staff view.
function TranscriptBubble({ message }) {
  const isExecutive = message.senderType === SENDER_TYPE.EXECUTIVE;

  return (
    <Box sx={{ display: 'flex', justifyContent: isExecutive ? 'flex-end' : 'flex-start' }}>
      <Paper
        variant={isExecutive ? 'elevation' : 'outlined'}
        elevation={isExecutive ? 2 : 0}
        sx={{
          px: 1.5,
          py: 1,
          maxWidth: '70%',
          bgcolor: isExecutive ? 'primary.main' : 'background.paper',
          color: isExecutive ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {message.message}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.5 }}>
          {message.senderType} · {new Date(message.sentAt).toLocaleString()}
        </Typography>
      </Paper>
    </Box>
  );
}

export default TranscriptBubble;
