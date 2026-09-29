// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, Prop, Watch } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { GeoJSONSource, LngLatLike, Map, MapGeoJSONFeature, Popup, Subscription } from "maplibre-gl";
import {
  enableHoverEffect,
  FontIconPaintParams,
  getFontIconData,
  listenLayerReady,
  loadIconFont
} from "../../utils/maplibre";
import { MyForecastResponse, WeatherForecastService } from "../../data/noi/weather-forecast-service";
import { GeoJSON, Point } from "geojson";
import { WeatherIconFont, WeatherIconName } from "./icon-font";
import { _getDailyMeasurement, getClearSkyType, getIconName } from "./weather-forecast.util";
import { AbortHandler } from "../../data/noi/fetch.util";

// Default styles
const defaultStyles = {
  unclusteredpoints: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      0, ['case', ['boolean', ['feature-state', 'hover'], false], 16, 14],
      10, ['case', ['boolean', ['feature-state', 'hover'], false], 17, 15],
      14, ['case', ['boolean', ['feature-state', 'hover'], false], 19, 17],
      18, ['case', ['boolean', ['feature-state', 'hover'], false], 21, 19]
    ],
    'circle-color': [
      'case', ['boolean', ['feature-state', 'hover'], false],
      '#FF6600',   // hovered
      '#004D71'    // normal
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
    'circle-opacity': 0.8
  },
} as const;


