import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import UIProvider from './contexts/UIProvider';
import NotificationProvider from './contexts/NotificationProvider';
import AuthProvider from './contexts/AuthProvider';
import AppRoutes from './routes/AppRoutes';
import ChatWidget from './features/chat-widget/ChatWidget';

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
                <ChatWidget />
              </AuthProvider>
            </NotificationProvider>
          </UIProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
