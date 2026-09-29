/**
 * Formatting Utilities for Vegetable Joint
 * SRS References: NFR-USAB-04, NFR-LOC-02, CON-07, DAT-06
 *
 * Rules:
 * - Currency is Nigerian Naira (₦), formatted with thousands separators and unit (e.g. ₦2,500 / basket).
 * - Timestamps are stored in UTC and displayed in Africa/Lagos (West Africa Time, WAT / UTC+1).
 */

export const TIMEZONE_LAGOS = 'Africa/Lagos';

/**
 * Formats a numeric amount or string into Nigerian Naira (₦) with thousands separators.
 *
 * @param {number|string} amount - Monetary amount in Naira.
 * @param {object} [options]
 * @param {boolean} [options.showDecimalsIfZero=false] - Whether to include kobo (.00) if zero.
 * @param {number} [options.maximumFractionDigits=2] - Maximum decimal places.
 * @returns {string} Formatted currency string, e.g. "₦2,500" or "₦2,500.50".
 */
export function formatCurrency(amount, options = {}) {
  const { showDecimalsIfZero = false, maximumFractionDigits = 2 } = options;
  const num = Number(amount);

  if (amount === null || amount === undefined || isNaN(num)) {
    return '₦0';
  }

  const hasFractions = num % 1 !== 0;

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: hasFractions || showDecimalsIfZero ? 2 : 0,
    maximumFractionDigits,
  }).format(num);
}

/**
 * Formats a price with its corresponding unit as required by NFR-USAB-04.
 * Examples: formatPrice(2500, 'basket') -> "₦2,500 / basket"
 *           formatPrice(1200, 'per bunch') -> "₦1,200 / bunch"
 *
 * @param {number|string} amount - Monetary amount in Naira.
 * @param {string} [unit] - Selling unit (e.g. "basket", "bunch", "kg", "bag").
 * @param {object} [options] - Options passed to formatCurrency.
 * @returns {string} Formatted price with unit, e.g. "₦2,500 / basket".
 */
export function formatPrice(amount, unit, options = {}) {
  const formatted = formatCurrency(amount, options);
  if (!unit) {
    return formatted;
  }

  // Clean redundant "per" or leading slashes if passed from legacy data
  const cleanUnit = unit
    .replace(/^per\s+/i, '')
    .replace(/^\/\s*/, '')
    .trim();

  return `${formatted} / ${cleanUnit}`;
}

/**
 * Parses a currency string or numeric input into a clean numeric float.
 * Example: parsePrice("₦2,500.50") -> 2500.5
 *
 * @param {string|number} formattedString
 * @returns {number} Numeric value in Naira.
 */
export function parsePrice(formattedString) {
  if (typeof formattedString === 'number') {
    return formattedString;
  }
  if (!formattedString) {
    return 0;
  }

  const sanitized = String(formattedString).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats a UTC timestamp into Africa/Lagos (West Africa Time, WAT) string (NFR-LOC-02, DAT-06).
 *
 * @param {string|number|Date} dateInput - ISO string, timestamp number, or Date object.
 * @param {object} [options]
 * @param {'date'|'dateTime'|'time'|'full'} [options.format='date'] - Date format preset.
 * @param {boolean} [options.includeTimezone=true] - Whether to append "WAT".
 * @returns {string} Formatted date string in Lagos timezone.
 */
export function formatDate(dateInput, options = {}) {
  if (!dateInput) return '';

  const date =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

  if (isNaN(date.getTime())) {
    return '';
  }

  const { format = 'date', includeTimezone = true } = options;

  if (format === 'time') {
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE_LAGOS,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return includeTimezone ? `${timeStr} WAT` : timeStr;
  }

  if (format === 'full') {
    const fullStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE_LAGOS,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return includeTimezone ? `${fullStr} WAT` : fullStr;
  }

  if (format === 'dateTime') {
    const dateTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE_LAGOS,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return includeTimezone ? `${dateTimeStr} WAT` : dateTimeStr;
  }

  // Default: date only ("25 Sep 2026")
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_LAGOS,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Convenient helper to format a UTC timestamp as Date & Time in Africa/Lagos.
 * Example: formatDateTime("2026-09-25T14:00:00Z") -> "25 Sept 2026, 15:00 WAT"
 *
 * @param {string|number|Date} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  return formatDate(dateInput, { format: 'dateTime', includeTimezone: true });
}

/**
 * Converts any local date or timestamp into a standard ISO 8601 UTC string for backend storage (DAT-06).
 *
 * @param {string|number|Date} [dateInput=new Date()]
 * @returns {string} ISO UTC timestamp string, e.g. "2026-09-25T14:00:00.000Z".
 */
export function toUtcIso(dateInput = new Date()) {
  const date =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;
  return date.toISOString();
}

/**
 * Formats a plain number with comma thousands separators.
 * Example: formatNumber(12500) -> "12,500"
 *
 * @param {number|string} value
 * @returns {string}
 */
export function formatNumber(value) {
  const num = Number(value);
  return isNaN(num) ? '0' : num.toLocaleString('en-NG');
}

/**
 * Formats a stock count with item unit.
 * Example: formatStock(45, 'bunches') -> "45 bunches"
 *
 * @param {number|string} quantity
 * @param {string} [unit='units']
 * @returns {string}
 */
export function formatStock(quantity, unit = 'units') {
  return `${formatNumber(quantity)} ${unit}`;
}

/**
 * Relative time formatter (e.g. "5 minutes ago", "yesterday").
 *
 * @param {string|number|Date} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';

  const date =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Fallback to formatted Lagos date
  return formatDate(date);
}

/**
 * Formats a rating value (0–5, one decimal place) or returns "No ratings yet" (REV-01).
 *
 * @param {number|string|null|undefined} rating - Numeric rating or string.
 * @returns {string} Formatted rating (e.g. "4.8", "5.0") or "No ratings yet".
 */
export function formatRating(rating) {
  if (rating === null || rating === undefined || rating === '') {
    return 'No ratings yet';
  }
  const num = Number(rating);
  if (isNaN(num) || num <= 0) {
    return 'No ratings yet';
  }
  const clamped = Math.min(5, Math.max(0, num));
  return clamped.toFixed(1);
}

export default {
  TIMEZONE_LAGOS,
  formatCurrency,
  formatPrice,
  parsePrice,
  formatDate,
  formatDateTime,
  toUtcIso,
  formatNumber,
  formatStock,
  formatRelativeTime,
  formatRating,
};
