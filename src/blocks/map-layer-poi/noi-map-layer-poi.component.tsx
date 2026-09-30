// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, Prop, Watch } from "@stencil/core";
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
import { PoiInfo, PoiService } from "../../data/noi/poi-service";
import { getPoiIcon } from "./icons";
import { poiClusterFilter, poiStyles } from "./styles";


const TAG = 'noi-map-layer-poi';

let _uid = 0;

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-poi',
  styleUrl: 'noi-map-layer-poi.css', // no value produces error in the bundle
  shadow: false,
})
export class NoiMapLayerPoiComponent implements StencilComponent {

  private map!: Map;

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

  private _subscriptions: Subscription[] = [];

  private poiService = PoiService.getInstance();

  private _id: number;

  private _popup?: Popup;
  private _popupFeatureId?: string | number;

  private _requestSub?: Subscription;

  constructor() {
    this._id = _uid++;
  }

  lid(idName: 'source' | 'icon' | 'layer-icon' | 'layer-label' | 'layer-cluster-circle' | 'layer-cluster-label') {
    return `layer-poi-${idName}-idx-${this._id}`;
  }

  /**
   */
  async connectedCallback() {
    this.map = await getParentMap(this.el);
    this.initLayer().then(() => this.tagChanged());
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }

  private _tagPrev?: string;

  @Watch('tag')
  tagChanged() {
    setTimeout(() => { // timeout is to avoid "The state/prop "layersLoading" changed during rendering"
      if (this._tagPrev === this.tag) {
        return;
      }
      this._tagPrev = this.tag;
      this._loadData(this.tag);
    });
  }


  /**
   *
   */
  async _loadData(tag?: string) {
    console.log(`[${TAG}] Loading tag data: ${tag}`);

    if (!tag) {
      console.warn(`[${TAG}] no tag specified`);
      return;
    }

    this.layerLoading.emit(true);

    // reload icon
    const iconId = this.lid('icon');
    if (this.map.hasImage(iconId)) {
      this.map.removeImage(iconId);
    }
    await registerSvgImage(this.map, iconId, getPoiIcon(tag), {size: 48, sdf: true});


    // reload data
    this._requestSub?.unsubscribe();
    this._requestSub = this.poiService.getPoiInfo$(tag).subscribe({
      next: (data) => {
        this._setLayerData(data || []);

        // re-center
        listenLayerReady(this.map, this.lid('source'), () => {
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


  async initLayer() {

    const tagSourceId = this.lid('source');
    const tagIconLayerId = this.lid('layer-icon');
    const tagCircleLayerId = this.lid('layer-label');
    const tagClusterCircleLayerId = this.lid('layer-cluster-circle');
    const tagClusterLabelLayerId = this.lid('layer-cluster-label');
    const iconId = this.lid('icon');


    //
    const geojsonPoints: FeatureCollection = {
      type: 'FeatureCollection',
      features: [], // _poi2mapFeature(data),
    };

    this.map.addSource(tagSourceId, {
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
      id: tagClusterCircleLayerId,
      type: 'circle',
      source: tagSourceId,
      // ONLY show features that ARE clusters
      filter: poiClusterFilter.clusterOnly,
      paint: {
        ...poiStyles.cluster as any,
      }
    });

    this.map.addLayer({
      id: tagClusterLabelLayerId,
      type: 'symbol',
      source: tagSourceId,
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
      id: tagCircleLayerId,
      type: 'circle',
      source: tagSourceId,
      // ONLY show features where cluster property is NOT true
      filter: poiClusterFilter.nonClusterOnly,
      paint: {
        ...poiStyles.unclusteredpoints as any,
      },
    });

    this.map.addLayer({
      id: tagIconLayerId,
      type: 'symbol',
      source: tagSourceId,
      // ONLY show features where cluster property is NOT true
      filter: poiClusterFilter.nonClusterOnly,
      layout: {
        'icon-image': iconId,
        'icon-size': 0.5,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
        'icon-allow-overlap': true,       // Keeps icons visible even if they crowd each other
        'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates
      },
      paint: {
        // 👇 Set your icon color here (paint property, not layout!)
        'icon-color': '#FFFFFF',
      }
    });

    // Hover effects
    this._subscriptions.push(
      clusterClickZoom(this.map, tagSourceId, tagClusterCircleLayerId),
      enableHoverEffect(this.map, tagClusterCircleLayerId),
      enableHoverEffectTargeted(this.map, {hoverOn: tagIconLayerId, applyTo: tagCircleLayerId}),
    );

    ///////// Click handlers
    const _pointClick = this.map.on('click', tagIconLayerId, (e) => {
      const feature = e.features![0];
      console.log('(debug) Clicked point:', feature);
      // this.createFeaturePopup(feature, e.lngLat);
      this.createFeaturePopup(feature);
    });
    this._subscriptions.push(_pointClick);

  }

  /**
   */
  async _setLayerData(data: PoiInfo[]) {
    const tagSourceId = this.lid('source');
    //
    const geojsonPoints: FeatureCollection = {
      type: 'FeatureCollection',
      features: _poi2mapFeature(data),
    };

    const sourceStops = this.map.getSource(tagSourceId) as GeoJSONSource;
    sourceStops.setData(geojsonPoints);
  }

  /**
   *
   */
  destroyLayer() {
    console.log(`[${TAG}] Removing layers`);
    if (!this.map) {
      console.warn('Map is not initialized');
      return;
    }

    // close popup
    this._popup?.remove();
    this._requestSub?.unsubscribe();

    // remove subscriptions
    for (const sub of this._subscriptions) {
      sub.unsubscribe();
    }
    this._subscriptions = [];

    // remove layers
    const tagSourceId = this.lid('source');
    const tagIconLayerId = this.lid('layer-icon');
    const tagCircleLayerId = this.lid('layer-label');
    const tagClusterCircleLayerId = this.lid('layer-cluster-circle');
    const tagClusterLabelLayerId = this.lid('layer-cluster-label');
    const iconId = this.lid('icon');

    if (this.map.hasImage(iconId)) {
      this.map.removeImage(iconId);
    }

    if (this.map.getLayer(tagIconLayerId)) {
      this.map.removeLayer(tagIconLayerId);
    }
    if (this.map.getLayer(tagCircleLayerId)) {
      this.map.removeLayer(tagCircleLayerId);
    }
    if (this.map.getLayer(tagClusterCircleLayerId)) {
      this.map.removeLayer(tagClusterCircleLayerId);
    }
    if (this.map.getLayer(tagClusterLabelLayerId)) {
      this.map.removeLayer(tagClusterLabelLayerId);
    }
    if (this.map.getSource(tagSourceId)) {
      this.map.removeSource(tagSourceId);
    }
  }


  resetPosition() {
    const tagSourceId = this.lid('source');
    mapCenterBySourceData(this.map, tagSourceId);
  }

  async createFeaturePopup(feature: MapGeoJSONFeature) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened
    }

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
function _poi2mapFeature(data: PoiInfo[]) {
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
