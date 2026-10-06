// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, Prop } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { Map, MapGeoJSONFeature, MapMouseEvent, Popup, RequestTransformFunction, Subscription } from "maplibre-gl";
import {
  enableHoverEffect,
  FontIconStyle,
  listenLayerReady,
  registerFontImage,
  registerSvgImage
} from "../../utils/maplibre";
import {
  debugPopupStructure,
  popupBuilder,
  PopupDefinitionFn,
  PopupDefinitionObject
} from "../../utils/maplibre-popup";
import { ODHIconFont } from "./icon-font";

const HOST = 'https://geo.api.opendatahub.testingmachine.eu';


// Default styles

function _getStyles(style: LayerConfig['style']) {
  const lineColor = style?.lines?.["line-color"];
  const lineWidth = style?.lines?.["line-width"] ?? 1;
  const pointColorNormal = style?.unclusteredpoints?.["circle-color"];
  const pointColorHovered = style?.unclusteredpoints?.["circle-color-hovered"];

  const clusterColors = style?.cluster;


  return {
    polygons: {
      'fill-color': [
        'case', ['boolean', ['feature-state', 'hover'], false],
        '#0055CC',   // hovered - darker blue
        '#0080FF'    // normal
      ],
      'fill-opacity': [
        'case', ['boolean', ['feature-state', 'hover'], false],
        0.7,   // hovered
        0.4    // normal
      ],
      'fill-outline-color': [
        'case', ['boolean', ['feature-state', 'hover'], false],
        '#FFFFFF',   // hovered - white outline to pop
        '#004080'    // normal
      ]
    },
    lines: {
      'line-color': lineColor || '#404040',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        8, ['case', ['boolean', ['feature-state', 'hover'], false], 5, lineWidth],
        12, ['case', ['boolean', ['feature-state', 'hover'], false], 5, lineWidth + 1],
        16, ['case', ['boolean', ['feature-state', 'hover'], false], 5, lineWidth + 3],
        20, ['case', ['boolean', ['feature-state', 'hover'], false], 5, lineWidth + 5]
      ],
      'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1.0, 0.8]
    },
    unclusteredpoints: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, ['case', ['boolean', ['feature-state', 'hover'], false], 14, 9],
        10, ['case', ['boolean', ['feature-state', 'hover'], false], 14, 10],
        14, ['case', ['boolean', ['feature-state', 'hover'], false], 14, 12],
        18, ['case', ['boolean', ['feature-state', 'hover'], false], 14, 14]
      ],
      'circle-color': [
        'case', ['boolean', ['feature-state', 'hover'], false],
        pointColorHovered || '#FF6600',   // hovered
        pointColorNormal || '#004D71'     // normal
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.8
    },
    cluster: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'count'],
        2, 12,
        10, 18,
        50, 28,
        200, 40
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'count'],
        2, clusterColors?.["color-2"] || '#66c2ff',
        10, clusterColors?.["color-10"] || '#3399ff',
        50, clusterColors?.["color-50"] || '#0066cc',
        200, clusterColors?.["color-200"] || '#003366'
      ],
      'circle-opacity': 0.85
    }
  };
}


// 'iconFontStyles' is not a part of maplibre
const iconFontStyles: FontIconStyle = {
  'icon-color': '#FFFFFF',
  "icon-size": 16,
};

export interface LayerConfig {
  fontIcon?: keyof typeof ODHIconFont.icons | { fontUrl: string, character: string },
  svgIcon?: string,
  isLineInteractive?: boolean;
  sourceLayer: string;
  additional: string;
  center?: [number, number];
  zoom?: number;

  requestTransform?: RequestTransformFunction;

  // custom style extension
  style?: {
    lines?: {
      'line-color'?: string;
      'line-width'?: number;
    };
    unclusteredpoints?: {
      'circle-color'?: string;
      'circle-color-hovered'?: string;
    };
    cluster?: {
      'color-2'?: string;
      'color-10'?: string;
      'color-50'?: string;
      'color-200'?: string;
    };
  };
}

let _uid_seed = 0;

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-base-odh',
  styleUrl: 'noi-map-layer-base-odh.css',
  shadow: false,
})
export class NoiMapLayerBaseOdhComponent implements StencilComponent {

  private _uid = -1;


  uid(name: string) {
    return 'base-odh-' + name + '-' + this._uid;
  }


  /**
   */
  @Prop({mutable: false})
  config!: LayerConfig;

  /**
   */
  @Prop({mutable: false})
  popupStructure?: PopupDefinitionFn;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  private map!: Map;

  @Element() el!: HTMLElement;

  private _mapParent!: HTMLNoiMapElement;

  private _subscriptions: Subscription[] = [];

  private tileSource: string = '';
  private tileSourceFilter: string = '';
  private _popup?: Popup;
  private _popupFeatureId?: string | number;

  constructor() {
    this._uid = (_uid_seed++);
  }

  componentWillLoad() {
  }


