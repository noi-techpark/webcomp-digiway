// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h, Method, State } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import { LanguageDataService } from "../../data/language/language-data-service";
import { Subscription } from "maplibre-gl";
import { popupBuilderContent, PopupDefinitionObject } from "../../utils/maplibre-popup";
import { AccommodationInfo, AccommodationsService } from "../../data/noi/accommodations-service";

/**
 * (INTERNAL) render map popup
 */
@Component({
  tag: 'noi-map-layer-poi-accommodation-popup',
  styleUrl: 'map-layer-poi-accommodation-popup.css',
  shadow: false,
})
export class MapLayerPoiAccommodationPopupComponent implements StencilComponent {

  private languageService = LanguageDataService.getInstance();

  @State()
  private isLoading = false;

  @State()
  private accInfo?: AccommodationInfo | null;

  @State()
  private featureName?: string;

  private featureId?: string;

  private poiAccomodationService = AccommodationsService.getInstance();


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

    this._sub = this.poiAccomodationService.getPoiById$(this.featureId).subscribe(poi => {
      this.accInfo = poi;
      this.isLoading = false;
    });
  }

  render() {
    let poiContent = '';
    let pointName = this.featureName;

    if (!this.isLoading && this.accInfo) {
      poiContent = this.renderInfo(this.accInfo);
      pointName = this.languageService.translateObjectDeep(this.accInfo.AccoDetail, 'Name')
        || this.accInfo.Shortname
        || this.featureName;
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
          (!this.accInfo || !poiContent)
            ? (<div class="popup__description">
              {this.languageService.translate('map.layer.util.no-details')}
            </div>)
            : (<div innerHTML={poiContent}></div>)
        )}

        {/* hotfix: link component */}
        <div style={{ display: 'none' }}><noi-stars></noi-stars></div>
      </div>
    );

  }

  renderInfo(accInfo: AccommodationInfo) {

    const phoneMobile = this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Mobile');
    const phoneBasic = this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Phone');
    const email = this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Email');

    const stars = accInfo.AccoCategoryId ? parseInt(accInfo.AccoCategoryId) : null;

    const previewImages = accInfo.ImageGallery || [];

    const structure: PopupDefinitionObject = {
      body: [
        // {
        //   type: 'name',
        //   text: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Name')
        //     || accInfo.Shortname
        //     || this.featureName,
        // },
        stars ? {
          type: 'html',
          cssClass: 'popup__description',
          html: `<noi-stars stars="${stars}" title="${accInfo.AccoCategoryId}"></noi-stars>`,
        } : null,
        {
          type: 'description',
          text: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Street')
        },
        {
          type: 'description',
          text: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Longdesc')
            || this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Shortdesc')
        },
        {type: 'description', text: accInfo.AccoTypeId},


        (previewImages.length > 0) ? {
          type: 'html',
          cssClass: 'popup__images',
          html: previewImages.map(img => `
            <img height="96" src="${img.ImageUrl}" alt="${this.languageService.translateObject(img.ImageDesc)}" />
        `).join(''),
        } : null,

        phoneMobile ? {
          type: 'link',
          link: 'tel:' + phoneMobile,
          linkName: phoneMobile,
        } : null,

        phoneBasic ? {
          type: 'link',
          link: 'tel:' + phoneBasic,
          linkName: phoneBasic,
        } : null,

        email ? {
          type: 'link',
          link: 'mailto:' + email,
          linkName: email,
        } : null,
        {type: 'link', link: this.languageService.translateObjectDeep(accInfo.AccoDetail, 'Website')},
      ],
    };
    return popupBuilderContent(structure);
  }

}

