import { useCallback, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import NotificationContext from './notificationContext';

let nextNotificationId = 1;

function NotificationProvider({ children }) {
  const [queue, setQueue] = useState([]);

  const notify = useCallback((message, { severity = 'info', autoHideDuration = 5000 } = {}) => {
    const notification = { id: nextNotificationId++, message, severity, autoHideDuration };
    setQueue((prev) => [...prev, notification]);
  }, []);

  const current = queue[0];

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setQueue((prev) => prev.slice(1));
  };

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={current?.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={current?.severity ?? 'info'} variant="filled" sx={{ width: '100%' }}>
          {current?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
