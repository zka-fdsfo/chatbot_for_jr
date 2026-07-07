import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import ConversationArea from './ConversationArea';
import QuickReplies from './QuickReplies';
import OfflineBanner from './OfflineBanner';
import useWidgetSettings from '../hooks/useWidgetSettings';
import useBusinessStatus from '../hooks/useBusinessStatus';
import { MESSAGE_TYPE, CONVERSATION_ENDED_MESSAGE } from '../constants/chatWidget';

const BUSINESS_STATUS_LABEL = {
  OPEN: 'Online',
  OPENING_SOON: 'Opening soon',
  CLOSING_SOON: 'Closing soon',
  CLOSED: 'Offline',
  HOLIDAY: 'Offline',
};

const BUSINESS_STATUS_CHIP_COLOR = {
  OPEN: 'success',
  OPENING_SOON: 'info',
  CLOSING_SOON: 'warning',
  CLOSED: 'default',
  HOLIDAY: 'default',
};

const WINDOW_WIDTH = 360;
const WINDOW_HEIGHT = 520;

function ChatWindow({
  connectionStatus,
  messages,
  isRemoteTyping,
  onClose,
  onSend,
  onTyping,
  isConversationClosed,
}) {
  const settings = useWidgetSettings();
  const { status: businessStatus, callbackSlots } = useBusinessStatus();
  const outerTheme = useTheme();
  const isMobile = useMediaQuery(outerTheme.breakpoints.down('sm'));
  const [draft, setDraft] = useState('');
  const isLeft = settings.position === 'BOTTOM_LEFT';

  const widgetTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: settings.theme === 'DARK' ? 'dark' : 'light',
          primary: { main: settings.primaryColor },
        },
      }),
    [settings.theme, settings.primaryColor],
  );

  const handleSend = () => {
    if (!draft.trim() || isConversationClosed) return;
    onSend(draft, MESSAGE_TYPE.TEXT);
    setDraft('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (reply) => {
    onSend(reply, MESSAGE_TYPE.QUICK_REPLY);
  };

  return (
    <ThemeProvider theme={widgetTheme}>
      <Paper
        elevation={6}
        role="dialog"
        aria-label="Chat with us"
        sx={{
          position: 'fixed',
          display: 'flex',
          flexDirection: 'column',
          zIndex: (t) => t.zIndex.modal,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          ...(isMobile
            ? { inset: 0, borderRadius: 0 }
            : {
                bottom: 24,
                ...(isLeft ? { left: 24 } : { right: 24 }),
                width: WINDOW_WIDTH,
                height: WINDOW_HEIGHT,
                borderRadius: 2,
              }),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {settings.brandLogoUrl && (
              <Avatar src={settings.brandLogoUrl} alt="" sx={{ width: 28, height: 28 }} />
            )}
            <Typography variant="subtitle1">Chat with us</Typography>
            {businessStatus && (
              <Chip
                size="small"
                label={BUSINESS_STATUS_LABEL[businessStatus.status] ?? businessStatus.status}
                color={BUSINESS_STATUS_CHIP_COLOR[businessStatus.status] ?? 'default'}
                sx={{ height: 20 }}
              />
            )}
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close chat" sx={{ color: 'inherit' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <OfflineBanner status={connectionStatus} />

        <ConversationArea
          messages={messages}
          isRemoteTyping={isRemoteTyping}
          onSelectSuggestion={(question) => onSend(question, MESSAGE_TYPE.TEXT)}
          businessStatus={businessStatus}
          callbackSlots={callbackSlots}
        />

        {settings.featureToggles.quickRepliesEnabled && !isConversationClosed && (
          <QuickReplies onSelect={handleQuickReply} />
        )}

        <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              onTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isConversationClosed ? CONVERSATION_ENDED_MESSAGE : 'Type a message…'}
            disabled={isConversationClosed}
            size="small"
            fullWidth
            multiline
            maxRows={4}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={isConversationClosed}
            aria-label="Send message"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </ThemeProvider>
  );
}

export default ChatWindow;
