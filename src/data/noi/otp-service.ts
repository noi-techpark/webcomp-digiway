// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { buildUrl } from "../../utils/url";
import { OtpPattern, OtpStation, OtpStop, OtpStoptime, OtpStoptimesInPattern, OtpTrip } from "./Otp";


interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const ql_pattern = `
fragment PatternDetails on Pattern {
        name
        directionId
        headsign
        code
        route {
          gtfsId
          shortName
          longName
        }
}
`;
const ql_stoptimes = `
fragment StoptimeDetails on StoptimesInPattern {
  pattern {
    ...PatternDetails
  }
  stoptimes {
    realtime

    scheduledArrival
    arrivalDelay
    realtimeArrival

    scheduledDeparture
    departureDelay
    realtimeDeparture

    headsign
    serviceDay
    timepoint
    stop {
      gtfsId
    }
    trip {
      gtfsId
    }
  }
}
`;

/**
 *
 */
export class OtpService {

  // NOTE: Passing OtpStoptime is the final fallback for resolving stop names.
  static getStopName(p: OtpPattern, s?: OtpStoptime) {
    // TODO: deal with names?
    const routeShortName = p.route?.shortName || p.name;
    const routeFullName = (p.route?.longName && p.route?.longName !== routeShortName) ? p.route?.longName : p.headsign || p.name || s?.headsign;
    const headSign = p.headsign || routeFullName;
    return {
      routeShortName,
      routeFullName,
      headSign,
    }
  }

  /**
   */
  getStopInfo(stopId: string): Promise<OtpStop> {

    console.log('[OtpService] getStopInfo', stopId);
    const graphqlQuery = `
query($stopId: String!) {
  stop(id:$stopId) {
    gtfsId
    code
    platformCode
    lat
    lon
    name
    vehicleMode
    stoptimesForPatterns(numberOfDepartures: 1000, omitNonPickups: true, omitCanceled: true){
      ...StoptimeDetails
    }
  }
}
${ql_pattern}
${ql_stoptimes}
`;

    // id: "urn:siat.provincia.tn.it:elementi_cicloviari_v:via001_23"
    return this._graphQLQuery<{ stop: OtpStop }>(graphqlQuery, {
      stopId: stopId // Dynamic data passed into the query
    }).then(data => data.stop)
      .then(stop => {
        stop.stoptimesForPatterns = _explodeStoptimes(stop.stoptimesForPatterns);
        return stop;
      });
  }

  /**
   */
  getStationInfo(stationId: string): Promise<OtpStation> {

    console.log('[OtpService] getStationInfo', stationId);
    const graphqlQuery = `
query($stationId: String!) {
  station(id:$stationId){
    gtfsId
    code
    lat
    lon
    name
    vehicleMode
    platformCode

    stoptimesForPatterns(numberOfDepartures:1000 omitCanceled:true, omitNonPickups:true) {
      ...StoptimeDetails
    }
  }
}

${ql_pattern}
${ql_stoptimes}
`;

    return this._graphQLQuery<{ station: OtpStation }>(graphqlQuery, {
      stationId: stationId // Dynamic data passed into the query
    }).then(data => data.station)
      .then(station => {
        station.stoptimesForPatterns = _explodeStoptimes(station.stoptimesForPatterns);
        return station;
      });
  }

  /**
   */
  getTripInfo(tripId: string): Promise<OtpTrip> {

    console.log('[OtpService] getTripInfo', tripId);
    const graphqlQuery = `
query ($tripId:String!){
    trip(id:$tripId) {
        gtfsId
        tripGeometry{
          points
        }
        pattern {
          name
          headsign
          route {
            gtfsId
            shortName
            longName
          }
        }
        stoptimesForDate {
          realtime

          scheduledArrival
          arrivalDelay
          realtimeArrival

          scheduledDeparture
          departureDelay
          realtimeDeparture

          headsign
          serviceDay
          timepoint

          stop {
            gtfsId
            name
            lat
            lon
            vehicleMode
            platformCode
          }
        }
    }
}`;

    return this._graphQLQuery<{ trip: OtpTrip }>(graphqlQuery, {
      tripId: tripId // Dynamic data passed into the query
    }).then(data => data.trip);
  }

  /**
   *
   */
  _graphQLQuery<T>(query: string, variables?: { [name: string]: string }) {
    // id: "urn:siat.provincia.tn.it:elementi_cicloviari_v:via001_23"
    return fetch(buildUrl(`https://v2.otp.opendatahub.com/otp/gtfs/v1`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}), // Must be stringified JSON
    }).then(response => response.json() as Promise<GraphQlResponse<T>>)
      .then(_assertResponse);
  }
}

/**
 *
 */
function _assertResponse<T>(data: GraphQlResponse<T>) {
  if (data.errors) {
    throw new Error(data.errors[0].message);
  } else {
    return data.data!;
  }
}


function _explodeStoptimes(stoptimesInPatterns?: OtpStoptimesInPattern[] | null | undefined) {
  const exploded: OtpStoptimesInPattern[] = [];
  if (stoptimesInPatterns) {
    for (const stp of stoptimesInPatterns) {
      for (const stime of stp.stoptimes) {
        exploded.push({
          pattern: stp.pattern,
          stoptimes: [stime],
        });
      }
    }
  }
  return exploded.sort((a, b) => {
    return a.stoptimes[0].scheduledDeparture - b.stoptimes[0].scheduledDeparture;
  });
}
