/**
 * Spires on the globe: report counts as height.
 *
 * Dots show where reports are; they do not show how many. A spire is a slender
 * cone, tapering evenly from the ground to a point, whose height grows with the number of reports at that spot, so
 * hotspots stand out from the horizon.
 *
 * Only real hotspots get one (see `topHotspots`); everything else stays a dot.
 * A spire for every spot buried the hotspots it was meant to reveal.
 *
 * - Physical tab: report points are grouped into grid cells; the busiest cells
 *   get a column at the average position of their reports, in one blue that
 *   deepens with height. (Dots already use green-to-red for severity; a second
 *   traffic-light scale for count was unreadable.)
 * - Digital tab: the largest brands get a column at the brand's dot, in the
 *   brand's color, labelled with name and count.
 *
 * Rendering: a Mapbox `fill-extrusion` layer plus a label layer. Heights
 * shrink as you zoom in so a spire keeps roughly the same height on screen,
 * and both fade out before city zoom, where individual dots are the better
 * view.
 *
 * Shape history (2026-11-12): four stacked blocks looked like a wedding cake;
 * a 16-slice flared needle showed rings up close; a straight shaft with a
 * pointed cap read as an obelisk. Now: one even taper from base to tip.
 *
 * Everything except the `apply*` functions is pure, with no map or DOM access.
 */

export type SpireInput = { lon: number; lat: number; count: number; color?: string; name?: string };

const SIDES = 14;
/**
 * Silhouette as [fraction of radius, fraction of height] slices: an even
 * taper from the full width at the ground to a point at the top (a slender
 * cone, not an obelisk with a cap). Extrusions are straight-sided, so the
 * taper is 24 thin slices, each 1/24 narrower than the one below; at the
 * zooms where spires are shown the steps are well under a pixel.
 */
const SLICES = 24;
const PROFILE: readonly (readonly [number, number])[] = Array.from(
  { length: SLICES },
  (_, i) => [1 - i / SLICES, (i + 1) / SLICES] as const,
);
const KM_PER_DEGREE = 111.32;

export const SPIRE_SOURCE = "report-spires";
export const SPIRE_LAYER = "report-spires";
export const SPIRE_LABEL_SOURCE = "report-spire-labels";
export const SPIRE_LABEL_LAYER = "report-spire-labels";
/** Tallest spire, in meters, at whole-globe zoom (about a fifth of Earth's radius). */
export const MAX_HEIGHT_M = 1_300_000;
const MIN_HEIGHT_M = 45_000;
/** Zoom at which stored heights apply; above it they halve per zoom level. */
const BASE_ZOOM = 1.5;
const FADE_START_ZOOM = 4.8;
const FADE_END_ZOOM = 5.8;

/** One hue, pale to deep, by how tall the spire is relative to the tallest. */
export function heatColor(fraction: number): string {
  const pale = [120, 190, 255];
  const deep = [20, 84, 255];
  const t = Math.max(0, Math.min(1, fraction));
  const mix = (i: number) => Math.round(pale[i] + (deep[i] - pale[i]) * t);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

/** The `limit` largest inputs, largest first. Ties keep their original order. */
export function topHotspots(inputs: readonly SpireInput[], limit: number): SpireInput[] {
  return inputs
    .filter((input) => input.count > 0)
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(0, limit));
}

/**
 * Group points into `cellDegrees` grid cells. Each cell becomes one input at
 * the mean position of its points, so a spire stands on the actual cluster
 * rather than on a grid corner.
 */
