import type { ReportKindFilter, ReportSignalSort } from "@/lib/report-evidence";
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPublicLatest(
  classification: "physical" | "digital",
  lang: string,
  n: number = 10,
  signal?: AbortSignal,
): Promise<PublicDiscoveryBatch> {
  return fetchJson<PublicDiscoveryBatch>(
    buildUrl("/api/v3/public/discovery/last", { classification, lang, n }),
    signal,
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

export type PublicEvidenceQuery = {
  kind?: ReportKindFilter;
  sort?: ReportSignalSort;
  offset?: number;
  product?: string;
};

export async function fetchPublicBrandReports(
  brandName: string,
  lang: string,
  n: number = 12,
  query: PublicEvidenceQuery = {},
): Promise<PublicDiscoveryBatch> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("Brand reports request timed out. Please retry."));
      controller.abort();
    }, 20_000);
  });
  try {
    // Race the full JSON promise so the deadline also covers a stalled body.
    return await Promise.race([
      fetchJson<PublicDiscoveryBatch>(
        buildUrl("/api/v3/public/discovery/by-brand", {
          brand_name: brandName,
          lang,
          n,
          ...query,
        }),
        controller.signal,
      ),
      deadline,
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPublicNearbyReports(
  latitude: number,
  longitude: number,
  lang: string,
  radiusKm: number = 0.5,
  n: number = 12,
): Promise<PublicDiscoveryBatch> {
  return fetchJson<PublicDiscoveryBatch>(
    buildUrl("/api/v3/public/discovery/by-latlng", {
      latitude,
      longitude,
      radius_km: radiusKm,
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

export function getPublicLiveSocketUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL ||
    process.env.NEXT_PUBLIC_LIVE_API_URL ||
    "https://live.cleanapp.io";
  return `${base.replace(/\/$/, "")}/api/v3/public/listen`;
}
