import type { NextApiRequest, NextApiResponse } from "next";
import { publicNotificationSummary } from "@/lib/report-notifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Both the public preview and private history must reflect current access and sends.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const publicId = typeof req.query.public_id === "string" ? req.query.public_id.trim() : "";
  if (!publicId) return res.status(400).json({ error: "Missing public_id parameter" });
  const full = req.query.full === "1";
  const authorization = req.headers.authorization;
  if (full && (!authorization || !/^Bearer\s+\S+$/i.test(authorization))) {
    return res.status(401).json({ error: "Sign in required" });
  }
  try {
    const apiUrl = process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
    const response = await fetch(
      `${apiUrl}/api/v3/reports/notifications/${full ? "full/" : ""}by-public-id?public_id=${encodeURIComponent(publicId)}`,
      {
        method: "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", ...(full ? { Authorization: authorization! } : {}) },
      },
    );
    if (!response.ok) {
      return res.status(response.status).json({ error: response.status === 401
        ? "Sign in required" : response.status === 403 ? "Subscription required" : "Notification history unavailable" });
    }
    const data = await response.json();
    return res.status(200).json(full ? data : publicNotificationSummary(data));
  } catch {
    return res.status(503).json({ error: "Notification history unavailable" });
  }
}