  async connectedCallback() {
    // 1. Find the parent map element in the DOM tree
    this._mapParent = this.el.closest('noi-map') as HTMLNoiMapElement;

    this.el.setAttribute('data-id', this._uid + '');

    if (!this._mapParent) {
      console.error('[noi-map-layer-base-odh] must be a child of my-map');
      return;
    }

    this.layerLoading.emit(true);

    try {
      // 2. Safely wait for the map instance to be initialized by the parent
      this.map = await this._mapParent.getMapAsync();

      // 3. Add this layer to the map library instance
      await this.initLayer();
    } catch (error) {
      console.error('Failed to get map instance:', error);
    }
  }


  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
      if (this.config.requestTransform) {
        this._mapParent.setUrlTransform(this.tileSourceFilter, null);
      }
    }
  }

  /**
   *
   */
  destroyLayer() {
    console.log(`[noi-map-layer-base-odh] Removing layer from map (${this._uid})`);

    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    // Cleanup source when HTML element gets removed from DOM
    if (this.map && this.map.getSource(this.uid('vector-tiles'))) {
      // Must remove dependent layers first before removing the source
      this.map.removeLayer(this.uid('polygons'));
      this.map.removeLayer(this.uid('lines'));
      this.map.removeLayer(this.uid('clusters'));
      this.map.removeLayer(this.uid('cluster-count'));
      this.map.removeLayer(this.uid('unclusteredpoints'));

      if (this.config.fontIcon || this.config.svgIcon) {
        this.map.removeLayer(this.uid('unclustered-icons'));
        this.map.removeImage(this.uid('marker-icon'));
      }
      this.map.removeSource(this.uid('vector-tiles'));
    }

    this._popup?.remove();
  }


  /**
   *
   */
  async initLayer() {
    console.log(`[noi-map-layer-base-odh] Adding layer to map (${this._uid})`);
    const sourceLayer = this.config.sourceLayer;
    const additional = this.config.additional;

    if (this.config.fontIcon && this.config.svgIcon) {
      throw new Error('Cannot use both fontIcon and svgIcon');
    }

    this.tileSource = `${HOST}/api/tiles/${sourceLayer}/{z}/{x}/{y}.pbf${additional}`;
    if (this.config.requestTransform) {
      this.tileSourceFilter = `${HOST}/api/tiles/${sourceLayer}/`;
      await this._mapParent.setUrlTransform(this.tileSourceFilter, this.config.requestTransform);
    }

    const sourceId = this.uid('vector-tiles');


    // 1. Start listening to incoming source updates
    const _loadEvent = listenLayerReady(this.map, sourceId, () => {
      this.layerLoading.emit(false);
    });
    this._subscriptions.push(_loadEvent);

    const styles = _getStyles(this.config.style);

    // Register your vector tile configuration
    this.map.addSource(this.uid('vector-tiles'), {
      type: 'vector',
      tiles: [this.tileSource],
      minzoom: 0,
      maxzoom: 22,
      promoteId: 'id' // Promotes your 'id' data property to the native feature.id hook
    });

    // Register layers
    this.map.addLayer({
      id: this.uid('polygons'),
      type: 'fill',
      source: this.uid('vector-tiles'),
      'source-layer': sourceLayer,
      filter: ['any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon']
      ],
      paint: styles.polygons as any,
    });

    this.map.addLayer({
      id: this.uid('lines'),
      type: 'line',
      source: this.uid('vector-tiles'),
      'source-layer': sourceLayer,
      filter: ['any',
        ['==', ['geometry-type'], 'LineString'],
        ['==', ['geometry-type'], 'MultiLineString']
      ],
      paint: styles.lines as any,
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });

    // CLUSTER CIRCLES
    this.map.addLayer({
      id: this.uid('clusters'),
      type: 'circle',
      source: this.uid('vector-tiles'),
      'source-layer': sourceLayer,
      filter: ['all',
        ['==', ['geometry-type'], 'Point'],
        ['==', ['get', 'cluster'], true]
      ],
      paint: styles.cluster as any,
    });

    // CLUSTER COUNT LABEL
    this.map.addLayer({
      id: this.uid('cluster-count'),
      type: 'symbol',
      source: this.uid('vector-tiles'),
      'source-layer': sourceLayer,
      filter: ['all',
        ['==', ['geometry-type'], 'Point'],
        ['==', ['get', 'cluster'], true]
      ],
      layout: {
        'text-field': ['get', 'count'],
        'text-size': 14
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // SINGLE POINTS
    this.map.addLayer({
      id: this.uid('unclusteredpoints'),
      type: 'circle',
      source: this.uid('vector-tiles'),
      'source-layer': sourceLayer,
      filter: ['all',
        ['==', ['geometry-type'], 'Point'],
        ['!=', ['get', 'cluster'], true]
      ],
      paint: styles.unclusteredpoints as any,
    });


    // ICON LAYER ON TOP OF CIRCLES
    if (this.config.fontIcon) {
      if (typeof this.config.fontIcon === 'string') {
        await registerFontImage(this.map, this.uid('marker-icon'), ODHIconFont.url, ODHIconFont.icons[this.config.fontIcon!], iconFontStyles);
      } else {
        await registerFontImage(this.map, this.uid('marker-icon'), this.config.fontIcon.fontUrl, this.config.fontIcon.character, iconFontStyles);
      }
    }
    if (this.config.svgIcon) {
      await registerSvgImage(this.map, this.uid('marker-icon'), this.config.svgIcon, {size: 16, sdf: true});
    }


    this.map.addLayer({
      id: this.uid('unclustered-icons'),
      type: 'symbol',
      source: this.uid('vector-tiles'),
      'source-layer': sourceLayer,
      filter: ['all',
        ['==', ['geometry-type'], 'Point'],
        ['!=', ['get', 'cluster'], true]
      ],
      layout: {
        'icon-image': this.uid('marker-icon'),
        'icon-size': 1.0,
        'icon-allow-overlap': true,       // Keeps icons visible even if they crowd each other
        'icon-ignore-placement': true,
        'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates
      },
      paint: {
        // Icon color here (for svg icon)
        'icon-color': iconFontStyles['icon-color'],
      }
    });


    console.log(`[noi-map-layer-base-odh] layer added: ${this.uid('unclustered-icons')}`);


    ///////// Click handlers
    const _polygonsClick = this.map.on('click', this.uid('polygons'), (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked polygons:', feature);
      this.createFeaturePopup(feature, e.lngLat);
    });
    this._subscriptions.push(_polygonsClick);


    const _pointClick = this.map.on('click', this.uid('unclusteredpoints'), (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked unclusteredpoints:', feature);
      this.createFeaturePopup(feature, e.lngLat);
    });
    this._subscriptions.push(_pointClick);

    // 'lines' should come after 'unclusteredpoints', so we can skip it if point is clicked
    if (this.config.isLineInteractive) {
      const _linesClick = this.map.on('click', this.uid('lines'), (e) => {
        const feature = e.features![0];
        console.log('(debug) Clicked lines:', feature);
        this.createFeaturePopup(feature, e.lngLat);
      });
      this._subscriptions.push(_linesClick);
    }

    const _clusterClick = this.map.on('click', this.uid('clusters'), (e) => {
      const feature = e.features![0] as any;
      console.log('(debug) Clicked clusters:', feature);
      this.map.easeTo({
        center: feature.geometry.coordinates,
        zoom: this.map.getZoom() + 2
      });
    });
    this._subscriptions.push(_clusterClick);


    // Hover effects
    let hoverTargets = ['unclusteredpoints', 'polygons', 'clusters'];
    if (this.config.isLineInteractive) {
      hoverTargets = ['unclusteredpoints', 'polygons', 'lines', 'clusters'];
    }
    const layerHover = enableHoverEffect(this.map, hoverTargets.map(layerName => this.uid(layerName)));
    this._subscriptions.push(layerHover);

    // Click anywhere for debug
    const _debugClick = this.map.on('click', (e) => {
      const features = this.map.queryRenderedFeatures(e.point);
      console.log('[DEBUG] All features at click:', features);
      console.log('[DEBUG] Vector features:', features.filter(f => f.source === 'vector-tiles'));
    });
    this._subscriptions.push(_debugClick);

    //
    console.log(`[noi-map-layer-base-odh] Successfully registered ${this.uid("vector-tiles")} source.`);
    this.resetPosition();
  }

  resetPosition() {
    if (this.config.center || this.config.zoom) {
      this.map.flyTo({
        center: this.config.center ?? undefined,
        zoom: this.config.zoom ?? undefined,
      });
    }
  }

  async createFeaturePopup(feature: MapGeoJSONFeature, lngLat: MapMouseEvent['lngLat']) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened by another event
    }
    this._popupFeatureId = featureId;

    const fn = this.popupStructure || debugPopupStructure;
    const structure = await fn(feature, feature.layer.type);

    // 1. Check for string
    if (typeof structure === 'string') {
      this._popup = new Popup()
        .setLngLat(lngLat)
        .setHTML(structure)
        .addTo(this.map);

      // 2. Check for HTMLElement
    } else if (structure instanceof HTMLElement) {
      // Wait for the browser layout engine to paint the content
      await new Promise(resolve => requestAnimationFrame(resolve));

      this._popup = new Popup()
        .setLngLat(lngLat)
        .setMaxWidth('380px')
        .setDOMContent(structure)
        .addTo(this.map);

      // 3. Check for PopupDefinitionObject object
    } else if (typeof structure === 'object') {
      this._popup = new Popup()
        .setLngLat(lngLat)
        .setHTML(popupBuilder(structure as PopupDefinitionObject))
        .addTo(this.map);
    }


    if (this._popup) {
      this._popup.on('close', () => {
        this._popupFeatureId = undefined;
      });
    } else {
      console.warn('No valid popup defnition');
    }
  }
}
