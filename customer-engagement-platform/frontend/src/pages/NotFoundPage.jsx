import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', mt: 8 }}>
      <Typography variant="h3">404</Typography>
      <Typography variant="body1" color="text.secondary">
        The page you are looking for does not exist.
      </Typography>
      <Button component={Link} to={ROUTES.HOME} variant="contained">
        Back to Home
      </Button>
    </Stack>
  );
}

export default NotFoundPage;
