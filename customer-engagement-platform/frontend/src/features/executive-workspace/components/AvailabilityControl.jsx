import { useEffect, useState } from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import executiveService from '../../../services/executiveService';
import useNotification from '../../../hooks/useNotification';
import { EXECUTIVE_STATUS } from '../constants/executiveWorkspace';

function AvailabilityControl({ liveStatus }) {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [appliedLiveStatus, setAppliedLiveStatus] = useState(liveStatus);
  const { notify } = useNotification();

  useEffect(() => {
    let isMounted = true;

    executiveService
      .getMe()
      .then((result) => {
        if (isMounted) setStatus(result.executive.status);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Connecting the socket marks the executive ONLINE server-side
  // (executiveService.markOnline), which can land after the REST fetch above
  // already read the prior status. `liveStatus` (from useExecutiveWorkspace)
  // is the server telling us once that write lands — applied here during
  // render, React's documented pattern for adjusting state from a prop
  // change, rather than in an effect (which would double-render and trips
  // the set-state-in-effect lint rule for a value that isn't derived from
  // an external subscription so much as a one-off correction).
  if (liveStatus !== appliedLiveStatus) {
    setAppliedLiveStatus(liveStatus);
    if (liveStatus) setStatus(liveStatus);
  }

  const handleChange = async (event) => {
    const nextStatus = event.target.value;
    const previousStatus = status;
    setStatus(nextStatus);

    try {
      await executiveService.updateMyStatus(nextStatus);
    } catch (error) {
      setStatus(previousStatus);
      notify(error.message ?? 'Failed to update availability.', { severity: 'error' });
    }
  };

  if (isLoading) return <CircularProgress size={20} sx={{ color: 'inherit' }} />;

  return (
    <FormControl size="small">
      <Select value={status} onChange={handleChange} sx={{ color: 'inherit', minWidth: 120 }}>
        {Object.values(EXECUTIVE_STATUS).map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default AvailabilityControl;
