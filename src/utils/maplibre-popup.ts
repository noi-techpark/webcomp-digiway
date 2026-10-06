// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later


import { sanitizeText } from "./html";
import { Point } from "geojson";
import { LngLatLike, Map, MapGeoJSONFeature, Popup } from "maplibre-gl";

export type PopupDefinitionFn = ((feature: MapGeoJSONFeature, featureType: string) => Promise<PopupDefinition>);
export type PopupDefinition = PopupDefinitionObject | string | HTMLElement;

export interface PopupDefinitionObject {
  title?: {
    icon?: string;
    text?: string;
  },
  body: Array<{
    type: 'name' | 'description' | 'section' | 'link' | 'html';
    cssClass?: string;
    /**
     * 'text' is for types 'name' and 'description'.
     * null and undefined values are skipped
     */
    text?: string | null;

    /**
     * 'link' and 'linkName' is for type 'link' only.
     * null and undefined values are skipped
     */
    link?: string | null;
    linkName?: string | null;

    /**
     * 'html' is for type 'html only.
     */
    html?: string | null;

    // 'section' is for 'section'
    section?: PopupDefinitionObject_sectionData;
  } | null>;
}


export interface PopupDefinitionObject_sectionData {
  name: string;
  value: string | number | null | undefined;
}


/**
 */
export function popupBuilder(def: PopupDefinitionObject): string {
  return `<div class="noi-map-popup" part="popup">${popupBuilderContent(def)}</div>`;
}

export function popupBuilderContent(def: PopupDefinitionObject): string {

  let popupContent = '';

  // header
  if (def.title) {
    let popupTitleContent = '';
    if (def.title?.icon) {
      popupTitleContent += `<noi-icon class="popup__header-icon" name="${def.title.icon}" alt="icon"></noi-icon>`;
    }
    if (def.title?.text) {
      popupTitleContent += `<div>${def.title.text}</div>`;
    }
    popupContent += `<div class="popup__header">${popupTitleContent}</div>`;
  }

  // body
  for (const bDef of def.body) {
    if (!bDef) {
      continue;
    }
    if (bDef.type === 'name') {
      if (bDef.text) {
        popupContent += `<div class="popup__name ${bDef.cssClass || ''}">${bDef.text}</div>`;
      }
    }
    if (bDef.type === 'html') {
      if (bDef.html) {
        popupContent += `<div class="${bDef.cssClass || ''}">${bDef.html}</div>`;
      }
    }
    if (bDef.type === 'description') {
      if (bDef.text) {
        popupContent += `<div class="popup__description ${bDef.cssClass || ''}">${sanitizeText(bDef.text)}</div>`;
      }
      continue;
    }
    if (bDef.type === 'link') {
      if (bDef.link) {
        popupContent += `<div class="popup__link ${bDef.cssClass || ''}">
            <a href="${bDef.link}" target="_blank">${bDef.linkName || bDef.link}</a>
        </div>`;
      }
      continue;
    }
    if (bDef.type === 'section') {
      if (bDef.section?.value === null || bDef.section?.value === undefined) {
        continue;
      }
      popupContent += `<div class="popup__section ${bDef.cssClass || ''}">
          <div class="popup__section-name">${bDef.section.name}</div>
          <div class="popup__section-value">${bDef.section.value}</div>
        </div>`;
    }
  }

  //
  return popupContent;
}

// Feature popup helper
export function debugPopupStructure(feature: MapGeoJSONFeature, featureType?: string) {
  const props = feature.properties || {};
  let html = `<strong>Feature (${featureType || feature.sourceLayer || feature.source})</strong><br>`;
  html += `<strong>ID:</strong> ${feature.id}<br>`;
  html += `<hr/>`;

  if (feature?.geometry?.type) {
    html += `<strong>Type:</strong> ${feature.geometry.type}<br>`;
  }

  // Alle flachen Properties auÃŸer count & cluster
  Object.keys(props).forEach(key => {
    if (['count', 'cluster'].includes(key)) return;

    if (key === 'data' && props.data) {
      try {
        const data = JSON.parse(props.data);
        for (const k in data) {
          html += `<strong>${k}:</strong> ${data[k]}<br>`;
        }
      } catch (e) {
        html += `<strong>Data:</strong> ${props.data}<br>`;
      }
    } else {
      html += `<strong>${key}:</strong> ${props[key]}<br>`;
    }
  });

  return html;
}


let _prevPopup: Popup | undefined;

export function createDebugPopup(map: Map, feature: MapGeoJSONFeature) {

  _prevPopup?.remove();

  // create popup element
  const popupContent = debugPopupStructure(feature);

  // Wait for the browser layout engine to paint the content
  // await new Promise(resolve => requestAnimationFrame(resolve));

  // Append 'popupContent' to the DOM (Crucial: Stencil needs connection to initialize)
  const popup = new Popup()
    // .setLngLat(lngLat) // < on mouse click point
    .setLngLat((feature.geometry as Point).coordinates as LngLatLike) // < on feature center
    .setHTML(popupContent)
    .setMaxWidth('380px')
    .addTo(map);
  popup.on('close', () => {
    if (_prevPopup === popup) {
      _prevPopup = undefined;
    }
  });
  _prevPopup = popup;
  return popup;
}


// Feature popup helper
export function popupLoadingContent() {
  return `
    <div class="noi-map-popup" part="popup">
        <div class="popup__loading">
          <noi-spinner></noi-spinner>
        </div>
    </div>
`;
}
