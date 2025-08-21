// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { html, LitElement } from 'lit-element';
import L from 'leaflet';
import leaflet_mrkcls from 'leaflet.markercluster';
import style__leaflet from 'leaflet/dist/leaflet.css';
import style__markercluster from 'leaflet.markercluster/dist/MarkerCluster.css';
import style from './scss/main.scss';
import { getStyle, rainbow, getDistanceFromLatLonInKm } from './utils.js';
import { fetchActivities,fetchGpsTrack } from './api/api.js';
import moment from 'moment';
import L2 from 'leaflet-gpx';
import L3 from 'leaflet-kml';

class MapWidget extends LitElement {

  static get properties() {
    return {
      propLanguage: {
        type: String,
        attribute: 'language'
      },
      propSource: {
        type: String,
        attribute: 'source'
      },
      propPagesize: {
        type: String,
        attribute: 'pagesize'
      },
      propCenterMap: {
        type: String,
        attribute: 'centermap'
      }
    };
  }

  constructor() {
    super();

    /* Map configuration */
    this.map_center = [46.479, 11.331];
    this.map_zoom = 9;
    this.map_layer = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png";
    this.map_attribution = '<a target="_blank" href="https://opendatahub.com">OpenDataHub.com</a> | &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a target="_blank" href="https://carto.com/attribution">CARTO</a>';

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

    this.nodes = [];
    this.types = {};

    /* Requests */
    //this.fetchStations = fetchStations.bind(this);
    this.fetchActivities = fetchActivities.bind(this);
    this.fetchGpsTrack = fetchGpsTrack.bind(this);
  }

  async initializeMap() {
    let root = this.shadowRoot;
    let mapref = root.getElementById('map');

    if(this.propCenterMap){
      var splittedgps = this.propCenterMap.split(',');
      this.map_center =  [parseFloat(splittedgps[0]),parseFloat(splittedgps[1])]
      this.map_zoom = parseInt(splittedgps[2]);
    }

    this.map = L.map(mapref, {
      zoomControl: false
    }).setView(this.map_center, this.map_zoom);

    L.tileLayer(this.map_layer, {
      attribution: this.map_attribution
    }).addTo(this.map);
  }

  async drawMap(pagenumber) {

    let columns_layer_array = [];
      
      if(this.propSource)
      {
          if(this.propLanguage == undefined)
            this.propLanguage = 'de';

      await this.fetchActivities(this.propLanguage, this.propSource, pagenumber, this.propPagesize);

      this.nodes.map(activity => {   
        
        let popup = '<div class="popup"><b>' + activity["Detail." + this.propLanguage + ".Title"] + '</b>';

        if(activity["Detail." + this.propLanguage + ".BaseText"] != null)
        {
          popup += '<div>' + activity["Detail." + this.propLanguage + ".BaseText"] + '</div>';
        }
        popup += '</div>';

        let popupobj = L.popup().setContent(popup);

        Object.keys(activity.GpsTrack).forEach(key => {
          
              var url = activity.GpsTrack[key].GpxTrackUrl;
                                  
              fetch(url)
              .then(res => res.json())
              .then(geojson => {
                  // Create new kml overlay
                  const parser = new DOMParser();
                  const shape = geojson.Geometry;
                  const track = new L.geoJSON(shape, {
                    async: true
                  }).on('loaded', function (e) {
                }).addTo(this.map).bindPopup(popupobj);                  
              });
                              
        });  
        
        Object.keys(activity.GpsInfo).forEach(key => {

          const pos = [
            activity.GpsInfo[key].Latitude,
            activity.GpsInfo[key].Longitude
          ];  

            let iconskiarea = L.divIcon({
            html: '<div class="marker"><div style="background-color: red"></div></div>',
            iconSize: L.point(17, 17)
          });

          let marker = L.marker(pos, {
            icon: iconskiarea,
          }).addTo(this.map).bindPopup(popupobj); 

        });
        


    });

    this.visibleNodes = columns_layer_array.length;
    let columns_layer = L.layerGroup(columns_layer_array, {});

    /** Prepare the cluster group for station markers */
    this.layer_columns = new L.markerClusterGroup({
      showCoverageOnHover: false,
      chunkedLoading: true,
      disableClusteringAtZoom: 13,
      iconCreateFunction: function(cluster) {
        return L.divIcon({
          html: '<div class="marker_cluster__marker">' + cluster.getChildCount() + '</div>',
          iconSize: L.point(32, 32)
        });
      }
    });
    /** Add maker layer in the cluster group */
    this.layer_columns.addLayer(columns_layer);
    /** Add the cluster group to the map */
    this.map.addLayer(this.layer_columns);
    }
    this.refreshPagingView();
  }

  async refreshPagingView(){
    let root = this.shadowRoot;
    let pageInforef = root.getElementById('pageInfo');

    pageInforef.innerText =
      `${this.currentpage} / ${this.pagestotal} (total: ${this.totalresults})`;
  }

  async registerPaging(){

    let root = this.shadowRoot;
    let pageInforef = root.getElementById('pageInfo');
    let prevBtnref = root.getElementById('prevBtn');
    let nextBtnref = root.getElementById('nextBtn');
    
    pageInforef.innerText =
      `${this.currentpage} / ${this.pagestotal} (total: ${this.totalresults})`;

      // Buttons steuern
      prevBtnref.addEventListener("click", () => {
        if (this.currentpage > 1) {
          this.drawMap(this.currentpage - 1);
        }
      });

      nextBtnref.addEventListener("click", () => {
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
      </div>
      <div id="pager" class="pager">
        <button id="prevBtn">⏮️ Back</button>
        <span id="pageInfo"></span>
        <button id="nextBtn">Next ⏭️</button>
      </div>
    `;
  }
}

if (!window.customElements.get('map-widget')) {
  window.customElements.define('map-widget', MapWidget);
}
