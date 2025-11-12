import { NextApiRequest, NextApiResponse } from "next";

// Simple in-memory cache (for production, consider Redis)
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
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
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json(cached.data);
  }

  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
    const response = await fetch(`${apiUrl}/api/v4/reports/by-seq?seq=${seq}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch report",
        details: `API returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

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
