import { Link, Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import { ROUTES } from '../../../constants/routes';

const NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.ADMIN_DASHBOARD },
  { label: 'Knowledge Management', to: ROUTES.ADMIN_KNOWLEDGE },
  { label: 'Prompt Management', to: ROUTES.ADMIN_PROMPTS },
  { label: 'AI Settings', to: ROUTES.ADMIN_AI_SETTINGS },
  { label: 'Widget Settings', to: ROUTES.ADMIN_WIDGET_SETTINGS },
  { label: 'Executive Management', to: ROUTES.ADMIN_EXECUTIVES },
  { label: 'Business Hours', to: ROUTES.ADMIN_BUSINESS_HOURS },
  { label: 'Analytics', to: ROUTES.ADMIN_ANALYTICS },
];

function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 1, height: 'fit-content' }}>
        <Typography variant="overline" sx={{ px: 2, display: 'block', pt: 1 }}>
          Admin Portal
        </Typography>
        <List dense>
          {NAV_ITEMS.map((item) => (
            <ListItemButton key={item.to} component={Link} to={item.to} selected={pathname.startsWith(item.to)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      <Box>
        <Outlet />
      </Box>
    </Box>
  );
}

export default AdminLayout;
