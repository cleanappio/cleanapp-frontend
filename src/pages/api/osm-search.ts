import type { NextApiRequest, NextApiResponse } from "next";
import type { Feature } from "geojson";
import {
  bboxToFeature,
  PlaceSearchResponse,
  PlaceSearchResult,
} from "@/lib/place-search";

const USER_AGENT = "CleanApp/1.0 (https://cleanapp.io)";
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  payload: PlaceSearchResponse;
};

const searchCache = new Map<string, CacheEntry>();

type NominatimResult = {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  category?: string;
  boundingbox?: [string, string, string, string];
  geojson?: Feature["geometry"];
};

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function readCached(query: string): PlaceSearchResponse | null {
  const cached = searchCache.get(query);
  if (!cached) {
    return null;
  }
  if (Date.now() > cached.expiresAt) {
    searchCache.delete(query);
    return null;
  }
  return cached.payload;
}

function writeCached(query: string, payload: PlaceSearchResponse) {
  searchCache.set(query, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    payload,
  });
}

function normalizeNameFromDisplayName(displayName: string): string {
  return displayName.split(",")[0]?.trim() || displayName;
}

function parseBoundingBox(
  raw?: [string, string, string, string]
): [number, number, number, number] | null {
  if (!raw || raw.length !== 4) {
    return null;
  }
  const south = Number(raw[0]);
  const north = Number(raw[1]);
  const west = Number(raw[2]);
  const east = Number(raw[3]);
  if ([south, north, west, east].some((v) => Number.isNaN(v))) {
    return null;
  }
  return [west, south, east, north];
}

function makePointBBox(
  lat: number,
  lng: number,
  meters = 120
): [number, number, number, number] {
  const latOffset = meters / 111_000;
  const lngOffset = meters / (111_000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  return [lng - lngOffset, lat - latOffset, lng + lngOffset, lat + latOffset];
}

function toFeature(
  geometry: Feature["geometry"] | undefined,
  fallbackBbox: [number, number, number, number],
  name: string
): Feature {
  if (geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon")) {
    return {
      type: "Feature",
      properties: { name },
      geometry,
    };
  }
  return bboxToFeature(fallbackBbox, name);
}

function fromNominatimResult(item: NominatimResult): PlaceSearchResult {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  const bbox = parseBoundingBox(item.boundingbox) || makePointBBox(lat, lng, 180);
  const name = item.name || normalizeNameFromDisplayName(item.display_name);
  return {
    id: `nominatim:${item.place_id}`,
    name,
    address: item.display_name,
    lat,
    lng,
    bbox,
    geometry: toFeature(item.geojson, bbox, name),
    result_type: "primary",
    category: item.category,
    subtype: item.type,
  };
}

function escapeRegexTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldFetchRelated(query: string, primary?: PlaceSearchResult): boolean {
  if (!primary) {
    return false;
  }
  if (/^[A-Z0-9 .-]{2,10}$/.test(query.trim())) {
    return true;
  }
  const haystack = `${primary.name} ${primary.address} ${primary.subtype || ""}`.toLowerCase();
  return /(university|college|school|hospital|medical|campus|station|terminal|museum|theatre|theater|center|centre)/.test(
    haystack
  );
}

function isInstitutionLike(primary: PlaceSearchResult): boolean {
  const haystack = `${primary.name} ${primary.address} ${primary.category || ""} ${primary.subtype || ""}`.toLowerCase();
  return /(university|college|school|campus|hospital|medical|clinic|extension|institute)/.test(
    haystack
  );
}

function relatedSearchRadiusMeters(primary: PlaceSearchResult): number {
  const [west, south, east, north] = primary.bbox;
  const latMeters = Math.abs(north - south) * 111_000;
  const lngMeters = Math.abs(east - west) * 111_000 * Math.cos((primary.lat * Math.PI) / 180);
  const span = Math.max(latMeters, lngMeters);
  return Math.max(1500, Math.min(Math.round(span * 1.8), 12000));
}

function buildRelatedRegex(query: string, primary: PlaceSearchResult): string {
  const terms = new Set<string>();
  const trimmed = query.trim();
  if (trimmed) {
    terms.add(trimmed);
  }
  if (primary.name) {
    terms.add(primary.name);
  }
  const acronym = primary.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  if (acronym.length >= 2 && acronym.length <= 8) {
    terms.add(acronym);
  }
  return Array.from(terms)
    .map(escapeRegexTerm)
    .join("|");
}

async function fetchNominatim(query: string): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "8",
    polygon_geojson: "1",
    addressdetails: "1",
    namedetails: "1",
    extratags: "1",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Nominatim search failed with status ${response.status}`);
  }
  const data = (await response.json()) as NominatimResult[];
  return data
    .filter((item) => item.lat && item.lon && item.display_name)
    .map(fromNominatimResult);
}

async function fetchRelatedPlaces(
  query: string,
  primary: PlaceSearchResult
): Promise<PlaceSearchResult[]> {
  if (!shouldFetchRelated(query, primary)) {
    return [];
  }

  if (isInstitutionLike(primary)) {
    return fetchRelatedInstitutionPlaces(query, primary);
  }

  const regex = buildRelatedRegex(query, primary);
  if (!regex) {
    return [];
  }

  const radius = relatedSearchRadiusMeters(primary);
  const overpass = `
[out:json][timeout:20];
(
  nwr["name"~"${regex}",i](around:${radius},${primary.lat},${primary.lng});
  nwr["operator"~"${regex}",i](around:${radius},${primary.lat},${primary.lng});
  nwr["brand"~"${regex}",i](around:${radius},${primary.lat},${primary.lng});
  nwr["network"~"${regex}",i](around:${radius},${primary.lat},${primary.lng});
);
out center tags;
`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": USER_AGENT,
    },
    body: overpass,
  });
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { elements?: OverpassElement[] };
  const seen = new Set<string>();

  return (data.elements || [])
    .map((element): PlaceSearchResult | null => {
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      const tags = element.tags || {};
      const name = tags.name || tags.operator || tags.brand || tags.network;
      if (!name || lat == null || lng == null) {
        return null;
      }

      const key = `${name.toLowerCase()}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      const bbox = makePointBBox(lat, lng, 140);
      const address = [name, tags["addr:street"], tags["addr:city"]]
        .filter(Boolean)
        .join(", ");

      return {
        id: `overpass:${element.type}:${element.id}`,
        name,
        address: address || primary.address,
        lat,
        lng,
        bbox,
        geometry: bboxToFeature(bbox, name),
        result_type: "related",
        category: tags.amenity || tags.office || tags.tourism || tags.railway || tags.aeroway,
        subtype: element.type,
      };
    })
    .filter((item): item is PlaceSearchResult => item !== null)
    .slice(0, 6);
}

