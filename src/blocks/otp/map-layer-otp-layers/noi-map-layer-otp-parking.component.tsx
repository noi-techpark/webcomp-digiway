// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { Map, MapGeoJSONFeature, Subscription } from "maplibre-gl";
import { enableHoverEffectTargeted, getParentMap } from "../../../utils/maplibre";
import { SOURCE_OTP, STATIONS_MAX_ZOOM, parkingLayout, hoverCirclePaint } from "./layout";


const TAG = 'noi-map-layer-otp-parking';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-otp-parking',
  shadow: false,
})
export class NoiMapLayerOtpParkingComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   *
   */
  @Event() featureClick!: EventEmitter<MapGeoJSONFeature>;

  private _subscriptions: Subscription[] = [];

  async connectedCallback() {
    const sourceParent = this.el.closest('noi-map-layer-otp-source'); // HTMLNoiMapLayerOtpSourceComponent;
    if (!sourceParent) {
      console.error('must be a child of noi-map-layer-otp-source');
      throw new Error('must be a child of noi-map-layer-otp-source');
    }
    if (await sourceParent.isDestroying()) {
      return;
    }

    this.map = await getParentMap(this.el);
    await sourceParent.waitSourceReady();

    this.initLayer();
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  async initLayer() {
    console.log(`[${TAG}] Adding layer to map`);


    // PARKING
    this.map.addLayer({
      'id': 'odh-parking-hover',
      'source': SOURCE_OTP,
      'source-layer': 'vehicleParking',
      minzoom: STATIONS_MAX_ZOOM,
      'type': 'circle',
      'paint': hoverCirclePaint,
    });
    this.map.addLayer({
      'id': 'odh-parking',
      'source': SOURCE_OTP,
      'source-layer': 'vehicleParking',
      minzoom: STATIONS_MAX_ZOOM,

      // 'type': 'circle',
      // 'paint': {
      //   'circle-radius': 6,
      //   'circle-color': '#2563EB',
      //   'circle-stroke-width': 1.5,
      //   'circle-stroke-color': '#FFFFFF'
      // },

      'type': 'symbol',
      'layout': parkingLayout,
    });
    this._subscriptions.push(enableHoverEffectTargeted(this.map, {
      hoverOn: 'odh-parking',
      applyTo: 'odh-parking-hover'
    }));


    const clickSub = this.map.on('click', (e) => {
      // Query every feature currently rendered under your mouse click
      const features = this.map.queryRenderedFeatures(e.point, {layers: ['odh-parking']});

      const targetFeature = features[0];

      if (targetFeature) {
        this.featureClick.emit(targetFeature);
      }
    });

    this._subscriptions.push(clickSub);

  }

  destroyLayer() {
    console.log(`[${TAG}] Removing layer from map`);

    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    // 4. Cleanup source when HTML element gets removed from DOM
    if (this.map) {
      if (this.map.getLayer('odh-parking-hover')) {
        this.map.removeLayer('odh-parking-hover');
        this.map.removeLayer('odh-parking');
      }
    }
  }
}
