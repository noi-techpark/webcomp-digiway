// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, forceUpdate, h, Host, Prop, State, Watch } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { getLayoutClass, resolveLayoutAuto, ViewLayout } from "../../utils/breakpoints";
import { SelectOption } from "../../blocks/select/select.component";
import { LanguageDataService } from "../../data/language/language-data-service";
import { getAssetPath } from "../../utils/asset-path";
import { formatDay } from "../../utils/intl";
import { WeatherForecastService } from "../../data/noi/weather-forecast-service";
import { diffInDays } from "../../utils/date";
import { ZoomCategory } from "../../blocks/otp/map-layer-otp-layers/layout";
import { WeatherCurrentViewMode } from "../../blocks/map-layer-weather-current/noi-map-layer-weather-current.component";


interface DataLayerOption extends SelectOption {
  forceGrayscale?: boolean;
  forceSource?: BaseMapType;
  children?: DataLayerOption[];
  tags?: string | string[];
  showLoader?: boolean; // default is true
}

type MapSourceOption = SelectOption;

/**
 * @internal
 */
type BaseMapType = 'tirol' | 'osm' | 'carto';

/**
 * Consolidated web-component to show Open Data Hub data imported within the Digiway project
 *
 * @part sidebar - Sidebar
 * @part map - Map
 * @part legend-container - Legend container
 * @part legend - Legend
 * @part popup - Map popup dialog
 */
@Component({
  tag: 'noi-digiway',
  styleUrl: 'noi-digiway.css',
  shadow: true,
})
export class NoiDigiwayComponent implements StencilComponent {

  /**
   * Layout appearance
   */
  @Prop({mutable: true})
  layout: ViewLayout = 'auto';

  /**
   * Base map layer
   */
  @Prop({mutable: true})
  baseMap: 'osm' | 'tirol' = 'tirol';

  /**
   * Pass latitude, longitude and zoomlevel separated by "," if map should be centered an a specific gps point
   */
  @Prop({mutable: true})
  centermap?: string;

  /**
   * Language
   * @default 'en'
   */
  @Prop({mutable: true})
  language = 'en';

  /**
   * View date for weather data (weather layer only)
   */
  @Prop({mutable: true})
  viewDate: string | undefined;

  @State()
  layoutResolved!: ViewLayout;

  @State()
  otpZoomCategory?: ZoomCategory;

  @Element()
  el!: HTMLElement;

  @State()
  isMenuOpened = false;

  @State()
  viewDateObj!: Date;

  @State()
  weatherCurrentMode: WeatherCurrentViewMode = 'temperature';

  private modes: MapSourceOption[] = [
    {value: 'tirol', text: 'map.base.tirol'},
    {value: 'osm', text: 'map.base.osm'},
    {value: 'carto', text: 'map.base.carto'},
  ];
  private modesTranslated: MapSourceOption[] = [];