function relatedInstitutionQueries(
  query: string,
  primary: PlaceSearchResult
): string[] {
  const baseTerms = new Set<string>();
  const trimmed = query.trim();
  if (trimmed) {
    baseTerms.add(trimmed);
  }
  if (primary.name) {
    baseTerms.add(primary.name);
  }

  const nameTerms = primary.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  if (nameTerms.length >= 2 && nameTerms.length <= 8) {
    baseTerms.add(nameTerms);
  }

  const suffixes = [
    "Medical Center",
    "Hospital",
    "Extension",
    "Clinic",
    "Campus",
  ];

  const out: string[] = [];
  for (const base of baseTerms) {
    for (const suffix of suffixes) {
      out.push(`${base} ${suffix}`);
    }
  }
  return Array.from(new Set(out)).slice(0, 8);
}

async function fetchRelatedInstitutionPlaces(
  query: string,
  primary: PlaceSearchResult
): Promise<PlaceSearchResult[]> {
  const searches = relatedInstitutionQueries(query, primary);
  if (searches.length === 0) {
    return [];
  }

  const relatedResults = await Promise.all(
    searches.map(async (searchTerm) => {
      try {
        const items = await fetchNominatim(searchTerm);
        return items;
      } catch {
        return [];
      }
    })
  );

  const [west, south, east, north] = primary.bbox;
  const margin = 0.2;
  const expanded = [
    west - (east - west) * margin,
    south - (north - south) * margin,
    east + (east - west) * margin,
    north + (north - south) * margin,
  ] as [number, number, number, number];

  return dedupePlaces(
    relatedResults
      .flat()
      .filter((item) => item.id !== primary.id)
      .filter((item) => {
        const [lng, lat] = [item.lng, item.lat];
        return (
          lng >= expanded[0] &&
          lng <= expanded[2] &&
          lat >= expanded[1] &&
          lat <= expanded[3]
        );
      })
      .map((item) => ({
        ...item,
        result_type: "related" as const,
      }))
  ).slice(0, 6);
}

function dedupePlaces(places: PlaceSearchResult[]): PlaceSearchResult[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.lat.toFixed(5)}|${place.lng.toFixed(5)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlaceSearchResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = String(req.query.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing required parameter: query" });
  }

  const cacheKey = query.toLowerCase();
  const cached = readCached(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const primaryPlaces = await fetchNominatim(query);
    const relatedPlaces =
      primaryPlaces.length > 0 ? await fetchRelatedPlaces(query, primaryPlaces[0]) : [];
    const places = dedupePlaces([...primaryPlaces, ...relatedPlaces]).slice(0, 10);
    const payload = {
      places,
      count: places.length,
    };
    writeCached(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("OSM search failed:", error);
    return res.status(500).json({ error: "Failed to search places" });
  }
}
