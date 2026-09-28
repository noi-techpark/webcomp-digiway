// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface OtpStation {
  gtfsId: string;
  code: string;

  lat: number;
  lon: number;
  name: string;
  vehicleMode: string; // NOTE: can be multiple
  platformCode: string | null; // always null
  // routes?: OtpRoute[]; // Routes which pass through this stop
  // stops?: OtpStop[]; // Returns all stops that are children of this station (Only applicable for stations)

  // NOTE: based on OtpService - 'stoptimesForPatterns' can be 'exploded' to  have exactly one 'stoptimes'
  stoptimesForPatterns?: OtpStoptimesInPattern[];
}

export interface OtpStop {
  gtfsId: string;
  code: string;
  platformCode: string;
  // locationType: LocationType;
  lat: number;
  lon: number;
  name: string;
  vehicleMode: string;
  routes?: OtpRoute[];
  // NOTE: based on OtpService - 'stoptimesForPatterns' can be 'exploded' to  have exactly one 'stoptimes'
  stoptimesForPatterns?: OtpStoptimesInPattern[];
}

export type OtpLocationType = 'ENTRANCE' | 'STATION' | 'STOP';


export interface OtpRoute {
  gtfsId: string;
  shortName: string; // Short name of the route, usually a line number, e.g. 550
  longName: string; // (unused: mostly same as shortName) Long name of the route, e.g. Helsinki-Leppävaara
  // patterns?: OtpPattern[];
}

export interface OtpPattern {
  gtfsId: string;
  name: string;
  headsign: string;
  stops?: OtpStop[];

  directionId: -1 | 0 | 1;
  patternGeometry: OtpGeometry;
  route?: OtpRoute;
  vehiclePositions?: OtpVehiclePosition[]; // Real-time updated position of vehicles that are serving this pattern.
}

export interface OtpStoptimesInPattern {
  pattern: OtpPattern;
  stoptimes: OtpStoptime[];
}

export interface OtpStoptime {
  arrivalDelay: number;
  departureDelay: number; // The offset from the scheduled departure time in seconds. Negative values indicate that the trip is running ahead of schedule
  dropoffType: OtpPickupDropoffType;
  headsign: string;
  pickupType: OtpPickupDropoffType;

  realtime: boolean; // true, if this stoptime has real-time data available
  realtimeArrival: number; // Real-time prediction of arrival time. Format: seconds since midnight of the departure date
  realtimeDeparture: number; // Real-time prediction of departure time. Format: seconds since midnight of the departure date
  // realtimeState: string; // RealtimeState
  scheduledArrival: number; //  Scheduled arrival time. Format: seconds since midnight of the departure date
  scheduledDeparture: number; // Scheduled departure time. Format: seconds since midnight of the departure date
  serviceDay: number; // Departure date of the trip. Format: Unix timestamp (local time) in seconds.

  stop?: OtpStop;
  // stopPosition: number; // The sequence of the stop in the trip.
  stopPositionInPattern: number; // The position of the stop in the pattern

  timepoint: boolean; // true, if this stop is used as a time equalization stop. false otherwise.
  trip?: OtpTrip; // Trip which this stoptime is for TODO
}

export type OtpPickupDropoffType = 'CALL_AGENCY' | 'COORDINATE_WITH_DRIVER' | 'NONE' | 'SCHEDULED';


export interface OtpTrip {
  gtfsId: string;
  tripGeometry?: OtpGeometry;
  stops?: OtpStop[];
  stoptimes?: OtpStoptime[];
  stoptimesForDate?: OtpStoptime[];
  tripHeadsign: string;
  pattern?: OtpPattern;
}


interface OtpGeometry {
  // The number of points in the string
  length: number;
  // List of coordinates of in a Google encoded polyline format (see https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
  points: string;
}

interface OtpVehiclePosition {
  vehicleId: string;
  lastUpdate: string; // When the position of the vehicle was recorded.
  lat: number;
  lon: number;
}
