// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later


/**
 * Calculates the difference in calendar days between two dates based on the user's local timezone.
 *
 * This function disregards the time of day (hours, minutes, seconds) and evaluates
 * whole calendar dates.
 *
 * @param date1 - The primary date.
 * @param date2 - The date to subtract from the primary date.
 * @returns The signed number of calendar days between the two dates (positive if date1 is after date2).
 */
export function diffInDays(date1: Date, date2: Date) {
  const date1Copy = new Date(date1.getTime());
  const date2Copy = new Date(date2.getTime());

  // Disregard time hours/minutes to safely evaluate calendar days
  date1Copy.setHours(0, 0, 0, 0);
  date2Copy.setHours(0, 0, 0, 0);

  const differenceInDays = (date1Copy.getTime() - date2Copy.getTime()) / (24 * 60 * 60 * 1000);

  // Since a DST shift only alters a day by +-1 hour, the fraction will always be very close to the true integer.
  // Math.round() safely snaps it to the correct calendar day count
  return Math.round(differenceInDays);
}


export function getSecondsSinceMidnight(date?: Date) {
  const _date = date || new Date();
  const hours = _date.getHours();
  const minutes = _date.getMinutes();
  const seconds = _date.getSeconds();

  return (hours * 3600) + (minutes * 60) + seconds;
}
