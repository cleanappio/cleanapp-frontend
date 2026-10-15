import type { NextApiRequest, NextApiResponse } from "next";
import { reportOrganizations } from "@/lib/report-contact-summary";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const publicId = typeof req.query.public_id === "string" ? req.query.public_id.trim() : "";
  const seq = typeof req.query.seq === "string" ? req.query.seq.trim() : "";
  if (!publicId && !/^[1-9]\d*$/.test(seq)) {
    return res.status(400).json({ error: "Missing public_id or seq parameter" });
  }
  const query = publicId
    ? `by-public-id?public_id=${encodeURIComponent(publicId)}`
    : `by-seq?seq=${encodeURIComponent(seq)}`;
  try {
    const apiUrl = process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
    const response = await fetch(`${apiUrl}/api/v3/reports/contact-strategy/${query}`, {
      cache: "no-store", signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" },
    });
    if (!response.ok) return res.status(response.status).json({ error: "Organizations unavailable" });
    const strategy = await response.json();
    // Public context shows organizations only; recipient history has its own subscription gate.
    return res.status(200).json({
      report_seq: strategy.report_seq,
      public_id: strategy.public_id,
      escalation_targets: reportOrganizations(strategy).map((organization) => ({ organization })),
      contact_observations: [],
      notify_plan: null,
      refreshed: false,
    });
  } catch {
    return res.status(503).json({ error: "Organizations unavailable" });
  }
}
