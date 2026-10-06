// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { buildUrl } from "../../utils/url";
import { RouteDetails } from "./route-details";
import { fromFetch } from "rxjs/fetch";
import { Observable } from "rxjs";

// origin is used to track usage and traffic patterns
const ORIGIN = 'webcomp-brennerlec';

export class RouteDetailsService {


  /**
   */
  getDetails$(pointId: string): Observable<RouteDetails> {
    return fromFetch<RouteDetails>(buildUrl(`https://tourism.api.opendatahub.com/v1/SpatialData/${pointId}`, {
      origin: ORIGIN,
      limit: -1,
    }), {
      // The selector allows you to parse the body directly
      selector: (response) => response.json()
    });
  }

}
