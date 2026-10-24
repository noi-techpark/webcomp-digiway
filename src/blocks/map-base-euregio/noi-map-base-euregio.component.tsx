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
  tag: 'noi-map-base-euregio',
  // styleUrl: 'noi-map.css',
  shadow: false,
})
export class NoiMapBaseEuregioComponent implements StencilComponent {

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
      console.error('[noi-map-base-euregio] must be a child of my-map');
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
        this.map.setPaintProperty('layer-euregio-background', 'raster-saturation', 0);
        break;
      case 'grayscale':
        this.map.setPaintProperty('layer-euregio-background', 'raster-saturation', -1);
        break;
      default:
        console.warn('[noi-map-base-euregio] Unknown variant:', this.variant);
    }
  }


  initLayer() {
    console.log(`[noi-map-base-euregio] Adding layer to map`);


    // Add the WMTS endpoint as a raster source
    this.map.addSource('source-euregio', {
      type: 'raster',
      tiles: [
        // Extracted tile template from the WMTS configuration
        'https://map21.mapservices.eu/tiles/styles/gs_liberty_europe_tirol_summer/{z}/{x}/{y}.png'
      ],
      tileSize: 256, // Adjust to 512 if the tiles appear blurry
      attribution: '© mapservices.eu'
    });

    // Render the source using a raster layer
    const layers = this.map.getLayersOrder();
    this.map.addLayer({
      id: 'layer-euregio-background',
      type: 'raster',
      source: 'source-euregio',
    }, layers[0]);

    this.onVariantChange();
  }

  destroyLayer() {
    console.log('[noi-map-base-euregio] Removing layer from map');

    // for (const subscription of this._subscriptions) {
    //   subscription.unsubscribe();
    // }
    // this._subscriptions = [];

    // 4. Cleanup source when HTML element gets removed from DOM
    if (this.map && this.map.getSource('source-euregio')) {
      this.map.removeLayer('layer-euregio-background');

      this.map.removeSource('source-euregio');
    }
  }
}