export function binPoints(points: readonly { lon: number; lat: number }[], cellDegrees = 1): SpireInput[] {
  const cells = new Map<string, { lon: number; lat: number; count: number }>();
  for (const point of points) {
    if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat)) continue;
    if (Math.abs(point.lat) > 85 || Math.abs(point.lon) > 180) continue;
    // Reports saved without a location sit at exactly 0,0; they are not a hotspot.
    if (point.lat === 0 && point.lon === 0) continue;
    const key = `${Math.floor(point.lon / cellDegrees)}:${Math.floor(point.lat / cellDegrees)}`;
    const cell = cells.get(key);
    if (cell) {
      cell.lon += point.lon;
      cell.lat += point.lat;
      cell.count += 1;
    } else {
      cells.set(key, { lon: point.lon, lat: point.lat, count: 1 });
    }
  }
  return Array.from(cells.values(), (cell) => ({
    lon: cell.lon / cell.count,
    lat: cell.lat / cell.count,
    count: cell.count,
  }));
}

/**
 * Height in meters for `count` when the largest count is `max`. Logarithmic,
 * then sharpened, so 10 vs 1,000 vs 100,000 are all tellable apart and the
 * biggest hotspots clearly tower over the rest.
 */
export function spireHeight(count: number, max: number): number {
  if (!(count > 0) || !(max > 0)) return 0;
  const fraction = Math.log1p(count) / Math.log1p(Math.max(max, count));
  return MIN_HEIGHT_M + (MAX_HEIGHT_M - MIN_HEIGHT_M) * Math.pow(fraction, 2.2);
}

function ring(lon: number, lat: number, radiusKm: number): number[][] {
  const dLat = radiusKm / KM_PER_DEGREE;
  // Longitude degrees shrink toward the poles; keep the footprint round.
  const dLon = dLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const points: number[][] = [];
  for (let i = 0; i <= SIDES; i++) {
    const angle = (2 * Math.PI * (i % SIDES)) / SIDES;
    points.push([
      Math.round((lon + dLon * Math.cos(angle)) * 1e5) / 1e5,
      Math.round((lat + dLat * Math.sin(angle)) * 1e5) / 1e5,
    ]);
  }
  return points;
}

/**
 * GeoJSON polygons for each input: the slices of PROFILE.
 * Properties: `h` (meters at BASE_ZOOM), `color`, `count`.
 */
export function buildSpires(inputs: readonly SpireInput[], radiusKm: number): GeoJSON.FeatureCollection {
  const max = inputs.reduce((largest, input) => Math.max(largest, input.count), 0);
  const features: GeoJSON.Feature[] = [];
  for (const input of inputs) {
    if (!(input.count > 0) || !Number.isFinite(input.lon) || !Number.isFinite(input.lat) || Math.abs(input.lat) > 85) continue;
    const height = spireHeight(input.count, max);
    const color = input.color || heatColor((height - MIN_HEIGHT_M) / (MAX_HEIGHT_M - MIN_HEIGHT_M));
    for (const [radiusFraction, heightFraction] of PROFILE) {
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring(input.lon, input.lat, radiusKm * radiusFraction)] },
        properties: { h: Math.round(height * heightFraction), color, count: input.count },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

/** Label points for the same inputs: "Name · 68,046", or just the count. */
export function buildSpireLabels(inputs: readonly SpireInput[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: inputs
      .filter((input) => input.count > 0 && Number.isFinite(input.lon) && Number.isFinite(input.lat))
      .map((input): GeoJSON.Feature => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [input.lon, input.lat] },
        properties: {
          label: `${input.name ? `${input.name} · ` : ""}${input.count.toLocaleString("en")}`,
          count: input.count,
        },
      })),
  };
}

/** The slice of the Mapbox map that spires need; keeps this file free of a mapbox import. */
type SpireMap = {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): unknown;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, before?: string): unknown;
  setLayoutProperty(layer: string, name: string, value: unknown): unknown;
  setFilter(layer: string, filter: unknown): unknown;
};

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Create or update the spire and label layers. Pass an empty list to clear
 * them. Safe to call repeatedly; it never throws into the caller's render path.
 */
