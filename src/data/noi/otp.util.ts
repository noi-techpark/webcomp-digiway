// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { formatTime } from "../../utils/intl";

/**
 * Convert raw transit seconds into a localized string.
 *
 * @param secondsSinceMidnight - Number of seconds elapsed since 00:00:00.
 * @param language - BCP 47 language tag (e.g., 'en-US', 'de-DE').
 */
export function formatTransitSeconds(secondsSinceMidnight: number, language: string): string {
  // 1. Create a date object initialized to today
  const date = new Date();

  // 2. Reset time to midnight, then add your elapsed seconds directly into the seconds argument
  date.setHours(0, 0, secondsSinceMidnight, 0);

  // 3. Pass the valid Date object directly to your internationalizer
  return formatTime(date, language);
}


/**
 */
export function formatDelaySeconds(secondsDelay: number): string {
  const sign = secondsDelay < 0 ? '-' : '+';
  const secondsDelayAbs = Math.abs(secondsDelay);

  const minutes = Math.floor(secondsDelayAbs / 60);
  const seconds = Math.floor(secondsDelayAbs % 60);

  const minutesStr = minutes !== 0 ? minutes + "' " : '';
  const secondsStr = seconds !== 0 ? seconds + '"' : '';

  return sign + minutesStr + secondsStr;
}
