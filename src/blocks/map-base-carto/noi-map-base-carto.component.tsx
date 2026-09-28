// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { Map } from "maplibre-gl";
import { _loadStyle, _unloadStyle, getParentMap } from "../../utils/maplibre";


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-base-carto',
  styleUrl: 'noi-map-base-carto.css', // NOTE: some components are generated invalid without style file
  shadow: false,
})
export class NoiMapBaseCartoComponent implements StencilComponent {

  private BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  private map!: Map;

  @Element() el!: HTMLElement;

  // @Prop()
  // variant: 'color' | 'grayscale' = 'color';

  async connectedCallback() {
    this.map = await getParentMap(this.el);
    this.initLayer();
  }

  disconnectedCallback() {
    // Clean up the layer if the HTML element is removed from the DOM
    if (this.map) {
      this.destroyLayer();
    }
  }


  async initLayer() {
    console.log(`[noi-map-base-carto] Adding layer to map`);
    await _loadStyle(this.map, this.BASEMAP_STYLE, {prepend: true});
  }

  destroyLayer() {
    console.log('[noi-map-base-carto] Removing layer from map');
    _unloadStyle(this.map, this.BASEMAP_STYLE);
  }

}
