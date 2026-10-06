// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { LngLatBounds, Map, Subscription } from "maplibre-gl";


/**
 *
 */
export function listenLayerReady(
  map: Map,
  sourceId: string,
  cb: () => void,
  opt?: {
    continuous?: boolean
  },
): Subscription {
  const _loadEvent = map.on('sourcedata', (e) => {
    // console.debug('[sourcedata]', e);
    if (
      e.sourceId === sourceId
      && e.sourceDataType !== 'metadata'
      && map.isSourceLoaded(sourceId)
    ) {
      console.log(`🎉 Layer loaded: ${sourceId}`);
      if (!opt?.continuous) {
        _loadEvent.unsubscribe();
      }
      cb();
    }
  });
  return _loadEvent;
}

/**
 *
 */
export function enableHoverEffect(map: Map, hoverLayerId: string | string[], hoverFeatureState = 'hover') {

  const _subscriptions: Subscription[] = [];

  // Hover effects
  const hoverTargets: string[] = Array.isArray(hoverLayerId) ? hoverLayerId : [hoverLayerId];

  for (const layerName of hoverTargets) {
    _subscriptions.push(enableHoverEffectTargeted(map, {hoverOn: layerName, applyTo: layerName}, hoverFeatureState));
  }

  return {
    unsubscribe: () => {
      for (const subscription of _subscriptions) {
        subscription.unsubscribe();
      }
    },
  } as Subscription;
}


/**
 *
 */
export function enableHoverEffectTargeted(map: Map, opts: {
  hoverOn: string,
  applyTo: string
}, hoverFeatureState = 'hover') {

  const hoveredIds: { [layerName: string]: string | null } = {};
  const _subscriptions: Subscription[] = [];

  // Hover effects
  const hoverLayerId = opts.hoverOn;
  const targetLayerId = opts.applyTo;

  const srcLayerDef = map.getLayer(hoverLayerId);
  if (!srcLayerDef) {
    throw new Error('enableHoverEffect: layer not found:' + hoverLayerId);
    ///////
  }
  const targetLayerDef = map.getLayer(targetLayerId);
  if (!targetLayerDef) {
    throw new Error('enableHoverEffect: layer not found:' + targetLayerId);
    ///////
  }

  //
  const _layerEnter = map.on('mouseenter', hoverLayerId, (e) => {
    map.getCanvas().style.cursor = 'pointer';

    const featureId = e.features![0]?.id as string;
    // console.log('mouseenter', featureId, e);

    if (featureId == null) {
      // guard
      console.warn('enableHoverEffect: no featureId:' + e.features);
      return;
    }

    // Clear previous hover on this layer
    if (hoveredIds[hoverLayerId]) {
      map.setFeatureState(
        {source: targetLayerDef.source, sourceLayer: targetLayerDef.sourceLayer, id: hoveredIds[hoverLayerId]},
        {[hoverFeatureState]: false},
        // {hover: false},
      );
    }

    // Set new hover
    hoveredIds[hoverLayerId] = featureId;
    map.setFeatureState(
      {source: targetLayerDef.source, sourceLayer: targetLayerDef.sourceLayer, id: hoveredIds[hoverLayerId]},
      {[hoverFeatureState]: true},
    );
  });
  _subscriptions.push(_layerEnter);

  //
  const _layerLeave = map.on('mouseleave', hoverLayerId, () => {
    map.getCanvas().style.cursor = '';

    // Clear hover on this layer
    if (hoveredIds[hoverLayerId]) {
      map.setFeatureState(
        {source: targetLayerDef.source, sourceLayer: targetLayerDef.sourceLayer, id: hoveredIds[hoverLayerId]},
        {[hoverFeatureState]: false},
      );
      hoveredIds[hoverLayerId] = null;
    }
  });
  _subscriptions.push(_layerLeave);


  return {
    unsubscribe: () => {
      for (const subscription of _subscriptions) {
        subscription.unsubscribe();
      }
    },
  } as Subscription;
}

/**
 * Click-to-Zoom on Clusters
 */
