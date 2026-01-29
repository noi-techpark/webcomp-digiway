// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import axios from 'axios';
import config from './config';

export function callGet(domain, path, params) {

  return axios
    .get(domain + path, {
      params: params,
    })
    .then(function (response) {
      //console.log("call response = ");
      //console.log(response.data);
      //console.log(response.config);
      return response.data;
    })
    .catch(function (error) {
      console.log(error.response);
      throw error;
    });
}

export async function fetchActivities(
  language,
  source,
  pagenumber,
  pagesize = 100
) {
  return callGet(config.API_BASE_URL_TOURISM, '/ODHActivityPoi', {
    pagesize: pagesize,
    fields:
      'Id,Shortname,GpsInfo,Tags,GpsTrack,Detail.' +
      language +
      '.Title,Detail.' +
      language +
      '.BaseText,Source,SyncSourceInterface',
    active: true,
    language: language,
    source: source,
    pagenumber: pagenumber,
    origin: config.ORIGIN,
  })
    .then((response) => {
      this.totalresults = response.TotalResults;
      this.pagestotal = response.TotalPages;
      this.currentpage = response.CurrentPage;
      this.nodes = response.Items;
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
}

export async function fetchGpsTrack(id) {
  return callGet(config.API_BASE_URL_TOURISM, '/GeoShape/' + id, {
    origin: config.ORIGIN,
  })
    .then((response) => {
      this.nodes = response.Items;
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
}

export async function fetchPeopleCounter(
  language,
  source,
  pagenumber,
  pagesize = 100
) {
    return callGet(config.API_BASE_URL_MOBILITY, '/flat,node/PeopleCounter/*/latest', {
      origin: config.ORIGIN
    })
    .then((response) => {
      this.mobilitynodes = response.data;
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
}

export async function fetchWeatherForecast(language) {
  try {
    const response = await callGet(config.API_BASE_URL_TOURISM, '/Weather/Forecast', {
      language: language,
      origin: config.ORIGIN,
    });
    
    console.log('Weather API response:', response);
    
    // Response: the array, not response.Forecasttttttttt
    const enrichedForecasts = await Promise.all(
      response.map(async (item) => {
        if (item.LocationInfo && item.LocationInfo.MunicipalityInfo && item.LocationInfo.MunicipalityInfo.Id) {
          try {
            const municipality = await callGet(
              config.API_BASE_URL_TOURISM, 
              `/Municipality/${item.LocationInfo.MunicipalityInfo.Id}`,
              { origin: config.ORIGIN }
            );
            return {
              ...item,
              Latitude: municipality.Latitude,
              Longitude: municipality.Longitude,
            };
          } catch (e) {
            console.log(`Failed to fetch municipality ${item.LocationInfo.MunicipalityInfo.Id}`, e);
            return item;
          }
        }
        return item;
      })
    );
    
    this.weathernodes = { Forecast: enrichedForecasts };
  } catch (e) {
    console.log('Failed to fetch weather forecast', e);
    throw e;
  }
}

export async function fetchAnnouncements(language, pagesize = 500) {
  return callGet(config.API_BASE_URL_TOURISM, '/Announcement', {
    source: 'digiway.zoho',
    pagesize: pagesize,
    origin: config.ORIGIN,
  })
  .then((response) => {
    this.announcementnodes = response.Items;
    this.totalresults = response.TotalResults;
    this.pagestotal = response.TotalPages;
    this.currentpage = response.CurrentPage;
  })
  .catch((e) => {
    console.log('Failed to fetch announcements', e);
    throw e;
  })
}
