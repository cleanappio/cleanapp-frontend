import type { NextApiRequest, NextApiResponse } from "next";
import { normalizePreviewPath, PreviewMissing, PreviewUnavailable, resolveSocialPreview } from "@/lib/server/social-preview";
import { renderSocialImage } from "@/lib/server/social-image";
import { runThumbnailJob, ThumbnailBusy } from "@/lib/server/report-thumbnail";

// Only fixed artwork can be cached. Dynamic brand/report cards recheck visibility every request.
const fixedImages = new Map<string, Buffer>();
const MAX_CACHED_IMAGES = 32;
const MAX_IMAGE_BYTES = 512 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }
  const path = normalizePreviewPath(req.query.path);
  if (!path) return res.status(400).end();
  try {
    const { image, dynamic } = await runThumbnailJob(async () => {
      const preview = await resolveSocialPreview(path);
      const cacheKey = JSON.stringify(preview);
      let image = preview.dynamic ? undefined : fixedImages.get(cacheKey);
      if (!image) {
        image = await renderSocialImage(preview);
        if (image.byteLength > MAX_IMAGE_BYTES) throw new PreviewUnavailable();
        if (!preview.dynamic) {
          if (fixedImages.size >= MAX_CACHED_IMAGES) fixedImages.delete(fixedImages.keys().next().value!);
          fixedImages.set(cacheKey, image);
        }
      }
      return { image, dynamic: preview.dynamic === true };
    });
    if (!dynamic) res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", image.byteLength);
    return req.method === "HEAD" ? res.status(200).end() : res.status(200).send(image);
  } catch (error) {
    if (error instanceof PreviewMissing) return res.status(404).end();
    if (error instanceof ThumbnailBusy || error instanceof PreviewUnavailable) {
      res.setHeader("Retry-After", "60");
      return res.status(503).end();
    }
    // Do not log report text, private URLs or source payloads on rendering failure.
    res.setHeader("Retry-After", "60");
    return res.status(503).end();
  }
}