export function applySpires(map: SpireMap, inputs: readonly SpireInput[], radiusKm: number): void {
  try {
    const setData = (id: string, data: GeoJSON.FeatureCollection) => {
      const source = map.getSource(id) as { setData?: (next: unknown) => void } | undefined;
      if (source?.setData) source.setData(data);
      else map.addSource(id, { type: "geojson", data });
    };
    setData(SPIRE_SOURCE, inputs.length ? buildSpires(inputs, radiusKm) : EMPTY);
    setData(SPIRE_LABEL_SOURCE, inputs.length ? buildSpireLabels(inputs) : EMPTY);
    if (!map.getLayer(SPIRE_LAYER)) {
      map.addLayer({
        id: SPIRE_LAYER,
        type: "fill-extrusion",
        source: SPIRE_SOURCE,
        maxzoom: FADE_END_ZOOM,
        paint: {
          "fill-extrusion-color": ["get", "color"],
          // Halve the height per zoom level: constant height on screen.
          "fill-extrusion-height": [
            "interpolate", ["exponential", 2], ["zoom"],
            BASE_ZOOM, ["get", "h"],
            FADE_END_ZOOM, ["/", ["get", "h"], Math.pow(2, FADE_END_ZOOM - BASE_ZOOM)],
          ],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], FADE_START_ZOOM, 0.92, FADE_END_ZOOM, 0],
          "fill-extrusion-vertical-gradient": true,
          // Keep colors readable on the night side of the globe.
          "fill-extrusion-emissive-strength": 0.85,
        },
      });
    }
    if (!map.getLayer(SPIRE_LABEL_LAYER)) {
      map.addLayer({
        id: SPIRE_LABEL_LAYER,
        type: "symbol",
        source: SPIRE_LABEL_SOURCE,
        maxzoom: FADE_END_ZOOM,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-anchor": "top",
          "text-offset": [0, 0.7],
          // Bigger hotspots win when labels would collide.
          "symbol-sort-key": ["-", 0, ["get", "count"]],
        },
        paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0, 0, 0, 0.75)", "text-halo-width": 1.4 },
      });
    }
    const visibility = inputs.length ? "visible" : "none";
    map.setLayoutProperty(SPIRE_LAYER, "visibility", visibility);
    map.setLayoutProperty(SPIRE_LABEL_LAYER, "visibility", visibility);
  } catch (error) {
    console.warn("map spires unavailable", error);
  }
}

/**
 * Minimum report total for a brand's dot to show, by zoom. Roughly 53,000
 * brands exist; about 140 have 500+ reports, 390 have 200+, 1,900 have 50+.
 * Even the 1,900 carpet the globe, so the far view shows only the 500+ brands
 * and the long tail arrives as the visitor zooms in.
 */
export const DIGITAL_DOT_TIERS: readonly (readonly [number, number])[] = [
  [0, 500],
  [3.5, 200],
  [4.5, 50],
  [5.5, 3],
  [6.5, 0],
];

/**
 * Thin the digital dots by zoom (see DIGITAL_DOT_TIERS). Needs a numeric
 * `total` property on the digital features of the `digital-territories` and
 * `reports` sources. Brand-name labels
 * on every dot are held back until zoom 5; spire labels cover the far view.
 */
export function applyDigitalDeclutter(map: SpireMap): void {
  try {
    const minimumTotal = ["step", ["zoom"], DIGITAL_DOT_TIERS[0][1], ...DIGITAL_DOT_TIERS.slice(1).flat()];
    const byZoom = [">=", ["coalesce", ["get", "total"], 0], minimumTotal];
    for (const layer of ["digital-nodes", "digital-pulse"]) {
      if (map.getLayer(layer)) map.setFilter(layer, byZoom);
    }
    if (map.getLayer("digital-labels")) map.setFilter("digital-labels", ["all", [">=", ["zoom"], 5], byZoom]);
    // `report-pins` draws a dot per brand on the digital tab as well, and per
    // report on the physical tab; only the brand dots are thinned.
    if (map.getLayer("report-pins")) {
      map.setFilter("report-pins", ["any", ["!=", ["get", "classification"], "digital"], byZoom]);
    }
  } catch (error) {
    console.warn("digital declutter unavailable", error);
  }
}
