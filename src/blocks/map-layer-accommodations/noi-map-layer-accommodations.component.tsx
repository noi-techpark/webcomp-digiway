// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { GeoJSONSource, LngLatLike, Map, MapGeoJSONFeature, Popup, Subscription } from "maplibre-gl";
import {
  clusterClickZoom,
  enableHoverEffect,
  enableHoverEffectTargeted,
  getParentMap,
  listenLayerReady,
  mapCenterBySourceData,
  registerSvgImage,
  stringToNumericId,
} from "../../utils/maplibre";
import { Feature, FeatureCollection, Point } from "geojson";
import { popupBuilder, PopupDefinitionObject } from "../../utils/maplibre-popup";
import { LanguageDataService } from "../../data/language/language-data-service";
import { AccommodationInfo, AccommodationsService } from "../../data/noi/accommodations-service";
import { poiClusterFilter, poiStyles } from "../map-layer-poi/styles";

const MARKER_ICON_SRC = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M40-200v-600h80v400h320v-320h320q66 0 113 47t47 113v360h-80v-120H120v120H40Zm155-275q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Zm325 75h320v-160q0-33-23.5-56.5T760-640H520v240ZM308.5-531.5Q320-543 320-560t-11.5-28.5Q297-600 280-600t-28.5 11.5Q240-577 240-560t11.5 28.5Q263-520 280-520t28.5-11.5ZM280-560Zm240-80v240-240Z"/></svg>';


const TAG = 'noi-map-layer-accommodations';


