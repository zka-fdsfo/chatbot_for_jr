import { useEffect, useRef, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import SendIcon from '@mui/icons-material/Send';
import { SENDER_TYPE, CONVERSATION_STATUS } from '../constants/executiveWorkspace';

function MessageBubble({ message }) {
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
        <Typography variant="body2">{message.message}</Typography>
        <Typography
          variant="caption"
          sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.5 }}
        >
          {message.senderType} · {new Date(message.sentAt).toLocaleTimeString()}
        </Typography>
      </Paper>
    </Box>
  );
}

function ActiveChatPanel({ conversation, messages, isRemoteTyping, onSend, onTyping, onMarkRead, onClose }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (conversation) onMarkRead();
  }, [conversation, onMarkRead]);

  if (!conversation) {
    return (
      <Paper variant="outlined" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Claim a conversation from the queue to start chatting.
        </Typography>
      </Paper>
    );
  }

  const isClosed =
    conversation.status === CONVERSATION_STATUS.CLOSED ||
    conversation.status === CONVERSATION_STATUS.ARCHIVED;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isClosed) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Box>
          <Typography variant="subtitle1">{conversation.visitorId}</Typography>
          <Typography variant="caption" color="text.secondary">
            {conversation.status}
          </Typography>
        </Box>
        <Button size="small" color="error" variant="outlined" disabled={isClosed} onClick={onClose}>
          Close Conversation
        </Button>
      </Stack>

      <Divider />

      <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack spacing={1.5}>
          {messages.map((message) => (
            <MessageBubble key={message._id ?? `${message.senderType}-${message.sentAt}`} message={message} />
          ))}
        </Stack>
      </Box>

      {isRemoteTyping && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
          Visitor is typing…
        </Typography>
      )}

      <Divider />

      <Stack component="form" direction="row" spacing={1} sx={{ p: 1.5 }} onSubmit={handleSubmit}>
        <TextField
          fullWidth
          size="small"
          placeholder={isClosed ? 'This conversation is closed.' : 'Type a message…'}
          value={draft}
          disabled={isClosed}
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping();
          }}
        />
        <IconButton type="submit" color="primary" disabled={isClosed || !draft.trim()}>
          <SendIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}

export default ActiveChatPanel;
