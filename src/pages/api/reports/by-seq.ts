import type { NextApiRequest, NextApiResponse } from "next";

async function fetchReportBySeq(apiUrl: string, seq: string): Promise<Response> {
  const query = `seq=${encodeURIComponent(seq)}`;
  const endpoints = [
    `${apiUrl}/api/v3/reports/by-seq?${query}`,
    `${apiUrl}/api/v4/reports/by-seq?${query}`,
  ];
  for (let index = 0; index < endpoints.length; index += 1) {
    const response = await fetch(endpoints[index], {
      method: "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
    if (response.ok || index > 0 || (response.status !== 404 && response.status !== 405)) {
      return response;
    }
  }
  throw new Error("No backend endpoints configured");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Report visibility, recipient redaction and notification counts must be checked anew.
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const seq = typeof req.query.seq === "string" ? req.query.seq.trim() : "";
  if (!/^[1-9]\d*$/.test(seq)) return res.status(400).json({ error: "Invalid seq parameter" });
  try {
    const apiUrl = process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
    const response = await fetchReportBySeq(apiUrl, seq);
    if (!response.ok) {
      return res.status(response.status).json({
        error: response.status === 404 ? "Report not found" : "Report unavailable",
      });
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json(await response.json());
  } catch {
    return res.status(500).json({ error: "Report unavailable" });
  }
}
