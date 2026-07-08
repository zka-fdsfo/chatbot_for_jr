import { ThemeProvider } from '@mui/material/styles';
import theme from './theme/theme';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ChatWidget from './features/chat-widget/ChatWidget';

// The embeddable widget's own root — deliberately independent of App.jsx
// (no BrowserRouter/AuthProvider/AppRoutes). This is what any external
// website loads, via public/embed.js, inside a full-viewport iframe
// pointed at widget.html. Keeping this tree minimal is what makes the
// widget bundle small and portable to a page that has nothing else to do
// with this project. Deliberately no <CssBaseline/> — it would paint the
// iframe's body with an opaque background color, breaking the
// click-through transparency widget.html's own CSS sets up.
function WidgetApp() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <ChatWidget />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default WidgetApp;
