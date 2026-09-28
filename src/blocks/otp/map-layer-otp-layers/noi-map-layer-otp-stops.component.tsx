// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { Map, MapGeoJSONFeature, Subscription } from "maplibre-gl";
import { enableHoverEffectTargeted, getParentMap } from "../../../utils/maplibre";
import {
  anyStationLayout,
  hoverCirclePaint,
  SOURCE_OTP,
  STATIONS_ALL_MIN_ZOOM,
  STATIONS_MAX_ZOOM,
  stopsLayout
} from "./layout";


const TAG = 'noi-map-layer-otp-stops';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-otp-stops',
  styleUrl: 'noi-map-layer-otp-stops.css', // NOTE: some components are generated invalid without style file
  shadow: false,
})
export class NoiMapLayerOtpStopsComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   *
   */
  @Event() featureClick!: EventEmitter<MapGeoJSONFeature>;

  private _subscriptions: Subscription[] = [];
  private _isDestroying = false;

  async connectedCallback() {
    if (this._isDestroying) {
      // sometimes stencil or browser reattach component to different elements.
      // That produces errors in console, but technically not a problem.
      // Anyway we can remove those errors by checking _isDestroying status
      return;
    }
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
    this._isDestroying = true;
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  async initLayer() {
    console.log(`[${TAG}] Adding layer to map`);

    if (this.map.getLayer('odh-stops-hover')) {
      console.warn(`[${TAG}] Already added`);
      return;
    }

    // STOPS (All)
    this.map.addLayer({
      'id': 'odh-stops-hover',
      'source': SOURCE_OTP,
      'source-layer': 'stops',
      "filter": [
        "all",
        ["!=", ["get", "type"], null],
        ["!=", ["get", "type"], ""],
      ],
      minzoom: STATIONS_MAX_ZOOM,
      'type': 'circle',
      'paint': hoverCirclePaint,
    });

    this.map.addLayer({
      'id': 'odh-stops',
      'source': SOURCE_OTP,
      'source-layer': 'stops',
      "filter": [
        "all",
        ["!=", ["get", "type"], null],
        ["!=", ["get", "type"], ""],
      ],
      minzoom: STATIONS_MAX_ZOOM,
      'type': 'symbol',
      'layout': stopsLayout,
    });
    this._subscriptions.push(enableHoverEffectTargeted(this.map, {
      hoverOn: 'odh-stops',
      applyTo: 'odh-stops-hover'
    }));


    // Stations (Train)
    this.map.addLayer({
      'id': 'odh-stations-rail-hover',
      'source': SOURCE_OTP,
      'source-layer': 'stations',
      "filter": ["in", "RAIL", ["string", ["get", "type"]]],
      maxzoom: STATIONS_MAX_ZOOM,
      'type': 'circle',
      'paint': hoverCirclePaint,
    });

    this.map.addLayer({
      'id': 'odh-stations-rail',
      'source': SOURCE_OTP,
      'source-layer': 'stations',
      "filter": ["in", "RAIL", ["string", ["get", "type"]]],
      maxzoom: STATIONS_MAX_ZOOM,
      'type': 'symbol',
      'layout': anyStationLayout,
    });
    this._subscriptions.push(enableHoverEffectTargeted(this.map, {
      hoverOn: 'odh-stations-rail',
      applyTo: 'odh-stations-rail-hover'
    }));

    // Stations (others)
    this.map.addLayer({
      'id': 'odh-stations-other-hover',
      'source': SOURCE_OTP,
      'source-layer': 'stations',
      "filter": ['all',
        ["!=", ["get", "type"], null],
        ["!=", ["get", "type"], ""],
        ["!", ["in", "RAIL", ["string", ["get", "type"]]]],
      ],
      maxzoom: STATIONS_MAX_ZOOM,
      minzoom: STATIONS_ALL_MIN_ZOOM,
      'type': 'circle',
      'paint': hoverCirclePaint,
    });

    this.map.addLayer({
      'id': 'odh-stations-other',
      'source': SOURCE_OTP,
      'source-layer': 'stations',
      "filter": ['all',
        ["!=", ["get", "type"], null],
        ["!=", ["get", "type"], ""],
        ["!", ["in", "RAIL", ["string", ["get", "type"]]]],
      ],
      maxzoom: STATIONS_MAX_ZOOM,
      minzoom: STATIONS_ALL_MIN_ZOOM,

      'type': 'symbol',
      'layout': anyStationLayout,
    });
    this._subscriptions.push(enableHoverEffectTargeted(this.map, {
      hoverOn: 'odh-stations-other',
      applyTo: 'odh-stations-other-hover'
    }));


    const clickSub = this.map.on('click', (e) => {
      // Query every feature currently rendered under your mouse click
      const features = this.map.queryRenderedFeatures(e.point, {layers: ['odh-stops', 'odh-stations-rail', 'odh-stations-other']});

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
      if (this.map.getLayer('odh-stops-hover')) {
        this.map.removeLayer('odh-stops-hover');
        this.map.removeLayer('odh-stops');
      }
      if (this.map.getLayer('odh-stations-rail-hover')) {
        this.map.removeLayer('odh-stations-rail-hover');
        this.map.removeLayer('odh-stations-rail');
      }
      if (this.map.getLayer('odh-stations-other-hover')) {
        this.map.removeLayer('odh-stations-other-hover');
        this.map.removeLayer('odh-stations-other');
      }
    }
  }
}