export function clusterClickZoom(map: Map, clusterSourceId: string, clusterLayerId: string) {

  const _subscriptions: Subscription[] = [];

  const clickEvent = map.on('click', clusterLayerId, (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [clusterLayerId]
    });

    const clusterId = features[0].properties.cluster_id;
    const source = map.getSource(clusterSourceId) as maplibregl.GeoJSONSource;

    // Get the next zoom level where this cluster expands
    source.getClusterExpansionZoom(clusterId).then((zoom) => {
      const coordinates = (features[0].geometry as any).coordinates;
      map.easeTo({
        center: coordinates,
        zoom: zoom + 0.5 // Add a small buffer so points disperse comfortably
      });
    });
  });
  _subscriptions.push(clickEvent);

  // Change the pointer fingerprint over clusters
  _subscriptions.push(
    map.on('mouseenter', clusterLayerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    }),

    map.on('mouseleave', clusterLayerId, () => {
      map.getCanvas().style.cursor = '';
    }),
  );


  return {
    unsubscribe: () => {
      for (const subscription of _subscriptions) {
        subscription.unsubscribe();
      }
    },
  } as Subscription;
}

/**
 *
 */
export function mapCenterBySourceData(map: Map, sourceId: string) {

  // Get all features currently loaded in the source tiles
  const features = map.querySourceFeatures(sourceId);
  console.debug('[mapCenterBySourceData] got data:', features.length, features?.[0]);
  if (!features || features.length === 0) return;


  const bounds = new LngLatBounds();
  let hasCoordinates = false;

  // 2. Loop through whatever the source has (clusters OR points)
  for (const feature of features) {
    if (feature.geometry && feature.geometry.type === 'Point') {
      bounds.extend(feature.geometry.coordinates as [number, number]);
      hasCoordinates = true;
    }
  }

  // 3. Zoom the map to wrap around all visible cluster nodes/points
  if (hasCoordinates) {
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
      duration: 1200
    });
    return true;
  }
  return false;
}

/**
 */
export interface FontIconStyle {
  'icon-size': number; // in px
  'icon-color': string;
}


/**
 */
interface FontIconPaintParams {
  'icon-text': string;
  'icon-font': string;
  'icon-size': number;
  'icon-color': string;
}

/**
 */
export function getFontIconData(paint: FontIconPaintParams) {
  const iconSize = paint["icon-size"];
  // Layout target boundaries
  const scale = 1; // 4x multiplier ensures sharp sub-pixel anti-aliasing

  // Create an offscreen rendering surface
  const canvas = document.createElement('canvas');
  canvas.width = iconSize * scale;
  canvas.height = iconSize * scale;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // FORCE CRITICAL BROWSER ANTI-ALIASING ENGINE HINTS
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear background canvas space completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply scaling and text rendering layout details
    ctx.font = `${iconSize * scale}px "${paint["icon-font"]}"`;
    ctx.fillStyle = paint["icon-color"];  // '#FFFFFF'; // Target paint color
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Render the exact hex string character ('\ue0c8' = Material Pin Marker)
    ctx.fillText(paint["icon-text"], canvas.width / 2, canvas.height / 2);

    // 4. FIX: Safely extract ImageData from the canvas.
    // This bypasses type errors and ensures MapLibre gets pure pixel data.
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imageData as ImageData;
  } else {
    return null;
  }
}

/**
 *
 */
export async function loadFont(fontName: string, url: string) {

  // TypeScript's internal DOM type definitions have a historical gap regarding the FontFaceSet interface, so we use 'any'
  const documentFonts = document.fonts as any;

  // 1. Check if another instance of your icon component already registered this font
  const isAlreadyLoaded = Array.from(documentFonts.values()).some(
    (font: any) => font.family === fontName
  );

  if (isAlreadyLoaded) {
    console.debug(`[loadFont] - already loaded:`, fontName);
    return;
  }

  console.log(`[loadFont] loading font:`, fontName);

  // 2. Instantiate and load the font directly into memory
  const iconFontFace = new FontFace(fontName, url);

  const fontLoadResult = await iconFontFace.load();
  console.debug(`[loadFont] loaded:`, fontName, fontLoadResult);

  // Inject it into document.fonts so the entire page (and all shadow roots) can use it
  documentFonts.add(iconFontFace);
}


const _fontLoadingCache: { [url: string]: { load$: Promise<void>; fontName: string } } = {};

/**
 * this method is suitable for uncolored icons.
 * icon color can be set using style parameter
 */
