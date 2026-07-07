import { useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import businessHoursService from '../../services/businessHoursService';
import useNotification from '../../hooks/useNotification';
import { DAYS_OF_WEEK, HOLIDAY_TYPES, BUSINESS_STATUS_COLOR } from '../../features/admin-portal/constants/adminPortal';

// 'UTC' is the model's own default but is omitted by supportedValuesOf() in
// some ICU builds — include it explicitly so the default is selectable.
const TIMEZONES = Array.from(new Set(['UTC', ...Intl.supportedValuesOf('timeZone')]));

const EMPTY_HOLIDAY = { name: '', date: '', type: 'PUBLIC' };

function BusinessHoursPage() {
  const [businessHours, setBusinessHours] = useState(null);
  const [status, setStatus] = useState(null);
  const [newHoliday, setNewHoliday] = useState(EMPTY_HOLIDAY);
  const { notify } = useNotification();

  const refresh = () => {
    businessHoursService.get().then((result) => setBusinessHours(result.businessHours));
    businessHoursService.getStatus().then((result) => setStatus(result.status));
  };

  useEffect(refresh, []);

  const scheduleByDay = useMemo(() => {
    if (!businessHours) return {};
    return Object.fromEntries(businessHours.weeklySchedule.map((entry) => [entry.day, entry]));
  }, [businessHours]);

  const updateDay = (day, changes) => {
    const nextSchedule = businessHours.weeklySchedule.map((entry) =>
      entry.day === day ? { ...entry, ...changes } : entry,
    );
    setBusinessHours({ ...businessHours, weeklySchedule: nextSchedule });
  };

  const handleSaveSchedule = async () => {
    try {
      await businessHoursService.update({
        timezone: businessHours.timezone,
        weeklySchedule: businessHours.weeklySchedule,
      });
      notify('Business hours saved.', { severity: 'success' });
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to save business hours.', { severity: 'error' });
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name.trim() || !newHoliday.date) return;
    try {
      const result = await businessHoursService.addHoliday(newHoliday);
      setBusinessHours(result.businessHours);
      setNewHoliday(EMPTY_HOLIDAY);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to add holiday.', { severity: 'error' });
    }
  };

  const handleRemoveHoliday = async (holidayId) => {
    try {
      const result = await businessHoursService.removeHoliday(holidayId);
      setBusinessHours(result.businessHours);
      refresh();
    } catch (error) {
      notify(error.message ?? 'Failed to remove holiday.', { severity: 'error' });
    }
  };

  if (!businessHours) return null;

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">Business Hours</Typography>
        {status && (
          <Chip
            label={status.status === 'HOLIDAY' ? `HOLIDAY — ${status.holiday}` : status.status}
            color={BUSINESS_STATUS_COLOR[status.status] ?? 'default'}
          />
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormControl size="small" sx={{ maxWidth: 360 }}>
            <InputLabel>Timezone</InputLabel>
            <Select
              label="Timezone"
              value={businessHours.timezone}
              onChange={(e) => setBusinessHours({ ...businessHours, timezone: e.target.value })}
              MenuProps={{ PaperProps: { style: { maxHeight: 400 } } }}
            >
              {TIMEZONES.map((zone) => (
                <MenuItem key={zone} value={zone}>
                  {zone}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell>Open</TableCell>
                <TableCell>Close</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DAYS_OF_WEEK.map((day) => {
                const entry = scheduleByDay[day];
                if (!entry) return null;

                return (
                  <TableRow key={day}>
                    <TableCell>{day}</TableCell>
                    <TableCell>
                      <Switch
                        checked={entry.enabled}
                        onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="time"
                        size="small"
                        value={entry.open}
                        disabled={!entry.enabled}
                        onChange={(e) => updateDay(day, { open: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="time"
                        size="small"
                        value={entry.close}
                        disabled={!entry.enabled}
                        onChange={(e) => updateDay(day, { close: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Button variant="contained" onClick={handleSaveSchedule} sx={{ alignSelf: 'flex-start' }}>
            Save Business Hours
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Holidays
        </Typography>

        <Table size="small">
          <TableBody>
            {businessHours.holidays.map((holiday) => (
              <TableRow key={holiday._id}>
                <TableCell>{holiday.name}</TableCell>
                <TableCell>{holiday.date}</TableCell>
                <TableCell>
                  <Chip size="small" label={holiday.type} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleRemoveHoliday(holiday._id)} aria-label="Remove holiday">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {businessHours.holidays.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No holidays configured.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            label="Name"
            size="small"
            value={newHoliday.name}
            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
          />
          <TextField
            label="Date"
            type="date"
            size="small"
            value={newHoliday.date}
            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={newHoliday.type}
              onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
            >
              {HOLIDAY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleAddHoliday}>
            Add Holiday
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default BusinessHoursPage;
