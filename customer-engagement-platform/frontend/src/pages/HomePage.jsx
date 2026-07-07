import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

function HomePage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">AI Customer Engagement Platform</Typography>
      <Typography variant="body1" color="text.secondary">
        Application shell is up and running. Feature pages will be added in later phases.
      </Typography>
    </Stack>
  );
}

export default HomePage;