  private structure: DataLayerOption[] = [
    {value: 'layer-closures', text: 'map.layer.route-closures', icon: 'pointer-off'},
    {value: 'layer-exposure', text: 'map.layer.risk-exposure', icon: 'context', forceGrayscale: true},
    {
      value: 'layer-cycling', text: 'map.layer.cycling', icon: 'bicycle', showLoader: false,
      children: [
        // {value: 'layer-cycling-tyrol', text: 'map.layer.cycling-tyrol'},
        {value: 'layer-cycling-tyrol-north', text: 'map.layer.cycling-tyrol-north'},
        {value: 'layer-cycling-bolzano-int', text: 'map.layer.cycling-bolzano-int'},
        {value: 'layer-cycling-trento', text: 'map.layer.cycling-trento'},
        {value: 'layer-mountain-bolzano', text: 'map.layer.mountain-bolzano'},
        {value: 'layer-mountain-trento', text: 'map.layer.mountain-trento'},
      ],
    },
    {
      value: 'layer-hiking', text: 'map.layer.hiking', icon: 'trekking', showLoader: false,
      children: [
        {value: 'layer-hiking-bolzano', text: 'map.layer.hiking-bolzano'},
        {value: 'layer-hiking-trento', text: 'map.layer.hiking-trento'},
        {value: 'layer-hiking-e5', text: 'map.layer.hiking-e5'},
        {value: 'layer-hiking-accessible', text: 'map.layer.hiking-accessible'},
      ],
    },
    {value: 'layer-weather-forecast', text: 'map.layer.weather-forecast', icon: 'weather-alert'},
    {value: 'layer-weather-current', text: 'map.layer.weather-current', icon: 'material-thermomether'},
    {
      value: 'layer-otp', text: 'map.layer.otp-stops', icon: 'transport', forceSource: 'carto', showLoader: true,
      // children: [
      //   {value: 'layer-otp-stops', text: 'map.layer.otp-stops', tags: 'stops', showLoader: false},
      //   {value: 'layer-otp-parking', text: 'map.layer.otp-parking', tags: 'parking', showLoader: false},
      //   {value: 'layer-otp-rental', text: 'map.layer.otp-rental', tags: 'rental', showLoader: false},
      // ],
    },
    // {value: 'layer-otp-charger', text: 'map.layer.otp-charger', forceSource: 'otp', showLoader: true},
    {
      value: 'layer-poi', text: 'map.layer.poi', icon: 'material-explore-nearby', showLoader: false,
      children: [
        {value: 'layer-poi-food', text: 'map.layer.poi-food', tags: 'gastronomies', showLoader: true},
        {value: 'layer-poi-shops', text: 'map.layer.poi-shops', tags: 'shops', showLoader: true},
        {value: 'layer-poi-culture', text: 'map.layer.poi-culture', tags: 'culture', showLoader: true},
        {value: 'layer-poi-summer', text: 'map.layer.poi-summer', tags: 'summer', showLoader: true},
        {value: 'layer-poi-relax', text: 'map.layer.poi-relax', tags: 'wellness', showLoader: true},
        {value: 'layer-poi-winter', text: 'map.layer.poi-winter', tags: 'winter', showLoader: true},
        {value: 'layer-poi-hotels', text: 'map.layer.poi-hotels', tags: 'accommodation', showLoader: true},
      ],
    },
  ];

  private _structureFlat: DataLayerOption[] = this.structure.reduce((acc, layer) => {
    acc.push(layer);
    if (layer.children) {
      acc.push(...layer.children);
    }
    return acc;
  }, [] as DataLayerOption[]);


  @State()
  mapMode: MapSourceOption = this.modes[0];

  @State()
  layersActive: string[] = [];

  @State()
  layersLoading: string[] = [];

  private _isGrayscaleMap = false;
  private _activeTags: { [parentId: string]: string[] } = {};

  private now = new Date();

  private sizeObserver: ResizeObserver | null = null;
  readonly languageService = LanguageDataService.getInstance();

  @Watch('layout')
  _layoutChanged() {
    this.layoutResolved = resolveLayoutAuto(this.el.offsetWidth, this.layout);
  }

  @Watch('baseMap')
  _baseMapChanged() {
    this.setBaseMap(this.baseMap);
  }

  @Watch('language')
  onLanguageChanged() {
    this.languageService.useLanguage(this.language)
      .then(this._onLanguageChanged.bind(this));
  }

  @Watch('viewDate')
  viewDateChanged() {
    if (!this.viewDate) {
      this.viewDateObj = new Date();
      return;
    }
    try {
      this.viewDateObj = new Date(this.viewDate);

      const daysDiff = diffInDays(this.viewDateObj, this.now);
      if (daysDiff < WeatherForecastService.MIN_DAYS_BEHIND) {
        console.warn('"viewDate" cannot be referenced to the past');
        this.viewDateObj = new Date();
      }
      if (daysDiff > WeatherForecastService.MAX_DAYS_AHEAD) {
        console.warn('"viewDate" cannot be referenced to the far future');
        this.viewDateObj = new Date();
      }

    } catch (e) {
      console.error(e);
      this.viewDateObj = new Date();
    }
  }

