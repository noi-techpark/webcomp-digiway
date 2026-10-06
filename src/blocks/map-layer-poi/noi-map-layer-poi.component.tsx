// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Prop } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { MapGeoJSONFeature } from "maplibre-gl";
import { PopupDefinition } from "../../utils/maplibre-popup";
import { LanguageDataService } from "../../data/language/language-data-service";
import { LayerConfig } from "../map-layer-base-odh/noi-map-layer-base-odh.component";
import { PoiIconFont } from "./icons";


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-poi',
  styleUrl: 'noi-map-layer-poi.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerPoiComponent implements StencilComponent {

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  /**
   * View date for weather data
   */
  @Prop({mutable: true})
  tag?: string;

  readonly languageService = LanguageDataService.getInstance();


  private config: { [key: string]: LayerConfig } = {
    'accommodation': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['hotel'],
      },

      sourceLayer: "accommodation",
      additional: '?enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
    'summer': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['sunny'],
      },

      sourceLayer: "odhactivitypoi",
      additional: '?tagfilter=summer&enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
    'winter': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['snowflake'],
      },

      sourceLayer: "odhactivitypoi",
      additional: '?tagfilter=winter&enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
    'gastronomies': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['restaurant'],
      },

      sourceLayer: "odhactivitypoi",
      additional: '?tagfilter=eating%20drinking&enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
    'culture': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['museum'],
      },

      sourceLayer: "odhactivitypoi",
      additional: '?tagfilter=culture%20attractions&enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
    'shops': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['storefront'],
      },

      sourceLayer: "odhactivitypoi",
      additional: '?tagfilter=shops%20and%20service%20providers&enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
    'wellness': {
      fontIcon: {
        fontUrl: PoiIconFont.url,
        character: PoiIconFont.icons['spa'],
      },

      sourceLayer: "odhactivitypoi",
      additional: '?tagfilter=wellness%20relaxation&enableclustering=true',
      center: [11.35, 46.5],
      zoom: 10,
    },
  }

  private tagConfig!: LayerConfig;

  connectedCallback() {
    this.tagConfig = this.config[this.tag!];
  }

  render(): any {
    return this.tagConfig ?
      (<noi-map-layer-base-odh config={this.tagConfig}
                               popupStructure={this.createPopup.bind(this)}
                               onLayerLoading={(e) => this.layerLoading.emit(e.detail)}
      ></noi-map-layer-base-odh>)
      : null;
  }


  // Feature popup helper
  async createPopup(feature: MapGeoJSONFeature): Promise<PopupDefinition> {
    if (this.tag === 'accommodation') {
      return this.createPopup_accommodation(feature);
    } else {
      return this.createPopup_generic(feature);
    }
  }

  async createPopup_accommodation(feature: MapGeoJSONFeature): Promise<PopupDefinition> {
    if (!feature.id) {
      console.error('No feature id', feature)
      throw new Error('No feature id');
    }
    const geoName = feature.properties.data;

    // create popup element
    const popupContent = document.createElement('noi-map-layer-poi-accommodation-popup');

    // CRUCIAL: add to dom, so Stencil can initialize it
    this.el.appendChild(popupContent);

    await popupContent.setName(geoName);
    await popupContent.setFeatureId(feature.id as string);

    return popupContent;
  }

  async createPopup_generic(feature: MapGeoJSONFeature): Promise<PopupDefinition> {
    if (!feature.id) {
      console.error('No feature id', feature)
      throw new Error('No feature id');
    }
    const geoName = feature.properties.data;

    // create popup element
    const popupContent = document.createElement('noi-map-layer-poi-popup');

    // CRUCIAL: add to dom, so Stencil can initialize it
    this.el.appendChild(popupContent);

    await popupContent.setName(geoName);
    await popupContent.setFeatureId(feature.id as string);

    return popupContent;
  }


}
