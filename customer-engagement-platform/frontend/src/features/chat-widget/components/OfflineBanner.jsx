import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import useWidgetSettings from '../hooks/useWidgetSettings';
import { CONNECTION_STATUS } from '../constants/chatWidget';

function OfflineBanner({ status }) {
  const settings = useWidgetSettings();

  if (status === CONNECTION_STATUS.CONNECTED) return null;

  const message = status === CONNECTION_STATUS.CONNECTING ? 'Connecting…' : settings.offlineMessage;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        bgcolor: 'warning.light',
        color: 'warning.contrastText',
        py: 0.5,
      }}
    >
      <CircularProgress size={12} color="inherit" />
      <Typography variant="caption">{message}</Typography>
    </Box>
  );
}

export default OfflineBanner;
