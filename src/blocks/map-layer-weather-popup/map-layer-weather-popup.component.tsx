// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h, Method, State } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { MapGeoJSONFeature } from "maplibre-gl";
import { WeatherForecast } from "../../data/noi/WeatherForecase";
import { LanguageDataService } from "../../data/language/language-data-service";
import {
  _getDailyMeasurement,
  calculateDayPoints,
  DayPointForecast,
  getClearSkyType,
  getIconContent,
  getWindDirectionLabel
} from "../map-layer-weather/weather-forecast.util";
import { formatNumber, formatTime } from "../../utils/intl";
import { WeatherForecastService } from "../../data/noi/weather-forecast-service";
import { AbortHandler } from "../../data/noi/fetch.util";
import { diffInDays } from "../../utils/date";


/**
 * (INTERNAL) render map popup
 */
@Component({
  tag: 'noi-map-layer-weather-popup',
  styleUrl: 'map-layer-weather-popup.css',
  shadow: false,
})
export class MapLayerWeatherPopupComponent implements StencilComponent {

  private languageService = LanguageDataService.getInstance();


  @State()
  private data?: WeatherForecast;

  @State()
  private dayIso?: string;

  @State()
  private dayForecast?: DayPointForecast[];

  @State()
  private dayForecastIndex: number = 0;

  @State()
  private isLoading = false;

  private stationId?: string;
  private weatherService = new WeatherForecastService();

  /**
   */
  async connectedCallback() {

  }

  disconnectedCallback() {

  }

  @Method()
  async setFeature(feature: MapGeoJSONFeature) {
    this.data = JSON.parse(feature?.properties?.data) as WeatherForecast;
    this.stationId = this.data.scode;
    this.dayIso = feature?.properties?.day as string;
    this.dayForecast = calculateDayPoints(this.data);
    this.dayForecastIndex = 0;
  }

  canChangeViewTime(increment: number) {
    const proposal = this.dayForecastIndex + increment;
    return proposal >= 0 && proposal < (this.dayForecast?.length || 0);
  }

  changeViewTime(increment: number) {
    this.dayForecastIndex += increment;
  }


  canChangeViewDay(daysChange: number) {
    const viewDate = new Date(this.dayIso || Date.now());
    const daysDiff = diffInDays(viewDate, new Date());
    const daysShift = (daysDiff + daysChange);
    return (daysShift >= WeatherForecastService.MIN_DAYS_BEHIND)
      && (daysShift <= WeatherForecastService.MAX_DAYS_AHEAD);
  }

  changeViewDay(increment: number) {
    const d = new Date(this.dayIso || Date.now());
    d.setDate(d.getDate() + increment);
    this.dayIso = d.toISOString();

    this._loadData();
  }

  private __request?: AbortHandler;

  _loadData() {
    if (!this.dayIso || !this.stationId) {
      console.warn('Cannot fetch data: no view day or station ID');
      return;
    }

    this.isLoading = true;
    this.__request?.abort();
    this.__request = this.weatherService.getWeatherForecastDayStation(new Date(this.dayIso), this.stationId, (forecastData) => {
      this.__request = undefined; // avoid cancelling finished request later
      this.isLoading = false;

      this.data = forecastData.values?.[0];
      this.dayIso = forecastData.dateFrom.toISOString();
      this.dayForecast = this.data ? calculateDayPoints(this.data) : [];
      if (!this.dayForecast[this.dayForecastIndex]) {
        // reset index if it's out of range
        this.dayForecastIndex = 0;
      }
    });
  }

