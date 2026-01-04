// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { html, LitElement } from 'lit-element';
import L from 'leaflet';
import 'leaflet.markercluster';
import style__leaflet from 'leaflet/dist/leaflet.css';
import style__markercluster from 'leaflet.markercluster/dist/MarkerCluster.css';
import style from './scss/main.scss';
import { getStyle } from './utils.js';
import {
  fetchActivities,
  fetchGpsTrack,
  fetchPeopleCounter,
  fetchWeatherForecast
} from './api/api.js';

// import moment from 'moment';
// import L2 from 'leaflet-gpx';
// import L3 from 'leaflet-kml';

class MapWidget extends LitElement {
  
  static get properties() {
  return {
    propLanguage: { type: String, attribute: 'language' },
    propSource: { type: String, attribute: 'source' },
    propPagesize: { type: String, attribute: 'pagesize' },
    propCenterMap: { type: String, attribute: 'centermap' },

    // Weather state
    weatherByMunicipality: { type: Object },
    weatherDates: { type: Array },

    // ✅ NEW (Step 3)
    selectedWeatherDate: { type: String }
  };
}

  constructor() {
    super();
    this.weatherLayer = L.layerGroup();

    // Weather state (SAFE for this build)
    this.weatherByMunicipality = {};
    this.weatherDates = [];
    this.selectedWeatherDate = null;
    this.weatherMarkersLayer = null;

    /* Map configuration */
    this.map_center = [46.479, 11.331];
    this.map_zoom = 9;
    this.map_layer =
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png';
    this.map_attribution =
      '<a target="_blank" href="https://opendatahub.com">OpenDataHub.com</a> | &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a target="_blank" href="https://carto.com/attribution">CARTO</a>';

    /* Data fetched from Open Data Hub */
    this.totalresults = 0;
    this.pagestotal = 0;
    this.currentpage = 0;
    this.displayitems = 0;

    this.nodes = [];
    this.mobilitynodes = [];
    this.types = {};

    /* Requests */
    this.fetchActivities = fetchActivities.bind(this);
    this.fetchGpsTrack = fetchGpsTrack.bind(this);
    this.fetchPeopleCounter = fetchPeopleCounter.bind(this);
    this.fetchWeatherForecast = fetchWeatherForecast.bind(this);
  }

