import {
  PublicBrandSummary,
  PublicDiscoveryBatch,
  PublicDiscoveryResolveResponse,
  PublicPhysicalPoint,
} from "@/types/public-discovery";

const apiBase =
  process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${apiBase}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPublicLatest(
  classification: "physical" | "digital",
  lang: string,
  n: number = 10,
): Promise<PublicDiscoveryBatch> {
  return fetchJson<PublicDiscoveryBatch>(
    buildUrl("/api/v3/public/discovery/last", { classification, lang, n }),
  );
}

export async function searchPublicReports(
  q: string,
  classification: "physical" | "digital",
  lang: string,
  n: number = 12,
): Promise<PublicDiscoveryBatch> {
  return fetchJson<PublicDiscoveryBatch>(
    buildUrl("/api/v3/public/discovery/search", { q, classification, lang, n }),
  );
}

export async function fetchPublicBrandReports(
  brandName: string,
  lang: string,
  n: number = 12,
): Promise<PublicDiscoveryBatch> {
  return fetchJson<PublicDiscoveryBatch>(
    buildUrl("/api/v3/public/discovery/by-brand", {
      brand_name: brandName,
      lang,
      n,
    }),
  );
}

export async function fetchPublicDigitalBrandSummaries(
  lang: string,
): Promise<PublicBrandSummary[]> {
  return fetchJson<PublicBrandSummary[]>(
    buildUrl("/api/v3/public/discovery/brands/summary", {
      classification: "digital",
      lang,
    }),
  );
}

export async function fetchPublicPhysicalPoints(
  bbox: [number, number, number, number],
  zoom: number,
  limit: number = 4000,
): Promise<PublicPhysicalPoint[]> {
  return fetchJson<PublicPhysicalPoint[]>(
    buildUrl("/api/v3/public/discovery/physical-points", {
      bbox: bbox.join(","),
      zoom,
      limit,
    }),
  );
}

export async function resolvePublicDiscoveryToken(
  token: string,
): Promise<PublicDiscoveryResolveResponse> {
  return fetchJson<PublicDiscoveryResolveResponse>(
    buildUrl("/api/v3/public/resolve", { token }),
  );
}

export async function resolvePublicPhysicalPoint(
  latitude: number,
  longitude: number,
  radiusKm: number = 0.35,
): Promise<PublicDiscoveryResolveResponse> {
  return fetchJson<PublicDiscoveryResolveResponse>(
    buildUrl("/api/v3/public/resolve-physical-point", {
      latitude,
      longitude,
      radius_km: radiusKm,
    }),
  );
}