  canChangeViewDate(daysChange: number) {
    const daysDiff = diffInDays(this.viewDateObj, this.now);
    const daysShift = (daysDiff + daysChange);
    return (daysShift >= WeatherForecastService.MIN_DAYS_BEHIND)
      && (daysShift <= WeatherForecastService.MAX_DAYS_AHEAD);
  }

  changeViewDate(daysChange: number) {
    this.viewDateObj = new Date(this.viewDateObj.getTime());
    this.viewDateObj.setDate(this.viewDateObj.getDate() + daysChange);
  }

  setWeatherCurrentMode(mode: WeatherCurrentViewMode) {
    this.weatherCurrentMode = mode;
  }

  _onLanguageChanged() {
    this.modesTranslated = this.modes.map(m => ({...m, text: this.languageService.translate(m.text)}));
    forceUpdate(this.el)
  }

  _watchSize() {
    if (typeof window.ResizeObserver === 'function') {
      this.sizeObserver = new ResizeObserver(() => {
        this._layoutChanged();
      });
      this.sizeObserver.observe(this.el);
    } else {
      console.warn('ResizeObserver is not supported');
    }
  }

  _unwatchSize() {
    if (this.sizeObserver) {
      this.sizeObserver.unobserve(this.el);
      this.sizeObserver = null;
    }
  }

  connectedCallback() {
    this._layoutChanged();
    this.viewDateChanged();
    this._baseMapChanged();
    this.onLanguageChanged();
    this._watchSize();
  }

  disconnectedCallback() {
    this._unwatchSize();
  }

  _toggleMenu() {
    this.isMenuOpened = !this.isMenuOpened;
  }

  async setBaseMap(baseMapId: BaseMapType) {
    console.log('[noi-digiway] setBaseMap', baseMapId);
    this.mapMode = this.modes.find(m => m.value === baseMapId) || this.modes[0];
  }


  setLayerActive(layer: string, isActive: boolean) {
    if (isActive) {
      if (!this.layersActive.includes(layer)) {
        // activate layer
        this.layersActive.push(layer);
        this.layersActive = [...this.layersActive];

        //
        const layerDef = this._structureFlat.find(l => l.value === layer);
        if (layerDef?.showLoader !== false) {
          // also set loading here to avoid blink
          this._setLayerLoading(layer, true);
        }

        if (layerDef?.forceSource) {
          // force source
          this.setBaseMap(layerDef.forceSource);
        }
      }
    } else {
      // deactivate layer
      this.layersActive = this.layersActive.filter(l => l !== layer);

      // also clear loading state in case it's still loading
      this._setLayerLoading(layer, false);

      // deactivate nested layers
      const layerDef = this.structure.find(l => l.value === layer);
      let layersNested: string[] = (layerDef?.children || []).map(dl => dl.value);
      this.layersActive = this.layersActive.filter(l => !layersNested.includes(l));

      // remove loading state for children layers
      for (const l of layersNested) {
        this._setLayerLoading(l, false);
      }
    }

    // recalculate _isGrayscaleMap and _childLayersIds
    this._isGrayscaleMap = false;
    this._activeTags = {};
    for (const layer of this.layersActive) {
      const layerDef = this._structureFlat.find(l => l.value === layer);
      if (layerDef?.forceGrayscale) {
        this._isGrayscaleMap = true;
      }

      if (layerDef?.children) {
        this._activeTags[layerDef.value] = [];
        for (const layerChild of layerDef.children) {
          if (this.layersActive.includes(layerChild.value)) {
            const tags: string[] = Array.isArray(layerChild.tags) ? layerChild.tags : (layerChild.tags ? [layerChild.tags] : []);
            this._activeTags[layerDef.value].push(...tags);
          }
        }
      }
    }
  }

