import { NextApiRequest, NextApiResponse } from "next";
import { invalidateCacheEntry, invalidateCacheEntries } from "@/lib/report-cache";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { seq, seqs } = req.body;

    // Support both single seq and array of seqs
    if (seqs && Array.isArray(seqs)) {
      const count = invalidateCacheEntries(seqs);
      return res.status(200).json({
        success: true,
        message: `Invalidated ${count} cache entries`,
        invalidated: count,
      });
    } else if (seq !== undefined) {
      const deleted = invalidateCacheEntry(seq);
      return res.status(200).json({
        success: true,
        message: deleted
          ? `Cache entry for seq ${seq} invalidated`
          : `Cache entry for seq ${seq} not found`,
        invalidated: deleted,
      });
    } else {
      return res.status(400).json({
        error: "Missing 'seq' or 'seqs' parameter in request body",
      });
    }
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

