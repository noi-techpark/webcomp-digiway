// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Host, Prop, State, Watch } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { GeoJSONSource, LngLatBounds, LngLatLike, Map, Popup } from "maplibre-gl";
import { OtpService } from "../../../data/noi/otp-service";
import { decode as decodePolyline } from '@mapbox/polyline';
import { OtpStop, OtpStoptime, OtpTrip } from "../../../data/noi/Otp";
import { GeoJSON } from "geojson";
import { enableHoverEffect, getParentMap, stringToNumericId } from "../../../utils/maplibre";
import { formatTransitSeconds } from "../../../data/noi/otp.util";
import { LanguageDataService } from "../../../data/language/language-data-service";
import { getLayoutClass, ViewLayout } from "../../../utils/breakpoints";

const TAG = 'noi-map-layer-otp-trip';

let _uid = 0;


/**
 * (INTERNAL)
 */
@Component({
  tag: 'noi-map-layer-otp-trip',
  styleUrl: 'noi-map-layer-otp-trip.css',
  shadow: true,
})
export class NoiMapLayerOtpTripComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;

  /**
   * Required
   */
  @Prop()
  tripId?: string;

  @Prop({mutable: true})
  layout?: ViewLayout;

  /**
   * Optional
   */
  @Prop()
  stopId?: string;

  @State()
  trip?: OtpTrip;

  // TODO: BUG in backend. override type for correct icon (TRAM instead of RAIL and some others)
  @Prop()
  vehicleTypeOverride?: string;

  @Event() close!: EventEmitter<'back' | 'close'>;

  private _id!: number;


  private _stopsToRender: OtpStoptime[] = [];
  /**
   * Emitted when layer data is loaded
   */
    // @Event() layerReady: EventEmitter<void>;

    // private _subscriptions: Subscription[] = [];

  private otpService = new OtpService();
  private languageService = LanguageDataService.getInstance();
  private primaryColor!: string;
  private highlightColor!: string;
  private primaryColorContrast!: string;

  constructor() {
    this._id = _uid++;
  }

  lid(layerLame: string) {
    return `${layerLame}-idx-${this._id}`;
  }

  async connectedCallback() {
    this.map = await getParentMap(this.el);

    const rootStyles = getComputedStyle(this.el);
    this.primaryColor = rootStyles.getPropertyValue('--color-primary').trim() || '#3b82f6';
    this.highlightColor = rootStyles.getPropertyValue('--circle-highlight-color').trim() || '#81c873';
    this.primaryColorContrast = rootStyles.getPropertyValue('--color-primary-contrast').trim() || '#FFFFFF';

    this.initLayer();
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }

  @Watch('tripId')
  onRouteIdChange() {
    if (!this.tripId) {
      return;
    }
    this.otpService.getTripInfo(this.tripId)
      .then(trip => {
        console.log(`[${TAG}] trip`, trip);
        this._showTrip(trip);
      });
  }

  _showTrip(trip: OtpTrip) {
    this.trip = trip;
    // 2. Decode the polyline. Returns an array of [lat, lng] pairs.
    const decodedCoords = decodePolyline(trip.tripGeometry!.points);

    // 3. Flip [lat, lng] to MapLibre's expected [lng, lat] format
    const geojsonCoordinates: LngLatLike[] = decodedCoords.map(([lat, lng]) => [lng, lat]);


    // create line
    const dataPointsLine: any[] = [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: geojsonCoordinates
      }
    }];

    //
    const geojsonPointsLine: GeoJSON = {
      type: 'FeatureCollection',
      features: dataPointsLine,
    };

    const sourceLine = this.map.getSource(this.lid('source-otp-route-trip-line-data')) as GeoJSONSource;
    sourceLine.setData(geojsonPointsLine);


    // create stops
    const tripStops = trip.stoptimesForDate || trip.stoptimes || [];
    const dataPointsStops: any = tripStops.map(sTime => {
      const stop = sTime.stop!;
      return {
        id: stringToNumericId(stop.gtfsId + ''), // feature's root-level id must be a number
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [stop.lon, stop.lat] // Ensure longitude is FIRST
        },
        properties: {
          data: stop,
          type: this.vehicleTypeOverride || stop.vehicleMode,
          name: stop.name,
          platform: stop.platformCode,
          arrival_time: formatTransitSeconds(sTime.scheduledArrival, this.languageService.currentLanguage!),
        },
      };
    });

    //
    const geojsonPointsStops: GeoJSON = {
      type: 'FeatureCollection',
      features: dataPointsStops,
    };

    const sourceStops = this.map.getSource(this.lid('source-otp-route-trip-stops-data')) as GeoJSONSource;
    sourceStops.setData(geojsonPointsStops);

    //
    if (this.stopId) {
      this.map.setFeatureState(
        {source: this.lid('source-otp-route-trip-stops-data'), id: stringToNumericId(this.stopId)},
        {current: true},
      );
    }

    // create markers
    this._removeStopMarkers();
    this._stopsToRender = [
      tripStops[0],
      tripStops[tripStops.length - 1],
    ];


    // Optional: Automatically fit the map view to the bounds of the route
    const bounds = geojsonCoordinates.reduce((acc, coord) => {
      return acc.extend(coord);
    }, new LngLatBounds(geojsonCoordinates[0], geojsonCoordinates[0]));

    this.map.fitBounds(bounds, {padding: 60});
  }

  private _stopPopups: Popup[] = [];

  _removeStopMarkers() {
    for (const popup of this._stopPopups) {
      popup.remove();
    }
    this._stopPopups = [];
  }


  _createStopMarker(stop: OtpStop, element: HTMLElement) {
    // Ensure the element exists and we haven't already attached a popup for this stop
    // if (!element || this._hasPopup(stop.gtfsId)) return;
    if (!stop || !element) return;

    const popup = new Popup({closeButton: false, anchor: 'bottom', closeOnClick: false})
      .setLngLat([stop.lon, stop.lat])
      .setDOMContent(element) // Works perfectly now because 'element' is a true DOM node
      .setMaxWidth('380px')
      .addTo(this.map);
    this._stopPopups.push(popup);
  }

  initLayer() {
    console.log(`[${TAG}] Adding layer to map`);

    //
    const geojsonPointsLine: GeoJSON = {
      type: 'FeatureCollection',
      features: [], // filled later
    };

    this.map.addSource(this.lid('source-otp-route-trip-line-data'), {
      type: 'geojson',
      data: geojsonPointsLine,
    });

    // Add a line layer to visibly style the route
    this.map.addLayer({
      id: this.lid('route-trip-line-layer'),
      type: 'line',
      source: this.lid('source-otp-route-trip-line-data'),
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': this.primaryColor,
        'line-width': 5,
        'line-opacity': 0.85
      }
    });


    //
    const geojsonPointsStops: GeoJSON = {
      type: 'FeatureCollection',
      features: [], // filled later
    };

    this.map.addSource(this.lid('source-otp-route-trip-stops-data'), {
      type: 'geojson',
      data: geojsonPointsStops,
    });

    // Add a line layer to visibly style the route
    this.map.addLayer({
      id: this.lid('route-trip-stops-layer'),
      type: 'circle',
      source: this.lid('source-otp-route-trip-stops-data'),
      paint: {
        'circle-radius': 4.5,
        // 'circle-color': this.primaryColor,
        'circle-stroke-width': 2.5,    // Width of the border in pixels
        'circle-color': ['case',
          ['boolean', ['feature-state', 'hover'], false], this.highlightColor,   // hovered
          this.primaryColorContrast    // normal
        ],

        'circle-stroke-color': ['case',
          ['boolean', ['feature-state', 'hover'], false], this.highlightColor,   // hovered
          ['boolean', ['feature-state', 'current'], false], this.highlightColor,   // selected
          this.primaryColor    // normal
        ],
      },
    });

    enableHoverEffect(this.map, this.lid('route-trip-stops-layer'));


    this.onRouteIdChange();
  }

  destroyLayer() {
    console.log(`[${TAG}] Removing layer from map`);

    this._removeStopMarkers();

    // for (const subscription of this._subscriptions) {
    //   subscription.unsubscribe();
    // }
    // this._subscriptions = [];

    // 4. Cleanup source when HTML element gets removed from DOM
    if (this.map) {
      this.map.removeLayer(this.lid('route-trip-line-layer'));
      this.map.removeSource(this.lid('source-otp-route-trip-line-data'));
      this.map.removeLayer(this.lid('route-trip-stops-layer'));
      this.map.removeSource(this.lid('source-otp-route-trip-stops-data'));
    }
  }

  /**
   *   NOTE: global styles only are working here. See {@link noi-map.css}
   */
  _renderStopMarker(stoptime: OtpStoptime) {
    const stop = stoptime.stop;
    if (!stop) return;

    return (<div
      class="popup-stop-marker"
      key={stop.gtfsId}
      ref={(el) => this._createStopMarker(stop, el!)}>

      <div class="stop-name">
        {/*<noi-icon innerHTML={icon}></noi-icon>*/}
        <span>{stop.name}</span>
      </div>
      <div class="stop-departure">
        <noi-otp-departure-time stoptime={stoptime}></noi-otp-departure-time>
      </div>
    </div>);
  }

  render() {
    if (!this.trip) {
      return;
    }
    const trip = this.trip;
    const tripStops = this.trip.stoptimesForDate || this.trip.stoptimes || [];


    // note: we expect all 'tripStops' has the same headsign, but it may not be true
    const info = OtpService.getStopName(trip.pattern!, tripStops[0]);
    return (<Host class={getLayoutClass(this.layout!)}>
      <div class="otp-overlay-anchor">
        <div class="otp-overlay">
          <div class="header">
            <noi-button class="header__back" onClick={() => this.close.emit('back')}>
              {/* <!-- material arrow back icon --> */}
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                   fill="currentColor">
                <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/>
              </svg>
              <span>{this.languageService.translate('otp.back-to-station')}</span>
            </noi-button>
            <noi-button class="header__close"
                        title={this.languageService.translate('app.close')}
                        onClick={() => this.close.emit('close')}>
              {/* <!-- material close icon --> */}
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                   fill="currentColor">
                <path
                  d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </noi-button>
          </div>

          <div class="route">
            <noi-badge class="route__badge">{info.routeShortName}</noi-badge>
            <div class="route__name">{info.routeFullName}</div>
          </div>

          <div class="route-label">{this.languageService.translate('otp.next-trip-route')}</div>

          <div class="route-stops-list">
            {tripStops.map((stopTime) => {
              return <div
                class={"trip-stop " + (this._highlightId === stopTime.stop?.gtfsId ? 'trip-stop--highlighted ' : '') + (this.stopId === stopTime.stop?.gtfsId ? 'trip-stop--current ' : '')}
                onClick={() => this._highlightPoint(stopTime)}>
                <div class="trip-stop__dot"></div>
                <noi-otp-departure-time class="trip-stop__padding"
                                        stoptime={stopTime}
                                        showDelay={false}></noi-otp-departure-time>
                <div class="trip-stop__padding">{stopTime?.stop?.name}</div>
              </div>
            })}
          </div>
        </div>

        {/* Hidden portal to let Stencil render and initialize your popups */}
        <div style={{display: 'none'}}>
          {this._stopsToRender.map(s => this._renderStopMarker(s))}
        </div>

      </div>
    </Host>);
  }

  @State()
  private _highlightId?: string | number;

  /**
   *
   */
  _highlightPoint(stopTime: OtpStoptime) {
    if (this._highlightId) {
      this.map.setFeatureState(
        {source: this.lid('source-otp-route-trip-stops-data'), id: stringToNumericId(this._highlightId)},
        {hover: false},
      );
    }

    this._highlightId = stopTime.stop!.gtfsId;

    this.map.setFeatureState(
      {source: this.lid('source-otp-route-trip-stops-data'), id: stringToNumericId(this._highlightId)},
      {hover: true},
    );

    const isMobile = this.layout === 'mobile';
    this.map.flyTo({
      center: [stopTime.stop!.lon, stopTime.stop!.lat],
      // padding size is quite approximate based on typical data
      padding: {bottom: isMobile ? 280 : 0, top: 0, left: isMobile ? 0 : 540, right: 0},
    });

  }

  /**
   *
   */
  // _highlightClear(stopTime: OtpStoptime) {
  //   const featureId = stopTime.stop!.gtfsId;
  //   this.map.setFeatureState(
  //     {source: this.lid('source-otp-route-trip-stops-data'), id: stringToNumericId(featureId)},
  //     {hover: false},
  //   );
  // }
}
