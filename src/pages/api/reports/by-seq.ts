import { NextApiRequest, NextApiResponse } from "next";

// Simple in-memory cache (for production, consider Redis)
interface CacheEntry {
  data: any;
  timestamp: number; // Creation time for TTL validation
  lastAccess: number; // Last access time for LRU eviction
}

const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour in milliseconds

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { seq } = req.query;
  if (!seq || typeof seq !== "string") {
    return res.status(400).json({ error: "Missing seq parameter" });
  }

  const cacheKey = `report-seq-${seq}`;
  const cached = cache.get(cacheKey);

  // Check if cache is valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Update lastAccess timestamp for LRU eviction
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

  // Check if there's already an in-flight request for this key
  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    try {
      const data = await existingRequest;
      // Update lastAccess timestamp for LRU eviction
      const cached = cache.get(cacheKey);
      if (cached) {
        cached.lastAccess = Date.now();
      }
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=86400"
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(200).json(data);
    } catch (error) {
      // If the in-flight request failed, we'll fall through to make our own request
      inFlightRequests.delete(cacheKey);
    }
  }

  // Create a new fetch promise
  const fetchPromise = (async () => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
      const response = await fetch(
        `${apiUrl}/api/v4/reports/by-seq?seq=${seq}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Prevent cache from growing unbounded - LRU eviction
      if (cache.size > 1000) {
        // Remove oldest 20% of entries (200 entries when at 1000 limit)
        const entriesToRemove = Math.ceil(cache.size * 0.2);
        const entries = Array.from(cache.entries());
        // Sort by lastAccess timestamp (oldest first)
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        // Remove oldest entries
        for (let i = 0; i < entriesToRemove; i++) {
          const [key] = entries[i];
          cache.delete(key);
          // Also remove from inFlightRequests if present
          inFlightRequests.delete(key);
        }
      }

      // Store in cache
      const now = Date.now();
      cache.set(cacheKey, { data, timestamp: now, lastAccess: now });

      return data;
    } finally {
      // Always remove from in-flight requests when done
      inFlightRequests.delete(cacheKey);
    }
  })();

  // Store the promise so other concurrent requests can await it
  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const data = await fetchPromise;

    // Set HTTP cache headers
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
