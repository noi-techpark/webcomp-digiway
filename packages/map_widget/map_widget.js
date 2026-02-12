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
import { fetchActivities, fetchAnnouncements, fetchGpsTrack, fetchPeopleCounter, fetchWeatherForecast } from './api/api.js';
// import moment from 'moment';
// import L2 from 'leaflet-gpx';
// import L3 from 'leaflet-kml';

class MapWidget extends LitElement {
  static get properties() {
    return {
      propLanguage: {
        type: String,
        attribute: 'language',
      },
      propSource: {
        type: String,
        attribute: 'source',
      },
      propPagesize: {
        type: String,
        attribute: 'pagesize',
      },
      propCenterMap: {
        type: String,
        attribute: 'centermap',
      },
      propForecastDay: {
        type: Number,
        attribute: 'forecastday',
      }
    };
  }

  constructor() {
    super();

    /* Map configuration */
    this.map_center = [46.479, 11.331];
    this.map_zoom = 9;
    this.map_layer =
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png';
    this.map_attribution =
      '<a target="_blank" href="https://opendatahub.com">OpenDataHub.com</a> | &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a target="_blank" href="https://carto.com/attribution">CARTO</a>';

    //OSM
    // this.map_layer = "http://a.tile.openstreetmap.org/{z}/{x}/{y}.png";
    // this.map_attribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';

    //OA MAP needs OA JS

    /* Internationalization */
    // this.language_default = 'en';
    // this.language = 'de';

    /* Data fetched from Open Data Hub */
    this.totalresults = 0;
    this.pagestotal = 0;
    this.currentpage = 0;
    this.displayitems = 0;

    this.nodes = [];
    this.mobilitynodes = [];
    this.weathernodes = [];
    this.announcementnodes = [];
    this.announcementMarkers = [];
    this.fetchAnnouncements = fetchAnnouncements.bind(this);
    this.types = {};

    /* Requests */
    //this.fetchStations = fetchStations.bind(this);
    this.fetchActivities = fetchActivities.bind(this);
    this.fetchGpsTrack = fetchGpsTrack.bind(this);
    this.fetchPeopleCounter = fetchPeopleCounter.bind(this);
    this.fetchWeatherForecast = fetchWeatherForecast.bind(this);
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
    if (activitysource == 'dservices3.arcgis.com.accessibletrails_austria') {
      color = '#534769';
      activitytype = 'accessibletrail';
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
    if (activitysource == 'odh.weather.forecast') {
      color = '#0088cc';
      activitytype = 'weatherforecast';
      source = 'opendatahub-weather';
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

      if (this.propSource.includes("tourism.weather"))
        await this.drawWeatherMap();

      if (this.propSource.includes("tourism.announcement"))
        await this.drawAnnouncementMap();

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

  

  async drawWeatherMap() {
    await this.fetchWeatherForecast(this.propLanguage || 'de');

    const forecastDay = this.propForecastDay !== undefined ? this.propForecastDay : 0;
    if (!this.weathernodes || !this.weathernodes.Forecast) {
      console.log('No weather data available');
      return;
    }

    this.weathernodes.Forecast.forEach((municipality) => {
      if (!municipality.ForeCastDaily || municipality.ForeCastDaily.length === 0) {
        return;
      }

      const forecast = municipality.ForeCastDaily[forecastDay];
      if (!forecast) {
        return;
      }

      const lat = municipality.Latitude;
      const lon = municipality.Longitude;

      if (!lat || !lon) {
        return;
      }

      // get weather icon url from response
      const weatherIconUrl = forecast.WeatherImgUrl || '';
      const weatherDesc = forecast.WeatherDesc || '';
      const maxTemp = forecast.MaxTemp !== undefined ? forecast.MaxTemp : '--';
      const minTemp = forecast.MinTemp !== undefined ? forecast.MinTemp : '--';
      const forecastDate = forecast.Date ? new Date(forecast.Date).toLocaleDateString() : '';

      const nameObj = municipality.LocationInfo &&
        municipality.LocationInfo.MunicipalityInfo &&
        municipality.LocationInfo.MunicipalityInfo.Name;

      console.log('nameObj:', nameObj, 'language:', this.propLanguage)

      let municipalityName = 'Unknown'

      if (typeof nameObj === 'string') {
        municipalityName = nameObj;
      } else if (nameObj && typeof nameObj[this.propLanguage] === 'string') {
        municipalityName = nameObj[this.propLanguage];
      } else if (nameObj && nameObj[this.propLanguage] && nameObj[this.propLanguage].Name) {
        municipalityName = nameObj[this.propLanguage].Name;
      } else if (municipality.LocationInfo && municipality.LocationInfo.MunicipalityInfo && municipality.LocationInfo.MunicipalityInfo.Id) {
        municipalityName = municipality.LocationInfo.MunicipalityInfo.Id;
      }

      console.log('Final municipalityName:', municipalityName);

      // const municipalityName =
      //   municipality.MunicipalityName ||
      //   (nameObj && nameObj[this.propLanguage]) ||
      //   'Unknown';


      const popup = `
        <div class="popup weather-popup">
          <b>${municipalityName}</b><br/>
          <div style="text-align: center;">
            ${weatherIconUrl ? `<img src="${weatherIconUrl}" alt="${weatherDesc}" style="width: 48px; height: 48px;">` : ''}
          </div>
          <div><b>${weatherDesc}</b></div>
          <div>Max: ${maxTemp}°C / Min: ${minTemp}°C</div>
          <div style="font-size: 0.9em; color: #666;">${forecastDate}</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'weather-marker',
        html: weatherIconUrl
          ? `<img src="${weatherIconUrl}" style="width: 40px; height: 40px; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));">`
          : `<span style="font-size: 32px;">🌡️</span>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

        // L.marker([lat, lon], { icon: icon })
        //   .bindPopup(popup)
        //   .addTo(this.map);
        const marker = L.marker([lat, lon], { icon: icon })
          .bindPopup(popup)
          .addTo(this.map);

        if (!this.weatherMarkers) this.weatherMarkers = [];
        this.weatherMarkers.push(marker);
    })
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
    this.initializeMap();
    await this.drawMap(1);
    this.registerPaging();
  }

  render() {
    return html`
      <style>
        ${getStyle(style__markercluster)}
        ${getStyle(style__leaflet)}
        ${getStyle(style)}
      </style>
      <div id="map_widget">
        <div id="map" class="map"></div>
        ${this.propSource && this.propSource.includes('tourism.weather') ? html`
          <div id="controls" class="controls" style="padding: 8px; background: white; position: absolute; top: 10px; right: 10px; z-index: 1000; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            <label for="daySelector">Forecast: </label>
            <select id="daySelector" @change="${this.onDayChange}">
              <option value="0">Today</option>
              <option value="1">Tomorrow</option>
              <option value="2">Day +2</option>
              <option value="3">Day +3</option>
              <option value="4">Day +4</option>
            </select>
          </div>
        ` : ''}
        <div id="pager" class="pager">
          <span id="pageInfo"></span>
          <button id="nextBtn">Load Next ⏭️</button>
        </div>
      </div>
    `;
  }

  onDayChange(e) {
    this.propForecastDay = parseInt(e.target.value);
    this.clearWeatherMarkers();
    this.drawWeatherMap();
  }

  clearWeatherMarkers() {
    // Remove existing weather markers from map
    if (this.weatherMarkers) {
      this.weatherMarkers.forEach(marker => this.map.removeLayer(marker));
    }
    this.weatherMarkers = [];
  }

  async drawAnnouncementMap() {
    await this.fetchAnnouncements(this.propLanguage || 'de');

    if (!this.announcementnodes || this.announcementnodes.length === 0) {
      console.log('No announcement data available');
      return;
    }

    console.log('Announcements count:', this.announcementnodes.length);

    this.announcementnodes.forEach((item) => {
      const geo = item.Geo && item.Geo.position;
      if (!geo || !geo.Latitude || !geo.Longitude) {
        return;
      }

      const lat = geo.Latitude;
      const lon = geo.Longitude;

      // Get detail in preferred language, fallback to Italian or any available
      const detail = (item.Detail && item.Detail[this.propLanguage]) ||
                     (item.Detail && item.Detail['it']) ||
                     (item.Detail && item.Detail['de']) ||
                     {};

      const title = detail.Title || item.Shortname || 'Unknown';
      const baseText = detail.BaseText || '';

      // "Chiuso" or "Aperto"
      const isClosed = baseText.toLowerCase().includes('chiuso') || 
                       baseText.toLowerCase().includes('closed');
      const isOpen = baseText.toLowerCase().includes('aperto') || 
                   baseText.toLowerCase().includes('open');

      //icon/color based on status
      let iconHtml;
      let color;

      if (isClosed) {
        color = '#dc3545';
        iconHtml = `<div style="background: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✕</div>`;
      } else if (isOpen) {
        color = '#28a745'; 
        iconHtml = `<div style="background: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✓</div>`;
      } else {
        color = '#ffc107'; 
        iconHtml = `<div style="background: ${color}; color: black; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">!</div>`;
      }

      const icon = L.divIcon({
        className: 'announcement-marker',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const popup = `
        <div class="popup announcement-popup">
          <b>${title}</b><br/>
          <div>${baseText}</div>
          ${item.StartTime ? `<div style="font-size: 0.85em; color: #666; margin-top: 4px;">From: ${new Date(item.StartTime).toLocaleDateString()}</div>` : ''}
          ${item.EndTime ? `<div style="font-size: 0.85em; color: #666;">To: ${new Date(item.EndTime).toLocaleDateString()}</div>` : ''}
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: icon })
        .bindPopup(popup)
        .addTo(this.map);

      this.announcementMarkers.push(marker);
    });
  }
}

if (!window.customElements.get('map-widget')) {
  window.customElements.define('map-widget', MapWidget);
}
