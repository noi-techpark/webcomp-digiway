// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Event, EventEmitter, forceUpdate, h, Method, State } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { OtpPattern, OtpStation, OtpStop, OtpStoptime, OtpStoptimesInPattern } from "../../../data/noi/Otp";
import { _getIconByType, _getNameByType } from "../map-layer-otp-icons/icons";
import { LanguageDataService } from "../../../data/language/language-data-service";
import { getSecondsSinceMidnight } from "../../../utils/date";
import { OtpService } from "../../../data/noi/otp-service";

/**
 * (INTERNAL) render otp popup
 */
@Component({
  tag: 'noi-map-layer-otp-popup-stop',
  styleUrl: 'map-layer-otp-popup-stop.css',
  shadow: true,
})
export class MapLayerOtpPopupStopComponent implements StencilComponent {

  /**
   * Emitted when user clicks on the route
   */
  @Event() routeClick!: EventEmitter<OtpStoptime>;

  @State()
  private _info?: OtpStop | OtpStation;

  @State()
  private _typeOverride?: string;

  @State()
  private _vehicleModes?: string[];
  // skip @State() for the following, because it's changed with another states
  @State()
  private _visibleStoptimes?: OtpStoptimesInPattern[];

  private languageService = LanguageDataService.getInstance();

  async connectedCallback() {
  }

  disconnectedCallback() {

  }

  @Method()
  async setData(stopInfo: OtpStop | OtpStation, vehicleMode?: string) {
    this._info = stopInfo;
    this._typeOverride = vehicleMode || '';
    this._recalculateData();

    // Forces an immediate queue of the render and returns a promise
    // that resolves right after the DOM updates.
    return forceUpdate(this);
  }

  private _recalculateData() {
    this._vehicleModes = (this._typeOverride || this._info?.vehicleMode || '')
      .split(',')
      .map(s => s.trim().toUpperCase());

    const currentFromMidnight = getSecondsSinceMidnight();
    this._visibleStoptimes = (this._info?.stoptimesForPatterns || [])
      .filter(st => st.stoptimes[0]?.scheduledDeparture >= currentFromMidnight)
      .slice(0, 15);
  }


  render() {
    if (!this._info) {
      return '';
    }

    return (
      <div class="noi-otp-popup" part="popup">
        <div class="popup__header">
          <noi-icon class="popup__header-icon" name="transport"></noi-icon>
          <div>{this.languageService.translate('map.layer.otp-stops')}</div>
        </div>

        <div class="transport-types-section">
          {this._vehicleModes?.map(vm => {
            const vmIcon = _getIconByType(vm || '');
            const vmName = this.languageService.translate(_getNameByType(vm || ''));
            return (<noi-badge class="transport-types-badge">
              <noi-icon innerHTML={vmIcon}></noi-icon>
              <div>{vmName}</div>
            </noi-badge>);
          })}
        </div>

        <div class="station-name-section">
          {this._info?.platformCode
            ? <div class="station-name-section__code">{this._info?.platformCode}</div>
            : ''}
          <div class="station-name-section__name">{this._info?.name}</div>
        </div>

        {this._visibleStoptimes?.length
          ? <div class="departures-section">
            <div class="departures-section__header">
              {this.languageService.translate('otp.next-departures')}
            </div>

            <div class="departures-list">
              {this._visibleStoptimes?.map(r => {
                return r.stoptimes?.map(s => {
                  return (<noi-button onClick={() => this.routeClick.emit(s)}>
                    {this._renderStopTime(r.pattern, s)}
                  </noi-button>);
                });
              })}
            </div>
          </div>
          : <div class="departures-section">
            <div class="departures-section__empty">
              {this.languageService.translate('otp.next-departures.empty')}
            </div>
          </div>}

      </div>
    );
  }


  _renderStopTime(p: OtpPattern, s: OtpStoptime) {

    // deal with names?
    const info = OtpService.getStopName(p, s);
    return (
      <div class="otp-stop">

        {(info.routeShortName)
          ? <noi-badge class="otp-stop__badge">
            {info.routeShortName}
          </noi-badge>
          : <div class="otp-stop__badge"></div>}

        <div class="otp-stop__headsign">
          <div class="otp-stop__headsign-stoptime">{info.headSign}</div>
          {(info.routeFullName && info.routeFullName !== info.headSign)
            ? <div class="otp-stop__headsign-pattern">{info.routeFullName}</div>
            : ''}
        </div>

        <noi-otp-departure-time stoptime={s}></noi-otp-departure-time>
      </div>
    );
  }

}
