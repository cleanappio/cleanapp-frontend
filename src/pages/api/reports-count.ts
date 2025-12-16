import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const env = process.env.NODE_ENV;
    let url = "";
    // if (env === "development") {
    //   url = "http://dev.api.cleanapp.io:8080/valid-reports-count";
    // } else if (env === "production") {
    //   url = "http://api.cleanapp.io:8080/valid-reports-count";
    // }

    url = process.env.NEXT_PUBLIC_REPORT_COUNT_URL || "http://localhost:8080";

    // Use AbortController for timeout (30 seconds to handle slow queries)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    return res.status(200).json(data);
  } catch (error) {
    console.error("Reports count API error:", error);
    return res.status(500).json({
      error: "Failed to fetch reports count",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
