// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h, Method, State } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { LanguageDataService } from "../../data/language/language-data-service";
import { PoiInfo, PoiService } from "../../data/noi/poi-service";
import { Subscription } from "maplibre-gl";
import { popupBuilderContent, PopupDefinitionObject } from "../../utils/maplibre-popup";

/**
 * (INTERNAL) render map popup
 */
@Component({
  tag: 'noi-map-layer-poi-popup',
  styleUrl: 'map-layer-poi-popup.css',
  shadow: false,
})
export class MapLayerPoiPopupComponent implements StencilComponent {

  private languageService = LanguageDataService.getInstance();

  @State()
  private isLoading = false;

  @State()
  private poiInfo?: PoiInfo | null;

  @State()
  private featureName?: string;

  private featureId?: string;

  private poiService = PoiService.getInstance();


  @Method()
  async setFeatureId(featureId: string) {
    this.featureId = featureId;
    this._loadData();
  }

  @Method()
  async setName(featureName: string) {
    this.featureName = featureName
  }


  private _sub?: Subscription;

  _loadData() {
    if (!this.featureId) {
      return;
    }
    this.isLoading = true;
    this._sub?.unsubscribe();

    this._sub = this.poiService.getPoiById$(this.featureId).subscribe(poi => {
      this.poiInfo = poi;
      this.isLoading = false;
    });
  }

  render() {
    let poiContent = '';
    let pointName = this.featureName;

    if (!this.isLoading && this.poiInfo) {
      poiContent = this.renderInfo(this.poiInfo);
      pointName = this.languageService.translateObjectDeep(this.poiInfo.Detail, 'Title') || this.poiInfo.Shortname || this.featureName;
    }

    return (
      <div class="noi-map-popup" part="popup">
        <div class="popup__header">
          <noi-icon class="popup__header-icon" name="material-explore-nearby"></noi-icon>
          <div>{this.languageService.translate('map.layer.poi')}</div>
        </div>

        {pointName ? (
          <div class="popup__name">{pointName}</div>
        ) : ''}

        {this.isLoading ? (
          <div class="popup__loading">
            <noi-spinner></noi-spinner>
          </div>
        ) : (
          (!this.poiInfo || !poiContent)
            ? (<div class="popup__description">
              {this.languageService.translate('map.layer.util.no-details')}
            </div>)
            : (<div innerHTML={poiContent}></div>)
        )}

      </div>
    );

  }

  renderInfo(poiInfo: PoiInfo) {
    const phoneNumber = this.languageService.translateObjectDeep(poiInfo.ContactInfos, 'Phonenumber');
    const email = this.languageService.translateObjectDeep(poiInfo.ContactInfos, 'Email');

    const structure: PopupDefinitionObject = {
      body: [
        // {type: 'name', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'Title') || poiInfo.Shortname},
        {type: 'name', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'Header')}, // shown in header
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'SubHeader')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'IntroText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'BaseText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'AdditionalText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'GetThereText')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'SafetyInfo')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'ParkingInfo')},
        {
          type: 'description',
          text: this.languageService.translateObjectDeep(poiInfo.Detail, 'PublicTransportationInfo')
        },
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'EquipmentInfo')},
        {type: 'description', text: this.languageService.translateObjectDeep(poiInfo.Detail, 'AuthorTip')},
        email ? {
          type: 'link',
          link: 'mailto:' + email,
          linkName: email,
        } : null,
        phoneNumber ? {
          type: 'link',
          link: 'tel:' + phoneNumber,
          linkName: phoneNumber,
        } : null,
        {type: 'link', link: this.languageService.translateObjectDeep(poiInfo.ContactInfos, 'Url')},
      ],
    };
    return popupBuilderContent(structure);
  }

}

