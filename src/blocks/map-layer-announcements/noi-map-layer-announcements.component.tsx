// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Event, EventEmitter, h, State } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { LanguageDataService } from "../../data/language/language-data-service";
import { LayerConfig } from "../map-layer-base-odh/noi-map-layer-base-odh.component";
import { PopupDefinition } from "../../utils/maplibre-popup";


/**
 * (INTERNAL) render map layer
 */
@Component({
  tag: 'noi-map-layer-announcements',
  styleUrl: 'noi-map-layer-announcements.css',
  shadow: false,
})
export class NoiMapLayerAnnouncementsComponent implements StencilComponent {


  /**
   * Emitted when layer data is loading
   */
  @Event() layerLoading!: EventEmitter<boolean>;


  private languageService = LanguageDataService.getInstance();

  private config: LayerConfig = {
    fontIcon: 'closure',
    sourceLayer: "announcement",
    // additional: '?source=tirol.mapservices.eu&operationmode=pointsandtracks&displaytracksonzoomlevel=10&jsonselector=StartTime,EndTime,Mapping[\'tirol.mapservices.eu\'].description';
    additional: '?source=tirol.mapservices.eu&operationmode=pointsandtracks&displaytracksonzoomlevel=10&jsonselector=StartTime,EndTime,Mapping',
    center: [11.3, 46.9],
    zoom: 9
  }


  @State()
  private configReady?: LayerConfig;

  constructor() {
  }


  async connectedCallback() {
    this.layerLoading.emit(true);

    // fetch desired IDs
    const date = new Date();
    const year = date.getFullYear();
    // Adds a leading '0' and takes the last 2 digits
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);

    const dateString = `${year}${month}${day}`;
    const ids = await fetch(`https://tourism.api.opendatahub.com/v1/Announcement?source=tirol.mapservices.eu&rawfilter=or(isnull(EndTime),gt(EndTime,'${dateString}'))&fields=Id&pagesize=0&getasidarray=true`)
    const payload = await ids.text();

    this.configReady = {...this.config};
    this.configReady.requestTransform = (url: string) => {
      return {
        url: url,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: payload,
        // body: JSON.stringify(['urn:announcements:tirol.mapservices.eu:121795001']),
      };
    };
  }

  render(): any {
    if (this.configReady) {
      return (<noi-map-layer-base-odh config={this.configReady}
                                      popupStructure={this.createPopup.bind(this)}
                                      onLayerLoading={(e) => this.layerLoading.emit(e.detail)}
      ></noi-map-layer-base-odh>)
    } else {
      return '';
    }
  }

  ///////////////


  // Feature popup helper
  async createPopup(feature: any/*, featureType*/): Promise<PopupDefinition> {
    const props = feature.properties;
    // const icon = getAssetPath('route-closures-icon.svg');

    let data = props.data;
    try {
      data = JSON.parse(props.data);
    } catch (e) {
      console.warn(e);
    }
    // console.log('[DEBUG] feature:', feature);
    console.log('[DEBUG] Parsed data:', data);

    const name = data['Mapping']?.['tirol.mapservices.eu']?.['name'];

    const lang = this.languageService.currentLanguage;
    const description = data['Mapping']?.['tirol.mapservices.eu']?.[`publicDescription.${lang}`]
      || data['Mapping']?.['tirol.mapservices.eu']?.['publicDescription.en']
      || data['Mapping']?.['tirol.mapservices.eu']?.['description']
      || "";

    return {
      title: {
        icon: 'pointer-off',
        text: this.languageService.translate('map.layer.route-closures'),
      },
      body: [
        {type: 'name', text: name},
        {type: 'description', text: description},
        {
          type: 'section',
          section: {
            name: this.languageService.translate('route-closures.start-time'),
            value: data['StartTime'],
          },
        },
        {
          type: 'section',
          section: {
            name: this.languageService.translate('route-closures.end-time'),
            value: data['EndTime'],
          },
        },
      ],
    };

  }

}
