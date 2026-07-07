import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SENDER_TYPE } from '../constants/chatWidget';

const SENDER_LABEL = {
  [SENDER_TYPE.AI]: 'AI Assistant',
  [SENDER_TYPE.EXECUTIVE]: 'Support',
};

function MessageBubble({ message }) {
  const isVisitor = message.senderType === SENDER_TYPE.VISITOR;
  const isSystem = message.senderType === SENDER_TYPE.SYSTEM;

  if (isSystem) {
    return (
      <Box sx={{ textAlign: 'center', my: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {message.message}
        </Typography>
      </Box>
    );
  }

  const label = SENDER_LABEL[message.senderType];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isVisitor ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
          {label}
        </Typography>
      )}
      <Box
        sx={{
          maxWidth: '80%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isVisitor ? 'primary.main' : 'grey.200',
          color: isVisitor ? 'primary.contrastText' : 'text.primary',
          opacity: message.pending ? 0.6 : 1,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.message}
        </Typography>
      </Box>
    </Box>
  );
}

export default MessageBubble;
