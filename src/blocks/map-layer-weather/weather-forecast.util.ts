// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { WeatherIconFont, WeatherIconName } from "./icon-font";
import { Measurement } from "../../data/noi/types-v1-common";
import { WeatherForecast, WeatherForecastMeasurementType } from "../../data/noi/WeatherForecase";


/**
 * NOTE: this is not a reliable way to calculate sunrise and sundown
 */
export function getClearSkyType(now: Date, sunshineHours: number) {
  // 1. Establish Solar Noon for Italy based on the season
  // Summer (CEST) solar noon is around 13.25 (1:15 PM). Winter (CET) is around 12.25 (12:15 PM).
  // const solarNoon = isSummerTime ? 13.25 : 12.25;
  const solarNoon = 13.75;

  // 2. Calculate approximate sunrise and sunset using the duration
  const halfDaylight = sunshineHours / 2;
  const sunrise = solarNoon - halfDaylight;
  const sunset = solarNoon + halfDaylight;

  // 3. Get the current local hour in Italy (expressed as a decimal, e.g., 14.5 for 14:30)
  const currentHour = now.getHours() + (now.getMinutes() / 60);

  // 4. Determine if it is currently day or night
  if (currentHour >= sunrise && currentHour < sunset) {
    return 'day';
  } else {
    return 'night';
  }
}


/**
 */
export function _getDailyMeasurement<T>(measurements: Measurement<T>[]) {

  const measurementDaily = (measurements || [])
    .filter(m => m.mperiod === 86400);

  if (measurementDaily.length > 1) {
    console.warn('Too many daily measurements:', measurements);
  }
  return measurementDaily[0];
}

/**
 */
export function _getMeasurementRelevant<T>(measurements: Measurement<T>[] | undefined, dateTime: Date) {

  const measurementDesc = (measurements || [])
    .filter(m => m.mperiod !== 86400)
    .sort((a, b) => b.mvalidtime.localeCompare(a.mvalidtime)); // date is JS-date string, which is safe to compare

  const timeLookup = dateTime.getTime();
  for (const m of measurementDesc) {
    const mTime = new Date(m.mvalidtime).getTime();
    if (mTime <= timeLookup) {
      if ((mTime + m.mperiod) >= timeLookup) {
        return m;
      }
    }
  }
  return null;
}


/**
 */
export function _getMeasurementLatest<T>(measurements: Measurement<T>[] | undefined, dateTime: Date) {

  const measurementDesc = (measurements || [])
    .filter(m => m.mperiod !== 86400)
    .sort((a, b) => b.mvalidtime.localeCompare(a.mvalidtime)); // date is JS-date string, which is safe to compare

  const timeLookup = dateTime.getTime();
  for (const m of measurementDesc) {
    const mTime = new Date(m.mvalidtime).getTime();
    if (mTime <= timeLookup) {
      return m;
    }
  }
  return null;
}

/**
 */
export function _getMeasurementAny<T>(measurements: Measurement<T>[] | undefined, dateTime: Date): {
  measurement: Measurement<T>,
  isRelevant: boolean
} | null {

  const measurementDesc = (measurements || [])
    .filter(m => m.mperiod !== 86400)
    .sort((a, b) => b.mvalidtime.localeCompare(a.mvalidtime)); // date is JS-date string, which is safe to compare

  const timeLookup = dateTime.getTime();
  for (const m of measurementDesc) {
    const mTime = new Date(m.mvalidtime).getTime();
    if (mTime <= timeLookup) {
      // const isRelevant = (mTime + m.mperiod) >= timeLookup;
      const isRelevant = Math.abs(mTime - timeLookup) <= (24 * 60 * 60 * 1000);
      return {measurement: m, isRelevant};
    }
  }
  return null;
}


/**
 *
 */
export function getWindDirectionLabel(degrees: number | null | undefined, intlLabels?: string) {
  if (degrees === null || degrees === undefined) {
    return '';
  }
  // 1. Normalize the degrees to keep them strictly between 0 and 359
  const normalizedDegrees = (degrees % 360 + 360) % 360;

  // 2. Define the 8 directions in clockwise order starting from North
  const directions = intlLabels ? intlLabels.split(',') : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  // 3. Divide by 45 degrees per segment, and shift by half a segment (22.5°)
  // so that North centers perfectly around 0° / 360°
  const index = Math.round(normalizedDegrees / 45) % 8;

  return directions[index];
}


