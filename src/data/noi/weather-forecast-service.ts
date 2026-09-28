// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { WeatherForecast } from "./WeatherForecase";
import { WeatherCurrentMeasurementType, WeatherMeteoStation } from "./WeatherMeteoStation";
import { buildUrl } from "../../utils/url";
import { AbortHandler } from "./fetch.util";


/**
 * @internal
 */
interface WeatherForecastResponse {
  offset: number;
  limit: number;
  data: {
    WeatherForecast: {
      stations: {
        [stationId: string]: WeatherForecast;
      }
    }
  };
}

/**
 *
 */
export interface MyForecastResponse {
  dateFrom: Date;
  dateTo: Date;
  values: WeatherForecast[];
}


/**
 * @internal
 */
interface WeatherMeteoStationResponse {
  offset: number;
  limit: number;
  data: {
    MeteoStation: {
      stations: {
        [stationId: string]: WeatherMeteoStation;
      }
    }
  };
}

/**
 *
 */
export interface MyMeteoStationsResponse {
  values: WeatherMeteoStation[];
}

// origin is used to track usage and traffic patterns
const ORIGIN = 'webcomp-brennerlec';

/**
 *
 */
export class WeatherForecastService {

  static MAX_DAYS_AHEAD = 5;
  static MIN_DAYS_BEHIND = 0;
  private __getWeatherCurrent = 0;
  private __getWeatherForecastForDay = 0;
  private __getWeatherForecastDayStation = 0;

  /**
   */
  getWeatherForecastForDay(date: Date, cb: (data: MyForecastResponse) => void): AbortHandler {
    const controller = new AbortController();
    const signal = controller.signal;

    const __getWeatherForecastForDay = ++this.__getWeatherForecastForDay;

    this._getWeatherForecastForDay(date, signal)
      .then(data => {
        if (__getWeatherForecastForDay !== this.__getWeatherForecastForDay) {
          // another request is in progress
          return;
        }

        cb(data);
      })
      .catch(e => {
        // catch the abort if you like
        if (e.name === 'AbortError') {
          return null;
        }
        throw e;
      });

    return {
      abort: () => {
        return controller.abort();
      },
    };
  }


  /**
   */
  async _getWeatherForecastForDay(date: Date, abortSignal: AbortSignal): Promise<MyForecastResponse> {

    const range = dayRange(date);

    const predictionResponse = await fetch(buildUrl(`https://mobility.api.opendatahub.com/v2/tree/WeatherForecast/*/${range.from.toISOString()}/${range.to.toISOString()}`, {
      origin: ORIGIN,
      limit: -1,
    }), {signal: abortSignal});
    const predictionData = await (predictionResponse.json() as Promise<WeatherForecastResponse>);

    return {
      dateFrom: range.from,
      dateTo: range.to,
      values: Object.values(predictionData?.data?.WeatherForecast?.stations || {}) as WeatherForecast[],
    };
  }


  /**
   */
  getWeatherCurrent(cb: (data: MyMeteoStationsResponse) => void): AbortHandler {

    const controller = new AbortController();
    const signal = controller.signal;

    const __getWeatherCurrent = ++this.__getWeatherCurrent;

    this._getWeatherCurrent(signal)
      .then(data => {
        if (__getWeatherCurrent !== this.__getWeatherCurrent) {
          // another request is in progress
          return;
        }

        cb(data);
      })
      .catch(e => {
        // catch the abort if you like
        if (e.name === 'AbortError') {
          return null;
        }
        throw e;
      });

    return {
      abort: () => {
        return controller.abort();
      },
    };
  }

