// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Prop, State, Watch } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { LngLat, LngLatLike, Map, MapGeoJSONFeature, Popup, Subscription } from "maplibre-gl";
import { Point } from "geojson";
import { debugPopupStructure, popupLoadingContent } from "../../../utils/maplibre-popup";
import { OtpService } from "../../../data/noi/otp-service";
import { OtpStation, OtpStop, OtpStoptime } from "../../../data/noi/Otp";
import { getParentMap } from "../../../utils/maplibre";
import { getZoomCategory, STATIONS_ALL_MIN_ZOOM, ZoomCategory } from "../map-layer-otp-layers/layout";
import { ViewLayout } from "../../../utils/breakpoints";


const TAG = 'noi-map-layer-otp';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-otp',
  styleUrl: 'noi-map-layer-otp.css',
  shadow: false,
})
export class NoiMapLayerOtpComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;

  // stops, parking, rental
  @Prop({mutable: true})
  layers?: string | string[];

  @Prop({mutable: true})
  layout?: ViewLayout;

  @State()
  layersActive: string[] = [];

  @Watch('layers')
  onLayersChange() {
    this.layersActive = Array.isArray(this.layers) ? this.layers : (this.layers as string).split(',');
  }

  private _zoomCategory: ZoomCategory | '' = '';

  @Event() zoomCategoryChange!: EventEmitter<ZoomCategory>;

  @State()
  private _selectedTripId?: string;
  private _selectedTripStopId?: string;
  private _selectedTripIcon?: string;

  private otpService = new OtpService();

  private _subscriptions: Subscription[] = [];

  /**
   */
  _onZoomChanged(zoomLevel: number) {
    if (this._selectedTripId) {
      // ignore zoom while trip is selected
      return;
    }
    const category = getZoomCategory(zoomLevel);
    if (this._zoomCategory === category) {
      return;
    }
    this._zoomCategory = category;
    this.zoomCategoryChange.emit(this._zoomCategory);
  }

  /**
   */
  render() {
    return (<div>
      {/*<noi-map-layer-otp-charger></noi-map-layer-otp-charger>*/}

      <noi-map-layer-otp-icons></noi-map-layer-otp-icons>

      {(this._selectedTripId && this._selectedTripStopId && this._selectedTripIcon)
        ? <noi-map-layer-otp-trip tripId={this._selectedTripId}
                                  stopId={this._selectedTripStopId}
                                  layout={this.layout}
                                  vehicleTypeOverride={this._selectedTripIcon}
                                  onClose={(e) => this._closeTripSelection({restoreMapPosition: e.detail === 'back'})}>

        </noi-map-layer-otp-trip>
        : <noi-map-layer-otp-source
          onLayerLoading={(event) => this.layerLoading.emit(event.detail)}
        >
          {this.layersActive.includes('stops')
            ? <noi-map-layer-otp-stops
              key="otp-stops"
              onFeatureClick={(event) => this.createFeaturePopup(event.detail)}></noi-map-layer-otp-stops>
            : ''}
          {/*
          {this.layersActive.includes('parking')
            ? <noi-map-layer-otp-parking
              key="otp-parking"
              onFeatureClick={(event) => this.createFeaturePopup(event.detail)}></noi-map-layer-otp-parking>
            : ''}
          {this.layersActive.includes('rental')
            ? <noi-map-layer-otp-rental
              key="otp-rental"
              onFeatureClick={(event) => this.createFeaturePopup(event.detail)}></noi-map-layer-otp-rental>
            : ''}
          */}
        </noi-map-layer-otp-source>
      }
    </div>);
  }

  /**
   */
  async connectedCallback() {
    this.map = await getParentMap(this.el);

    // zoom in to be able to see something =)
    const mapZoom = this.map.getZoom();
    if (mapZoom < STATIONS_ALL_MIN_ZOOM) {
      this.map.zoomTo(STATIONS_ALL_MIN_ZOOM);
    }

    //
    this._onZoomChanged(this.map.getZoom());
    this._subscriptions.push(this.map.on('zoom', () => {
      const zoom = this.map.getZoom();
      // console.log(`Zooming: ${zoom}`);
      this._onZoomChanged(zoom);
    }));

    this.onLayersChange();
  }

  /**
   */
  disconnectedCallback() {
    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
    this._subscriptions = [];

    this._popup?.remove();
    this._popupLoading?.remove();
  }


  /**
   */
  private _popupFeatureId: any;
  private _popup?: Popup;
  private _popupLoading?: Popup;
  private _popupData?: { feature: MapGeoJSONFeature, stopInfo: OtpStop | OtpStation };


  /**
   */
  async createFeaturePopup(feature: MapGeoJSONFeature) {
    console.log(`[${TAG}] createFeaturePopup`, feature);
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened by another event
    }
    this._popup?.remove();

    if (feature.sourceLayer === 'stops') {
      return this._createFeaturePopup_stop(feature, 'stop');
    } else if (feature.sourceLayer === 'stations') {
      return this._createFeaturePopup_stop(feature, "stations");
    } else if (feature.sourceLayer === 'vehicleParking') {
      return this._createFeaturePopup_parking(feature);
    } else {
      return this._createFeaturePopup_other(feature);
    }
  }

  /**
   */
  _openTripSelection(tripId: string, stopId: string, _vehicleMode: string) {
    this._saveMapState();
    this._popup?.remove();
    this._selectedTripId = tripId;
    this._selectedTripStopId = stopId;
    this._selectedTripIcon = _vehicleMode;
  }

  /**
   */
  _closeTripSelection(opts?: { restoreMapPosition?: boolean }) {
    this._selectedTripId = undefined;
    this._selectedTripStopId = undefined;
    if (opts?.restoreMapPosition) {
      this._restoreMapState();
    } else {
      // force recalculate zoom state
      this._onZoomChanged(this.map.getZoom());
    }
  }

  /**
   */
  async _createFeaturePopup_stop(feature: MapGeoJSONFeature, kind: 'stop' | 'stations') {
    const featureId = feature.id as string;
    // const stopInfo = await this.otpService.getStopInfo(featureId);

    if (this._popupFeatureId === featureId) {
      return;
    }
    this._popupFeatureId = featureId;

    this._popupLoading = this._createFeaturePopup_loading(feature);

    let stopInfo: OtpStop | OtpStation | null = null;
    switch (kind) {
      case "stop":
        stopInfo = await this.otpService.getStopInfo(featureId);
        break;
      case "stations":
        stopInfo = await this.otpService.getStationInfo(featureId);
        break;
    }
    this._popupLoading?.remove();

    if (!stopInfo) {
      console.error('No info about stop/station:', feature.id);
      this._popupFeatureId = undefined;
      return;
    }

    await this._createFeaturePopup_stopData(feature, stopInfo);
  }

  /**
   */
  private _savedState?: {
    zoom: number;
    position: LngLat;
    popupData?: { feature: MapGeoJSONFeature, stopInfo: OtpStop | OtpStation };
  };


  /**
   */
  _saveMapState() {
    this._savedState = {
      position:
        this.map.getCenter(),
      zoom: this.map.getZoom(),
      popupData: this._popupData,
    };
  }


  /**
   */
  _restoreMapState() {
    if (!this._savedState) {
      return;
    }
    this.map.flyTo({
      center: this._savedState.position,
      zoom: this._savedState.zoom,
    });
    if (this._savedState.popupData) {
      this._createFeaturePopup_stopData(this._savedState.popupData.feature, this._savedState.popupData.stopInfo);
    }
  }


  /**
   */
  _createFeaturePopup_loading(feature: MapGeoJSONFeature) {
    return new Popup({closeButton: false})
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      .setHTML(popupLoadingContent())
      .setMaxWidth('380px')
      .addTo(this.map);
  }

  /**
   */
  async _createFeaturePopup_stopData(feature: MapGeoJSONFeature, stopInfo: OtpStop | OtpStation) {
    this._popupData = {feature, stopInfo};

    // create popup element
    const popupContent = document.createElement('noi-map-layer-otp-popup-stop');
    // CRUCIAL: add to dom, so Stencil can initialize it
    this.el.appendChild(popupContent);

    // TODO: BUG in backend. override type for correct icon (TRAM instead of RAIL and some others)
    await popupContent.setData(stopInfo, feature.properties?.type);

    // 2. Add the event listener BEFORE or AFTER appending, but before the event fires
    popupContent.addEventListener('routeClick', (event: CustomEvent<OtpStoptime>) => {
      const stopTime = event.detail;
      console.log('Route clicked data:', stopTime);
      this._openTripSelection(stopTime.trip!.gtfsId, stopTime.stop!.gtfsId, feature.properties.type || stopInfo.vehicleMode);
    });

    // Wait for the browser layout engine to paint the content
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Append 'popupContent' to the DOM (Crucial: Stencil needs connection to initialize)
    this._popupFeatureId = feature.id;
    this._popup = new Popup()
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      .setDOMContent(popupContent)
      .setMaxWidth('380px')
      .addTo(this.map);
    this._popup.on('close', () => {
      this._popupFeatureId = undefined;
    });
  }

  /**
   */
  async _createFeaturePopup_parking(feature: MapGeoJSONFeature) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened by another event
    }

    const popupContent = document.createElement('noi-map-layer-otp-popup-parking');

    // CRUCIAL: add to dom, so Stencil can initialize it
    this.el.appendChild(popupContent);
    await popupContent.setData(feature);

    // Wait for the browser layout engine to paint the content
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Append 'popupContent' to the DOM (Crucial: Stencil needs connection to initialize)
    this._popupFeatureId = featureId;
    this._popup = new Popup()
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      .setDOMContent(popupContent)
      .setMaxWidth('380px')
      .addTo(this.map);
    this._popup.on('close', () => {
      this._popupFeatureId = undefined;
    });
  }


  /**
   */
  async _createFeaturePopup_other(feature: MapGeoJSONFeature) {
    const featureId = feature.id;
    if (this._popupFeatureId === featureId) {
      return; // same popup is already opened by another event
    }

    // create popup element
    const popupContent = debugPopupStructure(feature);


    // Wait for the browser layout engine to paint the content
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Append 'popupContent' to the DOM (Crucial: Stencil needs connection to initialize)
    this._popupFeatureId = featureId;
    this._popup = new Popup()
      // .setLngLat(lngLat) // < on mouse click point
      .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
      .setHTML(popupContent)
      .setMaxWidth('380px')
      .addTo(this.map);
    this._popup.on('close', () => {
      this._popupFeatureId = undefined;
    });
  }
}
