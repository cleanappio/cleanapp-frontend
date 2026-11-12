/**
 * Spires on the globe: report counts as height.
 *
 * Dots show where reports are; they do not show how many. A spire is a tiered
 * tower (wide base, narrow mast, like a skyscraper silhouette) whose height
 * grows with the number of reports at that spot, so hotspots stand out from
 * the horizon.
 *
 * - Physical tab: report points are grouped into grid cells; one spire per
 *   cell, at the average position of its reports, colored green to red by count.
 * - Digital tab: one spire per brand at the brand's dot, in the brand's color,
 *   sized by its report total.
 *
 * Rendering: a Mapbox `fill-extrusion` layer. Heights shrink as you zoom in so
 * a spire keeps roughly the same height on screen, and the layer fades out at
 * city zoom, where individual dots are the better view.
 *
 * Everything except `applySpires` is a pure function with no map or DOM access.
 */

export type SpireInput = { lon: number; lat: number; count: number; color?: string };

/** Tower silhouette: [fraction of base radius, fraction of full height]. */
const TIERS: readonly (readonly [number, number])[] = [
  [1, 0.14],
  [0.62, 0.42],
  [0.34, 0.74],
  [0.13, 1],
];
const SIDES = 10;
const KM_PER_DEGREE = 111.32;

export const SPIRE_SOURCE = "report-spires";
export const SPIRE_LAYER = "report-spires";
/** Tallest spire, in meters, at whole-globe zoom (about a fifth of Earth's radius). */
export const MAX_HEIGHT_M = 1_300_000;
const MIN_HEIGHT_M = 45_000;
/** Zoom at which stored heights apply; above it they halve per zoom level. */
const BASE_ZOOM = 1.5;
const FADE_START_ZOOM = 6.2;
const FADE_END_ZOOM = 7.4;

/** Green to amber to red, by how tall the spire is relative to the tallest. */
export function heatColor(fraction: number): string {
  const stops: readonly (readonly [number, number, number])[] = [
    [52, 199, 123],
    [247, 197, 72],
    [240, 96, 60],
  ];
  const t = Math.max(0, Math.min(1, fraction)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const mix = (a: number, b: number) => Math.round(a + (b - a) * (t - i));
  return `rgb(${mix(stops[i][0], stops[i + 1][0])}, ${mix(stops[i][1], stops[i + 1][1])}, ${mix(stops[i][2], stops[i + 1][2])})`;
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
 * One GeoJSON polygon per tier per input. Properties: `h` (meters at
 * BASE_ZOOM), `color`, `count`. Tiers overlap from the ground up, which reads
 * as a stepped tower without needing base heights.
 */
export function buildSpires(inputs: readonly SpireInput[], baseRadiusKm: number): GeoJSON.FeatureCollection {
  const max = inputs.reduce((largest, input) => Math.max(largest, input.count), 0);
  const features: GeoJSON.Feature[] = [];
  for (const input of inputs) {
    if (!(input.count > 0) || !Number.isFinite(input.lon) || !Number.isFinite(input.lat) || Math.abs(input.lat) > 85) continue;
    const height = spireHeight(input.count, max);
    const color = input.color || heatColor((height - MIN_HEIGHT_M) / (MAX_HEIGHT_M - MIN_HEIGHT_M));
    // Bigger hotspots also get a slightly wider footing, so they read at a glance.
    const radius = baseRadiusKm * (0.7 + 0.6 * (height / MAX_HEIGHT_M));
    for (const [radiusFraction, heightFraction] of TIERS) {
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring(input.lon, input.lat, radius * radiusFraction)] },
        properties: { h: Math.round(height * heightFraction), color, count: input.count },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

/** The slice of the Mapbox map that spires need; keeps this file free of a mapbox import. */
type SpireMap = {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): unknown;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, before?: string): unknown;
  setLayoutProperty(layer: string, name: string, value: unknown): unknown;
};

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Create or update the spire layer. Pass an empty list to clear it. Safe to
 * call repeatedly; it never throws into the caller's render path.
 */
export function applySpires(map: SpireMap, inputs: readonly SpireInput[], baseRadiusKm: number): void {
  try {
    const data = inputs.length ? buildSpires(inputs, baseRadiusKm) : EMPTY;
    const source = map.getSource(SPIRE_SOURCE) as { setData?: (next: unknown) => void } | undefined;
    if (source?.setData) source.setData(data);
    else map.addSource(SPIRE_SOURCE, { type: "geojson", data });
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
    map.setLayoutProperty(SPIRE_LAYER, "visibility", inputs.length ? "visible" : "none");
  } catch (error) {
    console.warn("map spires unavailable", error);
  }
}
