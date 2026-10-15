import type { NextApiRequest, NextApiResponse } from "next";
import { readAcquisitionEvent } from "@/lib/acquisition";
import { storeAcquisition } from "@/lib/acquisition-store";

export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };
let tokens = 60;
let lastRefill = Date.now();
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") return res.status(405).end();
  if (req.headers.dnt === "1" || req.headers["sec-gpc"] === "1") return res.status(204).end();
  const origin = req.headers.origin;
  const allowed = new Set(["https://www.cleanapp.io", "https://cleanapp.io", "https://dev.cleanapp.io"]);
  if (process.env.NODE_ENV !== "production") allowed.add("http://localhost:3000");
  if (typeof origin !== "string" || !allowed.has(origin) || req.headers["sec-fetch-site"] === "cross-site") return res.status(403).end();
  if (!(req.headers["content-type"] || "").startsWith("application/json")) return res.status(415).end();
  const event = readAcquisitionEvent(req.body);
  if (!event) return res.status(400).end();
  const now = Date.now();
  tokens = Math.min(60, tokens + Math.max(0, now - lastRefill) * 0.003);
  lastRefill = now;
  if (tokens < 1) { res.setHeader("Retry-After", "1"); return res.status(429).end(); }
  tokens--;
  try {
    if (!await storeAcquisition(event)) return res.status(503).end();
    return res.status(204).end();
  } catch {
    // Never log the request or its metadata. Reporting itself is independent.
    return res.status(503).end();
  }
}
