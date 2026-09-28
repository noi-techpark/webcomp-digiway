// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Method } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { Map, Subscription } from "maplibre-gl";
import { getParentMap, listenLayerReady } from "../../../utils/maplibre";
import { SOURCE_OTP } from "../map-layer-otp-layers/layout";


const TAG = 'noi-map-layer-otp-source';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-otp-source',
  styleUrl: 'noi-map-layer-otp-source.css',
  shadow: false,
})
export class NoiMapLayerOtpSourceComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  private _subscriptions: Subscription[] = [];

  // Create a promise that resolves when source is ready
  private _sourceReady!: () => void;

  private sourceReadyPromise: Promise<void> = new Promise((resolve) => {
    this._sourceReady = resolve;
  });

  private _isDestroying = false;


  async connectedCallback() {
    this.map = await getParentMap(this.el);
    this.initLayer();
  }

  disconnectedCallback() {
    this._isDestroying = true;
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }

  @Method()
  async waitSourceReady() {
    return this.sourceReadyPromise;
  }

  @Method()
  async isDestroying() {
    return this._isDestroying;
  }

  render() {
    return <slot></slot>;
  }


  async initLayer() {
    console.log(`[${TAG}] Adding layer to map`);

    const _loadEvent = listenLayerReady(this.map, SOURCE_OTP, () => {
      this.layerLoading.emit(false);
    });
    this._subscriptions.push(_loadEvent);

    //
    this.layerLoading.emit(true);


    // 2. Inject your Open Data Hub raw source data
    this.map.addSource(SOURCE_OTP, {
      type: 'vector',
      tiles: [
        'https://v2.otp.opendatahub.com/otp/routers/default/vectorTiles/rentalStations,vehicleParking,stops,stations/{z}/{x}/{y}.pbf'
      ],
      promoteId: {
        'rentalStations': 'id',
        'vehicleParking': 'id',
        'stops': 'gtfsId',
        'stations': 'gtfsId'
      }
    });

    this._sourceReady();
  }

  destroyLayer() {
    console.log(`[${TAG}] Removing layer from map`);

    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    // 4. Cleanup source when HTML element gets removed from DOM
    if (this.map && this.map.getSource(SOURCE_OTP)) {

      const layerIds = this.map.getLayersOrder();
      for (const layerId of layerIds) {
        const layer = this.map.getLayer(layerId);
        if (layer?.source === SOURCE_OTP) {
          this.map.removeLayer(layer.id);
        }
      }
      this.map.removeSource(SOURCE_OTP);
    }
  }
}
