// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h, Method, State } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { AbortHandler } from "../../data/noi/fetch.util";
import { RouteDetailsService } from "../../data/noi/route-details-service";
import { RouteDetails } from "../../data/noi/route-details";
import { LanguageDataService } from "../../data/language/language-data-service";

interface HeaderConfig {
  icon: string;
  text: string;
}

/**
 * (INTERNAL) render map popup
 */
@Component({
  tag: 'noi-map-layer-roads-popup',
  styleUrl: 'map-layer-roads-popup.css',
  shadow: false,
})
export class MapLayerRoadsPopupComponent implements StencilComponent {

  private languageService = LanguageDataService.getInstance();

  @State()
  private isLoading = false;

  @State()
  private routeDetails?: RouteDetails;
  private mappingData: Array<{ name: string, value: string }> = [];

  @State()
  private headerConfig?: HeaderConfig;

  @State()
  private geoName?: string;

  private routeId?: string;
  private detailsService = new RouteDetailsService();


  @Method()
  async setPointId(roadId: string) {
    this.routeId = roadId
    this._loadData();
  }

  @Method()
  async setPopupHeader(headerConfig: HeaderConfig) {
    this.headerConfig = headerConfig
  }

  @Method()
  async setName(geoName: string) {
    this.geoName = geoName
  }


  private __request?: AbortHandler;

  _loadData() {
    if (!this.routeId) {
      return;
    }
    this.isLoading = true;
    this.__request?.abort();
    this.__request = this.detailsService.getDetails(this.routeId, (_, routeDetails) => {
      this.__request = undefined; // avoid cancelling finished request later
      this.routeDetails = routeDetails;

      // calculate extended details
      this.mappingData = [];
      const mMapping = this.routeDetails?.Mapping || {};
      for (const mProvider in mMapping) {
        const mProps = mMapping[mProvider] || {};
        for (const mKey in mProps) {
          if (!!mProps[mKey] || (mProps[mKey] as any) === 0) {
            this.mappingData.push({name: mKey, value: mProps[mKey]});
          }
        }
      }
      console.log('mappingData', this.mappingData);

      this.isLoading = false;
    });
  }

  render() {
    const details = this.languageService.translateObject(this.routeDetails?.Detail);
    const description = details?.BaseText;

    return (
      <div class="noi-map-popup" part="popup">
        <div class="popup__header">
          <noi-icon class="popup__header-icon" name={this.headerConfig?.icon}></noi-icon>
          <div>{this.headerConfig?.text} {this.isLoading}</div>
        </div>

        {this.geoName ? (
          <div class="popup__name">{this.geoName}</div>
        ) : ''}

        {this.isLoading ? (
          <div class="popup__loading">
            <noi-spinner></noi-spinner>
          </div>
        ) : (
          !description
            ? (<div class="popup__description">
              {this.languageService.translate('map.layer.util.no-details')}
            </div>)
            : (<div>
              {/*<div class="popup__name">{details?.Title}</div>*/}
              <div class="popup__description">{description}</div>
            </div>)
        )}

        {(!this.isLoading && this.mappingData.length > 0)
          ?
          <details class="roads-extra-details">
            <summary>{this.languageService.translate('map.layer.util.technical-details')}</summary>
            {this.mappingData.map(mData => (
              <div class="popup__section popup__section--roads">
                <div class="popup__section-name">{mData.name}</div>
                <div class="popup__section-value">{mData.value}</div>
              </div>
            ))}
          </details>
          : ''}

      </div>
    );

    // return (
    //   <div class="noi-weather-popup" part="popup">
    //     <div class="header">
    //       <noi-icon name="map-point"></noi-icon>
    //       <div>{pointName}</div>
    //     </div>
    //
    //     <div class="panel">
    //       <noi-button class="panel__btn"
    //                   title="Previous day"
    //                   disabled={!this.canChangeViewDay(-1)}
    //                   onClick={() => this.changeViewDay(-1)}>
    //         <noi-icon name="chevron-left"></noi-icon>
    //       </noi-button>
    //       <div class="panel__body panel-date">
    //         <span>{formatDateCustom(this.dayIso!, this.languageService.currentLanguage)}</span>
    //       </div>
    //       <noi-button class="panel__btn"
    //                   title="Next day"
    //                   disabled={!this.canChangeViewDay(1)}
    //                   onClick={() => this.changeViewDay(1)}>
    //         <noi-icon name="chevron-right"></noi-icon>
    //       </noi-button>
    //     </div>
    //
    //     <div class={'day-content' + (this.isLoading ? ' loading' : '')}>
    //       {this.isLoading ? (
    //         <div class="day-content__loader">
    //           <noi-spinner></noi-spinner>
    //         </div>
    //       ) : ''}
    //       <div class="day-content__main">
    //         <div class="section section--background">
    //           {t('weather.air-temperature-min')}: {num(airTemperatureMin)}℃
    //           &nbsp;-&nbsp;
    //           {t('weather.air-temperature-max')}: {num(airTemperatureMax)}℃
    //         </div>
    //         <div class="section">
    //           {t('weather.precipitation-probability')}: {num(precipitationProbabilityDaily)}%
    //         </div>
    //         <div class="section">
    //           {t('weather.precipitation-amount')}: {num(precipitationAmountDaily)}mm
    //         </div>
    //         <div class="section">
    //           {t('weather.sunshine-duration')}: {num(sunshineDuration)}h
    //         </div>
    //         {this._renderTimePoint(this.dayForecast[this.dayForecastIndex], sunshineDuration)}
    //       </div>
    //     </div>
    //   </div>
    // );
  }

}

