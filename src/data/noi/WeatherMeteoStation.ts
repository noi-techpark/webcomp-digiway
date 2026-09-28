// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Datatype, Station } from "./types-v1-common";

export type WeatherCurrentMeasurementType =
  'air-humidity'
  | 'air-temperature'
  | 'air-temperature-max'
  | 'air-temperature-min'
  | 'snow-level'
  | 'wind-direction'
  | 'wind-gust-speed'
  | 'wind-speed'

  | "atmospheric-pressure-reduced"
  | "global-radiation"
  | "precipitation"
  | "sunshine-duration"
  | "water-level"
  | "water-temperature"
  | "flow-rate"
  | "suspended-solids-in-watercourse"
  | "hydrometric-level"
  | "atmospheric-pressure"
  | "rainfall-duration"

  // ?
  | "air_temperature"
  | "global_radiation"
  | "relative_humidity"
  | "wind10m_direction"
  | "wind10m_speed"
  | "snow_depth"

/**
 *
 */
export interface WeatherMeteoStation extends Station<{ name_en: string; name_de: string; name_it: string }> {
  sdatatypes: {
    [key in WeatherCurrentMeasurementType]?: Datatype<number>;
  };
}
