// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, Method, Prop, Watch } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { GeoJSONSource, LngLatLike, Map, MapGeoJSONFeature, Popup, Subscription } from "maplibre-gl";
import { enableHoverEffect, stringToNumId, } from "../../utils/maplibre";
import { MyMeteoStationsResponse, WeatherForecastService } from "../../data/noi/weather-forecast-service";
import { GeoJSON, Point } from "geojson";
import { AbortHandler } from "../../data/noi/fetch.util";
import { popupBuilder, PopupDefinitionObject } from "../../utils/maplibre-popup";
import {
  _getMeasurementAny,
  _getMeasurementLatest,
  getWindDirectionLabel
} from "../map-layer-weather/weather-forecast.util";
import { WeatherCurrentMeasurementType, WeatherMeteoStation } from "../../data/noi/WeatherMeteoStation";
import { formatDateTime } from "../../utils/intl";
import { LanguageDataService } from "../../data/language/language-data-service";

// Default styles
const defaultStylesBase = {
  unclusteredpoints: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      0, ['case', ['boolean', ['feature-state', 'hover'], false], 16, 14],
      10, ['case', ['boolean', ['feature-state', 'hover'], false], 17, 15],
      14, ['case', ['boolean', ['feature-state', 'hover'], false], 19, 17],
      18, ['case', ['boolean', ['feature-state', 'hover'], false], 21, 19]
    ],
    'circle-color': [ // unused, as it's overritten by defaultTypeStyle
      'case', ['boolean', ['feature-state', 'hover'], false],
      '#FF6600',   // hovered
      '#004D71'    // normal
    ],
    // 'circle-stroke-width': 2,
    // 'circle-stroke-color': '#FFFFFF',
    'circle-opacity': 0.8
  },
} as const;

const defaultTypeStyle = {
  'temperature': {
    'circle-color': [
      // 1. Check if the feature is currently hovered
      'case', ['boolean', ['feature-state', 'hover'], false],
      '#FFB366',    // Hovered color (Bright Orange)

      // 2. Check if relevant temperature data is unavailable
      ['!', ['boolean', ['get', 'air_temperature_relevant'], false]],
      '#EAEAEA', // Unavailable data color (Muted Gray)

      // 3. Pure Warm Scale (Steps tailored for Italy, text stays perfectly legible)
      [
        'step',
        ['get', 'air_temperature'],

        // Freezing & Alpine tones (Bright, crisp ice colors)
        '#A78BFA', // Below -10°C (Deep Alpine Freeze - Bright Lavender)
        -10.0, '#60A5FA', // -10°C to -3°C (Hard Frost - Sky Blue)
        -3.0, '#38BDF8', // -3°C to 0°C (Light Freeze - Electric Cyan)

        // Cool transitions (Fresh, luminous water and plant tones)
        0.0, '#2DD4BF', // 0°C to 6°C (Chilly Winter - Bright Turquoise)
        6.0, '#4ADE80', // 6°C to 12°C (Cool Spring - Vibrant Mint Green)

        // Warmth & Comfort (Sunny, cheerful mid-tones)
        12.0, '#A3E635', // 12°C to 22°C (Ideal Comfort - Lime Green)
        22.0, '#FACC15', // 22°C to 28°C (Warm Sunshine - Vivid Yellow)

        // Summer heat (Punchy, energetic tropical tones)
        28.0, '#FB923C', // 28°C to 34°C (High Summer Heat - Bright Mandarin Orange)
        34.0, '#F87171', // 34°C to 39°C (Severe Heat - Vibrant Coral Red)
        39.0, '#F43F5E'  // > 39°C (Extreme Heatwave - Rose Crimson)

      ]
    ],

    // 'circle-stroke-color': [
    //   'case',
    //   ['!', ['boolean', ['get', 'air_temperature_relevant'], false]],
    //   '#EAEAEA', // Unavailable data color (Muted Gray)
    //   '#004D71', // data available color (Muted Gray)
    // ],
  },

  'precipitation': {
    'circle-color': [

      // 1. Check if the feature is currently hovered
      'case', ['boolean', ['feature-state', 'hover'], false],
      '#FFB366',    // Hovered color (Bright Orange)

      // 2. Check if relevant precipitation data is unavailable
      ['!', ['boolean', ['get', 'precipitation_relevant'], false]],
      '#EAEAEA', // Unavailable data color (Muted Gray)

      // 3. Fallback: Data is available, color code by precipitation amount (in mm)
      [
        'step',
        ['get', 'precipitation_amount'],
        '#F5F7FA', // 0.0 mm (Dry)
        0.1, '#E1EDF7', // Up to 2 mm (Light Drizzle)
        2.0, '#C3DCF1', // Up to 10 mm (Steady Rain)
        10.0, '#9BC7EA', // Up to 25 mm (Heavy Showers)
        25.0, '#6BA7DC', // Up to 50 mm (Heavy Rain)
        50.0, '#428CD4'  // > 50 mm (Extreme Cloudburst)
      ]
    ],

    'circle-stroke-color': [
      'case',
      ['!', ['boolean', ['get', 'precipitation_relevant'], false]],
      '#EAEAEA', // Unavailable data color (Muted Gray)
      '#004D71', // data available color (Muted Gray)
    ],
  },

} as const;