export function registerFontImage(map: Map,
                                  imageName: string,
                                  fontUrl: string,
                                  iconCharacterCode: string,
                                  style: FontIconStyle,
): Promise<void> {

  // load font
  if (!_fontLoadingCache[fontUrl]) {
    const fontName = 'icon-font-' + Object.keys(_fontLoadingCache).length;
    _fontLoadingCache[fontUrl] = {
      load$: loadFont(fontName, fontUrl),
      fontName,
    };
  }
  const _fontCache = _fontLoadingCache[fontUrl];

  // register image
  return _fontCache.load$.then(() => {
    const imageData = getFontIconData({
      ...style,
      'icon-font': _fontCache.fontName,
      "icon-text": iconCharacterCode,
    });

    if (imageData) {
      // 3. Register the crisp canvas bitmap straight into MapLibre
      map.addImage(imageName, imageData as any, {
        sdf: false,
      });
    }
  });
}

/**
 * this method is suitable for colored icons.
 * If the icon color should be changed dynamically - font icons approach should be used.
 *
 *  // map.addImage(imageName, img, {sdf: true}); // < this technically can be used to make colored icons,
 *     but this approach makes icon with sharp edges.
 */
export function registerSvgImage(map: Map, imageName: string, svgString: string, opts?: {
  size?: number,
  sdf?: boolean,
}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create an HTML Image element entirely in memory
    const img = new Image();

    // Convert the SVG string safely to a Blob URL
    const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);

    if (typeof opts?.size === 'number') {
      img.height = opts.size;
      img.width = opts.size;
    }

    img.src = url;

    img.onload = () => {
      // 3. Add the loaded image into MapLibre's sprite registry
      map.addImage(imageName, img, {sdf: opts?.sdf || false});

      // Clean up the object URL to save system memory
      URL.revokeObjectURL(url);

      resolve();
    };

    img.onerror = reject;
  });
}


const _styleDataHash: { [styleUrl: string]: Promise<any> } = {};

export async function _loadStyle(map: Map, styleUrl: string, opts?: {
  prepend?: boolean;
  idPrefix?: string
}): Promise<void> {

  // this.map.setStyle(styleUrl); // < this replaces an entire map

  console.log('_loadStyle: ', styleUrl);
  if (!_styleDataHash[styleUrl]) {
    _styleDataHash[styleUrl] = fetch(styleUrl)
      .then(r => r.json());
  }
  const styleData = await _styleDataHash[styleUrl];

  if (styleData.sprite) {
    map.setSprite(styleData.sprite);
  }
  if (styleData.glyphs) {
    map.setGlyphs(styleData.glyphs);
  }

  if (styleData.sources) {
    for (const sourceName in styleData.sources) {
      map.addSource(sourceName, styleData.sources[sourceName]);
    }
  }
  if (styleData.layers) {
    const layers = map.getLayersOrder();
    for (const layer of styleData.layers) {
      if (opts?.prepend) {
        map.addLayer(layer, layers[0]);
      } else {
        map.addLayer(layer);
      }
    }
  }
}

export async function _unloadStyle(map: Map, styleUrl: string): Promise<void> {
  if (!_styleDataHash[styleUrl]) {
    console.error('_unloadStyle: style not loaded:', styleUrl);
    return;
  }
  const styleData = await _styleDataHash[styleUrl];

  if (styleData.layers) {
    for (const layer of styleData.layers) {
      map.removeLayer(layer.id);
    }
  }

  if (styleData.sources) {
    for (const sourceName in styleData.sources) {
      map.removeSource(sourceName);
    }
  }
  // no way to remove glypth, tricky for sprite
}


/**
 *
 * @param el
 */
export async function getParentMap(el: HTMLElement): Promise<Map> {
  // 1. Find the parent map element in the DOM tree
  const mapParent = el.closest('noi-map') as HTMLNoiMapElement;

  if (!mapParent) {
    console.error('must be a child of noi-map');
    throw new Error('must be a child of noi-map');
  }

  const map = await mapParent.getMapAsync();

  if (!map) {
    throw new Error('No map instance?');
  }

  return map;
}


/**
 * In MapLibre GL, feature-state has a strict historical requirement: unless configured otherwise, a feature's root-level id must be a number (an integer) or a string that can be cast to an integer.
 *
 * this helps to resolve it
 */
export function stringToNumericId(str: string | number): number {
  let hash = 5381;
  const strstr = str + '';
  for (let i = 0; i < strstr.length; i++) {
    hash = (hash * 33) ^ strstr.charCodeAt(i);
  }
  return hash >>> 0; // Ensures it is a positive integer
}
