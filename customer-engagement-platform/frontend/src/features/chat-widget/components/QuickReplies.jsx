import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { QUICK_REPLIES } from '../constants/chatWidget';
import analyticsService from '../../../services/analyticsService';
import { EVENT_TYPE } from '../../../constants/analytics';

function QuickReplies({ onSelect }) {
  const handleSelect = (reply) => {
    analyticsService.recordEvent(EVENT_TYPE.QUICK_REPLY_USED, { reply });
    onSelect(reply);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1, overflowX: 'auto' }}>
      {QUICK_REPLIES.map((reply) => (
        <Button
          key={reply}
          onClick={() => handleSelect(reply)}
          size="small"
          variant="outlined"
          sx={{ flexShrink: 0 }}
        >
          {reply}
        </Button>
      ))}
    </Stack>
  );
}

export default QuickReplies;
