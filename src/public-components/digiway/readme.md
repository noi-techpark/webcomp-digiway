<!--
SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>

SPDX-License-Identifier: CC0-1.0
-->
# noi-digiway



<!-- Auto Generated Below -->


## Overview

Consolidated web-component to show Open Data Hub data imported within the Digiway project

## Properties

| Property    | Attribute   | Description                                                                                               | Type                                          | Default     |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| `baseMap`   | `base-map`  | Base map layer                                                                                            | `"osm" \| "tirol"`                            | `'tirol'`   |
| `centermap` | `centermap` | Pass latitude, longitude and zoomlevel separated by "," if map should be centered an a specific gps point | `string`                                      | `undefined` |
| `language`  | `language`  | Language                                                                                                  | `string`                                      | `'en'`      |
| `layout`    | `layout`    | Layout appearance                                                                                         | `"auto" \| "desktop" \| "mobile" \| "tablet"` | `'auto'`    |
| `viewDate`  | `view-date` | View date for weather data (weather layer only)                                                           | `string`                                      | `undefined` |


## Shadow Parts

| Part                 | Description      |
| -------------------- | ---------------- |
| `"legend"`           | Legend           |
| `"legend-container"` | Legend container |
| `"map"`              | Map              |
| `"popup"`            | Map popup dialog |
| `"sidebar"`          | Sidebar          |


## CSS Custom Properties

| Name                       | Description                                  |
| -------------------------- | -------------------------------------------- |
| `--color-background`       | Background color                             |
| `--color-background-hover` | Background color on hover                    |
| `--color-background-shade` | Background darken color                      |
| `--color-border`           | Border color                                 |
| `--color-primary`          | Primary color                                |
| `--color-secondary`        | Secondary color                              |
| `--color-text`             | Text color                                   |
| `--color-shadow`           | Shadow color for some elements               |
| `--map-filter`             | 'filter' property for the map                |
| `--scrollbar-bg`           | Scrollbar background color                   |
| `--scrollbar-color`        | Scrollbar thumb color                        |
| `--sidebar-width`          | Sidebar with (for desktop and tablet layout) |


## Dependencies

### Depends on

- [noi-icon](../../blocks/icon)
- [noi-map](../../blocks/map)
- [noi-map-base-osm](../../blocks/map-base-osm)
- [noi-map-base-tirol](../../blocks/map-base-tyrol)
- [noi-map-layer-risk-exposure](../../blocks/map-layer-risk-exposure)
- [noi-map-layer-announcements](../../blocks/map-layer-announcements)
- [noi-map-layer-roads](../../blocks/map-layer-roads)
- [noi-map-layer-weather](../../blocks/map-layer-weather)
- [noi-select](../../blocks/select)
- [noi-checkbox](../../blocks/checkbox)
- [noi-checkbox-group](../../blocks/checkbox-group)
- [noi-button](../../blocks/button)

### Graph
```mermaid
graph TD;
  noi-digiway --> noi-icon
  noi-digiway --> noi-map
  noi-digiway --> noi-map-base-osm
  noi-digiway --> noi-map-base-tirol
  noi-digiway --> noi-map-layer-risk-exposure
  noi-digiway --> noi-map-layer-announcements
  noi-digiway --> noi-map-layer-roads
  noi-digiway --> noi-map-layer-weather
  noi-digiway --> noi-select
  noi-digiway --> noi-checkbox
  noi-digiway --> noi-checkbox-group
  noi-digiway --> noi-button
  noi-map-layer-announcements --> noi-map-layer-base-odh
  noi-map-layer-roads --> noi-map-layer-base-odh
  noi-map-layer-roads --> noi-map-layer-roads-popup
  noi-map-layer-roads-popup --> noi-icon
  noi-map-layer-roads-popup --> noi-spinner
  noi-map-layer-weather --> noi-map-layer-weather-popup
  noi-map-layer-weather-popup --> noi-icon
  noi-map-layer-weather-popup --> noi-button
  noi-map-layer-weather-popup --> noi-spinner
  noi-checkbox --> noi-spinner
  style noi-digiway fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