// 'iconFontStyles' is not a part of maplibre
const iconFontStyles: FontIconPaintParams = {
  "icon-font": WeatherIconFont.fontName,
  'icon-color': '#FFFFFF',
  "icon-size": 18,
  "icon-text": '',
};


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-weather',
  styleUrl: 'noi-map-layer-weather.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerWeatherComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  /**
   * View date for weather data
   */
  @Prop({mutable: true})
  viewDate: Date | undefined;

  private _subscriptions: Subscription[] = [];

  private weatherService = new WeatherForecastService();

  private _popup?: Popup;
  private _popupFeatureId?: string | number;

  private config = {
    center: [11.35, 46.5] as LngLatLike,
    zoom: 10,
  };

  /**
   */
  async connectedCallback() {
    // 1. Find the parent map element in the DOM tree
    const mapParent = this.el.closest('noi-map') as HTMLNoiMapElement;

    if (!mapParent) {
      console.error('[noi-map-layer-weather] must be a child of noi-map');
      return;
    }

    try {
      // 2. Safely wait for the map instance to be initialized by the parent
      this.map = await mapParent.getMapAsync();
    } catch (error) {
      console.error('Failed to get map instance:', error);
      throw error;
    }

    // 3. Add this layer to the map library instance
    await this.initLayer();
    await this.initLayerData();
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  @Watch('viewDate')
  viewDateChanged() {
    setTimeout(() => { // timeout is to avoid "The state/prop "layersLoading" changed during rendering"
      this.initLayerData();
    });
  }

  async initLayer() {
    console.log(`[noi-map-layer-weather] Adding layer to map`);

    //
    const geojsonPoints: GeoJSON = {
      type: 'FeatureCollection',
      features: [], // filled later
    };

    this.map.addSource('source-weather-data', {
      type: 'geojson',
      data: geojsonPoints,
    });


    // Add a visual layer
    this.map.addLayer({
      id: 'layer-weather-data',
      type: 'circle',
      source: 'source-weather-data',
      paint: defaultStyles.unclusteredpoints as any,
    });

    loadIconFont(WeatherIconFont.fontName, WeatherIconFont.url).then(() => {

      for (const iconName in WeatherIconFont.icons) {
        if (!iconName) {
          continue;
        }
        const imageData = getFontIconData({
          ...iconFontStyles,
          // "icon-text": 'A',
          "icon-text": WeatherIconFont.icons[iconName as WeatherIconName],
        });

        if (imageData) {
          // 3. Register the crisp canvas bitmap straight into MapLibre
          this.map.addImage(iconName, imageData, {
            sdf: false,
          });
        }
      }

      this.map.addLayer({
        id: 'layer-weather-icon',
        type: 'symbol',
        source: 'source-weather-data',

        layout: {
          'icon-image': ['get', 'icon_name'],
          'icon-size': 1.0,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
      });

    });

    // Hover effects
    const layerHover = enableHoverEffect(this.map, 'layer-weather-data');
    this._subscriptions.push(layerHover);

    ///////// Click handlers
    const _pointClick = this.map.on('click', 'layer-weather-data', (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked point:', feature);
      // this.createFeaturePopup(feature, e.lngLat);
      this.createFeaturePopup(feature);
    });
    this._subscriptions.push(_pointClick);

    // Click anywhere for debug
    const _debugClick = this.map.on('click', (e) => {
      const features = this.map.queryRenderedFeatures(e.point);
      console.log('[DEBUG] All features at click:', features);
    });
    this._subscriptions.push(_debugClick);

    this.resetPosition();
  }


  private __request?: AbortHandler;

  async initLayerData() {

    const viewDateTime = this.viewDate || new Date();
    console.debug(`[noi-map-layer-weather] initLayerData`, viewDateTime);

    this.layerLoading.emit(true);
    // fetch weather forecast

    this.__request?.abort();

    this.__request = this.weatherService.getWeatherForecastForDay(viewDateTime, data => {
      this.__request = undefined; // avoid cancelling finished request later
      this._initLayerData(data, viewDateTime);
    });
  }

  async _initLayerData(forecastData: MyForecastResponse, viewDateTime: Date) {
    // Convert your 2000 points into a GeoJSON FeatureCollection
    const dataPoints: any = forecastData.values.map(point => {
      const pointDescription = _getDailyMeasurement(point.sdatatypes["qualitative-forecast"]?.tmeasurements || [])?.mvalue;
      const sunshineDuration = _getDailyMeasurement(point.sdatatypes["forecast-sunshine-duration"]?.tmeasurements || [])?.mvalue;

      const skyType = getClearSkyType(viewDateTime, sunshineDuration);
      return {
        id: point.scode,
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.scoordinate.x, point.scoordinate.y] // Ensure longitude is FIRST
        },
        properties: {
          data: point,
          day: forecastData.dateFrom.toISOString(),
          icon_name: getIconName(pointDescription, skyType),
        },
      };
    });

    //
    const geojsonPoints: GeoJSON = {
      type: 'FeatureCollection',
      features: dataPoints,
    };

    const source = this.map.getSource('source-weather-data') as GeoJSONSource;
    source.setData(geojsonPoints);

    return new Promise<void>(resolve => {
      listenLayerReady(this.map, 'source-weather-data', () => resolve());
    }).then(() => {
      this.layerLoading.emit(false);
      this._reopenPopup();
    });
  }

  async _reopenPopup(){
    const idOpened = this._popupFeatureId;
    if (!idOpened) {
      return;
    }
    this._popup?.remove();

    // reopen popup of the same point
    const features = this.map.querySourceFeatures('source-weather-data', {
      filter: ['==', ['id'], idOpened]
    });

    const targetFeature = features[0] as MapGeoJSONFeature;
    if (targetFeature) {
      this.createFeaturePopup(targetFeature);
    }
  }

  /**
   */
  destroyLayer() {
    console.log('[noi-map-layer-weather] Removing layer from map');

    this._popup?.remove();

    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    if (this.map && this.map.getSource('source-weather-data')) {
      this.map.removeLayer('layer-weather-data');
      this.map.removeLayer('layer-weather-icon');

      for (const iconName in WeatherIconFont.icons) {
        if (!iconName) {
          continue;
        }
        this.map.removeImage(iconName);
      }

      this.map.removeSource('source-weather-data');
    }
  }

  resetPosition() {
    if (this.config.center || this.config.zoom) {
      this.map.flyTo({
        center: this.config.center ?? undefined,
        zoom: this.config.zoom ?? undefined,
      });
    }
  }

  // createFeaturePopup(feature: MapGeoJSONFeature, lngLat: MapMouseEvent['lngLat']) {
  async createFeaturePopup(feature: MapGeoJSONFeature) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened by another event
    }

    // create popup element
    const popupContent = document.createElement('noi-map-layer-weather-popup');

    // CRUCIAL: add to dom, so Stencil can initialize it
    this.el.appendChild(popupContent);

    // Wait for component hydration & data load
    // await popupContent.componentOnReady(); // < this breaks bundle, all the component already registered
    await popupContent.setFeature(feature);

    // Wait for the browser layout engine to paint the content
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Append 'popupContent' to the DOM (Crucial: Stencil needs connection to initialize)
    this._popupFeatureId = featureId;
    this._popup = new Popup()
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      .setDOMContent(popupContent)
      .setMaxWidth('380px')
      .addTo(this.map);
    this._popup.on('close', () => {
      this._popupFeatureId = undefined;
    });
  }

}



