// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later


import { CircleLayerSpecification, FilterSpecification } from "@maplibre/maplibre-gl-style-spec";

/**
 */
export const poiStyles: {
  cluster: CircleLayerSpecification['paint'],
  unclusteredpoints: CircleLayerSpecification['paint'],
} = {
  cluster: {
    // Make circles larger as the point count increases
    'circle-radius': [
      'step', ['get', 'point_count'],
      20,   // Radius 20px for clusters with < 100 points
      100,
      30,   // Radius 30px for clusters with 100-750 points
      750,
      40    // Radius 40px for clusters with >= 750 points
    ],
    // Change colors based on density
    'circle-color': [
      'case', ['boolean', ['feature-state', 'hover'], false],
      '#FF6600',   // hovered
      ['step', ['get', 'point_count'],
        '#4caf50', // Teal for small clusters
        100,
        '#ff9800', // Yellow for medium clusters
        750,
        '#f44336'  // Pink for massive clusters
      ],
    ],
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff',
  },
  unclusteredpoints: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      0, ['case', ['boolean', ['feature-state', 'hover'], false], 16, 14],
      10, ['case', ['boolean', ['feature-state', 'hover'], false], 17, 15],
      14, ['case', ['boolean', ['feature-state', 'hover'], false], 19, 17],
      18, ['case', ['boolean', ['feature-state', 'hover'], false], 21, 19]
    ],
    'circle-color': [
      'case', ['boolean', ['feature-state', 'hover'], false],
      '#FF6600',   // hovered
      '#004D71'    // normal
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
    'circle-opacity': 0.8
  },
} as const;


/**
 * 'clusterMaxZoom' is not guarantee that clusters are disappear at greater zoom
 *  so we add a filter condition
 */
export const poiClusterFilter: {
  clusterOnly: FilterSpecification,
  nonClusterOnly: FilterSpecification,
} = {
  clusterOnly: [
    'all',
    ['has', 'point_count'],
    ['<', ['zoom'], 18] // <--- Hide cluster graphics entirely above zoom 18
  ],
  nonClusterOnly: [
    'any',
    ['!', ['has', 'point_count']], // 1. Show normal single points at any zoom
    ['>=', ['zoom'], 18]          // 2. Show everything (even clusters) if zoom >= 18
  ],
} as const;
