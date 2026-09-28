// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { buildUrl } from "../../utils/url";
import { AbortHandler } from "./fetch.util";

interface ChargerListResponse {
  last_updated: number;
  ttl: number;
  version: string; // semver
  data: {
    stations: ChargerStation[];
  };
}


export interface ChargerStation {
  "station_id": string; // "DW-000027",
  "name": string; //  "San Vigilio Hotel Sport",
  "lat": number; // 46.698061,
  "lon": number; // 11.934766,
  "address": string; // "Strada al Plan Dessora",
  "city": string; // "San Vigilio (marebbe)",
  "accessType": string; // "PRIVATE_WITHPUBLICACCESS",
  "capacity": number; // 1,
  "free": number; // 1,
  "provider": string; //"DriWe",
  "reservable": string; //"yes",
  "state": string; //"ACTIVE",
  "plugsTypes": ChargerType[],
  "plugs": ChargerPlug[];
}

export interface ChargerPlug {
  "plug_id": string; //"DW-000027-1",
  "name": string; //"San Vigilio Hotel Sport-1",
  "available": boolean; //true,
  "maxPower": number; //3680,
  "maxCurrent": number; //16,
  "minCurrent": number; //6,
  "outletTypeCode": ChargerType; //"Type2Mennekes"
}

export type ChargerType = 'Type2Mennekes' | string;

export class ChargerStationService {


  getChargerStations(): Promise<ChargerStation[]> {
    return new Promise((resolve, reject) => {
      this.getChargerStations$((err, chargerStations) => {
        if (err) {
          reject(err);
        } else {
          resolve(chargerStations || []);
        }
      });
    })
  }

  /**
   */
  getChargerStations$(cb: (err: Error | null, data?: ChargerStation[]) => void): AbortHandler {

    const controller = new AbortController();
    const signal = controller.signal;

    // id: "urn:siat.provincia.tn.it:elementi_cicloviari_v:via001_23"
    fetch(buildUrl(`https://charger.v2.otp.opendatahub.com/charger/stations.json`), {signal})
      .then(response => response.json() as Promise<ChargerListResponse>)
      .then(data => {
        cb(null, data?.data?.stations || []);
      })
      .catch(err => {
        console.error(err);
        cb(err);
      });

    return controller;
  }


}
