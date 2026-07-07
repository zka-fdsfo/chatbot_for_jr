import { useEffect, useState } from 'react';
import businessHoursService from '../../../services/businessHoursService';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// BUSINESS_HOURS.md §14: the widget should display Online/Offline/
// Opening Soon/Closing Soon. Polled rather than pushed — there's no
// socket event for this (status changes on a clock tick, not an action),
// and a public REST call is cheap.
export default function useBusinessStatus() {
  const [status, setStatus] = useState(null);
  const [callbackSlots, setCallbackSlots] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const refresh = () => {
      businessHoursService.getStatus().then((result) => {
        if (!isMounted) return;
        setStatus(result.status);

        if (result.status.status === 'CLOSED' || result.status.status === 'HOLIDAY') {
          businessHoursService.getCallbackAvailability({ count: 3 }).then((availability) => {
            if (isMounted) setCallbackSlots(availability.availability.slots ?? []);
          });
        } else {
          setCallbackSlots([]);
        }
      });
    };

    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { status, callbackSlots };
}
