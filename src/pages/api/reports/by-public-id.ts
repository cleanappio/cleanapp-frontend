import { NextApiRequest, NextApiResponse } from "next";

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
    `${apiUrl}/api/v3/reports/by-public-id?${query}`,
    `${apiUrl}/api/v4/reports/by-public-id?${query}`,
  ];

  for (let i = 0; i < endpoints.length; i += 1) {
    const response = await fetch(endpoints[i], {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const bodyText = await response.text();
    if (response.ok || i > 0 || (response.status !== 404 && response.status !== 405)) {
      return { response, bodyText };
    }
  }
  throw new Error("No backend endpoints configured");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Visibility and evidence can change; every request needs a fresh backend read.
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { public_id } = req.query;
  if (!public_id || typeof public_id !== "string") {
    return res.status(400).json({ error: "Missing public_id parameter" });
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
    const { response, bodyText } = await fetchReportByPublicId(apiUrl, public_id);
    if (!response.ok) {
      let payload: unknown = bodyText;
      if ((response.headers.get("content-type") || "").includes("application/json") && bodyText) {
        try { payload = JSON.parse(bodyText); } catch { payload = bodyText; }
      }
      return res.status(response.status).json({
        ...(payload && typeof payload === "object"
          ? payload as Record<string, unknown>
          : { error: response.status === 404 ? "Report not found" : "Internal server error" }),
        details: `API returned ${response.status}`,
      });
    }
    const data = bodyText ? JSON.parse(bodyText) : null;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
