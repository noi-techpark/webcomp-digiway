// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Event, EventEmitter, h, Method, State } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { OtpTrip } from "../../../data/noi/Otp";
import { otpIcons } from "../map-layer-otp-icons/icons";
import { MapGeoJSONFeature } from "maplibre-gl";

/**
 * (INTERNAL) render otp popup
 */
@Component({
  tag: 'noi-map-layer-otp-popup-parking',
  styleUrl: 'map-layer-otp-popup-parking.css',
  shadow: true,
})
export class MapLayerOtpPopupParkingComponent implements StencilComponent {

  // private languageService = LanguageDataService.getInstance();

  /**
   * Emitted when user clicks on the route
   */
  @Event() routeClick!: EventEmitter<OtpTrip>;

  @State()
  private _info?: any;
  // private _feature?: MapGeoJSONFeature;


  // private languageService = LanguageDataService.getInstance();

  async connectedCallback() {
  }

  disconnectedCallback() {

  }

  @Method()
  async setData(stopInfo: MapGeoJSONFeature) {
    // this._feature = stopInfo;
    this._info = stopInfo?.properties || {};
  }


  render() {
    if (!this._info) {
      return '';
    }
    // TODO: incomplete!
    return (
      <div class="noi-otp-popup" part="popup">
        <div class="popup__header">
          <noi-icon class="popup__header-icon" innerHTML={otpIcons.parking}></noi-icon>
          <div>
            <div>{this._info.name}</div>
            <div>Parking</div>
          </div>
        </div>


      </div>
    );
  }

}
