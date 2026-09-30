// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { buildUrl } from "../../utils/url";
import { MultilangData } from "../language/language-data-service";
import { ListResponse } from "./types-v1-common";
import { map, Observable, shareReplay } from "rxjs";
import { fromFetch } from "rxjs/fetch";


export interface AccommodationInfo {
  Id: string;
  Self: string;

  Active: boolean;
  Review: null;
  HasRoom: boolean;
  AccoType: {
    Id: string; // "HotelPension",
    Self: string; // "https://tourism.opendatahub.com/v1/AccommodationTypes/HotelPension"
  };

  Altitude: number;
  BadgeIds: null;
  BoardIds: null;
  Features: [];
  Latitude: number; // 46.63437271118164,
  Longitude: number; // 11.542257308959961,

  RatePlan: null;
  TVMember: null;
  ThemeIds: [];
  GpsPoints: {
    position: {
      Default: null;
      Gpstype: "position";
      Altitude: number; // 856.0,
      Geometry: null;
      Latitude: number; // 46.63437271118164,
      Longitude: number; // 11.542257308959961,
      AltitudeUnitofMeasure: "m" | string;
    };
  };
  IsCamping: null;
  Shortname: string;
  SmgActive: boolean;
  AccoBadges: [];
  AccoBoards: [];
  AccoDetail: MultilangData<{
    Fax: null;
    Vat: null;
    Zip: string; // "39040";
    City: string; // "Villanders";
    Name: string; // "Granpanorama-Hotel Stephanshof";
    Email: null;
    Phone: string; // "+39 0472 843150";
    Mobile: null;
    Street: string; // "St. Stefan 12";
    Website: string; // "https://www.stephanshof.com";
    // "Language": "en",
    Lastname: null;
    Longdesc: null;
    MetaDesc: null;
    Firstname: null;
    MetaTitle: null;
    Shortdesc: null;
    CountryCode: string; // "IT";
    NameAddition: null;
  }>;

  AccoTypeId: "HotelPension";
  IsBookable: null;
  LastChange: string; // "2026-09-20T22:37:28.5139215+00:00",
  AccoCategory: {
    Id: string; // "4stars",
    Self: string; // "https://tourism.opendatahub.com/v1/AccommodationTypes/4stars"
  };
  AccoOverview: null;
  AccoRoomInfo: null;
  GastronomyId: null;
  HasApartment: boolean;
  IsGastronomy: null;
  MainLanguage: null;
  TrustYouScore: null;
  TrustYouState: null;
  AccoCategoryId: string; // "4stars";
  AccoProperties: {
    HasDorm: boolean;
    HasRoom: boolean;
    TVMember: null;
    IsCamping: null;
    HasPitches: boolean;
    IsBookable: null;
    HasApartment: boolean;
    IsGastronomy: null;
    IsAccommodation: null;
  };
  RelatedContent: null;
  Representation: number; // 0
  TrustYouActive: null;
  IndependentData: null;
  IsAccommodation: null;
  TourismVereinId: null;
  TrustYouResults: null;
  MssResponseShort: [];
  MarketingGroupIds: null;
  OperationSchedule: null;
  AccoBookingChannel: null;
  SpecialFeaturesIds: [];
  AccoSpecialFeatures: [];
  AdditionalProperties: null;

  ImageGallery: Array<{
    Width: null;
    Height: null;
    License: null;
    ValidTo: null;
    ImageUrl: string; // "https://media-v2.discover.swiss/rawmedia/ctd/8705a5326c050244a82e16e30f6b9c8c7ac93e85_9cea1a6d_5876_4e78_9355_8b0aec925087.jpeg",
    CopyRight: string; //  "VISIT Glarnerland AG",
    ImageDesc: MultilangData<string>; // "10- Bettzimmer im Restaurant Sternen (ctd_c43bdd6_image)"
    ImageName: string; // "img_s9t_sedrttg",
    ImageTags: null;
    ValidFrom: null;
    ImageTitle: {};
    ImageSource: string; // "VISIT Glarnerland AG"
    IsInGallery: null;
    ImageAltText: {};
    ListPosition: null;
    LicenseHolder: null;
  }>;
  // NOTE: that is not all the field from the response
}

// origin is used to track usage and traffic patterns
const ORIGIN = 'webcomp-brennerlec';


/**
 *
 */
export class AccommodationsService {

  static _instance?: AccommodationsService;
  private _cache$?: Observable<AccommodationInfo[]>;

  static getInstance() {
    if (!AccommodationsService._instance) {
      AccommodationsService._instance = new AccommodationsService();
    }
    return AccommodationsService._instance;
  }

  /**
   */
  getAccommodationsInfo$(): Observable<AccommodationInfo[]> {

    if (!this._cache$) {
      this._cache$ = fromFetch<ListResponse<AccommodationInfo>>(buildUrl(`https://tourism.opendatahub.com/v1/Accommodation`, {
        pagenumber: 1,
        pagesize: -1, // -1 means no limit
        // pagesize: 10, // TODO: debug
        origin: ORIGIN,
      }), {
        // The selector allows you to parse the body directly
        selector: (response) => response.json()
      }).pipe(
        map(response => response?.Items || []),
        shareReplay({refCount: false, bufferSize: 1}),
      );
    }
    return this._cache$;
  }


}
