// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Formats a given number or numeric string into a localized string based on the provided language code.
 *
 * @param num - The number or numeric string to format. If undefined or invalid, returns an empty string.
 * @param language - The BCP 47 language tag (e.g., 'en-US', 'de-DE') to determine regional formatting rules.
 * @returns A localized string representation of the number with up to 1 decimal place, or an empty string if invalid.
 */
export function formatNumber(num: number | string | undefined, language: string): string {
  const numSafe = (num as any) * 1;
  if (Number.isNaN(num)) {
    return '';
  }
  try {
    // Uses native browser API to format according to regional rules
    return new Intl.NumberFormat(language, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(numSafe);
  } catch (error) {
    // Fallback safely to English format if the language string is invalid
    return new Intl.NumberFormat('en', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(numSafe);
  }
}

/**
 * Formats a Date object or date string into a localized day/date string (including year, month, and day).
 *
 * @param date - The Date object or date-parseable string to format. Returns an empty string if undefined or null.
 * @param language - The BCP 47 language tag (e.g., 'en-US', 'fr-FR') used to apply regional date layouts.
 * @returns A localized date string, or an English fallback if the language tag is invalid.
 */
export function formatDay(date: Date | string | undefined, language: string): string {
  if (date === undefined || date === null) {
    return '';
  }
  const dateSafe = (typeof date === 'string') ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  };

  try {
    return new Intl.DateTimeFormat(language, options).format(dateSafe);
  } catch (error) {
    // Safe fallback to English format
    return new Intl.DateTimeFormat('en', options).format(dateSafe);
  }
}

/**
 * Formats a Date object or date string into a localized time string displaying hours and minutes.
 *
 * @param date - The Date object or date-parseable string to format. Returns an empty string if undefined or null.
 * @param language - The BCP 47 language tag (e.g., 'en-US', 'ja-JP') used to apply regional 12/24 hour time layouts.
 * @returns A localized time string (e.g., "3:00 PM" or "15:00"), or an English fallback if the language tag is invalid.
 */
export function formatTime(date: Date | string | undefined, language: string): string {
  if (date === undefined || date === null) {
    return '';
  }
  const dateSafe = (typeof date === 'string') ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit'
  };
  try {
    return new Intl.DateTimeFormat(language, options).format(dateSafe);
  } catch (error) {
    // Safe fallback to English format
    return new Intl.DateTimeFormat('en', options).format(dateSafe);
  }
}

/**
 * Formats a Date object or date string into a localized date and time string
 * (including year, month, day, hour, and minute).
 *
 * @param date - The Date object or date-parseable string to format. Returns an empty string if undefined or null.
 * @param language - The BCP 47 language tag (e.g., 'en-US', 'fr-FR') used to apply regional layouts.
 * @returns A localized date and time string, or an English fallback if the language tag is invalid.
 */
export function formatDateTime(date: Date | string | undefined, language: string): string {
  if (date === undefined || date === null) {
    return '';
  }
  const dateSafe = (typeof date === 'string') ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  };

  try {
    return new Intl.DateTimeFormat(language, options).format(dateSafe);
  } catch (error) {
    // Safe fallback to English format
    return new Intl.DateTimeFormat('en', options).format(dateSafe);
  }
}