const SOURCE_ID = 'source-weather-current-data';
const LAYER_TEMP_LABEL_ID = 'layer-weather-current-temperature-label';
const LAYER_TEMP_DATA_ID = 'layer-weather-current-temperature-data';

const LAYER_PRECIP_LABEL_ID = 'layer-weather-current-precipitation-label';
const LAYER_PRECIP_DATA_ID = 'layer-weather-current-precipitation-data';


export type WeatherCurrentViewMode = 'temperature' | 'precipitation' | 'snow';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-weather-current',
  styleUrl: 'noi-map-layer-weather-current.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerWeatherCurrentComponent implements StencilComponent {

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
  viewMode: WeatherCurrentViewMode = 'temperature';

  readonly languageService = LanguageDataService.getInstance();

  private _subscriptions: Subscription[] = [];

  private weatherService = new WeatherForecastService();

  private viewDateTime = new Date();

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
      console.error('[noi-map-layer-weather-current] must be a child of noi-map');
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
    await this.reloadData();
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  @Watch('viewMode')
  viewModeChanged() {
    setTimeout(() => { // timeout is to avoid "The state/prop "layersLoading" changed during rendering"
      this._reinitLayerProperties();
    });
  }

  async initLayer() {
    console.log(`[noi-map-layer-weather-current] Adding layer to map`);

    //
    const geojsonPoints: GeoJSON = {
      type: 'FeatureCollection',
      features: [], // filled later
    };

    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojsonPoints,
    });

    // Add a visual layer
    this.map.addLayer({
      id: LAYER_TEMP_DATA_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['any',
        ['!=', ['get', 'air_temperature'], null],
      ],
      paint: {
        ...defaultStylesBase.unclusteredpoints as any,
        ...defaultTypeStyle['temperature'],
      },
    });

    // text label
    this.map.addLayer({
      id: LAYER_TEMP_LABEL_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['any',
        ['!=', ['get', 'air_temperature'], null],
      ],
      layout: {
        'text-field': ['get', 'air_temperature'],
        'text-size': 12,

        'text-allow-overlap': true,    // Allows other symbols to overlap this text
        'text-ignore-placement': true, // Prevents this text from hiding other symbols
      },
      paint: {
        'text-color': '#222222'
      }
    });


    // Add a visual layer
    this.map.addLayer({
      id: LAYER_PRECIP_DATA_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['any',
        ['!=', ['get', 'precipitation_amount'], null],
      ],
      paint: {
        ...defaultStylesBase.unclusteredpoints as any,
        ...defaultTypeStyle['precipitation'],
      },
    });

    // text label
    this.map.addLayer({
      id: LAYER_PRECIP_LABEL_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['any',
        ['!=', ['get', 'precipitation_amount'], null],
      ],
      layout: {
        'text-field': ['get', 'precipitation_amount'],
        'text-size': 12,

        'text-allow-overlap': true,    // Allows other symbols to overlap this text
        'text-ignore-placement': true, // Prevents this text from hiding other symbols
      },
      paint: {
        'text-color': '#222222'
      }
    });

    // Hover effects
    this._subscriptions.push(
      enableHoverEffect(this.map, LAYER_TEMP_DATA_ID),
      enableHoverEffect(this.map, LAYER_PRECIP_DATA_ID),
    );

    ///////// Click handlers
    const _pointClickTemperature = this.map.on('click', LAYER_TEMP_DATA_ID, (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked point:', feature);
      // this.createFeaturePopup(feature, e.lngLat);
      this.createFeaturePopup(feature);
    });
    this._subscriptions.push(_pointClickTemperature);

    const _pointClickPrecipitation = this.map.on('click', LAYER_PRECIP_DATA_ID, (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked point:', feature);
      // this.createFeaturePopup(feature, e.lngLat);
      this.createFeaturePopup(feature);
    });
    this._subscriptions.push(_pointClickPrecipitation);

    // Click anywhere for debug
    const _debugClick = this.map.on('click', (e) => {
      const features = this.map.queryRenderedFeatures(e.point);
      console.log('[DEBUG] All features at click:', features);
    });
    this._subscriptions.push(_debugClick);

    this.resetPosition();
  }


  private __data?: MyMeteoStationsResponse;
  private __request?: AbortHandler;

  /**
   *
   */
  @Method()
  async reloadData() {

    this.layerLoading.emit(true);
    // fetch weather forecast

    this.__request?.abort();

    this.__request = this.weatherService.getWeatherCurrent(data => {
      this.__request = undefined; // avoid cancelling finished request later
      this.__data = data;
      this._initLayerData();
      this.layerLoading.emit(false);
    });
  }

  /**
   *
   */
  _initLayerData() {
    // Convert your 2000 points into a GeoJSON FeatureCollection
    console.log(`[noi-map-layer-weather-current] _initLayerData`);
    if (!this.__data) {
      return; // probably not loaded yet
    }
    const dataPoints: any = this.__data.values.map(point => {

      const airTemperature = _getMeasurementAny(point.sdatatypes?.['air-temperature']?.tmeasurements, this.viewDateTime)
        || _getMeasurementAny(point.sdatatypes?.['air_temperature']?.tmeasurements, this.viewDateTime);
      // const airHumidity = _getMeasurementAny(point.sdatatypes?.['air-humidity']?.tmeasurements, this.viewDateTime);
      const precipitation = _getMeasurementAny(point.sdatatypes?.['precipitation']?.tmeasurements, this.viewDateTime);
      // const snowLevel = _getMeasurementAny(point.sdatatypes?.['snow-level']?.tmeasurements, this.viewDateTime);

      // const skyType = getClearSkyType(viewDateTime, sunshineDuration);
      return {
        id: stringToNumId(point.scode),
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.scoordinate.x, point.scoordinate.y] // Ensure longitude is FIRST
        },
        properties: {
          data: point,
          air_temperature: airTemperature?.measurement?.mvalue ?? null,
          air_temperature_relevant: airTemperature?.isRelevant ?? null,
          // air_humidity: _suffix(airHumidity?.measurement?.mvalue, ' %') || null,
          // air_humidity_relevant: airHumidity?.isRelevant || null,
          precipitation_amount: precipitation?.measurement?.mvalue ?? null,
          precipitation_relevant: precipitation?.isRelevant ?? null,
        },
      };
    });

    // update dataset
    const geojsonPoints: GeoJSON = {
      type: 'FeatureCollection',
      features: dataPoints,
    };

    const source = this.map.getSource(SOURCE_ID) as GeoJSONSource;
    source.setData(geojsonPoints);
    this._reinitLayerProperties();
  }

  _reinitLayerProperties() {
    // update label layout
    switch (this.viewMode) {
      case 'temperature':
        this.map.setLayoutProperty(LAYER_TEMP_DATA_ID, 'visibility', 'visible');
        this.map.setLayoutProperty(LAYER_TEMP_LABEL_ID, 'visibility', 'visible');

        this.map.setLayoutProperty(LAYER_PRECIP_DATA_ID, 'visibility', 'none');
        this.map.setLayoutProperty(LAYER_PRECIP_LABEL_ID, 'visibility', 'none');
        break;
      case 'precipitation':
        this.map.setLayoutProperty(LAYER_TEMP_DATA_ID, 'visibility', 'none');
        this.map.setLayoutProperty(LAYER_TEMP_LABEL_ID, 'visibility', 'none');

        this.map.setLayoutProperty(LAYER_PRECIP_DATA_ID, 'visibility', 'visible');
        this.map.setLayoutProperty(LAYER_PRECIP_LABEL_ID, 'visibility', 'visible');
        break;
    }
    this._reopenPopup();
  }

  /**
   */
  destroyLayer() {
    console.log('[noi-map-layer-weather-current] Removing layer from map');

    this._popup?.remove();

    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    if (this.map && this.map.getSource(SOURCE_ID)) {
      this.map.removeLayer(LAYER_TEMP_DATA_ID);
      this.map.removeLayer(LAYER_TEMP_LABEL_ID);

      this.map.removeLayer(LAYER_PRECIP_DATA_ID);
      this.map.removeLayer(LAYER_PRECIP_LABEL_ID);

      this.map.removeSource(SOURCE_ID);
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

  _reopenPopup() {
    const idOpened = this._popupFeatureId;
    if (!idOpened) {
      return;
    }

    const features = this.map.querySourceFeatures(SOURCE_ID, {
      filter: ['==', ['id'], idOpened]
    });
    // const features = this.map.queryRenderedFeatures({ // < not working correctly, because rendered features is updated with a delay
    //   filter: ['==', ['id'], idOpened]
    // });

    const targetFeature = features[0] as MapGeoJSONFeature;
    console.log('_reopenPopup', targetFeature, idOpened);
    // close popup if it's not relevant anymore
    if (!targetFeature) {
      this._popup?.remove();
      return;
      //////
    }

    switch (this.viewMode) {
      case "temperature":
        if (targetFeature.properties.air_temperature === undefined) {
          this._popup?.remove();
        }
        break;

      case "precipitation":
        if (targetFeature.properties.precipitation_amount === undefined) {
          this._popup?.remove();
        }
        break;
    }
  }

  // createFeaturePopup(feature: MapGeoJSONFeature, lngLat: MapMouseEvent['lngLat']) {
  async createFeaturePopup(feature: MapGeoJSONFeature) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened
    }

    const pointData = JSON.parse(feature?.properties?.data) as WeatherMeteoStation;

    // collect popup data
    const popupBody: PopupDefinitionObject['body'] = [];

    switch (this.viewMode) {
      case "temperature":
        if (!feature.properties.air_temperature_relevant) {
          popupBody.push({
            type: 'description',
            cssClass:'map-layer-weather-current--popup-outdated',
            text: this.languageService.translate('weather.utils.data-outdated'),
          });
        }
        break;

      case "precipitation":
        if (!feature.properties.precipitation_relevant) {
          popupBody.push({
            type: 'description',
            cssClass:'map-layer-weather-current--popup-outdated',
            text: this.languageService.translate('weather.utils.data-outdated'),
          });
        }
        break;
    }

    if (pointData?.sdatatypes) {
      for (const dataType in pointData?.sdatatypes) {
        const sDatatype = pointData?.sdatatypes?.[dataType as WeatherCurrentMeasurementType]!;
        const sMeasure = _getMeasurementLatest(sDatatype.tmeasurements, this.viewDateTime);

        if (sMeasure) {
          // const measurementName = (sDatatype.tdescription && sDatatype.tdescription !== dataType) ? sDatatype.tdescription : this.languageService.translate('weather.parameter.' + dataType);
          let measurementName = sDatatype.tdescription;
          if (!measurementName || measurementName === dataType) {
            // no valid translation
            measurementName = this.languageService.translate('weather.parameter.' + dataType, dataType);
          }

          const value = this._valueSpecial(sMeasure?.mvalue, dataType as WeatherCurrentMeasurementType) || _suffix(sMeasure?.mvalue, sDatatype.tunit);

          popupBody.push({
            type: 'section',
            section: {
              name: measurementName,
              value: value,
            }
          }, {
            type: 'description',
            text: formatDateTime(sMeasure.mvalidtime, this.languageService.currentLanguage!),
            cssClass: 'map-layer-weather-current--popup-date',
          });
        }
      }
    }

    const structure: PopupDefinitionObject = {
      title: {
        text: pointData.sname,
      },
      body: popupBody,
    };

    // create popup
    this._popupFeatureId = featureId;
    this._popup = new Popup()
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      // .setHTML(debugPopupStructure(feature))
      .setHTML(popupBuilder(structure))
      .setMaxWidth('380px')
      .addTo(this.map);
    this._popup.on('close', () => {
      if (this._popupFeatureId === featureId) {
        this._popupFeatureId = undefined;
      }
    });
  }

  _valueSpecial(value: number | undefined, dataType: WeatherCurrentMeasurementType) {
    if (!value && value !== 0) {
      return '';
    }

    switch (dataType) {
      case 'wind-direction':
      case 'wind10m_direction':
        return `${value}° (${getWindDirectionLabel(value, this.languageService.translate('weather.wind-directions'))})`;
    }
    return null;
  }
}

/**
 *
 */
function _suffix<T = any>(val: T, suffix?: string): string | T {
  return (val !== undefined && val !== null) ? val + (suffix || '') : val;
}

