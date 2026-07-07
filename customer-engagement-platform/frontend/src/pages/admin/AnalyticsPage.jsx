import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import analyticsService from '../../services/analyticsService';
import useNotification from '../../hooks/useNotification';
import { ANALYTICS_DATE_RANGES } from '../../features/admin-portal/constants/adminPortal';

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(1);
  return String(value);
}

function StatTile({ label, value, suffix = '' }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h5">
        {formatValue(value)}
        {value !== null && value !== undefined ? suffix : ''}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

function MetricRow({ label, value, suffix = '' }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">
        {formatValue(value)}
        {value !== null && value !== undefined ? suffix : ''}
      </Typography>
    </Stack>
  );
}

function DistributionTable({ title, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <Stack sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {title}: no data.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key ?? row.date ?? row.hour}>
              <TableCell sx={{ border: 0, py: 0.25 }}>{row.key ?? row.date ?? `Hour ${row.hour}`}</TableCell>
              <TableCell sx={{ border: 0, py: 0.25 }} align="right">
                {row.count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

function AnalyticsPage() {
  const [range, setRange] = useState('TODAY');
  const [dashboard, setDashboard] = useState(null);
  const [conversations, setConversations] = useState(null);
  const [ai, setAi] = useState(null);
  const [executives, setExecutives] = useState(null);
  const [leads, setLeads] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [visitors, setVisitors] = useState(null);
  const [widget, setWidget] = useState(null);
  const [businessHours, setBusinessHours] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    analyticsService.getDashboard().then((result) => setDashboard(result.metrics));
  }, []);

  useEffect(() => {
    const params = { range };

    analyticsService.getConversations(params).then((result) => setConversations(result.metrics));
    analyticsService.getAi(params).then((result) => setAi(result.metrics));
    analyticsService.getExecutives(params).then((result) => setExecutives(result.metrics));
    analyticsService.getLeads(params).then((result) => setLeads(result.metrics));
    analyticsService.getTickets(params).then((result) => setTickets(result.metrics));
    analyticsService.getVisitors(params).then((result) => setVisitors(result.metrics));
    analyticsService.getWidget(params).then((result) => setWidget(result.metrics));
    analyticsService
      .getBusinessHours(params)
      .then((result) => setBusinessHours(result.metrics))
      .catch((error) => notify(error.message ?? 'Failed to load analytics.', { severity: 'error' }));
  }, [range, notify]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Analytics</Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Date Range</InputLabel>
          <Select label="Date Range" value={range} onChange={(e) => setRange(e.target.value)}>
            {ANALYTICS_DATE_RANGES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {dashboard && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="Active Visitors" value={dashboard.activeVisitors} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="Active Conversations" value={dashboard.activeConversations} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="Waiting Conversations" value={dashboard.waitingConversations} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="Online Executives" value={dashboard.onlineExecutives} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="Open Tickets" value={dashboard.openTickets} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="New Leads Today" value={dashboard.newLeads} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="AI Resolution Rate" value={dashboard.aiResolutionRate} suffix="%" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatTile label="Avg. Response Time" value={dashboard.averageResponseTimeSeconds} suffix="s" />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Conversations
            </Typography>
            {conversations && (
              <>
                <MetricRow label="Started" value={conversations.conversationsStarted} />
                <MetricRow label="Completed" value={conversations.conversationsCompleted} />
                <MetricRow label="Active (now)" value={conversations.activeConversations} />
                <MetricRow label="Avg. Duration" value={conversations.averageConversationDurationSeconds} suffix="s" />
                <MetricRow label="Avg. Messages / Conversation" value={conversations.averageMessagesPerConversation} />
                <DistributionTable title="By Day" rows={conversations.conversationsByDay} />
                <DistributionTable title="By Hour" rows={conversations.conversationsByHour} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              AI
            </Typography>
            {ai && (
              <>
                <MetricRow label="AI Responses" value={ai.aiResponses} />
                <MetricRow label="AI Resolution Rate" value={ai.aiResolutionRate} suffix="%" />
                <MetricRow label="Human Handoffs" value={ai.humanHandoffs} />
                <MetricRow label="AI Confidence" value={ai.aiConfidence} />
                <MetricRow label="Avg. Response Time" value={ai.averageResponseTimeSeconds} suffix="s" />
                <MetricRow label="Failed Responses" value={ai.failedResponses} />
                <MetricRow label="Fallback Responses" value={ai.fallbackResponses} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Executives (All)
            </Typography>
            {executives && (
              <>
                <MetricRow label="Assigned Conversations" value={executives.assignedConversations} />
                <MetricRow label="Resolved Conversations" value={executives.resolvedConversations} />
                <MetricRow label="Avg. Resolution Time" value={executives.averageResolutionTimeSeconds} suffix="s" />
                <MetricRow label="Active Time" value={executives.activeTime} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Leads
            </Typography>
            {leads && (
              <>
                <MetricRow label="Total Leads" value={leads.totalLeads} />
                <MetricRow label="Qualified" value={leads.qualifiedLeads} />
                <MetricRow label="Converted" value={leads.convertedLeads} />
                <MetricRow label="Lost" value={leads.lostLeads} />
                <MetricRow label="Conversion Rate" value={leads.conversionRate} suffix="%" />
                <DistributionTable title="Lead Sources" rows={leads.leadSources} />
                <DistributionTable title="Score Distribution" rows={leads.leadScoreDistribution} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tickets
            </Typography>
            {tickets && (
              <>
                <MetricRow label="Open" value={tickets.openTickets} />
                <MetricRow label="Closed" value={tickets.closedTickets} />
                <MetricRow label="Reopened" value={tickets.reopenedTickets} />
                <MetricRow label="Avg. Resolution Time" value={tickets.resolutionTimeSeconds} suffix="s" />
                <DistributionTable title="Categories" rows={tickets.ticketCategories} />
                <DistributionTable title="Priorities" rows={tickets.ticketPriorities} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Visitors
            </Typography>
            {visitors && (
              <>
                <MetricRow label="Unique Visitors" value={visitors.uniqueVisitors} />
                <MetricRow label="New Visitors" value={visitors.newVisitors} />
                <MetricRow label="Returning Visitors" value={visitors.returningVisitors} />
                <DistributionTable title="Device Type" rows={visitors.deviceType} />
                <DistributionTable title="Browser" rows={visitors.browser} />
                <DistributionTable title="Language" rows={visitors.language} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Widget
            </Typography>
            {widget && (
              <>
                <MetricRow label="Opens" value={widget.widgetOpens} />
                <MetricRow label="Closes" value={widget.widgetCloses} />
                <MetricRow label="Messages Sent" value={widget.messagesSent} />
                <MetricRow label="Suggested Question Usage" value={widget.suggestedQuestionUsage} />
                <MetricRow label="Quick Reply Usage" value={widget.quickReplyUsage} />
                <MetricRow label="Avg. Session Duration" value={widget.averageSessionDurationSeconds} suffix="s" />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Business Hours
            </Typography>
            {businessHours && (
              <>
                <MetricRow label="Chats During Business Hours" value={businessHours.chatsDuringBusinessHours} />
                <MetricRow label="Chats Outside Business Hours" value={businessHours.chatsOutsideBusinessHours} />
                <MetricRow label="Callback Requests" value={businessHours.callbackRequests} />
                <MetricRow label="Tickets Created After Hours" value={businessHours.ticketsCreatedAfterHours} />
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default AnalyticsPage;
