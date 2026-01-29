/**
 * Date utility functions for Thai timezone formatting
 */

/** Thai timezone identifier */
const THAI_TIMEZONE = 'Asia/Bangkok';

/** Thai locale for date formatting */
const THAI_LOCALE = 'th-TH';

/** Default date format options */
const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: THAI_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

/**
 * Convert a UTC date string to Thai timezone formatted string
 *
 * @param utcDateString - ISO 8601 date string in UTC, or null/undefined
 * @returns Formatted date string in Thai timezone (dd/mm/yyyy, hh:mm:ss)
 *
 * @example
 * toThaiTime('2026-01-29T05:00:00.000Z') // => "29/01/2569, 12:00:00"
 * toThaiTime(null) // => current time in Thai timezone
 */
export function toThaiTime(utcDateString: string | undefined | null): string {
  // If no date provided or invalid, return current Thai time
  if (!utcDateString) {
    return new Date().toLocaleString(THAI_LOCALE, DEFAULT_FORMAT_OPTIONS);
  }

  const date = new Date(utcDateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return new Date().toLocaleString(THAI_LOCALE, DEFAULT_FORMAT_OPTIONS);
  }

  return date.toLocaleString(THAI_LOCALE, DEFAULT_FORMAT_OPTIONS);
}

/**
 * Get current time as ISO string
 * @returns ISO 8601 string of current time
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Calculate days since a given date
 * @param dateString - ISO 8601 date string
 * @returns Number of days since the date (floored)
 */
export function daysSince(dateString: string): number {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get a date N days ago as ISO string
 * @param days - Number of days ago
 * @returns ISO 8601 string
 */
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
