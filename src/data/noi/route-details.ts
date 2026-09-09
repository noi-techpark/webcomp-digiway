// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later


export interface RouteDetails {
  Id: string;
  // Geo: Geo; // not needed yet
  // _Meta: Meta; // not needed yet
  Active: boolean;
  Detail: Record<string, LanguageDetail>;
  Source: string; // example: "civis.geoserver"
  TagIds: string[];
  Mapping: Record<string | 'civis.geoserver' | 'siat.provincia.tn.it', MappingDetails>;
  Shortname: string;
  LastChange: string; // ISO Date String
  FirstImport: string; // ISO Date String
  HasLanguage: string[];
  // LicenseInfo: LicenseInfo; // not needed yet
  // AdditionalProperties: null | Record<string, any>; // not needed yet
}


export interface Geo {
  track: TrackOrPosition;
  position: TrackOrPosition;
}

export interface TrackOrPosition {
  Default: boolean;
  Gpstype: string | null;
  Altitude: number | null;
  Geometry: string | null;
  Latitude: number | null;
  Longitude: number | null;
  AltitudeUnitofMeasure: string | null;
}

export interface Meta {
  Id: string;
  Type: string;
  Source: string;
  Reduced: boolean;
  LastUpdate: string; // ISO Date String
  UpdateInfo: UpdateInfo;
}

export interface UpdateInfo {
  Revision: number;
  UpdatedBy: string;
  UpdateSource: string;
  UpdateHistory: UpdateHistoryItem[];
}

export interface UpdateHistoryItem {
  UpdatedBy: string;
  LastUpdate: string; // ISO Date String
  UpdateSource: string;
}

export interface LanguageDetail {
  Title: string;
  BaseText: string;
  Language: string;
}

export interface MappingDetails {
  // various data can be here
  [key: string]: string; // Fallback index signature for varying dynamic keys
}

export interface LicenseInfo {
  Author: string | null;
  License: string;
  ClosedData: boolean;
  LicenseHolder: string | null;
}
