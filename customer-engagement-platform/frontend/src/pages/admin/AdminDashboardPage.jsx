import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import dashboardService from '../../services/dashboardService';

const REFRESH_INTERVAL_MS = 15000;

const METRIC_DEFINITIONS = [
  { key: 'activeVisitors', label: 'Active Visitors' },
  { key: 'activeConversations', label: 'Active Conversations' },
  { key: 'waitingChats', label: 'Waiting Chats' },
  { key: 'onlineExecutives', label: 'Online Executives' },
  { key: 'averageResponseTimeSeconds', label: 'Avg. Response Time', suffix: 's' },
  { key: 'openTickets', label: 'Open Tickets' },
  { key: 'todaysLeads', label: "Today's Leads" },
  { key: 'aiResolutionRate', label: 'AI Resolution Rate', suffix: '%' },
];

function formatValue(value, suffix) {
  if (value === null || value === undefined) return 'N/A';
  return suffix ? `${value}${suffix}` : value;
}

function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = () => {
      dashboardService.getMetrics().then((result) => {
        if (isMounted) setMetrics(result.metrics);
      });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Dashboard</Typography>

      <Grid container spacing={2}>
        {METRIC_DEFINITIONS.map((metric) => (
          <Grid key={metric.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {metric.label}
              </Typography>
              <Typography variant="h4">
                {metrics ? formatValue(metrics[metric.key], metric.suffix) : '—'}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="caption" color="text.secondary">
        Ticket, Lead, and AI Resolution Rate metrics show N/A — those modules aren&apos;t built yet.
      </Typography>
    </Stack>
  );
}

export default AdminDashboardPage;
