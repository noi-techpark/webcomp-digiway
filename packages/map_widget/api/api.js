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
    origin: config.ORIGIN,
  })
    .then((response) => {      
      this.mobilitynodes = response.data;
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
}
