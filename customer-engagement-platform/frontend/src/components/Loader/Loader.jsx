import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

function Loader({ fullScreen = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '200px',
        width: '100%',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default Loader;
