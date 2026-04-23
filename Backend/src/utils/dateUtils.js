/**
 * Date Utilities
 * Common date manipulation functions
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const relativeTime = require('dayjs/plugin/relativeTime');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

// Setup plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Set default timezone
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'; // Vietnam timezone

/**
 * Get current date and time
 * @param {string} format - Output format (default: YYYY-MM-DD HH:mm:ss)
 * @returns {string} Formatted current date and time
 */
exports.now = (format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs().tz(DEFAULT_TIMEZONE).format(format);
};

/**
 * Format a date
 * @param {Date|string} date - Date to format
 * @param {string} format - Output format (default: YYYY-MM-DD)
 * @returns {string} Formatted date
 */
exports.formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;
  return dayjs(date).tz(DEFAULT_TIMEZONE).format(format);
};

/**
 * Parse a date string
 * @param {string} dateStr - Date string to parse
 * @param {string} format - Format of the input date string
 * @returns {Date} Parsed date
 */
exports.parseDate = (dateStr, format) => {
  if (!dateStr) return null;
  return format 
    ? dayjs(dateStr, format).tz(DEFAULT_TIMEZONE).toDate()
    : dayjs(dateStr).tz(DEFAULT_TIMEZONE).toDate();
};

/**
 * Add time to a date
 * @param {Date|string} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit (day, month, year, etc)
 * @returns {Date} New date
 */
exports.addTime = (date, amount, unit = 'day') => {
  if (!date) return null;
  return dayjs(date).tz(DEFAULT_TIMEZONE).add(amount, unit).toDate();
};

/**
 * Subtract time from a date
 * @param {Date|string} date - Base date
 * @param {number} amount - Amount to subtract
 * @param {string} unit - Unit (day, month, year, etc)
 * @returns {Date} New date
 */
exports.subtractTime = (date, amount, unit = 'day') => {
  if (!date) return null;
  return dayjs(date).tz(DEFAULT_TIMEZONE).subtract(amount, unit).toDate();
};

/**
 * Get start of a time unit for a date
 * @param {Date|string} date - Base date
 * @param {string} unit - Unit (day, week, month, year)
 * @returns {Date} Start of unit date
 */
exports.startOf = (date, unit = 'day') => {
  if (!date) return null;
  return dayjs(date).tz(DEFAULT_TIMEZONE).startOf(unit).toDate();
};

/**
 * Get end of a time unit for a date
 * @param {Date|string} date - Base date
 * @param {string} unit - Unit (day, week, month, year)
 * @returns {Date} End of unit date
 */
exports.endOf = (date, unit = 'day') => {
  if (!date) return null;
  return dayjs(date).tz(DEFAULT_TIMEZONE).endOf(unit).toDate();
};

/**
 * Check if a date is after another date
 * @param {Date|string} date - Date to check
 * @param {Date|string} compareDate - Date to compare against
 * @returns {boolean} True if date is after compareDate
 */
exports.isAfter = (date, compareDate) => {
  if (!date || !compareDate) return false;
  return dayjs(date).isAfter(dayjs(compareDate));
};

/**
 * Check if a date is before another date
 * @param {Date|string} date - Date to check
 * @param {Date|string} compareDate - Date to compare against
 * @returns {boolean} True if date is before compareDate
 */
exports.isBefore = (date, compareDate) => {
  if (!date || !compareDate) return false;
  return dayjs(date).isBefore(dayjs(compareDate));
};

/**
 * Get the difference between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @param {string} unit - Unit of measurement
 * @returns {number} Difference in the specified unit
 */
exports.diff = (date1, date2, unit = 'day') => {
  if (!date1 || !date2) return null;
  return dayjs(date1).diff(dayjs(date2), unit);
};

/**
 * Get human-readable time difference
 * @param {Date|string} date - Date to get relative time for
 * @param {Date|string} baseDate - Base date to compare against
 * @returns {string} Human-readable relative time
 */
exports.fromNow = (date, baseDate = null) => {
  if (!date) return null;
  return baseDate 
    ? dayjs(date).from(dayjs(baseDate))
    : dayjs(date).fromNow();
};

/**
 * Format a date for database storage
 * @param {Date|string} date - Date to format
 * @returns {string} Date formatted for database (YYYY-MM-DD)
 */
exports.formatDateForDB = (date) => {
  if (!date) return null;
  return dayjs(date).tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');
};