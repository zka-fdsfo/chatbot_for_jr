import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { SENDER_TYPE } from '../constants/chatWidget';

const SENDER_LABEL = {
  [SENDER_TYPE.AI]: 'AI Assistant',
  [SENDER_TYPE.EXECUTIVE]: 'Support',
};

// Two patterns, not one: `.split()` needs the capturing group + global flag,
// but reusing a global-flagged regex across repeated `.test()` calls on
// different strings carries stateful `lastIndex` between them and silently
// gives wrong results from the second call on — a non-global pattern for
// the per-part check avoids that entirely.
const URL_SPLIT_PATTERN = /(https?:\/\/[^\s]+)/g;
const URL_TEST_PATTERN = /^https?:\/\/[^\s]+$/;

// A small, dependency-free auto-linker rather than a full markdown
// renderer — messages are plain text (MESSAGE_TYPE.TEXT), so only bare
// URLs need turning into clickable links.
function renderMessageText(text) {
  const parts = text.split(URL_SPLIT_PATTERN);

  return parts.map((part, index) =>
    URL_TEST_PATTERN.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function formatTimestamp(sentAt) {
  if (!sentAt) return '';
  return new Date(sentAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

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
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {renderMessageText(message.message)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
        {message.pending && <CircularProgress size={9} thickness={6} />}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {message.pending ? 'Sending…' : formatTimestamp(message.sentAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export default MessageBubble;
