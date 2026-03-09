import type { Feature, Geometry, Polygon, Position } from "geojson";

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  bbox: [number, number, number, number];
  geometry: Feature;
  result_type: "primary" | "related";
  category?: string;
  subtype?: string;
}

export interface PlaceSearchResponse {
  places: PlaceSearchResult[];
  count: number;
}

export function bboxToFeature(
  bbox: [number, number, number, number],
  name?: string
): Feature<Polygon> {
  const [west, south, east, north] = bbox;
  return {
    type: "Feature",
    properties: name ? { name } : {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    },
  };
}

function extendBounds(
  bounds: [number, number, number, number] | null,
  position: Position
): [number, number, number, number] {
  const [lon, lat] = position;
  if (bounds === null) {
    return [lon, lat, lon, lat];
  }
  return [
    Math.min(bounds[0], lon),
    Math.min(bounds[1], lat),
    Math.max(bounds[2], lon),
    Math.max(bounds[3], lat),
  ];
}

function walkGeometry(
  geometry: Geometry,
  bounds: [number, number, number, number] | null
): [number, number, number, number] | null {
  switch (geometry.type) {
    case "Point":
      return extendBounds(bounds, geometry.coordinates);
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates.reduce(extendBounds, bounds);
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.flat().reduce(extendBounds, bounds);
    case "MultiPolygon":
      return geometry.coordinates.flat(2).reduce(extendBounds, bounds);
    case "GeometryCollection":
      return geometry.geometries.reduce(
        (acc, item) => walkGeometry(item, acc),
        bounds
      );
    default:
      return bounds;
  }
}

export function computeFeatureBBox(
  feature?: Feature | null
): [number, number, number, number] | null {
  if (!feature?.geometry) {
    return null;
  }
  return walkGeometry(feature.geometry, null);
}