  render() {
    if (!this.data || !this.dayForecast) {
      return '';
    }

    // helpers, to make template more clear
    const t = this.languageService.translate.bind(this.languageService);
    const num = (_num: | number | undefined) => formatNumber(_num, this.languageService.currentLanguage!);

    // const iconName = this.feature.properties['icon_name'];
    // const pointDescription = _getDailyMeasurement(data.sdatatypes["qualitative-forecast"]?.tmeasurements || [])?.mvalue;
    const pointName = this.data.smetadata.nameEn;

    const airTemperatureMin = _getDailyMeasurement(this.data.sdatatypes["forecast-air-temperature-min"]?.tmeasurements || [])?.mvalue;
    const airTemperatureMax = _getDailyMeasurement(this.data.sdatatypes["forecast-air-temperature-max"]?.tmeasurements || [])?.mvalue;
    const precipitationProbabilityDaily = _getDailyMeasurement(this.data.sdatatypes["forecast-precipitation-probability"]?.tmeasurements || [])?.mvalue;
    const precipitationAmountDaily = _getDailyMeasurement(this.data.sdatatypes["forecast-precipitation-sum"]?.tmeasurements || [])?.mvalue;
    const sunshineDuration = _getDailyMeasurement(this.data.sdatatypes["forecast-sunshine-duration"]?.tmeasurements || [])?.mvalue;

    return (
      <div class="noi-weather-popup" part="popup">
        <div class="header">
          <noi-icon name="map-point"></noi-icon>
          <div>{pointName}</div>
        </div>

        <div class="panel">
          <noi-button class="panel__btn"
                      title="Previous day"
                      disabled={!this.canChangeViewDay(-1)}
                      onClick={() => this.changeViewDay(-1)}>
            <noi-icon name="chevron-left"></noi-icon>
          </noi-button>
          <div class="panel__body panel-date">
            <span>{formatDateCustom(this.dayIso!, this.languageService.currentLanguage)}</span>
          </div>
          <noi-button class="panel__btn"
                      title="Next day"
                      disabled={!this.canChangeViewDay(1)}
                      onClick={() => this.changeViewDay(1)}>
            <noi-icon name="chevron-right"></noi-icon>
          </noi-button>
        </div>

        <div class={'day-content' + (this.isLoading ? ' loading' : '')}>
          {this.isLoading ? (
            <div class="day-content__loader">
              <noi-spinner></noi-spinner>
            </div>
          ) : ''}
          <div class="day-content__main">
            <div class="section section--background">
              {t('weather.air-temperature-min')}: {num(airTemperatureMin)}℃&nbsp;-&nbsp;{t('weather.air-temperature-max')}: {num(airTemperatureMax)}℃
            </div>
            <div class="section">
              {t('weather.precipitation-probability')}: {num(precipitationProbabilityDaily)}%
            </div>
            <div class="section">
              {t('weather.precipitation-amount')}: {num(precipitationAmountDaily)}mm
            </div>
            <div class="section">
              {t('weather.sunshine-duration')}: {num(sunshineDuration)}h
            </div>
            {this._renderTimePoint(this.dayForecast[this.dayForecastIndex], sunshineDuration)}
          </div>
        </div>
      </div>
    );
  }

  /**
   *
   */
  _renderTimePoint(dp: DayPointForecast, sunshineDuration: number) {

    // helpers, to make template more clear
    const t = this.languageService.translate.bind(this.languageService);
    const num = (_num: | number | undefined) => formatNumber(_num, this.languageService.currentLanguage!);

    const skyType = getClearSkyType(new Date(dp.time), sunshineDuration);

    return (<div>

      <div class="panel">
        <noi-button class="panel__btn"
                    title="Previous entry"
                    disabled={!this.canChangeViewTime(-1)}
                    onClick={() => this.changeViewTime(-1)}>
          <noi-icon name="chevron-left"></noi-icon>
        </noi-button>
        <div class="panel__body">
          <span>{formatTime(dp.time, this.languageService.currentLanguage!)}</span>
        </div>
        <noi-button class="panel__btn"
                    title="Next entry"
                    disabled={!this.canChangeViewTime(1)}
                    onClick={() => this.changeViewTime(1)}>
          <noi-icon name="chevron-right"></noi-icon>
        </noi-button>
      </div>
      <div class="section">
        <div class="table">
          <div class="table__cell">
            <div class="noi-weather-icon value-icon"
                 title={dp["qualitative-forecast"] as any}>{getIconContent(dp["qualitative-forecast"] as any, skyType)}</div>
            <div class="value-description">{dp["qualitative-forecast"]}</div>
          </div>
          <div class="table__cell">
            <div class="value-description">{t('weather.hours.air-temperature')}</div>
            <div class="value">{num(dp["air-temperature"])}℃</div>
          </div>
          <div class="table__cell">
            <div class="value-description">{t('weather.hours.wind')}</div>
            <div class="value">{num(dp["wind-speed"])}m/s</div>
            <div>
              {dp["wind-direction"]}° ({getWindDirectionLabel(dp["wind-direction"], t('weather.wind-directions'))})
            </div>
          </div>
          <div class="table__cell">
            <div class="value-description">{t('weather.hours.precipitation')}</div>
            <div class="value">{num(dp["precipitation-sum"])}mm</div>
            <div>{dp["precipitation-probability"]}%</div>
          </div>
        </div>
      </div>
    </div>);
  }
}


/**
 */
function formatDateCustom(dateStr: string, locale = 'en-US') {
  if (!dateStr) {
    return '';
  }
  const date = new Date(dateStr);

  // 1. Extract the day number string
  const day = date.getDate();

  // 2. Extract the lowercase long weekday name
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {weekday: 'long'});
  const weekdayName = weekdayFormatter.format(date).toLowerCase();

  // 3. Extract the lowercase long month name
  const monthFormatter = new Intl.DateTimeFormat(locale, {month: 'long'});
  const monthName = monthFormatter.format(date).toLowerCase();

  // 4. Force the precise order: [Weekday] [Day] [Month]
  return `${weekdayName} ${day} ${monthName}`;
}

