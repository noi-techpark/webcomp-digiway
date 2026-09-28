// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { GeoJSONSource, Map, MapGeoJSONFeature, Popup, Subscription } from "maplibre-gl";
import { enableHoverEffectTargeted, getParentMap, registerSvgImage } from "../../../utils/maplibre";
import { ChargerStationService } from "../../../data/noi/charger-stations-service";
import { GeoJSON } from "geojson";
import { createDebugPopup } from "../../../utils/maplibre-popup";


const HIGHLIGHT_COLOR = '#0068B4';


const SOURCE_CHARGE = 'map-source-otp-charger';
const TAG = 'noi-map-layer-otp-charger';

const chargerIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 26.62 23.293"><path d="M33.806,41.966V36.974h-.674a3.49,3.49,0,0,1-2.912-5.382l.832-1.289-6.4.017,2.2-4.991h7.408L36.414,22H25.749a1.664,1.664,0,0,0-1.51,1.007L21.8,28.655H19.664a1.664,1.664,0,0,0,0,3.328h.711l-.711,1.664v4.991A3.328,3.328,0,0,0,21.328,41.5v2.126a1.664,1.664,0,0,0,1.664,1.664h1.664a1.664,1.664,0,0,0,1.664-1.664V41.966ZM24.655,35.31a1.664,1.664,0,1,1-1.664,1.664A1.664,1.664,0,0,1,24.655,35.31Zm19.808-.965L37.629,44.906a.72.72,0,0,1-1.327-.391V34.479h-3.17a.994.994,0,0,1-.832-1.531l6.834-10.561a.72.72,0,0,1,1.327.391V32.815h3.165a.994.994,0,0,1,.836,1.531Z" transform="translate(-18 -22)" fill="currentColor"></path></svg>';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-otp-charger',
  // styleUrl: 'noi-map-layer-otp-charger.css',
  shadow: false,
})
export class NoiMapLayerOtpChargerComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  /**
   *
   */
  @Event() featureClick!: EventEmitter<MapGeoJSONFeature>;

  private _subscriptions: Subscription[] = [];

  private chargerStationService = new ChargerStationService();

  private _popup?: Popup;

  async connectedCallback() {
    this.map = await getParentMap(this.el);
    this.initLayer();
    this._reloadData();
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  async initLayer() {
    console.log(`[${TAG}] Adding layer to map`);

    //
    const geojsonPointsLine: GeoJSON = {
      type: 'FeatureCollection',
      features: [], // filled later
    };

    this.map.addSource(SOURCE_CHARGE, {
      type: 'geojson',
      data: geojsonPointsLine,
    });

    await registerSvgImage(this.map, 'icon-charger', chargerIcon);

    // STOPS (All)
    this.map.addLayer({
      'id': 'odh-charger-hover',
      'source': SOURCE_CHARGE,
      'type': 'circle',
      'paint': {
        'circle-radius': 20,
        'circle-color': HIGHLIGHT_COLOR,
        // 'circle-opacity': 0.6,

        'circle-opacity': [
          'case', ['boolean', ['feature-state', 'hover'], false], 0.6,   // hovered
          0    // normal
        ],
      },
    });

    this.map.addLayer({
      'id': 'odh-charger',
      'source': SOURCE_CHARGE,
      'type': 'symbol',
      minzoom: 12,
      'layout': {
        'icon-size': 1.0,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
        'icon-allow-overlap': false,       // Keeps icons visible even if they crowd each other
        'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates
        'icon-image': 'icon-charger',     // Matches the name used in map.addImage()

        'text-anchor': 'top', // Anchor the text to the top of the label bounding box (This pushes the text BELOW the anchor point)
        'text-offset': [0, 1.0], // Offset the text down slightly so it doesn't overlap the icon
        'text-size': 12,
        'text-field': [
          'format',
          ['get', 'name'], {'font-scale': 1.0},
          '\n', {}, // Newline break
          ['get', 'available'], {'font-scale': 0.85, 'text-color': '#444444'}
        ],
      }
    });
    this._subscriptions.push(enableHoverEffectTargeted(this.map, {
      hoverOn: 'odh-charger',
      applyTo: 'odh-charger-hover'
    }));


    const clickSub = this.map.on('click', (e) => {
      // Query every feature currently rendered under your mouse click
      const features = this.map.queryRenderedFeatures(e.point);
      const targetFeature = features.filter(f => f.source === SOURCE_CHARGE)[0];
      console.log('Feature', targetFeature);
      this._popup?.remove();
      this._popup = createDebugPopup(this.map, targetFeature);
    });

    this._subscriptions.push(clickSub);

  }

  destroyLayer() {
    console.log(`[${TAG}] Removing layer from map`);

    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    this._popup?.remove();

    this.map.removeImage('icon-charger');

    // 4. Cleanup source when HTML element gets removed from DOM
    if (this.map) {
      this.map.removeLayer('odh-charger-hover');
      this.map.removeLayer('odh-charger');

      this.map.removeSource(SOURCE_CHARGE);
    }
  }

  async _reloadData() {

    this.layerLoading.emit(true);
    const data = await this.chargerStationService.getChargerStations();

    const dataPointsStops: any = data.map(chStation => {
      return {
        id: chStation.station_id,
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [chStation.lon, chStation.lat] // Ensure longitude is FIRST
        },
        properties: {
          data: chStation,
          name: chStation.name,
          available: chStation.free,
        },
      };
    });

    //
    const geojsonPointsStops: GeoJSON = {
      type: 'FeatureCollection',
      features: dataPointsStops,
    };

    const sourceStops = this.map.getSource(SOURCE_CHARGE) as GeoJSONSource;
    sourceStops.setData(geojsonPointsStops);

    this.layerLoading.emit(false);


  }
}
