// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element } from "@stencil/core";
import { StencilComponent } from "../../../utils/StencilComponent";
import { Map } from "maplibre-gl";
import { getParentMap, registerSvgImage } from "../../../utils/maplibre";
import { otpIcons } from "./icons";


const TAG = 'noi-map-layer-otp-icons';

/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-otp-icons',
  styleUrl: 'noi-map-layer-otp-icons.css',
  shadow: false,
})
export class NoiMapLayerOtpIconsComponent implements StencilComponent {

  private map!: Map;

  @Element() el!: HTMLElement;


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
    console.log(`[${TAG}] Adding layer to map`);

    await registerSvgImage(this.map, 'otp-parking-green', otpIcons.parkingDotGreen);
    await registerSvgImage(this.map, 'otp-parking-red', otpIcons.parkingDotRed);

    await registerSvgImage(this.map, 'otp-bicycle-green', otpIcons.bikeDotGreen);
    await registerSvgImage(this.map, 'otp-bicycle-red', otpIcons.bikeDotRed);
    await registerSvgImage(this.map, 'otp-car-green', otpIcons.carDotGreen);
    await registerSvgImage(this.map, 'otp-car-red', otpIcons.carDotRed);
    await registerSvgImage(this.map, 'otp-unknown-green', otpIcons.unknownDotGreen);
    await registerSvgImage(this.map, 'otp-unknown-red', otpIcons.unknownDotRed);

    await registerSvgImage(this.map, 'otp-train', otpIcons.train);
    await registerSvgImage(this.map, 'otp-bus', otpIcons.bus);
    await registerSvgImage(this.map, 'otp-airplane', otpIcons.airplane);
    await registerSvgImage(this.map, 'otp-ferry', otpIcons.ferry);
    await registerSvgImage(this.map, 'otp-funicular', otpIcons.funicular);
    await registerSvgImage(this.map, 'otp-gondola', otpIcons.gondola);
    await registerSvgImage(this.map, 'otp-subway', otpIcons.subway);
    await registerSvgImage(this.map, 'otp-tram', otpIcons.tram);

    await registerSvgImage(this.map, 'otp-unknown', otpIcons.unknown);
  }

  destroyLayer() {
    console.log(`[${TAG}] Removing layer from map`);

    if (this.map) {
      this.map.removeImage('otp-parking-green');
      this.map.removeImage('otp-parking-red');

      this.map.removeImage('otp-bicycle-green');
      this.map.removeImage('otp-bicycle-red');
      this.map.removeImage('otp-car-green');
      this.map.removeImage('otp-car-red');
      this.map.removeImage('otp-unknown-green');
      this.map.removeImage('otp-unknown-red');

      this.map.removeImage('otp-train');
      this.map.removeImage('otp-bus');
      this.map.removeImage('otp-airplane');
      this.map.removeImage('otp-ferry');
      this.map.removeImage('otp-funicular');
      this.map.removeImage('otp-gondola');
      this.map.removeImage('otp-subway');
      this.map.removeImage('otp-tram');
      this.map.removeImage('otp-unknown');
    }
  }
}
