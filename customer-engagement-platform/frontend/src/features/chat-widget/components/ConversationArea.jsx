import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SuggestedQuestions from './SuggestedQuestions';
import VisitorInfoForm from './VisitorInfoForm';
import useWidgetSettings from '../hooks/useWidgetSettings';

const CLOSED_STATUSES = new Set(['CLOSED', 'HOLIDAY']);

function formatSlot(slot) {
  const opensAt = new Date(slot.opensAt);
  return opensAt.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ConversationArea({
  messages,
  isRemoteTyping,
  typingSenderType,
  onSelectSuggestion,
  businessStatus,
  callbackSlots,
  visitorProfile,
  onUpdateProfile,
}) {
  const settings = useWidgetSettings();
  const bottomRef = useRef(null);
  const isClosed = businessStatus && CLOSED_STATUSES.has(businessStatus.status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isRemoteTyping]);

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
      {messages.length === 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {isClosed ? settings.offlineMessage : settings.welcomeMessage}
          </Typography>

          {isClosed && callbackSlots?.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Next available:
              </Typography>
              {callbackSlots.map((slot) => (
                <Typography key={slot.opensAt} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {formatSlot(slot)}
                </Typography>
              ))}
            </Box>
          )}

          {visitorProfile && !visitorProfile.name && <VisitorInfoForm onSubmit={onUpdateProfile} />}

          <SuggestedQuestions onSelect={onSelectSuggestion} />
        </Box>
      )}

      {messages.map((message) => (
        <MessageBubble key={message._id ?? message.tempId} message={message} />
      ))}

      {isRemoteTyping && settings.featureToggles.typingIndicatorEnabled && (
        <TypingIndicator senderType={typingSenderType} />
      )}

      <div ref={bottomRef} />
    </Box>
  );
}

export default ConversationArea;