/**
 * examples:
 // overall
 | 'sunny'
 | 'partly cloudy'
 | 'cloudy'
 | 'very cloudy'

 // overcast
 | 'overcast'
 | 'overcast with light rain'
 | 'overcast with moderate rain'
 | 'overcast with heavy rain' // never appeared yet

 | 'overcast with light snow'
 | 'overcast with moderate snow'
 | 'overcast with heavy snow' // never appeared yet

 | 'overcast with rain and snow'

 // cloudy
 | 'cloudy with light rain' // never appeared yet
 | 'cloudy with moderate rain'
 | 'cloudy with heavy rain' // never appeared yet
 | 'cloudy with light snow'
 | 'cloudy with moderate snow' // never appeared yet
 | 'cloudy with heavy snow'

 | 'cloudy, thunderstorms with moderate showers'
 | 'cloudy with rain and snow'
 */
export function getIconName(description: string, type: 'day' | 'night'): WeatherIconName {
  if (!description) {
    return '';
  }
  const lc = (description + '').toLowerCase();

  if (lc === 'sunny') {
    return type === 'night' ? 'icon-moon' : 'icon-sunny';
  }
  if (lc === 'partly cloudy') {
    return type === 'night' ? 'icon-cloudy-night' : 'icon-cloudy-day';
  }
  if (lc === 'cloudy' || lc === 'very cloudy') {
    return 'icon-cloudy';
  }
  if (lc.includes('rain and snow')) {
    return 'icon-rain-snow';
  }
  if (lc.includes('thunderstorms')) {
    if (lc.includes('moderate')) {
      return 'icon-rain-bolt-2';
    } else {
      return 'icon-rain-bolt-1';
    }
  }

  const isCloudy = lc.includes('cloudy') || lc.includes('overcast');
  const isSnow = lc.includes('snow');
  const isRain = lc.includes('rain');
  let level = 2; // moderate
  if (lc.includes('light')) {
    level = 1;
  }
  if (lc.includes('heavy')) {
    level = 3;
  }
  if (isCloudy) {
    if (isRain) {
      return 'icon-rain-' + level as any;
    }
    if (isSnow) {
      return 'icon-snow-' + level as any;
    }
  }
  return '';
}


export function getIconContent(description: string, type: 'day' | 'night'): string {
  return WeatherIconFont.icons[getIconName(description, type)];
}


export interface DayPointForecast {
  'time': string;
  'air-temperature'?: number;
  'wind-direction'?: number;
  'wind-speed'?: number;
  'precipitation-probability'?: number;
  'precipitation-sum'?: number;
  'qualitative-forecast'?: number;
}

/**
 */
export function calculateDayPoints(point: WeatherForecast): DayPointForecast[] {
  const _uniqueDayPoints: string[] = [];

  function __collectTime(type: WeatherForecastMeasurementType) {
    for (const m of point.sdatatypes[type]?.tmeasurements) {
      if (m.mperiod === 86400) {
        // skip daily points
        continue;
      }
      if (!_uniqueDayPoints.includes(m.mvalidtime)) {
        _uniqueDayPoints.push(m.mvalidtime);
      }
    }
  }

  __collectTime('forecast-air-temperature');
  __collectTime('forecast-wind-direction');
  __collectTime('forecast-wind-speed');
  __collectTime('forecast-precipitation-probability');
  __collectTime('forecast-precipitation-sum');
  __collectTime('qualitative-forecast');

  // sort by time
  const _uniqueDayPointsSorted = _uniqueDayPoints.sort((a, b) => a.localeCompare(b));

  function __getPointMeasurement(type: WeatherForecastMeasurementType, dp: string) {
    return (point.sdatatypes[type]?.tmeasurements || [])?.find(m => m.mvalidtime === dp);
  }

  const points: DayPointForecast[] = [];
  for (const dp of _uniqueDayPointsSorted) {
    const pointData: DayPointForecast = {
      'time': dp,
      'air-temperature': __getPointMeasurement('forecast-air-temperature', dp)?.mvalue,
      'wind-direction': __getPointMeasurement('forecast-wind-direction', dp)?.mvalue,
      'wind-speed': __getPointMeasurement('forecast-wind-speed', dp)?.mvalue,
      'precipitation-probability': __getPointMeasurement('forecast-precipitation-probability', dp)?.mvalue,
      'precipitation-sum': __getPointMeasurement('forecast-precipitation-sum', dp)?.mvalue,
      'qualitative-forecast': __getPointMeasurement('qualitative-forecast', dp)?.mvalue,
    };
    points.push(pointData);
  }
  return points;
}