  getMunicipalityCenter(municipalityCode) {
  // fallback: use existing activity GPS data to approximate center
  for (let i = 0; i < this.nodes.length; i++) {
    const activity = this.nodes[i];

    const code =
      activity.MunicipalityIstatCode ||
      (activity.LocationInfo &&
        activity.LocationInfo.MunicipalityInfo &&
        activity.LocationInfo.MunicipalityInfo.MunicipalityIstatCode);

    if (code === municipalityCode && activity.GpsInfo) {
      const keys = Object.keys(activity.GpsInfo);
      if (keys.length > 0) {
        const gps = activity.GpsInfo[keys[0]];
        return [gps.Latitude, gps.Longitude];
      }
    }
  }

  return null;
}

connectedCallback() {
  super.connectedCallback();

  this.weatherByMunicipality = {};
  this.weatherDates = [];

  this.fetchWeatherForecast(this.propLanguage || 'en')
    .then((response) => {
      console.log('Weather forecast response:', response);

      response.forEach((entry) => {
        // --- municipality code (NO optional chaining) ---
        let municipalityCode = entry.MunicipalityIstatCode;

        if (
          !municipalityCode &&
          entry.LocationInfo &&
          entry.LocationInfo.MunicipalityInfo
        ) {
          municipalityCode =
            entry.LocationInfo.MunicipalityInfo.MunicipalityIstatCode;
        }

        // --- date (NO optional chaining) ---
        let date = null;
        if (entry.Date) {
          date = entry.Date.split('T')[0];
        }

        if (!municipalityCode || !date) return;

        // --- collect unique dates ---
        if (this.weatherDates.indexOf(date) === -1) {
          this.weatherDates.push(date);
        }

        if (!this.weatherByMunicipality[municipalityCode]) {
          this.weatherByMunicipality[municipalityCode] = {};
        }

        // --- forecast daily (SAFE) ---
        let daily = null;
        if (entry.ForecastDaily && entry.ForecastDaily.length > 0) {
          daily = entry.ForecastDaily[0];
        }

        this.weatherByMunicipality[municipalityCode][date] = {
          minTemp: daily ? daily.MinTemp : null,
          maxTemp: daily ? daily.MaxTemp : null,
          weatherCode: daily ? daily.WeatherCode : null,
        };
      });

      console.log('FINAL weatherByMunicipality:', this.weatherByMunicipality);
      console.log('FINAL weatherDates:', this.weatherDates);

      // set default selected date
      if (!this.selectedWeatherDate && this.weatherDates.length > 0) {
        this.selectedWeatherDate = this.weatherDates[0];
      }

      this.drawWeatherMarkers();
    })
    .catch((err) => {
      console.error('Weather forecast error:', err);
    });
}


handleWeatherDateChange(e) {
  this.selectedWeatherDate = e.target.value;
  this.drawWeatherMarkers();
}

drawWeatherMarkers() {
  if (!this.weatherMarkersLayer) {
    this.weatherMarkersLayer = L.layerGroup().addTo(this.map);
  }

  this.weatherMarkersLayer.clearLayers();

  var selectedDate = this.selectedWeatherDate;
  if (!selectedDate) return;

  var self = this;

  Object.keys(this.weatherByMunicipality).forEach(function (municipalityCode) {
    var datesMap = self.weatherByMunicipality[municipalityCode];
    var forecast = datesMap[selectedDate];
    if (!forecast) return;

    var center = self.getMunicipalityCenter(municipalityCode);
    if (!center) return;

    var minTemp =
      forecast.minTemp !== null && forecast.minTemp !== undefined
        ? forecast.minTemp
        : '-';

    var maxTemp =
      forecast.maxTemp !== null && forecast.maxTemp !== undefined
        ? forecast.maxTemp
        : '-';

    var popupHtml =
      '<b>Weather Forecast</b><br/>' +
      'Date: ' + selectedDate + '<br/>' +
      'Min: ' + minTemp + ' °C<br/>' +
      'Max: ' + maxTemp + ' °C';

    L.marker(center)
      .addTo(self.weatherMarkersLayer)
      .bindPopup(popupHtml);
  });
}

  async initializeMap() {
    let root = this.shadowRoot;
    let mapref = root.getElementById('map');

    if (this.propCenterMap) {
      var splittedgps = this.propCenterMap.split(',');
      this.map_center = [
        parseFloat(splittedgps[0]),
        parseFloat(splittedgps[1]),
      ];
      this.map_zoom = parseInt(splittedgps[2]);
    }

    this.map = L.map(mapref, {
      zoomControl: false,
    }).setView(this.map_center, this.map_zoom);

    L.tileLayer(this.map_layer, {
      attribution: this.map_attribution,
    }).addTo(this.map);
  }

  async getColorAndType(activitysource) {
    let color = '#e91e63';
    let activitytype = '';
    let source = '';
    let darker = '#e91e63';    

    if (activitysource == 'civis.geoserver.hikingtrails') {
      color = '#e91e63';
      activitytype = 'hikingtrail';
      source = 'civis.geoserver';
    }
    if (activitysource == 'civis.geoserver.mountainbikeroutes') {
      color = '#3d1ee9';
      activitytype = 'mountainbikeroutes';
      source = 'civis.geoserver';
    }
    if (activitysource == 'civis.geoserver.intermunicipalcyclingroutes') {
      color = '#20804b';
      activitytype = 'intermunicipalcyclingroutes';
      source = 'civis.geoserver';
    }
    if (activitysource == 'civis.geoserver.cyclewaystyrol') {
      color = '#e9d51e';
      activitytype = 'cycleway';
      source = 'civis.geoserver';
    }
    if (activitysource == 'dservices3.arcgis.com.radrouten_tirol') {
      color = '#272726';
      activitytype = 'cycleway';
      source = 'dservices3.arcgis.com';
    }
    if (activitysource == 'dservices3.arcgis.com.hikintrail_e5') {
      color = '#b65edf';
      activitytype = 'hikingtrail';
      source = 'dservices3.arcgis.com';
    }
    if (activitysource == 'siat.provincia.tn.it.mtb_percorsi_v') {
      color = '#179b5d';
      activitytype = 'mountainbikeroutes';
      source = 'siat.provincia.tn.it';      
    }
    if (activitysource == 'siat.provincia.tn.it.elementi_cicloviari_v') {
      color = '#52694a';
      activitytype = 'cycleway';
      source = 'siat.provincia.tn.it';
    }
    if (activitysource == 'siat.provincia.tn.it.sentieri_della_sat') {
      color = '#6e545e';
      activitytype = 'hikingtrail';
      source = 'siat.provincia.tn.it';  
    }
    if (activitysource == 'mobility.peoplecounter') {
      color = '#ff0000';
      activitytype = 'peoplecounter';
      source = 'systems-merano';  
    }

    darker = this.makeDarker(color, 40);

    return { color, activitytype, source, darker };
  }

