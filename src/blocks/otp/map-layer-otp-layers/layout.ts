// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { CircleLayerSpecification, SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";

export const SOURCE_OTP = 'source-otp';


export const HIGHLIGHT_COLOR = '#0068B4';
/**
 * zoomLevel < 12: nothing is visible (dataset has no data for it)
 * 12 <= zoomLevel < 14 (STATIONS_MAX_ZOOM): 'stops' dataset has no data. 'stations' only is visible
 * 14 <= zoomLevel : 'stops' dataset is visible, 'stations' is hidden.
 *
 * 21 <= zoomLevel: too much zoom, datasets are empty
 *
 * 'rental' and 'parking' layers follows tha same logic as 'stops'
 */
export const STATIONS_MAX_ZOOM = 14;

/**
 *  'stations' dataset are split at 'rail' and 'all except rail' layers.
 *  'rail' is visible always, meanwhile the other is visible when zoom >= STATIONS_ALL_MIN_ZOOM
 */
export const STATIONS_ALL_MIN_ZOOM = 13; // should be >= 12, because the layer doesn't provide 'stations' info with small zoom

export const rentalLayout: SymbolLayerSpecification['layout'] = {
  'icon-image': [
    'case',
    ["==", "BICYCLE", ["string", ["get", "formFactors"]]],
    ['case', ['>', ['get', 'vehiclesAvailable'], 0], 'otp-bicycle-green', 'otp-bicycle-red'],
    ["==", "CAR", ["string", ["get", "formFactors"]]],
    ['case', ['>', ['get', 'vehiclesAvailable'], 0], 'otp-car-green', 'otp-car-red'],
    ['case', ['>', ['get', 'vehiclesAvailable'], 0], 'otp-unknown-green', 'otp-unknown-red']
  ],

  'icon-size': 1.0,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
  'icon-allow-overlap': false,       // Keeps icons visible even if they crowd each other
  'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates

  'text-field': ['get', 'name'], // Specify the field containing the name
  'text-anchor': 'top', // Anchor the text to the top of the label bounding box (This pushes the text BELOW the anchor point)
  'text-offset': [0, 1.0], // Offset the text down slightly so it doesn't overlap the icon
  'text-size': 12,
};


export const stopsLayout: SymbolLayerSpecification['layout'] = {
  'icon-size': 1.0,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
  'icon-allow-overlap': false,       // Keeps icons visible even if they crowd each other
  'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates
  // 'icon-image': 'otp-bus',           // Matches the name used in map.addImage()
  'icon-image': [
    'case',
    ["==", "RAIL", ["string", ["get", "type"]]], 'otp-train',
    ["==", "BUS", ["string", ["get", "type"]]], 'otp-bus',
    ["==", "AIRPLANE", ["string", ["get", "type"]]], 'otp-airplane',
    ["==", "FERRY", ["string", ["get", "type"]]], 'otp-ferry',
    ["==", "FUNICULAR", ["string", ["get", "type"]]], 'otp-funicular',
    ["==", "GONDOLA", ["string", ["get", "type"]]], 'otp-gondola',
    ["==", "SUBWAY", ["string", ["get", "type"]]], 'otp-subway',
    ["==", "TRAM", ["string", ["get", "type"]]], 'otp-tram',
    'otp-unknown'
  ],

  'text-anchor': 'top', // Anchor the text to the top of the label bounding box (This pushes the text BELOW the anchor point)
  'text-offset': [0, 1.0], // Offset the text down slightly so it doesn't overlap the icon
  'text-size': 12,
  'text-field': [
    'format',
    ['get', 'name'], {'font-scale': 1.0},
    '\n', {}, // Newline break
    ['get', 'platform'], {'font-scale': 0.85, 'text-color': '#444444'}
  ],
};


export const parkingLayout: SymbolLayerSpecification['layout'] = {
  'icon-image': [
    'case',
    ['all',
      ["==", ["get", "carPlaces"], true],
      ['>', ['get', 'capacity.carPlaces'], 0],
    ], 'otp-parking-green',

    ['all',
      ["==", ["get", "bicyclePlaces"], true],
      ['>', ['get', 'capacity.bicyclePlaces'], 0],
    ], 'otp-parking-green',

    'otp-parking-red'
  ],
  'icon-size': 1.0,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
  'icon-allow-overlap': false,       // Keeps icons visible even if they crowd each other
  'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates

  'text-field': ['get', 'name'], // Specify the field containing the name
  'text-anchor': 'top', // Anchor the text to the top of the label bounding box (This pushes the text BELOW the anchor point)
  'text-offset': [0, 1.0], // Offset the text down slightly so it doesn't overlap the icon
  'text-size': 12,
};


export const anyStationLayout: SymbolLayerSpecification['layout'] = {
  'icon-size': 1.0,                  // Adjust scale here (0.5 = half size, 2.0 = double size)
  'icon-allow-overlap': false,       // Keeps icons visible even if they crowd each other
  'icon-anchor': 'center',            // "bottom" forces the bottom of your pin to sit directly on the coordinates
  'icon-image': [
    'case',
    // Element order is matter here!
    ["in", "RAIL", ["string", ["get", "type"]]], 'otp-train',
    ["in", "BUS", ["string", ["get", "type"]]], 'otp-bus',
    ["in", "SUBWAY", ["string", ["get", "type"]]], 'otp-subway',
    ["in", "AIRPLANE", ["string", ["get", "type"]]], 'otp-airplane',
    ["in", "FERRY", ["string", ["get", "type"]]], 'otp-ferry',
    ["in", "FUNICULAR", ["string", ["get", "type"]]], 'otp-funicular',
    ["in", "GONDOLA", ["string", ["get", "type"]]], 'otp-gondola',
    ["in", "TRAM", ["string", ["get", "type"]]], 'otp-tram',
    'otp-unknown'
  ],

  'text-field': ['get', 'name'], // Specify the field containing the name
  'text-anchor': 'top', // Anchor the text to the top of the label bounding box (This pushes the text BELOW the anchor point)
  'text-offset': [0, 1.0], // Offset the text down slightly so it doesn't overlap the icon
  'text-size': 12,
}


export const hoverCirclePaint: CircleLayerSpecification['paint'] = {
  'circle-radius': 20,
  'circle-color': HIGHLIGHT_COLOR,
  // 'circle-opacity': 0.6,

  'circle-opacity': [
    'case', ['boolean', ['feature-state', 'hover'], false], 0.6,   // hovered
    0    // normal
  ],
}


export type ZoomCategory = 'too-far' | 'stations-train' | 'stations-all' | 'all' | 'too-close';

export function getZoomCategory(zoomLevel: number): ZoomCategory {
  if (zoomLevel < 12) {
    return 'too-far';
  } else if (zoomLevel < STATIONS_ALL_MIN_ZOOM) {
    return 'stations-train';
  } else if (STATIONS_ALL_MIN_ZOOM <= zoomLevel && zoomLevel < STATIONS_MAX_ZOOM) {
    return 'stations-all';
  } else if (zoomLevel < 21) {
    return 'all';
  } else {
    return 'too-close';
  }
}
