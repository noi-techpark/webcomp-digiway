// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Prop, Watch } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { Map } from "maplibre-gl";


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-base-osm',
  // styleUrl: 'noi-map.css',
  shadow: false,
})
export class NoiMapBaseOsmComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  @Prop()
  variant: 'color' | 'grayscale' = 'color';

  /**
   * Emitted when layer data is loaded
   */
  // @Event() layerReady: EventEmitter<void>;

  // private _subscriptions: Subscription[] = [];

  constructor() {
  }


  async connectedCallback() {
    // 1. Find the parent map element in the DOM tree
    const mapParent = this.el.closest('noi-map') as HTMLNoiMapElement;

    if (!mapParent) {
      console.error('[noi-map-base-tyrol-osm] must be a child of my-map');
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

  @Watch('variant')
  onVariantChange() {
    switch (this.variant) {
      case 'color':
        this.map.setPaintProperty('layer-osm-background', 'raster-saturation', 0);
        break;
      case 'grayscale':
        this.map.setPaintProperty('layer-osm-background', 'raster-saturation', -1);
        break;
      default:
        console.warn('[noi-map-base-tyrol-osm] Unknown variant:', this.variant);
    }
  }


  initLayer() {
    console.log(`[noi-map-base-osm] Adding layer to map`);

    this.map.addSource('source-osm', {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'OpenStreetMap',
    });

    const layers = this.map.getLayersOrder();
    this.map.addLayer({
      id: 'layer-osm-background',
      type: 'raster',
      source: 'source-osm',
      minzoom: 0,
      maxzoom: 22
    }, layers[0]);

    this.onVariantChange();
  }

  destroyLayer() {
    console.log('[noi-map-base-tyrol-osm] Removing layer from map');

    // for (const subscription of this._subscriptions) {
    //   subscription.unsubscribe();
    // }
    // this._subscriptions = [];

    // 4. Cleanup source when HTML element gets removed from DOM
    if (this.map && this.map.getSource('source-osm')) {
      this.map.removeLayer('layer-osm-background');

      this.map.removeSource('source-osm');
    }
  }
}
