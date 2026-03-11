import { NextApiRequest, NextApiResponse } from "next";
import { cache, inFlightRequests, CACHE_TTL } from "@/lib/report-cache";

type BackendAttempt = {
  response: Response;
  bodyText: string;
};

async function fetchReportByPublicId(
  apiUrl: string,
  publicId: string
): Promise<BackendAttempt> {
  const query = `public_id=${encodeURIComponent(publicId)}`;
  const endpoints = [
    `${apiUrl}/api/v4/reports/by-public-id?${query}`,
    `${apiUrl}/api/v3/reports/by-public-id?${query}`,
  ];

  let lastAttempt: BackendAttempt | null = null;

  for (let i = 0; i < endpoints.length; i += 1) {
    const response = await fetch(endpoints[i], {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const bodyText = await response.text();
    const attempt = { response, bodyText };
    lastAttempt = attempt;

    if (response.ok) {
      return attempt;
    }

    const shouldTryLegacy =
      i === 0 && (response.status === 404 || response.status === 405);
    if (!shouldTryLegacy) {
      return attempt;
    }
  }

  if (!lastAttempt) {
    throw new Error("No backend endpoints configured");
  }

  return lastAttempt;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { public_id } = req.query;
  if (!public_id || typeof public_id !== "string") {
    return res.status(400).json({ error: "Missing public_id parameter" });
  }

  const cacheKey = `report-public-id-${public_id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cached.lastAccess = Date.now();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json(cached.data);
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    try {
      const data = await existingRequest;
      const freshCached = cache.get(cacheKey);
      if (freshCached) {
        freshCached.lastAccess = Date.now();
      }
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=86400"
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(200).json(data);
    } catch {
      inFlightRequests.delete(cacheKey);
    }
  }

  const fetchPromise = (async () => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
      const { response, bodyText } = await fetchReportByPublicId(
        apiUrl,
        public_id
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let payload: unknown = bodyText;
        if (contentType.includes("application/json") && bodyText) {
          try {
            payload = JSON.parse(bodyText);
          } catch {
            payload = bodyText;
          }
        }

        throw Object.assign(new Error(`API returned ${response.status}`), {
          status: response.status,
          payload,
        });
      }

      const data = bodyText ? JSON.parse(bodyText) : null;

      if (cache.size > 1000) {
        const entriesToRemove = Math.ceil(cache.size * 0.2);
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        for (let i = 0; i < entriesToRemove; i++) {
          const [key] = entries[i];
          cache.delete(key);
          inFlightRequests.delete(key);
        }
      }

      const now = Date.now();
      cache.set(cacheKey, { data, timestamp: now, lastAccess: now });
      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const data = await fetchPromise;
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching report by public id:", error);
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    return res.status(status).json({
      ...(typeof error === "object" &&
      error !== null &&
      "payload" in error &&
      error.payload &&
      typeof error.payload === "object"
        ? (error.payload as Record<string, unknown>)
        : {
            error: status === 404 ? "Report not found" : "Internal server error",
          }),
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