  _setLayerLoading(layer: string, isLoading: boolean) {
    if (isLoading) {
      if (!this.layersLoading.includes(layer)) {
        this.layersLoading.push(layer);
        this.layersLoading = [...this.layersLoading];
      }
    } else {
      this.layersLoading = this.layersLoading.filter(l => l !== layer);
    }
  }

  // note: this method works with a single tag only!
  _setLayerLoadingByTag(tag: string, isLoading: boolean) {
    const node = this._structureFlat.find(el => el.tags === tag);
    if (!node) {
      console.warn('No menu nod found for tag: ' + tag);
      return;
    }
    const layerId = node.value;

    return this._setLayerLoading(layerId, isLoading);
  }

  render() {
    return (
      <Host class={getLayoutClass(this.layoutResolved)}>
        <div class="sidebar-collapsed">
          <div class="menu-button-wrapper">
            <button class="menu-button" onClick={() => this._toggleMenu()}>
              <noi-icon name="menu"></noi-icon>
            </button>
          </div>
        </div>
        {this._renderSidebar()}
        <noi-map part="map" centermap={this.centermap}>
          {this.mapMode.value === 'osm'
            ? <noi-map-base-osm variant={this._isGrayscaleMap ? 'grayscale' : 'color'}></noi-map-base-osm>
            : ''}
          {this.mapMode.value === 'tirol'
            ? <noi-map-base-tirol variant={this._isGrayscaleMap ? 'grayscale' : 'color'}></noi-map-base-tirol>
            : ''}
          {this.mapMode.value === 'carto'
            ? <noi-map-base-carto></noi-map-base-carto>
            : ''}


          {this.layersActive.includes('layer-exposure')
            ? <noi-map-layer-risk-exposure
              onLayerLoading={(e) => this._setLayerLoading('layer-exposure', e.detail)}></noi-map-layer-risk-exposure>
            : ''}

          {this.layersActive.includes('layer-closures')
            ? <noi-map-layer-announcements
              key="layer-closures"
              onLayerLoading={(e) => this._setLayerLoading('layer-closures', e.detail)}></noi-map-layer-announcements>
            : ''}

          {this.layersActive.includes('layer-cycling-tyrol')
            ? <noi-map-layer-roads
              key="layer-cycling-tyrol"
              region="tyrol"
              titleIcon="bicycle"
              titleText={this.languageService.translate('map.layer.cycling')}
              onLayerLoading={(e) => this._setLayerLoading('layer-cycling-tyrol', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-cycling-tyrol-north')
            ? <noi-map-layer-roads
              key="layer-cycling-tyrol-north"
              region="tyrol-north"
              titleIcon="bicycle"
              titleText={this.languageService.translate('map.layer.cycling')}
              onLayerLoading={(e) => this._setLayerLoading('layer-cycling-tyrol-north', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-cycling-bolzano-int')
            ? <noi-map-layer-roads
              key="layer-cycling-bolzano-int"
              region="bolzano-int"
              titleIcon="bicycle"
              titleText={this.languageService.translate('map.layer.cycling')}
              onLayerLoading={(e) => this._setLayerLoading('layer-cycling-bolzano-int', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-cycling-trento')
            ? <noi-map-layer-roads
              key="layer-cycling-bolzano-trento"
              region="trento"
              titleIcon="bicycle"
              titleText={this.languageService.translate('map.layer.cycling')}
              onLayerLoading={(e) => this._setLayerLoading('layer-cycling-trento', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-mountain-bolzano')
            ? <noi-map-layer-roads
              key="layer-mountain-bolzano"
              region="mountain-bike-bolzano"
              titleIcon="mountain"
              titleText={this.languageService.translate('map.layer.cycling')}
              onLayerLoading={(e) => this._setLayerLoading('layer-mountain-bolzano', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-mountain-trento')
            ? <noi-map-layer-roads
              key="layer-mountain-trento"
              region="mountain-bike-trento"
              titleIcon="mountain"
              titleText={this.languageService.translate('map.layer.cycling')}
              onLayerLoading={(e) => this._setLayerLoading('layer-mountain-trento', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-hiking-bolzano')
            ? <noi-map-layer-roads
              key="layer-hiking-bolzano"
              region="hiking-bolzano"
              titleIcon="trekking"
              titleText={this.languageService.translate('map.layer.hiking')}
              onLayerLoading={(e) => this._setLayerLoading('layer-hiking-bolzano', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-hiking-trento')
            ? <noi-map-layer-roads
              key="layer-hiking-trento"
              region="hiking-trento"
              titleIcon="trekking"
              titleText={this.languageService.translate('map.layer.hiking')}
              onLayerLoading={(e) => this._setLayerLoading('layer-hiking-trento', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-hiking-e5')
            ? <noi-map-layer-roads
              key="layer-hiking-e5"
              region="hiking-e5"
              titleIcon="trekking"
              titleText={this.languageService.translate('map.layer.hiking')}
              onLayerLoading={(e) => this._setLayerLoading('layer-hiking-e5', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-hiking-accessible')
            ? <noi-map-layer-roads
              key="layer-hiking-accessible"
              region="hiking-accessible"
              titleIcon="trekking"
              titleText={this.languageService.translate('map.layer.hiking')}
              onLayerLoading={(e) => this._setLayerLoading('layer-hiking-accessible', e.detail)}></noi-map-layer-roads>
            : ''}

          {this.layersActive.includes('layer-weather-forecast')
            ? <noi-map-layer-weather
              key="layer-weather-forecast"
              viewDate={this.viewDateObj}
              onLayerLoading={(e) => this._setLayerLoading('layer-weather-forecast', e.detail)}></noi-map-layer-weather>
            : ''}

          {this.layersActive.includes('layer-weather-current')
            ? <noi-map-layer-weather-current
              key="layer-weather-current"
              viewMode={this.weatherCurrentMode}
              onLayerLoading={(e) => this._setLayerLoading('layer-weather-current', e.detail)}></noi-map-layer-weather-current>
            : ''}

          {this.layersActive.includes('layer-otp')
            ? <noi-map-layer-otp
              key="layer-otp"
              layers="stops"
              layout={this.layoutResolved}
              onLayerLoading={(e) => this._setLayerLoading('layer-otp', e.detail)}
              onZoomCategoryChange={e => this.otpZoomCategory = e.detail}
            ></noi-map-layer-otp>
            : ''}


          {this.layersActive.includes('layer-poi')
            ? (this._activeTags['layer-poi'] || []).map(tag => (<noi-map-layer-poi
              key={"layer-poi-" + tag}
              tag={tag}
              onLayerLoading={(e) => this._setLayerLoadingByTag(tag, e.detail)}
            ></noi-map-layer-poi>))
            : ''}


          {/*this.layersActive.includes('layer-otp-charger')
            ? <noi-map-layer-otp-charger
              key="layer-otp-charger"
              onLayerLoading={(e) => this._setLayerLoading('layer-otp-charger', e.detail)}></noi-map-layer-otp-charger>
            : ''*/}

          {/*<noi-map-layer-otp-route routeId="sta:it:apb:Line:01216_.26a:"></noi-map-layer-otp-route>*/}
        </noi-map>
        {this._renderLegend()}
        <div class={this.isMenuOpened ? "sidebar-backdrop open" : "sidebar-backdrop"}
             onClick={() => this._toggleMenu()}></div>
      </Host>
    );
  }


  _renderSidebar() {
    const logoSrc = getAssetPath('logo.svg');
    return (
      <div part="sidebar" class={this.isMenuOpened ? "sidebar open" : "sidebar"}>
        {this.layoutResolved === 'desktop'
          ? ''
          : (<div class="menu-button-wrapper">
            <button class="menu-button" onClick={() => this._toggleMenu()}>
              <noi-icon name="close"></noi-icon>
            </button>
          </div>)
        }
        <div class="menu-content">
          <img class="logo" src={logoSrc} alt="logo"/>

          <div class="menu-section-header p-bottom">
            <noi-icon name="layers"></noi-icon>
            <span>{this.languageService.translate('sidebar.base-map')}</span>
          </div>

          <noi-select class="p-bottom-small"
                      options={this.modesTranslated}
                      value={this.mapMode?.value}
                      onSelectChange={event => this.setBaseMap(event.detail as BaseMapType)}></noi-select>
          {/*<noi-select class="p-bottom-small" options={this.subModes}></noi-select>*/}

          <div class="menu-section-header p-top p-bottom">
            <noi-icon name="layers-child"></noi-icon>
            <span>{this.languageService.translate('sidebar.data-layers')}</span>
          </div>

          {this.structure.map(structureItem => {
            if (structureItem.children) {
              // group
              return (<noi-checkbox-group class="p-bottom-small"
                                          key={structureItem.value}
                                          open={this.layersActive.includes(structureItem.value)}>
                <noi-checkbox slot="main"
                              kind="chevron"
                              checked={this.layersActive.includes(structureItem.value)}
                              loading={this.layersLoading.includes(structureItem.value)}
                              onCheckedChange={(event) => this.setLayerActive(structureItem.value, event.detail.checked)}>
                  <div class="checkbox-content">
                    {structureItem.icon ? <noi-icon name={structureItem.icon}></noi-icon> : ''}
                    <span>{this.languageService.translate(structureItem.text)}</span>
                  </div>
                </noi-checkbox>

                {structureItem.children.map(childItem =>
                  <noi-checkbox key={childItem.value}
                                loading={this.layersLoading.includes(childItem.value)}
                                checked={this.layersActive.includes(childItem.value)}
                                onCheckedChange={(event) => this.setLayerActive(childItem.value, event.detail.checked)}>
                    <div class="checkbox-content">
                      <span>{this.languageService.translate(childItem.text)}</span>
                    </div>
                  </noi-checkbox>
                )}
              </noi-checkbox-group>);
            } else {
              // one item
              return (<noi-checkbox class="p-bottom-small"
                                    key={structureItem.value}
                                    loading={this.layersLoading.includes(structureItem.value)}
                                    checked={this.layersActive.includes(structureItem.value)}
                                    onCheckedChange={(event) => this.setLayerActive(structureItem.value, event.detail.checked)}>
                <div class="checkbox-content">
                  <noi-icon name={structureItem.icon}></noi-icon>
                  <span>{this.languageService.translate(structureItem.text)}</span>
                </div>
              </noi-checkbox>);
            }

          })}

          <div class="spacer"></div>

          {/*
          {this._renderWeather()}
          */}
        </div>
      </div>
    )
  }

  // _renderWeather() {
  //   return (<div class="weather">
  //     <img class="weather__icon" src="weather.png" alt="weather icon"/>
  //     <div class="weather__temperature">17°C</div>
  //     <div class="weather__content">
  //       <div class="weather__location">Bolzano - Bozen</div>
  //       <div class="weather__humidity">Humidity 58%</div>
  //     </div>
  //   </div>);
  // }

  _renderLegend() {
    const legendArr = [];
    // legendArr.push(this._renderLegend_debug());

    for (const layer of this.layersActive) {
      switch (layer) {
        case 'layer-weather-forecast':
          legendArr.push(this._renderLegend_weatherForecast());
          break;
        case 'layer-weather-current':
          legendArr.push(this._renderLegend_weatherCurrent());
          break;
        case 'layer-exposure':
          legendArr.push(this._renderLegend_riskExposure());
          break;
        case 'layer-otp':
          legendArr.push(this._renderLegend_otp());
          break;
      }
    }
    return (<div class="legend-container" part="legend-container">{legendArr}</div>)
  }

  _renderLegend_debug() {
    return (<div class="legend" part="legend">
      <div class="legend__text legend__text--debug">mapMode: {this.mapMode?.value}</div>
      <div class="legend__text legend__text--debug">layout: {this.layoutResolved}</div>
    </div>);
  }

  _renderLegend_riskExposure() {
    return (<div class="legend" part="legend">
      <noi-icon name="context" class="legend__icon legend__pane"
                title={this.languageService.translate('map.layer.risk-exposure')}></noi-icon>
      <div class="legend__text risk-level risk-level--low">
        <span>{this.languageService.translate('risk-exposure.low')}</span></div>
      <div class="legend__text risk-level risk-level--medium">
        <span>{this.languageService.translate('risk-exposure.medium')}</span></div>
      <div class="legend__text risk-level risk-level--high">
        <span>{this.languageService.translate('risk-exposure.high')}</span></div>
      <div class="legend__text risk-level risk-level--veryhigh">
        <span>{this.languageService.translate('risk-exposure.veryhigh')}</span></div>
      <div class="legend__text risk-level risk-level--extreme">
        <span>{this.languageService.translate('risk-exposure.extreme')}</span></div>
    </div>);
  }

  _renderLegend_weatherForecast() {
    return (<div class="legend" part="legend">
      <noi-icon name="weather-alert" class="legend__icon legend__pane"
                title={this.languageService.translate('map.layer.weather-forecast')}></noi-icon>
      <noi-button class="legend__btn"
                  title="Previous day"
                  disabled={!this.canChangeViewDate(-1)}
                  onClick={() => this.changeViewDate(-1)}>
        <noi-icon name="chevron-left"></noi-icon>
      </noi-button>
      <div class="legend__text">
        <span>{formatDay(this.viewDateObj, this.languageService.currentLanguage!)}</span>
      </div>
      <noi-button class="legend__btn"
                  title="Next day"
                  disabled={!this.canChangeViewDate(1)}
                  onClick={() => this.changeViewDate(1)}>
        <noi-icon name="chevron-right"></noi-icon>
      </noi-button>
    </div>);
  }


  _renderLegend_otp() {
    if (this.otpZoomCategory !== 'too-far') {
      return;
    }
    return (<div class="legend" part="legend">
      <noi-icon name="transport" class="legend__icon legend__pane"
                title={this.languageService.translate('map.layer.otp-stops')}></noi-icon>
      <div class="legend__text">
        <span>{this.languageService.translate('otp.zoom-too-far')}</span>
      </div>
    </div>);
  }

  _renderLegend_weatherCurrent() {
    let iconName = 'weather-alert';
    switch (this.weatherCurrentMode) {
      case 'temperature':
        iconName = 'material-thermomether';
        break;
      case 'precipitation':
        iconName = 'material-weather-mix';
        break;
    }
    return (<div class="legend" part="legend">
      <noi-icon name={iconName} class="legend__icon legend__pane"
                title={this.languageService.translate('map.layer.weather-current')}></noi-icon>
      <noi-button
        class={'legend__btn ' + (this.weatherCurrentMode === 'temperature' ? 'legend__btn-toggle--active' : '')}
        onClick={() => this.setWeatherCurrentMode('temperature')}>
        {this.languageService.translate('weather.type.temperature')}
      </noi-button>
      <noi-button
        class={'legend__btn ' + (this.weatherCurrentMode === 'precipitation' ? 'legend__btn-toggle--active' : '')}
        onClick={() => this.setWeatherCurrentMode('precipitation')}>
        {this.languageService.translate('weather.type.precipitation')}
      </noi-button>
    </div>);
  }
}
