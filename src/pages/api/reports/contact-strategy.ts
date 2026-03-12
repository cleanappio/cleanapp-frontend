import { NextApiRequest, NextApiResponse } from "next";
import { cache, inFlightRequests, CACHE_TTL } from "@/lib/report-cache";

async function fetchContactStrategy(
  apiUrl: string,
  query: string,
): Promise<Response> {
  return fetch(`${apiUrl}/api/v3/reports/contact-strategy/${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const publicId =
    typeof req.query.public_id === "string" ? req.query.public_id.trim() : "";
  const seq = typeof req.query.seq === "string" ? req.query.seq.trim() : "";
  const refreshTargets =
    typeof req.query.refresh_targets === "string"
      ? req.query.refresh_targets.trim()
      : "";

  if (!publicId && !seq) {
    return res.status(400).json({ error: "Missing public_id or seq parameter" });
  }

  const query = publicId
    ? `by-public-id?public_id=${encodeURIComponent(publicId)}${refreshTargets ? `&refresh_targets=${encodeURIComponent(refreshTargets)}` : ""}`
    : `by-seq?seq=${encodeURIComponent(seq)}${refreshTargets ? `&refresh_targets=${encodeURIComponent(refreshTargets)}` : ""}`;

  const cacheKey = `report-contact-${publicId || seq}`;
  const bypassCache = refreshTargets === "1";
  if (!bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      cached.lastAccess = Date.now();
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=600, stale-while-revalidate=3600",
      );
      return res.status(200).json(cached.data);
    }

    const existingRequest = inFlightRequests.get(cacheKey);
    if (existingRequest) {
      try {
        const data = await existingRequest;
        return res.status(200).json(data);
      } catch {
        inFlightRequests.delete(cacheKey);
      }
    }
  }

  const fetchPromise = (async () => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
      const response = await fetchContactStrategy(apiUrl, query);
      const bodyText = await response.text();
      if (!response.ok) {
        let payload: unknown = bodyText;
        try {
          payload = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          payload = bodyText;
        }
        throw Object.assign(new Error(`API returned ${response.status}`), {
          status: response.status,
          payload,
        });
      }
      const data = bodyText ? JSON.parse(bodyText) : null;
      if (!bypassCache) {
        const now = Date.now();
        cache.set(cacheKey, { data, timestamp: now, lastAccess: now });
      }
      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (!bypassCache) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  try {
    const data = await fetchPromise;
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=3600",
    );
    return res.status(200).json(data);
  } catch (error) {
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
            error:
              status === 404 ? "Report contact strategy not found" : "Internal server error",
          }),
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
