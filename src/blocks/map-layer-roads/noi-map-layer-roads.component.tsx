// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Prop } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { LayerConfig } from "../map-layer-base-odh/noi-map-layer-base-odh.component";
import { MapGeoJSONFeature } from "maplibre-gl";
import { PopupDefinition } from "../../utils/maplibre-popup";

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-roads',
  styleUrl: 'noi-map-layer-roads.css',
  shadow: false,
})
export class NoiMapLayerRoadsComponent implements StencilComponent {

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  /**
   */
  @Prop({mutable: false})
  region!: 'tyrol'
    | 'tyrol-north'
    | 'bolzano-int'
    | 'trento'
    | 'mountain-bike-bolzano'
    | 'mountain-bike-trento'
    | 'hiking-bolzano'
    | 'hiking-trento'
    | 'hiking-e5'
    | 'hiking-accessible';


  /**
   */
  @Prop({mutable: false})
  titleText?: string;
  /**
   */
  @Prop({mutable: false})
  titleIcon?: string;

  @Element() el!: HTMLElement;

  private config: { [key: string]: LayerConfig } = {
    'tyrol': {
      fontIcon: 'bicycle',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=dservices3.arcgis.com&tagfilter=radrouten_tirol&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.06, 47.27],
      zoom: 10
    },
    'tyrol-north': {
      fontIcon: 'bicycle',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=dservices3.arcgis.com&tagfilter=radrouten_tirol&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      // additional: '?source=civis.geoserver&tagfilter=cyclewaystyrol&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      // center: [10.98, 46.88],
      center: [11.06, 47.27],
      zoom: 10
    },
    'bolzano-int': {
      fontIcon: 'bicycle',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=civis.geoserver&tagfilter=intermunicipalcyclingroutes&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.35, 46.5],
      zoom: 10
    },
    'trento': {
      fontIcon: 'bicycle',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=siat.provincia.tn.it&tagfilter=elementi_cicloviari_v&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.12, 46.07],
      zoom: 10
    },


    'mountain-bike-bolzano': {
      // markerIcon: 'mountain-trails',
      fontIcon: 'bicycle',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=civis.geoserver&tagfilter=mountainbikeroutes&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.35, 46.5],
      zoom: 10
    },
    'mountain-bike-trento': {
      // markerIcon: 'mountain-trails',
      fontIcon: 'bicycle',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=siat.provincia.tn.it&tagfilter=mtb_percorsi_v&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.12, 46.07],
      zoom: 10
    },


    'hiking-bolzano': {
      fontIcon: 'trekking',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=civis.geoserver&tagfilter=hikingtrails&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.35, 46.5],
      zoom: 10
    },

    'hiking-trento': {
      fontIcon: 'trekking',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=siat.provincia.tn.it&tagfilter=sentieri_della_sat&operationmode=pointsandtracks&displaytracksonzoomlevel=10',
      center: [11.0900, 46.2300],
      zoom: 10
    },
    'hiking-e5': {
      fontIcon: 'trekking',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=dservices3.arcgis.com&tagfilter=hikingtrail_e5&operationmode=pointsandtracks&displaytracksonzoomlevel=8',
      // center: [11.06, 47.27], // original
      center: [10.7114, 47.1026], // custom
      zoom: 10,

      style: {
        lines: {
          "line-color": '#9d4edd',
          "line-width": 2,
        },
        unclusteredpoints: {
          "circle-color": '#7500cc',
        },
        cluster: {
          'color-2': '#d4b3ff',   // Darker, more noticeable light violet
          'color-10': '#b366ff',  // Medium vibrant violet
          'color-50': '#8000ff',  // Deep rich violet
          'color-200': '#330066', // Very dark/navy violet
        }
      }
    },
    'hiking-accessible': {
      fontIcon: 'trekking',
      isLineInteractive: true,

      sourceLayer: "spatialdata",
      additional: '?source=dservices3.arcgis.com&tagfilter=accessibletrails_austria&operationmode=pointsandtracks&displaytracksonzoomlevel=8',
      // center: [11.06, 47.27], // original
      center: [10.6463, 47.4750], // custom
      zoom: 10
    },
  }

  private regionConfig!: LayerConfig;

  connectedCallback() {
    this.regionConfig = this.config[this.region];
  }

  render(): any {
    return (<noi-map-layer-base-odh config={this.regionConfig}
                                    popupStructure={this.createPopup.bind(this)}
                                    onLayerLoading={(e) => this.layerLoading.emit(e.detail)}
    ></noi-map-layer-base-odh>)
  }


  // Feature popup helper
  async createPopup(feature: MapGeoJSONFeature/*, featureType*/): Promise<PopupDefinition> {

    if (!feature.id) {
      console.error('No feature id', feature)
      throw new Error('No feature id');
    }
    const geoName = feature.properties.data;

    // create popup element
    const popupContent = document.createElement('noi-map-layer-roads-popup');

    // CRUCIAL: add to dom, so Stencil can initialize it
    this.el.appendChild(popupContent);

    await popupContent.setPopupHeader({
      icon: this.titleIcon,
      text: this.titleText,
    });
    await popupContent.setName(geoName);
    await popupContent.setPointId(feature.id as string);

    return popupContent;
  }

}

