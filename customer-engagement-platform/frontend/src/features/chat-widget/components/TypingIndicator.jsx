import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import { SENDER_TYPE } from '../constants/chatWidget';

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
`;

const TYPING_LABEL = {
  [SENDER_TYPE.AI]: 'AI Assistant is typing',
  [SENDER_TYPE.EXECUTIVE]: 'Support is typing',
};

function TypingIndicator({ senderType }) {
  const label = TYPING_LABEL[senderType] ?? 'Typing';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }} aria-label={label}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: `${bounce} 1.2s ${index * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default TypingIndicator;
