const businessHoursRepository = require('../repository/businessHoursRepository');
const { DAYS_OF_WEEK, BUSINESS_STATUS } = require('../constants/settings');
const { AppError, NotFoundError } = require('../../../shared/errors');

const SOON_THRESHOLD_MINUTES = 30;
const MAX_SLOT_SEARCH_DAYS = 14;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Extracts the wall-clock day/date/time a UTC instant corresponds to in a
// given IANA timezone — BUSINESS_HOURS.md §6: "The server timezone should
// never be assumed." Uses only Intl (no new dependency).
function getLocalParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const map = {};
  formatter.formatToParts(date).forEach((part) => {
    map[part.type] = part.value;
  });

  // Some ICU builds render midnight as hour "24" with hour12:false — fold
  // it back to 0 rather than let it silently produce an invalid HH:MM.
  const hour = Number(map.hour) % 24;

  return {
    dayOfWeek: map.weekday.toUpperCase(),
    dateStr: `${map.year}-${map.month}-${map.day}`,
    minutesSinceMidnight: hour * 60 + Number(map.minute),
  };
}

// Reverse direction: a wall-clock date/time in a given timezone -> the UTC
// instant it corresponds to. Only Intl is available (no luxon/date-fns-tz
// in this project), so this uses the standard guess-then-correct trick:
// treat the wall-clock values as if they were UTC, see how far off that
// guess lands when re-read back in the target timezone, and shift by the
// difference. Accurate for virtually every real case; the one known edge
// case is the ambiguous/skipped local hour during a DST transition itself
// (see docs/DATABASE.md's Business Hours section).
function localToUtcDate(dateStr, timeStr, timezone) {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const guessed = getLocalParts(naiveUtc, timezone);
  const targetMinutes = timeToMinutes(timeStr);

  let diffMinutes = targetMinutes - guessed.minutesSinceMidnight;
  if (diffMinutes > 12 * 60) diffMinutes -= 24 * 60;
  if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;

  return new Date(naiveUtc.getTime() + diffMinutes * 60000);
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

class BusinessHoursService {
  async get() {
    const existing = await businessHoursRepository.getSingleton();
    if (existing) return existing;

    return businessHoursRepository.create({});
  }

  async update(updates) {
    const businessHours = await this.get();

    if (updates.timezone !== undefined) {
      this.assertValidTimezone(updates.timezone);
      businessHours.timezone = updates.timezone;
    }

    if (updates.weeklySchedule !== undefined) {
      this.assertValidWeeklySchedule(updates.weeklySchedule);
      businessHours.weeklySchedule = updates.weeklySchedule;
    }

    await businessHours.save();
    return businessHours;
  }

  // Intl.supportedValuesOf('timeZone') omits legitimate zones such as 'UTC'
  // in some ICU builds, so validity is checked by construction instead —
  // Intl.DateTimeFormat throws RangeError for anything it can't resolve.
  assertValidTimezone(timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      throw new AppError(`"${timezone}" is not a recognized IANA timezone.`, 400);
    }
  }

  // BUSINESS_HOURS.md §18: "Opening time before closing time."
  assertValidWeeklySchedule(weeklySchedule) {
    const providedDays = new Set(weeklySchedule.map((entry) => entry.day));

    if (providedDays.size !== DAYS_OF_WEEK.length || !DAYS_OF_WEEK.every((day) => providedDays.has(day))) {
      throw new AppError('weeklySchedule must include exactly one entry for each day of the week.', 400);
    }

    weeklySchedule.forEach((entry) => {
      if (!entry.enabled) return;

      if (!TIME_PATTERN.test(entry.open) || !TIME_PATTERN.test(entry.close)) {
        throw new AppError(`${entry.day}: open/close must be in HH:MM 24-hour format.`, 400);
      }

      if (timeToMinutes(entry.open) >= timeToMinutes(entry.close)) {
        throw new AppError(`${entry.day}: opening time must be before closing time.`, 400);
      }
    });
  }

  assertValidHolidayDate(date) {
    if (!DATE_PATTERN.test(date) || Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime())) {
      throw new AppError('Holiday date must be a valid YYYY-MM-DD calendar date.', 400);
    }
  }

  async addHoliday({ name, date, type }) {
    this.assertValidHolidayDate(date);

    const businessHours = await this.get();
    businessHours.holidays.push({ name, date, type });
    await businessHours.save();

    return businessHours;
  }

  async removeHoliday(holidayId) {
    const businessHours = await this.get();
    const holiday = businessHours.holidays.id(holidayId);

    if (!holiday) {
      throw new NotFoundError('Holiday not found');
    }

    holiday.deleteOne();
    await businessHours.save();

    return businessHours;
  }

  // BUSINESS_HOURS.md §7, §10 — the core Availability Service computation.
  // Holidays override the weekly schedule (§8); everything is evaluated in
  // the configured timezone, never the server's.
  async getStatus(atDate = new Date()) {
    const businessHours = await this.get();
    return this.computeStatus(businessHours, atDate);
  }

  // Pure, synchronous variant of getStatus — takes an already-loaded
  // `businessHours` document so a caller classifying many timestamps at
  // once (e.g. Analytics' Business Hours metrics, ANALYTICS.md §13) can
  // fetch the singleton exactly once instead of once per timestamp.
  computeStatus(businessHours, atDate = new Date()) {
    const { dayOfWeek, dateStr, minutesSinceMidnight } = getLocalParts(atDate, businessHours.timezone);

    const holiday = businessHours.holidays.find((entry) => entry.date === dateStr);
    if (holiday) {
      return { status: BUSINESS_STATUS.HOLIDAY, timezone: businessHours.timezone, holiday: holiday.name };
    }

    const daySchedule = businessHours.weeklySchedule.find((entry) => entry.day === dayOfWeek);
    if (!daySchedule || !daySchedule.enabled) {
      return { status: BUSINESS_STATUS.CLOSED, timezone: businessHours.timezone };
    }

    const openMinutes = timeToMinutes(daySchedule.open);
    const closeMinutes = timeToMinutes(daySchedule.close);

    if (minutesSinceMidnight < openMinutes) {
      const status =
        openMinutes - minutesSinceMidnight <= SOON_THRESHOLD_MINUTES
          ? BUSINESS_STATUS.OPENING_SOON
          : BUSINESS_STATUS.CLOSED;
      return { status, timezone: businessHours.timezone, opensAt: daySchedule.open };
    }

    if (minutesSinceMidnight >= closeMinutes) {
      return { status: BUSINESS_STATUS.CLOSED, timezone: businessHours.timezone };
    }

    const status =
      closeMinutes - minutesSinceMidnight <= SOON_THRESHOLD_MINUTES
        ? BUSINESS_STATUS.CLOSING_SOON
        : BUSINESS_STATUS.OPEN;
    return { status, timezone: businessHours.timezone, closesAt: daySchedule.close };
  }

  async isOpen(atDate = new Date()) {
    const { status } = await this.getStatus(atDate);
    return status === BUSINESS_STATUS.OPEN || status === BUSINESS_STATUS.CLOSING_SOON;
  }

  // BUSINESS_HOURS.md §11: "Callbacks should be scheduled within future
  // business hours." With `proposedAt`, validates that instant; without
  // one, suggests the next upcoming open windows as real UTC instants
  // (so the frontend can render them in the visitor's own local time).
  async getCallbackAvailability({ proposedAt, count = 5 } = {}) {
    const businessHours = await this.get();

    if (proposedAt) {
      const proposedDate = new Date(proposedAt);
      if (Number.isNaN(proposedDate.getTime())) {
        throw new AppError('proposedAt must be a valid date/time.', 400);
      }

      if (proposedDate.getTime() <= Date.now()) {
        return { isAvailable: false, reason: 'The proposed time must be in the future.' };
      }

      const { dayOfWeek, dateStr, minutesSinceMidnight } = getLocalParts(proposedDate, businessHours.timezone);

      const holiday = businessHours.holidays.find((entry) => entry.date === dateStr);
      if (holiday) {
        return { isAvailable: false, reason: `The business is closed for ${holiday.name}.` };
      }

      const daySchedule = businessHours.weeklySchedule.find((entry) => entry.day === dayOfWeek);
      if (
        !daySchedule ||
        !daySchedule.enabled ||
        minutesSinceMidnight < timeToMinutes(daySchedule.open) ||
        minutesSinceMidnight >= timeToMinutes(daySchedule.close)
      ) {
        return { isAvailable: false, reason: 'The proposed time falls outside business hours.' };
      }

      return { isAvailable: true };
    }

    const slots = [];
    const nowParts = getLocalParts(new Date(), businessHours.timezone);
    let cursorDate = nowParts.dateStr;

    for (let i = 0; i < MAX_SLOT_SEARCH_DAYS && slots.length < count; i += 1) {
      const { dayOfWeek } = getLocalParts(new Date(`${cursorDate}T12:00:00.000Z`), businessHours.timezone);
      const isHoliday = businessHours.holidays.some((entry) => entry.date === cursorDate);
      const daySchedule = businessHours.weeklySchedule.find((entry) => entry.day === dayOfWeek);

      if (!isHoliday && daySchedule?.enabled) {
        const windowOpen = localToUtcDate(cursorDate, daySchedule.open, businessHours.timezone);
        const windowClose = localToUtcDate(cursorDate, daySchedule.close, businessHours.timezone);

        if (windowClose.getTime() > Date.now()) {
          slots.push({
            date: cursorDate,
            opensAt: (windowOpen.getTime() > Date.now() ? windowOpen : new Date()).toISOString(),
            closesAt: windowClose.toISOString(),
          });
        }
      }

      cursorDate = addDays(cursorDate, 1);
    }

    return { slots };
  }
}

module.exports = new BusinessHoursService();
