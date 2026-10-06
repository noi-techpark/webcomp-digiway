// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Event, EventEmitter, h, Prop } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { MapGeoJSONFeature } from "maplibre-gl";
import { PopupDefinitionObject } from "../../utils/maplibre-popup";
import { LanguageDataService } from "../../data/language/language-data-service";
import { PoiInfo } from "../../data/noi/poi-service";
import { LayerConfig } from "../map-layer-base-odh/noi-map-layer-base-odh.component";
import { PoiIconFont, poiIcons } from "./icons";


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-poi',
  styleUrl: 'noi-map-layer-poi.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerPoiComponent implements StencilComponent {

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


  // private poiService = PoiService.getInstance();

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
                               popupStructure={this.createFeaturePopup.bind(this)}
                               onLayerLoading={(e) => this.layerLoading.emit(e.detail)}
      ></noi-map-layer-base-odh>)
      : null;
  }

  async createFeaturePopup(feature: MapGeoJSONFeature) {
    // const featureId = feature.id;
    // if (this._popupFeatureId === featureId) {
    //   return; // same popup is already opened
    // }

    const poiInfo = JSON.parse(feature?.properties?.data) as PoiInfo;

    const phoneNumber = this.languageService.translateObjectDeep(poiInfo.ContactInfos, 'Phonenumber');
    const email = this.languageService.translateObjectDeep(poiInfo.ContactInfos, 'Email');

    const structure: PopupDefinitionObject = {
      title: {
        icon: 'material-explore-nearby',
        text: this.languageService.translate('map.layer.poi'),
      },
      body: [
        {type: 'name', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'Header')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'SubHeader')},
        {type: 'name', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'Title') || poiInfo.Shortname},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'IntroText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'BaseText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'AdditionalText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'GetThereText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'SafetyInfo')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'ParkingInfo')},
        {
          type: 'description',
          text: this.languageService.translateObjectDeep(poiInfo.Detail, 'PublicTransportationInfo')
        },
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'EquipmentInfo')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'AuthorTip')},
        email ? {
          type: 'link',
          link: 'mailto:' + email,
          linkName: email,
        } : null,
        phoneNumber ? {
          type: 'link',
          link: 'tel:' + phoneNumber,
          linkName: phoneNumber,
        } : null,
        {type: 'link', link: this.languageService.translateObjectDeep(poiInfo.ContactInfos, 'Url')},
      ],
    };

    return structure;

    // create popup
    // this._popupFeatureId = featureId;
    // this._popup = new Popup()
    //   // .setLngLat(lngLat) // < on mouse click point
    //   .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
    //   .setHTML(popupBuilder(structure))
    //   // .setHTML(debugPopupStructure(feature))
    //   .setMaxWidth('380px')
    //   .addTo(this.map);
    // this._popup.on('close', () => {
    //   if (this._popupFeatureId === featureId) {
    //     this._popupFeatureId = undefined;
    //   }
    // });
  }

}
