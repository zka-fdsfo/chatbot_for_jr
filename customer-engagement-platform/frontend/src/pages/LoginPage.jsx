import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import useAuth from '../hooks/useAuth';
import useNotification from '../hooks/useNotification';
import { ROUTES } from '../constants/routes';

function LoginPage() {
  const { login } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from ?? ROUTES.DASHBOARD;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      notify(error.message ?? 'Login failed.', { severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper elevation={2} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
          <Typography variant="h5" sx={{ textAlign: 'center' }}>
            Sign in
          </Typography>

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="username"
            fullWidth
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            fullWidth
          />

          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default LoginPage;
