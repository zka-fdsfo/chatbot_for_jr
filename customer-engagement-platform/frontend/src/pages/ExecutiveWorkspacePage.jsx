import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import useAuth from '../hooks/useAuth';
import useExecutiveWorkspace from '../features/executive-workspace/hooks/useExecutiveWorkspace';
import ConversationQueue from '../features/executive-workspace/components/ConversationQueue';
import ActiveChatPanel from '../features/executive-workspace/components/ActiveChatPanel';
import VisitorPanel from '../features/executive-workspace/components/VisitorPanel';
import SummaryPanel from '../features/executive-workspace/components/SummaryPanel';
import AvailabilityControl from '../features/executive-workspace/components/AvailabilityControl';

function ExecutiveWorkspacePage() {
  const { user } = useAuth();
  const {
    queue,
    activeConversation,
    messages,
    isRemoteTyping,
    liveExecutiveStatus,
    joinConversation,
    sendMessage,
    notifyTyping,
    markRead,
    closeConversation,
    transferConversation,
  } = useExecutiveWorkspace(user?.id);

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Paper
        variant="outlined"
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Executive Workspace</Typography>
          <AvailabilityControl liveStatus={liveExecutiveStatus} />
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
          gap: 2,
          minHeight: 480,
        }}
      >
        <ConversationQueue
          queue={queue}
          activeConversationId={activeConversation?.conversationId}
          onClaim={joinConversation}
        />
        <ActiveChatPanel
          conversation={activeConversation}
          messages={messages}
          isRemoteTyping={isRemoteTyping}
          onSend={sendMessage}
          onTyping={notifyTyping}
          onMarkRead={markRead}
          onClose={closeConversation}
          onTransfer={transferConversation}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          minHeight: 320,
        }}
      >
        <VisitorPanel
          key={`visitor-${activeConversation?.conversationId}`}
          visitorId={activeConversation?.visitorId}
          currentConversationId={activeConversation?.conversationId}
        />
        <SummaryPanel key={`summary-${activeConversation?.conversationId}`} mongoConversationId={activeConversation?._id} />
      </Box>
    </Stack>
  );
}

export default ExecutiveWorkspacePage;
