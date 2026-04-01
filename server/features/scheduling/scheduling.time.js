import {
  DEFAULT_SCHEDULE_TIME_OF_DAY,
  DEFAULT_SCHEDULE_TIMEZONE,
  SCHEDULE_TYPE_ONE_TIME,
  SCHEDULE_TYPE_YEARLY
} from './scheduling.constants.js';

const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RUN_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const formatterCache = new Map();

const fail = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const getFormatter = (timeZone) => {
  const key = String(timeZone || '').trim();
  if (formatterCache.has(key)) {
    return formatterCache.get(key);
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: key,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  formatterCache.set(key, formatter);
  return formatter;
};

const getLocalPartsInTimeZone = (date, timeZone) => {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const byType = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      byType[part.type] = part.value;
    }
  }

  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second)
  };
};

const getOffsetForTimeZoneMs = (date, timeZone) => {
  const local = getLocalPartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second
  );
  return asUtc - date.getTime();
};

const isValidDayForMonth = (year, month, day) => {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= max;
};

export const normalizeTimezone = (value) => {
  const next = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_SCHEDULE_TIMEZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: next }).format(new Date());
    return next;
  } catch {
    fail('Invalid timezone');
  }
};

export const normalizeTimeOfDay = (value) => {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_SCHEDULE_TIME_OF_DAY;
  const match = raw.match(TIME_OF_DAY_REGEX);
  if (!match) {
    fail('timeOfDay must be in HH:mm format');
  }
  return `${match[1]}:${match[2]}`;
};

export const parseRunDateString = (runDate) => {
  if (typeof runDate !== 'string' || !RUN_DATE_REGEX.test(runDate)) {
    fail('runDate must be in YYYY-MM-DD format');
  }

  const [yearRaw, monthRaw, dayRaw] = runDate.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!isValidDayForMonth(year, month, day)) {
    fail('runDate is invalid');
  }

  return { year, month, day, runDate };
};

export const parseYearlyMonthDay = (month, day) => {
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  if (!Number.isInteger(parsedMonth) || !Number.isInteger(parsedDay)) {
    fail('month/day must be integers');
  }
  if (parsedMonth < 1 || parsedMonth > 12) {
    fail('month must be between 1 and 12');
  }
  if (parsedDay < 1 || parsedDay > 31) {
    fail('day must be between 1 and 31');
  }

  return { month: parsedMonth, day: parsedDay };
};

const toUtcDateFromZonedLocal = ({ year, month, day, hour, minute, timeZone }) => {
  if (!isValidDayForMonth(year, month, day)) {
    return null;
  }

  const localWallClock = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = localWallClock;

  for (let i = 0; i < 4; i += 1) {
    const offset = getOffsetForTimeZoneMs(new Date(guess), timeZone);
    const corrected = localWallClock - offset;
    if (Math.abs(corrected - guess) < 1000) {
      guess = corrected;
      break;
    }
    guess = corrected;
  }

  return new Date(guess);
};

export const computeOneTimeNextRunAt = ({
  runDate,
  timeOfDay = DEFAULT_SCHEDULE_TIME_OF_DAY,
  timezone = DEFAULT_SCHEDULE_TIMEZONE,
  fromDate = new Date()
}) => {
  const { year, month, day } = parseRunDateString(runDate);
  const normalizedTime = normalizeTimeOfDay(timeOfDay);
  const normalizedZone = normalizeTimezone(timezone);
  const [hourRaw, minuteRaw] = normalizedTime.split(':');

  const candidate = toUtcDateFromZonedLocal({
    year,
    month,
    day,
    hour: Number(hourRaw),
    minute: Number(minuteRaw),
    timeZone: normalizedZone
  });

  if (!candidate || Number.isNaN(candidate.getTime())) {
    fail('Unable to compute one-time schedule date');
  }

  if (candidate.getTime() <= fromDate.getTime()) {
    return null;
  }

  return candidate;
};

export const computeYearlyNextRunAt = ({
  month,
  day,
  timeOfDay = DEFAULT_SCHEDULE_TIME_OF_DAY,
  timezone = DEFAULT_SCHEDULE_TIMEZONE,
  fromDate = new Date()
}) => {
  const normalizedZone = normalizeTimezone(timezone);
  const normalizedTime = normalizeTimeOfDay(timeOfDay);
  const parsed = parseYearlyMonthDay(month, day);
  const [hourRaw, minuteRaw] = normalizedTime.split(':');
  const nowInZone = getLocalPartsInTimeZone(fromDate, normalizedZone);

  for (let year = nowInZone.year; year < nowInZone.year + 8; year += 1) {
    if (!isValidDayForMonth(year, parsed.month, parsed.day)) {
      continue;
    }
    const candidate = toUtcDateFromZonedLocal({
      year,
      month: parsed.month,
      day: parsed.day,
      hour: Number(hourRaw),
      minute: Number(minuteRaw),
      timeZone: normalizedZone
    });

    if (!candidate || Number.isNaN(candidate.getTime())) {
      continue;
    }
    if (candidate.getTime() > fromDate.getTime()) {
      return candidate;
    }
  }

  fail('Unable to compute next yearly schedule');
};

export const computeNextRunAt = ({
  scheduleType,
  runDate,
  month,
  day,
  timeOfDay = DEFAULT_SCHEDULE_TIME_OF_DAY,
  timezone = DEFAULT_SCHEDULE_TIMEZONE,
  fromDate = new Date()
}) => {
  if (scheduleType === SCHEDULE_TYPE_ONE_TIME) {
    return computeOneTimeNextRunAt({ runDate, timeOfDay, timezone, fromDate });
  }

  if (scheduleType === SCHEDULE_TYPE_YEARLY) {
    return computeYearlyNextRunAt({ month, day, timeOfDay, timezone, fromDate });
  }

  fail('Invalid scheduleType');
};