const MAP_SOURCE = 'source-accomodations';
const MAP_ICON = 'layer-accomodations-icon';
const MAP_LAYER_CIRCLE = 'layer-accomodations-circle';
const MAP_LAYER_CLUSTER_CIRCLE = 'layer-accomodations-cluster-cicle';
const MAP_LAYER_CLUSTER_LABEL = 'layer-accomodations-cluster-label';
const MAP_LAYER_LABEL = 'layer-accomodations-label';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-accommodations',
  styleUrl: 'noi-map-layer-accommodations.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerAccommodationsComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;


  readonly languageService = LanguageDataService.getInstance();

  private _subscriptions: Subscription[] = [];

  private accommodationsService = AccommodationsService.getInstance();

  private _popup?: Popup;
  private _popupFeatureId?: string | number;

  private _requestSub?: Subscription;

  /**
   */
  async connectedCallback() {
    this.map = await getParentMap(this.el);
    this.initLayer().then(() => this._loadData());
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  /**
   *
   */
  async _loadData() {


    this.layerLoading.emit(true);

    this._requestSub?.unsubscribe();
    this._requestSub = this.accommodationsService.getAccommodationsInfo$().subscribe({
      next: (data) => {
        this._setLayerData(data || []);

        // re-center
        listenLayerReady(this.map, MAP_SOURCE, () => {
          this.layerLoading.emit(false);
          this.resetPosition();
        });
      },
      error: (e) => {
        console.error(e);
        this.layerLoading.emit(false);
      }
    });
  }


  async _setLayerData(data: AccommodationInfo[]) {
    const geojsonPoints: FeatureCollection = {
      type: 'FeatureCollection',
      features: _info2mapFeature(data),
    };

    const sourceStops = this.map.getSource(MAP_SOURCE) as GeoJSONSource;
    sourceStops.setData(geojsonPoints);
  }

  async initLayer() {
    console.log(`[${TAG}] Adding layer to map`);

    await registerSvgImage(this.map, MAP_ICON, MARKER_ICON_SRC, {size: 48, sdf: true});

    //
    const geojsonPoints: FeatureCollection = {
      type: 'FeatureCollection',
      features: [], // _info2mapFeature(data),
    };

    this.map.addSource(MAP_SOURCE, {
      type: 'geojson',
      data: geojsonPoints,
      cluster: true,
      clusterMaxZoom: 14, // Stop clustering at this zoom level
      clusterRadius: 50,   // Radius of each cluster in pixels

      tolerance: 0.375, // Higher values increase simplification (faster rendering)
      buffer: 64        // Size of the tile buffer (higher values reduce edge artifacts but use more memory)
    });


    // cluster layers
    this.map.addLayer({
      id: MAP_LAYER_CLUSTER_CIRCLE,
      type: 'circle',
      source: MAP_SOURCE,
      // ONLY show features that ARE clusters
      filter: poiClusterFilter.clusterOnly,
      paint: {
        ...poiStyles.cluster,
      }
    });

    this.map.addLayer({
      id: MAP_LAYER_CLUSTER_LABEL,
      type: 'symbol',
      source: MAP_SOURCE,
      filter: poiClusterFilter.clusterOnly,
      layout: {
        // This grabs the count and displays it as text
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 13,
        'text-allow-overlap': true,       // Ensures numbers don't hide if tight on space
        'text-ignore-placement': true,
        'icon-allow-overlap': true, // Forces icons to stay visible
      },
      paint: {
        'text-color': '#ffffff' // Change this to contrast with your circle color
      }
    });

    // Add a visual layer
    this.map.addLayer({
      id: MAP_LAYER_CIRCLE,
      type: 'circle',
      // ONLY show features where cluster property is NOT true
      filter: poiClusterFilter.nonClusterOnly,
      source: MAP_SOURCE,
      paint: {
        ...poiStyles.unclusteredpoints,
      },
    });

    this.map.addLayer({
      id: MAP_LAYER_LABEL,
      type: 'symbol',
      source: MAP_SOURCE,
      // ONLY show features where cluster property is NOT true
      filter: poiClusterFilter.nonClusterOnly,
      layout: {
        'icon-image': MAP_ICON,
        'icon-size': 0.5,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
        'icon-allow-overlap': true,       // Keeps icons visible even if they crowd each other
        'icon-ignore-placement': true,
        'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates
      },
      paint: {
        // 👇 Set your icon color here (paint property, not layout!)
        'icon-color': '#FFFFFF',
      }
    });

    // Hover effects
    this._subscriptions.push(
      clusterClickZoom(this.map, MAP_SOURCE, MAP_LAYER_CLUSTER_CIRCLE),
      enableHoverEffect(this.map, MAP_LAYER_CLUSTER_CIRCLE),
      enableHoverEffectTargeted(this.map, {hoverOn: MAP_LAYER_LABEL, applyTo: MAP_LAYER_CIRCLE}),
    );

    ///////// Click handlers
    const _pointClick = this.map.on('click', MAP_LAYER_CIRCLE, (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked point:', feature);
      // this.createFeaturePopup(feature, e.lngLat);
      this.createFeaturePopup(feature);
    });
    this._subscriptions.push(_pointClick);
  }

  /**
   */
  destroyLayer() {
    console.log(`[${TAG}] Removing layer from map`);

    this._requestSub?.unsubscribe();

    this._popup?.remove();

    // remove subscriptions
    for (const sub of this._subscriptions) {
      sub.unsubscribe();
    }
    this._subscriptions = [];

    // remove layers
    if (this.map.hasImage(MAP_ICON)) {
      this.map.removeImage(MAP_ICON);
    }

    if (this.map.getLayer(MAP_LAYER_LABEL)) {
      this.map.removeLayer(MAP_LAYER_LABEL);
    }
    if (this.map.getLayer(MAP_LAYER_CIRCLE)) {
      this.map.removeLayer(MAP_LAYER_CIRCLE);
    }
    if (this.map.getLayer(MAP_LAYER_CLUSTER_CIRCLE)) {
      this.map.removeLayer(MAP_LAYER_CLUSTER_CIRCLE);
    }
    if (this.map.getLayer(MAP_LAYER_CLUSTER_LABEL)) {
      this.map.removeLayer(MAP_LAYER_CLUSTER_LABEL);
    }
    if (this.map.getSource(MAP_SOURCE)) {
      this.map.removeSource(MAP_SOURCE);
    }

  }

  resetPosition() {
    mapCenterBySourceData(this.map, MAP_SOURCE);
  }

  async createFeaturePopup(feature: MapGeoJSONFeature) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened
    }

    const accInfo = JSON.parse(feature?.properties?.data) as AccommodationInfo;

    const phoneMobile = this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Mobile');
    const phoneBasic = this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Phone');
    const email = this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Email');

    const stars = accInfo.AccoCategoryId ? parseInt(accInfo.AccoCategoryId) : null;

    const previewImages = accInfo.ImageGallery || [];

    const structure: PopupDefinitionObject = {
      title: {
        // header is same as 'poi'
        icon: 'material-explore-nearby',
        text: this.languageService.translate('map.layer.poi'),
      },
      body: [
        {
          type: 'name',
          text: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Name')
            || accInfo.Shortname
        },
        stars ? {
          type: 'html',
          cssClass: 'popup__description',
          html: `<noi-stars stars="${stars}" title="${accInfo.AccoCategoryId}"></noi-stars>`,
        } : null,
        {
          type: 'description',
          text: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Street')
        },
        {
          type: 'description',
          text: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Longdesc')
            || this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Shortdesc')
        },
        {type: 'description', text: accInfo.AccoTypeId},


        (previewImages.length > 0) ? {
          type: 'html',
          cssClass: 'popup__images',
          html: previewImages.map(img => `
            <img height="96" src="${img.ImageUrl}" alt="${this.languageService.translateObject(img.ImageDesc)}" />
        `).join(''),
        } : null,

        phoneMobile ? {
          type: 'link',
          link: 'tel:' + phoneMobile,
          linkName: phoneMobile,
        } : null,

        phoneBasic ? {
          type: 'link',
          link: 'tel:' + phoneBasic,
          linkName: phoneBasic,
        } : null,

        email ? {
          type: 'link',
          link: 'mailto:' + email,
          linkName: email,
        } : null,
        {type: 'link', link: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Website')},
      ],
    };

    // create popup
    this._popupFeatureId = featureId;
    this._popup = new Popup()
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      .setHTML(popupBuilder(structure))
      // .setHTML(debugPopupStructure(feature))
      .setMaxWidth('380px')
      .addTo(this.map);
    this._popup.on('close', () => {
      if (this._popupFeatureId === featureId) {
        this._popupFeatureId = undefined;
      }
    });
  }

}


/**
 *
 */
function _info2mapFeature(data: AccommodationInfo[]) {
  if (!data) {
    return [];
  }
  // Convert points to a GeoJSON FeatureCollection

  const dataPoints: Feature[] = [];
  for (const point of (data || [])) {
    const lon = point.GpsPoints?.position?.Longitude;
    const lat = point.GpsPoints?.position?.Latitude;
    if (!lat || !lon) {
      // essential coordinates be valid for an entire layout
      continue;
    }

    dataPoints.push({
      id: stringToNumericId(point.Id),
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat] // Ensure longitude is FIRST
      },
      properties: {
        data: point,
      },
    });
  }
  return dataPoints;
}
