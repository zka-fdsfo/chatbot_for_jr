import { Outlet, Link, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';
import useUI from '../hooks/useUI';
import useAuth from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

function MainLayout() {
  const { isSidebarOpen, toggleSidebar, closeSidebar } = useUI();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
            aria-label="toggle navigation"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component={Link}
            to={ROUTES.HOME}
            sx={{ flex: 1, color: 'inherit', textDecoration: 'none' }}
          >
            AI Customer Engagement Platform
          </Typography>

          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">{user?.name}</Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          ) : (
            <Button color="inherit" component={Link} to={ROUTES.LOGIN}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={isSidebarOpen} onClose={closeSidebar}>
        <Box sx={{ width: DRAWER_WIDTH, pt: 2 }} role="presentation" onClick={closeSidebar}>
          <Typography variant="subtitle1" sx={{ px: 2, pb: 1 }}>
            Navigation
          </Typography>
          <List dense>
            {isAuthenticated && (
              <ListItemButton component={Link} to={ROUTES.DASHBOARD}>
                <ListItemText primary="Executive Workspace" />
              </ListItemButton>
            )}
            {isAuthenticated && (
              <ListItemButton component={Link} to={ROUTES.TICKETS}>
                <ListItemText primary="Tickets" />
              </ListItemButton>
            )}
            {isAuthenticated && (
              <ListItemButton component={Link} to={ROUTES.LEADS}>
                <ListItemText primary="Leads" />
              </ListItemButton>
            )}
            {user?.role === ROLES.ADMIN && (
              <ListItemButton component={Link} to={ROUTES.ADMIN_DASHBOARD}>
                <ListItemText primary="Admin Portal" />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Drawer>

      <Container component="main" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer" sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          AI Customer Engagement Platform
        </Typography>
      </Box>
    </Box>
  );
}

export default MainLayout;
