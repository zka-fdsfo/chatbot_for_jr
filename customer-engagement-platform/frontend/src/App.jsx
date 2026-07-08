import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import UIProvider from './contexts/UIProvider';
import NotificationProvider from './contexts/NotificationProvider';
import AuthProvider from './contexts/AuthProvider';
import AppRoutes from './routes/AppRoutes';

// This is the staff app only (Login/Executive/Admin) — the Chat Widget
// is a deliberately separate bundle (see widget.html/WidgetApp.jsx) so it
// never renders on a staff page, and so it can be embedded into any other
// website via public/embed.js without dragging this whole app along.
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <UIProvider>
            <NotificationProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </NotificationProvider>
          </UIProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
