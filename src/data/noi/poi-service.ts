// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { buildUrl } from "../../utils/url";
import { MultilangData } from "../language/language-data-service";
import { fromFetch } from 'rxjs/fetch';
import { catchError, EMPTY, Observable, of, shareReplay } from "rxjs";


export interface PoiInfo {
  Id: string;
  Self: string;

  Shortname: string;

  Active: true,
  Detail: MultilangData<{
    Title: string;
    Header: string | null;
    BaseText: string | null;
    Keywords: string | null;
    Language: string; // language code
    MetaDesc: string | null;
    AuthorTip: string | null;
    IntroText: string | null;
    MetaTitle: string | null;
    SubHeader: string | null;
    SafetyInfo: string | null;
    ParkingInfo: string | null;
    GetThereText: string | null;
    EquipmentInfo: string | null;
    AdditionalText: string | null;
    PublicTransportationInfo: string | null;
  }>;
  IsOpen: false,
  // "GpsInfo": [];
  GpsPoints: {
    position: {
      // "Default": null,
      Gpstype: "position",
      Altitude: number;
      Geometry: null,
      Latitude: number;
      Longitude: number;
      AltitudeUnitofMeasure: "m" | string;
    };
  };
  LastChange: string; // "2026-08-14T12:31:49.4693003+00:00";
  VideoItems: {}; // TODO ?

  ContactInfos: MultilangData<{
    Tax: null;
    Url: string; // "http://www.fit181.com";
    Vat: null;
    Area: string; // "St. Ulrich/Ortisei - Val Gardena",
    City: null;
    Email: null;
    Region: null;
    Address: null;
    LogoUrl: null;
    Surname: null;
    ZipCode: null;
    Language: string; // "en";
    Faxnumber: null;
    Givenname: null;
    NamePrefix: null;
    RegionCode: null;
    CompanyName: null;
    CountryCode: null;
    CountryName: string; // "Italy";
    Phonenumber: null;
  }>;
  ImageGallery: any[]; // TODO ?

  BikeTransport: null;
  LiftAvailable: null;
  DistanceLength: null;
  // SyncUpdateMode: "full",
  HasFreeEntrance: boolean;
  AdditionalContact: null;
  AdditionalPoiInfos: MultilangData<{
    Novelty: null;
    PoiType: null;
    SubType: null;
    Language: string; // "en";
    MainType: null;
    Categories: string[];
  }>;

  // NOTE: that is not all the field from the response
}

// origin is used to track usage and traffic patterns
const ORIGIN = 'webcomp-brennerlec';

/**
 *
 */
export class PoiService {

  static _instance?: PoiService;
  private _cache$: { [id: string]: Observable<PoiInfo | null> } = {};

  static getInstance() {
    if (!PoiService._instance) {
      PoiService._instance = new PoiService();
    }
    return PoiService._instance;
  }


  /**
   */
  getPoiById$(id: string): Observable<PoiInfo | null> {

    if (!id) {
      return EMPTY;
    }

    const normalizedId = prepareId(id);

    if (!this._cache$[normalizedId]) {
      this._cache$[normalizedId] = fromFetch<PoiInfo>(buildUrl(`https://tourism.opendatahub.com/v1/ODHActivityPoi/${normalizedId}`, {
        origin: ORIGIN,
      }), {
        // The selector allows you to parse the body directly
        selector: (response) => response.json()
      }).pipe(
        shareReplay({refCount: false, bufferSize: 1}),
        catchError((err) => {
          console.error(err);
          return of(null);
        }),
      );
    }
    return this._cache$[normalizedId];
  }


}

const ID_SUFFIX_TO_REMOVE = '_reduced';

function prepareId(id: string) {
  if (id.toLowerCase().endsWith(ID_SUFFIX_TO_REMOVE)) {
    return id.substring(0, id.length - ID_SUFFIX_TO_REMOVE.length);
  } else {
    return id;
  }
}
