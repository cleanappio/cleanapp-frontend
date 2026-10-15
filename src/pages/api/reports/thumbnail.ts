import type { NextApiRequest, NextApiResponse } from "next";
import { fetchReportThumbnail, isDiscoveryThumbnailToken, ThumbnailBusy } from "@/lib/server/report-thumbnail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Recheck current publication on every request, including after a report is hidden.
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!isDiscoveryThumbnailToken(token)) return res.status(400).end();
  try {
    const apiBase = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
    const image = await fetchReportThumbnail(token, apiBase);
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Content-Length", image.byteLength);
    return res.status(200).send(image);
  } catch (error) {
    if (error instanceof ThumbnailBusy) {
      res.setHeader("Retry-After", "1");
      return res.status(503).end();
    }
    // Missing, private, expired or malformed media all disappear gracefully.
    return res.status(404).end();
  }
}
