/**
 * Physical report dots, loaded as map tiles.
 *
 * The map used to download every physical report in one request and keep them
 * all in memory, so it slowed down as reports were added. Now the renderer
 * serves vector tiles (`/api/v4/reports/tiles/{z}/{x}/{y}`): the map fetches
 * only the tiles in view and drops the ones it leaves, and each tile groups
 * its reports into a fixed grid, so memory no longer grows with the total.
 *
 * A tile feature is one grid cell with reports in it: `count` reports,
 * `severity` of the worst one, and `lat`/`lon` when it is a single report.
 * Zoomed out, a dot stands for all reports in its cell; zooming in splits it.
 *
 * Everything except the `apply*`/`reload*` functions is pure.
 */

import { getColorByValue } from "@/lib/util";
import { SPIRE_LABEL_LAYER } from "@/lib/map-spires";

export const REPORT_TILE_SOURCE = "physical-report-tiles";
export const REPORT_TILE_LAYER = "physical-report-pins";
/** Name of the layer inside each tile, set by the renderer. */
const TILE_LAYER_NAME = "reports";
/** Deepest zoom the renderer is asked for; beyond it the map reuses these tiles. */
const MAX_TILE_ZOOM = 16;
/** From this zoom a grouped dot covers under 40 m, so a click opens it. */
const OPEN_GROUP_ZOOM = 15;
/**
 * Wait before reloading tiles after a live report. Tiles may be cached for
 * 30 seconds; a later reload is sure to fetch ones that include the report.
 */
export const REPORT_TILE_REFRESH_MS = 35_000;

export function reportTileUrl(rendererUrl: string): string {
  return `${rendererUrl.replace(/\/$/, "")}/api/v4/reports/tiles/{z}/{x}/{y}`;
}

/** Same dot size by severity as before tiles, plus a little for grouped reports. */
const DOT_RADIUS = [
  "+",
  ["interpolate", ["linear"], ["get", "severity"], 0, 4.6, 0.9, 9.2],
  ["min", 6, ["*", 1.6, ["ln", ["max", 1, ["get", "count"]]]]],
];

type TileMap = {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): unknown;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, before?: string): unknown;
  setLayoutProperty(layer: string, name: string, value: unknown): unknown;
};

/**
 * Create the tile source and dot layer if missing, and show or hide the dots.
 * Safe to call repeatedly; it never throws into the caller's render path.
 */
export function applyReportTiles(map: TileMap, rendererUrl: string, visible: boolean): void {
  try {
    if (!map.getSource(REPORT_TILE_SOURCE)) {
      map.addSource(REPORT_TILE_SOURCE, {
        type: "vector",
        tiles: [reportTileUrl(rendererUrl)],
        minzoom: 0,
        maxzoom: MAX_TILE_ZOOM,
      });
    }
    if (!map.getLayer(REPORT_TILE_LAYER)) {
      map.addLayer(
        {
          id: REPORT_TILE_LAYER,
          type: "circle",
          source: REPORT_TILE_SOURCE,
          "source-layer": TILE_LAYER_NAME,
          paint: {
            "circle-radius": DOT_RADIUS,
            "circle-color": [
              "interpolate", ["linear"], ["get", "severity"],
              0.0, getColorByValue(0.0),
              0.5, getColorByValue(0.5),
              0.9, getColorByValue(0.9),
            ],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        },
        // Hotspot labels must stay readable above the dots.
        map.getLayer(SPIRE_LABEL_LAYER) ? SPIRE_LABEL_LAYER : undefined,
      );
    }
    map.setLayoutProperty(REPORT_TILE_LAYER, "visibility", visible ? "visible" : "none");
  } catch (error) {
    console.warn("report tiles unavailable", error);
  }
}

/** Fetch the tiles in view again, to pick up reports added since they loaded. */
export function reloadReportTiles(map: { getSource(id: string): unknown } | null | undefined): void {
  try {
    (map?.getSource(REPORT_TILE_SOURCE) as { reload?: () => void } | undefined)?.reload?.();
  } catch (error) {
    console.warn("report tiles reload failed", error);
  }
}

export type ReportDotClick =
  | { action: "open"; latitude: number; longitude: number }
  | { action: "zoom"; center: [number, number]; zoom: number };

/**
 * What a click on a dot should do: open the report there, or, for a dot that
 * stands for several reports spread over a wide area, zoom in to split it.
 */
export function reportDotClick(
  feature: { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> | null } | undefined,
  zoom: number,
): ReportDotClick | null {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number") {
    return null;
  }
  const properties = feature?.properties || {};
  const count = Number(properties.count) || 1;
  if (count === 1) {
    // Tile coordinates are coarse when zoomed out; the exact position is in the properties.
    const latitude = Number(properties.lat);
    const longitude = Number(properties.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { action: "open", latitude, longitude }
      : { action: "open", latitude: coordinates[1], longitude: coordinates[0] };
  }
  if (zoom >= OPEN_GROUP_ZOOM) {
    return { action: "open", latitude: coordinates[1], longitude: coordinates[0] };
  }
  return { action: "zoom", center: [coordinates[0], coordinates[1]], zoom: Math.min(zoom + 3, MAX_TILE_ZOOM) };
}