  makeDarker(hexColor, percent) {
    // Validate percent parameter
    percent = Math.max(0, Math.min(100, percent));
    
    // Remove # if present and validate hex format
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
        throw new Error('Invalid hex color format. Use #RRGGBB format.');
    }
    
    // Parse RGB values
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Calculate darkening factor
    const factor = (100 - percent) / 100;
    
    // Apply darkening
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    
    // Convert back to hex
    const toHex = (n) => n.toString(16).padStart(2, '0');
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

  async drawMap(pagenumber) {
    let columns_layer_array = [];

    if (this.propSource) {
      if (this.propLanguage == undefined) this.propLanguage = 'de';
      
      if(this.propSource.includes("mobility"))
        await this.drawMobilityMap();

      await this.fetchActivities(
        this.propLanguage,
        this.propSource,
        pagenumber,
        this.propPagesize
      );
      
      const icon = L.divIcon({
        className: 'marker-24x32',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
      });

      const BATCH_SIZE = 50; // Process 10 at a time
      const BATCH_DELAY = 500; // 500ms delay between batches

      for (let i = 0; i < this.nodes.length; i += BATCH_SIZE) {
        const batch = this.nodes.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const promises = batch.map(async (activity) => {
          const { color, activitytype, source, darker } = await this.getColorAndType(
            activity.SyncSourceInterface
          );          

          this.displayitems++;

let popup =
  '<div class="popup">Name: <b>' +
  activity['Shortname'] +
  '</b><br /><div>Type: ' +
  activitytype +
  '</div><br /><div>Source: ' +
  source +
  '</div>';

if (activity['Detail.' + this.propLanguage + '.BaseText'] != null) {
  popup +=
    '<div>' +
    activity['Detail.' + this.propLanguage + '.BaseText'] +
    '</div>';
}

/* ===============================
   WEATHER EXTENSION (STEP 4)
   =============================== */

/* ===============================
   WEATHER EXTENSION (STEP 4)
   =============================== */

var municipalityCode = null;

if (activity.MunicipalityIstatCode) {
  municipalityCode = activity.MunicipalityIstatCode;
} else if (
  activity.LocationInfo &&
  activity.LocationInfo.MunicipalityInfo &&
  activity.LocationInfo.MunicipalityInfo.MunicipalityIstatCode
) {
  municipalityCode =
    activity.LocationInfo.MunicipalityInfo.MunicipalityIstatCode;
}

var selectedDate = this.selectedWeatherDate;

popup += '<hr/>';

if (
  municipalityCode &&
  selectedDate &&
  this.weatherByMunicipality &&
  this.weatherByMunicipality[municipalityCode] &&
  this.weatherByMunicipality[municipalityCode][selectedDate]
) {
  var w = this.weatherByMunicipality[municipalityCode][selectedDate];

  popup +=
    '<b>Weather (' + selectedDate + ')</b><br/>' +
    'Min: ' + (w.minTemp !== null ? w.minTemp : '-') + ' °C<br/>' +
    'Max: ' + (w.maxTemp !== null ? w.maxTemp : '-') + ' °C';
} else {
  popup += '<i>No weather data</i>';
}

/* =============================== */


/* =============================== */

popup += '</div>';

console.log(color);
console.log(darker);

let popupobj = L.popup().setContent(popup);


          Object.keys(activity.GpsTrack).forEach((key) => {
            var url = activity.GpsTrack[key].GpxTrackUrl;

            fetch(url)
              .then((res) => res.json())
              .then((geojson) => {
                // Create new overlay for geojson
                const shape = geojson.Geometry;
                new L.geoJSON(shape, {
                  async: true,
                  // Add default styling
                  style: {
                    color: color,
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                  },
                  // Add hover functionality
                  onEachFeature: function (feature, layer) {
                    layer.on({
                      mouseover: function (e) {                        
                        e.target.setStyle({
                          color: darker,
                          weight: 3, // Thicker on hover
                          opacity: 1.0,
                        });
                      },
                      mouseout: function (e) {
                        e.target.setStyle({
                          color: color, // Back to original
                          weight: 2,
                          opacity: 0.8,
                        });
                      },
                    });
                  },
                })
                  .on('loaded', function () {})
                  .addTo(this.map)
                  .bindPopup(popupobj);
              });
          });

          Object.keys(activity.GpsInfo).forEach((key) => {
            const pos = [
              activity.GpsInfo[key].Latitude,
              activity.GpsInfo[key].Longitude,
            ];

            let marker = L.marker(pos, {
              icon: icon,
              markerColor: color,
            })
              .on('add', function (e) {
                const dot = e.target.getElement();
                if (dot) dot.style.setProperty('--marker-color', color);
              })
              .on('mouseover', function (e) {
                const dot = e.target.getElement();
                if (dot) dot.style.setProperty('--marker-color', darker);
              })
              .on('mouseout', function (e) {
                const dot = e.target.getElement();
                if (dot) dot.style.setProperty('--marker-color', color);
              })
              .bindPopup(popupobj); //.addTo(this.map).bindPopup(popupobj);

            columns_layer_array.push(marker);

            // Use the 'add' event to set color when marker is actually rendered
            // marker.on('add', function() {
            //   const el = this.getElement();
            //   if (el) el.style.setProperty("--marker-color", color);
            // });
          });
        });

        await Promise.all(promises);

        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < this.nodes.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      //TODO CHECK WHY Clustering does not work

      this.visibleNodes = columns_layer_array.length;
      let columns_layer = L.layerGroup(columns_layer_array, {});

      /** Prepare the cluster group for station markers */
      this.layer_columns = new L.markerClusterGroup({
        showCoverageOnHover: false,
        chunkedLoading: true,
        disableClusteringAtZoom: 13,
        iconCreateFunction: function (cluster) {
          return L.divIcon({
            html:
              '<div class="marker_cluster__marker" style="background-color:grey">' +
              cluster.getChildCount() +
              '</div>',
            iconSize: L.point(32, 32),
          });
        },
      });

      /** Add maker layer in the cluster group */
      this.layer_columns.addLayer(columns_layer);

      // this.layer_columns.on('animationend', function() {
      //     // Apply colors to all visible markers after cluster animation
      //     columns_layer.eachLayer(function(marker) {
      //         if (marker.options && marker.options.markerColor) {
      //             const el = marker.getElement();
      //             if (el) el.style.setProperty("--marker-color", marker.options.markerColor);
      //         }
      //     });
      // });

      /** Add the cluster group to the map */
      this.map.addLayer(this.layer_columns);
    }
    this.refreshPagingView();
  }

  async drawMobilityMap() {
    let columns_layer_array = [];
      
    await this.fetchPeopleCounter();

      const icon = L.divIcon({
        className: 'marker-24x32',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
      });

      const BATCH_SIZE = 1000; // Process 10 at a time
      const BATCH_DELAY = 500; // 500ms delay between batches

      for (let i = 0; i < this.mobilitynodes.length; i += BATCH_SIZE) {
        const batch = this.mobilitynodes.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const promises = batch.map(async (activity) => {
          const { color, activitytype, source, darker } = await this.getColorAndType(
            "mobility.peoplecounter"
          );          

          this.displayitems++;

          let popup =
            '<div class="popup">Name: <b>' +
            activity['sname'] +
            '</b><br /><div>Data Type: ' +
            activity['tname'] + 
            '</div>' +
            '<div>Period: ' +
            activity['mperiod'] + 
            '</div>' +
            '<div>Measured value: ' +
            activity['mvalue'] + ' ' + activity['tunit']
            '</div>';

          if (activity['tdescription'] != null) {
            popup +=
              '<div>' +
              activity['tdescription'] +
              '</div>';
          }
          popup += '</div>';

          let popupobj = L.popup().setContent(popup);

          const pos = [
            activity.scoordinate.y,
            activity.scoordinate.x,
          ];

          let marker = L.marker(pos, {
            icon: icon,
            markerColor: color,
          })
            .on('add', function (e) {
              const dot = e.target.getElement();
              if (dot) dot.style.setProperty('--marker-color', color);
            })
            .on('mouseover', function (e) {
              const dot = e.target.getElement();
              if (dot) dot.style.setProperty('--marker-color', darker);
            })
            .on('mouseout', function (e) {
              const dot = e.target.getElement();
              if (dot) dot.style.setProperty('--marker-color', color);
            })
            .bindPopup(popupobj); //.addTo(this.map).bindPopup(popupobj);

          columns_layer_array.push(marker);
        });

        await Promise.all(promises);

        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < this.nodes.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      //TODO CHECK WHY Clustering does not work

      this.visibleNodes = columns_layer_array.length;
      let columns_layer = L.layerGroup(columns_layer_array, {});

      /** Prepare the cluster group for station markers */
      this.layer_columns = new L.markerClusterGroup({
        showCoverageOnHover: false,
        chunkedLoading: true,
        disableClusteringAtZoom: 20,
        iconCreateFunction: function (cluster) {
          return L.divIcon({
            html:
              '<div class="marker_cluster__marker" style="background-color:grey">' +
              cluster.getChildCount() +
              '</div>',
            iconSize: L.point(32, 32),
          });
        },
      });

      /** Add maker layer in the cluster group */
      this.layer_columns.addLayer(columns_layer);

      /** Add the cluster group to the map */
      this.map.addLayer(this.layer_columns);        
  }

  async refreshPagingView() {
    let root = this.shadowRoot;
    let pageInforef = root.getElementById('pageInfo');

    pageInforef.innerText = `page ${this.currentpage} / ${this.pagestotal} (displaying: ${this.displayitems} of total: ${this.totalresults})`;
  }

  async registerPaging() {
    let root = this.shadowRoot;
    let pageInforef = root.getElementById('pageInfo');
    //let prevBtnref = root.getElementById('prevBtn');
    let nextBtnref = root.getElementById('nextBtn');

    pageInforef.innerText = `page ${this.currentpage} / ${this.pagestotal} (displaying: ${this.displayitems} of total: ${this.totalresults})`;

    // prevBtnref.addEventListener("click", () => {
    //   if (this.currentpage > 1) {
    //     this.drawMap(this.currentpage - 1);
    //   }
    // });

    nextBtnref.addEventListener('click', () => {
      if (this.currentpage < this.pagestotal) {
        this.drawMap(this.currentpage + 1);
      }
    });
  }

async firstUpdated() {
  // Expose instance for debugging (SAFE & STABLE)
  window.mapWidget = this;

  // Existing logic
  this.initializeMap();
  await this.drawMap(1);
  this.registerPaging();

  console.log('MapWidget exposed as window.mapWidget');
}




 render() {
  return html`
    <style>
      ${getStyle(style__markercluster)}
      ${getStyle(style__leaflet)}
      ${getStyle(style)}
    </style>

    <div id="map_widget">
      <div style="padding: 8px; background: #fff;">
        <label>
          Forecast date:&nbsp;
          <select @change=${this.handleWeatherDateChange}>
            ${this.weatherDates.map(
              (date) => html`
                <option
                  value=${date}
                  ?selected=${date === this.selectedWeatherDate}
                >
                  ${date}
                </option>
              `
            )}
          </select>
        </label>
      </div>

      <div id="map" class="map"></div>

      <div id="pager" class="pager">
        <span id="pageInfo"></span>
        <button id="nextBtn">Load Next ⏭️</button>
      </div>
    </div>
  `;
}

}

if (!window.customElements.get('map-widget')) {
  window.customElements.define('map-widget', MapWidget);
}
