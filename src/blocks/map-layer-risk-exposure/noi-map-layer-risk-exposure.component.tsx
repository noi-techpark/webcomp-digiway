// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { Map, Subscription } from "maplibre-gl";
import { listenLayerReady } from "../../utils/maplibre";


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-risk-exposure',
  styleUrl: 'noi-map-layer-risk-exposure.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerRiskExposureComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  private _subscriptions: Subscription[] = [];

  constructor() {
  }


  async connectedCallback() {
    // 1. Find the parent map element in the DOM tree
    const mapParent = this.el.closest('noi-map') as HTMLNoiMapElement;

    if (!mapParent) {
      console.error('[noi-map-base-tyrol-euregio] must be a child of my-map');
      return;
    }

    try {
      // 2. Safely wait for the map instance to be initialized by the parent
      this.map = await mapParent.getMapAsync();

      // 3. Add this layer to the map library instance
      this.initLayer();
    } catch (error) {
      console.error('Failed to get map instance:', error);
    }
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  initLayer() {
    console.log(`[noi-map-base-euregio] Adding layer to map`);


    const _loadEvent = listenLayerReady(this.map, 'source-euregio-data', () => {
      this.layerLoading.emit(false);
    });
    this._subscriptions.push(_loadEvent);

    //
    this.layerLoading.emit(true);
    /////
    //

    /// CORS!

    // const euregioLinesUrl =
    //   'https://tirol.gv.at' +
    //   '?bbox={bbox-epsg-3857}' +
    //   '&bboxSR=102100' +
    //   '&imageSR=102100' +
    //   '&size=512,512' +
    //   '&dpi=96' +
    //   '&format=png32' +
    //   '&transparent=true' +
    //   '&layers=show:3' +
    //   '&f=image';
    //
    // this.map.addSource('euregio-lines-source', {
    //   type: 'raster',
    //   tiles: [euregioLinesUrl],
    //   tileSize: 512,
    //   // crossOrigin: 'anonymous',
    //   attribution: '© Land Tirol',
    // });
    //
    // this.map.addLayer({
    //   id: 'euregio-lines-layer',
    //   type: 'raster',
    //   source: 'euregio-lines-source',
    //   paint: { 'raster-opacity': 1.0 },
    // });


    ////

    // this.map.addSource('esri-vector-base', {
    //   type: 'vector',
    //   tiles: ['https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf'],
    //   minzoom: 0,
    //   maxzoom: 22
    // });
    //
    //
    // // 2. You must define layers explicitly to tell MapLibre how to render the data
    // this.map.addLayer({
    //   id: 'base-ground',
    //   type: 'fill',
    //   source: 'esri-vector-base',
    //   'source-layer': 'Land',
    //   paint: { 'fill-color': '#f5f5f2' }
    // });
    //
    // // 3. Rivers & Lakes Layer
    // this.map.addLayer({
    //   id: 'base-rivers',
    //   type: 'fill',
    //   source: 'esri-vector-base',
    //   'source-layer': 'Water area',
    //   paint: { 'fill-color': '#c3e2ed' }
    // });
    //
    // // 4. Street Grid & Highway Corridors
    // this.map.addLayer({
    //   id: 'base-roads',
    //   type: 'line',
    //   source: 'esri-vector-base',
    //   'source-layer': 'Road',
    //   paint: {
    //     'line-color': '#ffffff',
    //     'line-width': [
    //       'interpolate', ['linear'], ['zoom'],
    //       6, 0.5,  // Narrow lines at low zoom
    //       12, 2.0  // Thicker lines as you zoom in close
    //     ]
    //   }
    // });


    //// HILLSHADE

    // this.map.addSource('source-osm', {
    //   type: 'raster',
    //   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    //   tileSize: 256,
    //   attribution: 'OpenStreetMap',
    // });
    //
    // this.map.addLayer({
    //   id: 'layer-osm-background',
    //   type: 'raster',
    //   source: 'source-osm',
    //   minzoom: 0,
    //   maxzoom: 22,
    //   paint: {
    //     'raster-saturation': -1, // make grayscale
    //   }
    // });


    // const esriHillshadeUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}';
    //
    // this.map.addSource('source-euregio', {
    //   type: 'raster',
    //   tiles: [esriHillshadeUrl],
    //   tileSize: 256,
    //   attribution: 'Tiles © Esri — Source: USGS, NGA, NASA, CGIAR',
    // });
    //
    // this.map.addLayer({
    //   id: 'layer-euregio-background',
    //   type: 'raster',
    //   source: 'source-euregio',
    //   paint: {
    //     'raster-opacity': 0.4, // Adjust transparency of the overlay
    //   },
    //   minzoom: 0,
    //   maxzoom: 22
    // });


    ////// DATA

    const euregioLinesUrl =
      'https://gis.tirol.gv.at/arcgis/rest/services/Service_Public/euregio/MapServer/export' +
      '?bbox={bbox-epsg-3857}' +
      '&bboxSR=102100' +
      '&imageSR=102100' +
      '&size=512,512' + // MapLibre requests tiles in 512x512 blocks
      '&dpi=96' +
      '&format=png32' +
      '&transparent=true' +
      '&layers=show:3' + // 👈 Isolates the specific route lines layer from your link
      '&f=image';

    this.map.addSource('source-euregio-data', {
      type: 'raster',
      tiles: [euregioLinesUrl],
      tileSize: 512,
      attribution: '© Land Tirol, Südtirol, Trentino',
    });

    this.map.addLayer({
      id: 'layer-euregio-background-data',
      type: 'raster',
      source: 'source-euregio-data',
      minzoom: 0,
      maxzoom: 22
    });


  }

  destroyLayer() {
    console.log('[noi-map-base-tyrol-euregio] Removing layer from map');


    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    // Must remove dependent layers first before removing the source
    // if (this.map && this.map.getSource('source-euregio')) {
    //   this.map.removeLayer('layer-euregio-background');
    //
    //   this.map.removeSource('source-euregio');
    // }
    if (this.map && this.map.getSource('source-euregio-data')) {
      this.map.removeLayer('layer-euregio-background-data');

      this.map.removeSource('source-euregio-data');
    }
  }
}