  /**
   */
  async _getWeatherCurrent(abortSignal: AbortSignal): Promise<MyMeteoStationsResponse> {

    const predictionResponse = await fetch(buildUrl(`https://mobility.api.opendatahub.com/v2/tree/MeteoStation/*/latest`, {
      origin: ORIGIN,
      limit: -1,
      distinct: true,
      where: 'and(savailable.eq.true,sactive.eq.true,or(sorigin.eq."SIAG",sorigin.eq."meteotrentino"))',
    }), {signal: abortSignal});
    const predictionData = await (predictionResponse.json() as Promise<WeatherMeteoStationResponse>);

    const stations = Object.values(predictionData?.data?.MeteoStation?.stations || {}) as WeatherMeteoStation[];

    // filter stations data not too old
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - 7); // 7 days ago is the earliest

    const stationsRelevant: WeatherMeteoStation[] = [];

    for (const s of stations) {

      const sDatatypesRelevant: WeatherMeteoStation['sdatatypes'] = {};

      for (const _dType in s.sdatatypes) {
        const dType = _dType as WeatherCurrentMeasurementType;

        const measurements = s.sdatatypes[dType]!.tmeasurements;
        const measurementsFiltered = measurements.filter(measurement => {
          const mValid = new Date(measurement.mvalidtime);
          return mValid.getTime() >= earliestDate.getTime();
        });
        if (measurementsFiltered.length > 0) {
          sDatatypesRelevant[dType] = {
            ...s.sdatatypes[dType]!,
            tmeasurements: measurementsFiltered,
          };
        }
      }

      if(Object.keys(sDatatypesRelevant)?.length > 0) {
        stationsRelevant.push({
          ...s,
          sdatatypes: sDatatypesRelevant,
        });
      }

    }

    return {
      values: stationsRelevant,
      // values: Object.values(predictionData?.data?.MeteoStation?.stations || {}) as WeatherMeteoStation[],
    };
  }

  /**
   */
  getWeatherForecastDayStation(date: Date, scode: string, cb: (data: MyForecastResponse) => void): AbortHandler {
    const controller = new AbortController();
    const signal = controller.signal;

    const __getWeatherForecastDayStation = ++this.__getWeatherForecastDayStation;

    this._getWeatherForecastDayStation(date, scode, signal)
      .then(data => {
        if (__getWeatherForecastDayStation !== this.__getWeatherForecastDayStation) {
          // another request is in progress
          return;
        }

        cb(data);
      })
      .catch(e => {
        // catch the abort if you like
        if (e.name === 'AbortError') {
          return null;
        }
        throw e;
      });

    return {
      abort: () => {
        return controller.abort();
      },
    };
  }


  /**
   */
  async _getWeatherForecastDayStation(date: Date, scode: string, abortSignal: AbortSignal): Promise<MyForecastResponse> {
    // https://mobility.api.opendatahub.com/v2/flat/WeatherForecast/*/2026-05-20T00:00:00.000Z/2026-05-20T23:59:00.000Z?limit=-1&where=scode.eq."021118"
    const range = dayRange(date);

    const predictionResponse = await fetch(buildUrl(`https://mobility.api.opendatahub.com/v2/tree/WeatherForecast/*/${range.from.toISOString()}/${range.to.toISOString()}`, {
      origin: ORIGIN,
      limit: -1,
      where: `scode.eq."${scode}"`,
    }), {signal: abortSignal});
    const predictionData = await (predictionResponse.json() as Promise<WeatherForecastResponse>);

    return {
      dateFrom: range.from,
      dateTo: range.to,
      values: Object.values(predictionData?.data?.WeatherForecast?.stations || {}) as WeatherForecast[],
    };
  }

}

/**
 */
function dayRange(date: Date) {

  const dateFrom = new Date(date.getTime());
  dateFrom.setHours(0);
  dateFrom.setMinutes(0);
  dateFrom.setSeconds(0);
  dateFrom.setMilliseconds(0);

  const dateTo = new Date(dateFrom.getTime());
  dateTo.setDate(dateTo.getDate() + 1);
  dateTo.setMilliseconds(-1);

  return {
    from: dateFrom,
    to: dateTo,
  };

}
