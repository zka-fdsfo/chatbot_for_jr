const mongoose = require('mongoose');
const { DAYS_OF_WEEK, HOLIDAY_TYPE } = require('../constants/settings');

const daySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: DAYS_OF_WEEK,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    // "HH:MM", 24-hour, evaluated in the schedule's own timezone — never
    // the server's timezone (BUSINESS_HOURS.md §6).
    open: {
      type: String,
      default: '09:00',
    },
    close: {
      type: String,
      default: '17:00',
    },
  },
  { _id: false },
);

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      // Calendar date only ("YYYY-MM-DD"), not a specific instant — a
      // holiday is the same calendar day regardless of what time zone's
      // clock you're reading, which is why this isn't a Date/timestamp.
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(HOLIDAY_TYPE),
      default: HOLIDAY_TYPE.PUBLIC,
    },
  },
  { timestamps: true },
);

const businessHoursSchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      default: 'UTC',
    },
    weeklySchedule: {
      type: [daySchema],
      default: () =>
        DAYS_OF_WEEK.map((day) => ({
          day,
          enabled: !['SATURDAY', 'SUNDAY'].includes(day),
          open: '09:00',
          close: '17:30',
        })),
    },
    holidays: {
      type: [holidaySchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Singleton document — only one Business Hours record should ever exist
// (BUSINESS_HOURS.md doesn't describe multiple locations; "Multiple
// Locations" is explicitly Future, §21).
const BusinessHours = mongoose.model('BusinessHours', businessHoursSchema, 'business_hours');

module.exports = BusinessHours;
