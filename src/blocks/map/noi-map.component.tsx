// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, Method, Prop, Watch } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { Map, NavigationControl, RequestTransformFunction, ScaleControl } from "maplibre-gl";


/**
 * (INTERNAL) render a basic map with no layouts
 */
@Component({
  tag: 'noi-map',
  // styleUrl: 'noi-map.css',
  // shadow: true,
  styleUrls: [
    '../../../node_modules/maplibre-gl/dist/maplibre-gl.css',
    'noi-map.css',
  ],
})
export class NoiMapComponent implements StencilComponent {

  map!: Map;
  sizeObserver: ResizeObserver | null = null;

  /**
   * Map center.
   * Pass latitude, longitude and zoomlevel separated by "," if map should be centered an a specific gps point
   */
  @Prop({mutable: true})
  centermap?: string;

  @Element() el!: HTMLElement;

  /**
   * Emitted when map is initialized and ready to draw on it
   */
  @Event() mapReady!: EventEmitter<Map>;

  // Create a promise that resolves when the map is ready
  private _resolveMap!: (map: Map) => void;

  private mapReadyPromise: Promise<Map> = new Promise((resolve) => {
    this._resolveMap = resolve;
  });


  // NOTE: it's not intended to have multiple transforms for the same web page
  private _tileTransforms: { [id: string]: RequestTransformFunction | null } = {};

  /**
   *
   */
  connectedCallback() {
    const mapCenterParsed = this._parseCenterProperty();

    this.map = new Map({
      container: this.el,
      center: mapCenterParsed.center || {lat: 46.5, lng: 11.35},
      zoom: !isNaN(mapCenterParsed.zoom!) ? mapCenterParsed.zoom : 10,

      // // Intercept all map network traffic
      transformRequest: (url, resourceType) => {
        for (const urlPart in this._tileTransforms) {
          // Only target requests aimed at your vector tile server
          if (resourceType === 'Tile' && url.includes(urlPart)) {
            if (this._tileTransforms[urlPart]) {
              return this._tileTransforms[urlPart](url, resourceType);
            }
            break;
          }
        }

        // Allow standard GET requests for fonts, sprites, base maps
        return {url: url};
      }
    });

    // this.map.addSource('osm', {
    //   type: 'raster',
    //   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    //   tileSize: 256,
    //   attribution: 'OpenStreetMap',
    // });
    //
    // this.map.addLayer({
    //   id: 'osm-background',
    //   type: 'raster',
    //   source: 'osm',
    //   minzoom: 0,
    //   maxzoom: 22
    // });


    this.map.addControl(new NavigationControl());
    this.map.addControl(new ScaleControl());

    (window as any)._map = this.map; // TODO: debug only

    // L.control.layers(this._layers, this._overlays, {position: 'topright'}).addTo(map);
    // this._layerControl = L.control.layers(this._layers, {}, {position: 'bottomright'}).addTo(this.map);
    // L.control.zoom({
    //   position: 'bottomright'
    // }).addTo(this.map);

    this.mapReady.emit(this.map);
    this._resolveMap(this.map);
    this._watchSize();
  }

  @Watch('centermap')
  onCenterChanged() {
    const mapCenterParsed = this._parseCenterProperty();
    if (mapCenterParsed.center) {
      this.map.setCenter(mapCenterParsed.center);
    }
    if (mapCenterParsed.zoom) {
      this.map.setZoom(mapCenterParsed.zoom);
    }
  }

  @Method()
  async setUrlTransform(urlPart: string, transformFn: RequestTransformFunction | null) {
    if (!!transformFn && this._tileTransforms[urlPart]) {
      console.error('[noi-map] setUrlTransform: url already has transformer', urlPart);
    }
    this._tileTransforms[urlPart] = transformFn;
  }

  _parseCenterProperty(): { center?: { lat: number, lng: number }, zoom?: number } {
    try {
      const coordsparts = (this.centermap + '').split(',');
      const lat = parseFloat(coordsparts[0]);
      const lng = parseFloat(coordsparts[1]);
      const zoom = parseFloat(coordsparts[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          center: {lat, lng},
          zoom: !isNaN(zoom) ? zoom : undefined,
        }
      } else {
        return {
          zoom: !isNaN(zoom) ? zoom : undefined,
        }
      }
    } catch (e) {
      console.error(e);
      return {};
    }
  }


  _watchSize() {
    if (typeof window.ResizeObserver === 'function') {
      this.sizeObserver = new ResizeObserver(() => {
        if (this.map) {
          this.map.resize();
        }
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

  disconnectedCallback() {
    this._unwatchSize();
  }

  @Method()
  async getMapAsync() {
    return this.mapReadyPromise;
  }

  // render() {
  //   return <Host></Host>;
  // }

}
