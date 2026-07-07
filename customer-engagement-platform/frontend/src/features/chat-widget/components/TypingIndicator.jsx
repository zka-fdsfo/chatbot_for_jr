import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
`;

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1 }} aria-label="Support is typing">
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
  );
}

export default TypingIndicator;
