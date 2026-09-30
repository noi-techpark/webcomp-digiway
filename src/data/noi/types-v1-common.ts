// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later


/**
 * iso-8601 string
 */
export type DateTimeString = string;

export interface ListResponse<T> {
  TotalResults: number;
  TotalPages: number;
  CurrentPage: number;
  PreviousPage: string | null;
  NextPage: string | null;
  // Seed: null;
  Items: T[];
}

/**
 *
 */
export interface FlatDataResponse<T> {
  offset: number;
  limit: number;
  data: T[];
}


export interface Measurement<M = string | number | any> {
  mvalue: M;
  mvalidtime: DateTimeString;
  mtransactiontime: DateTimeString;
  /**
   * Distance in seconds between two measurements
   */
  mperiod: number;
// mprovenance:	Provenance
}

// export interface Provenance {
//
// }
export interface Datatype<MeasurementType = string | number | any> {
  tname: string;
  tunit: string;
  ttype: string;
  tdescription: string;
  tmeasurements: Measurement<MeasurementType>[];
}


export interface Station<Metadata = any> {
  sname: string;
  stype: string;
  scode: string;
  sorigin: string;
  sactive: string;
  scoordinate: Coordinate;
  smetadata: Metadata;
// sparent:Parent;
}

interface Coordinate {
  x: number
  y: number
  srid: number;
}
