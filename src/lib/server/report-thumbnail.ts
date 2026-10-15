import sharp from "sharp";

export const MAX_THUMBNAIL_INPUT_BYTES = 6 * 1024 * 1024;
export const MAX_THUMBNAIL_OUTPUT_BYTES = 128 * 1024;
const MAX_THUMBNAIL_PIXELS = 16_000_000;

export class ThumbnailUnavailable extends Error {}
export class ThumbnailBusy extends ThumbnailUnavailable {}

let activeJobs = 0;
const waitingJobs: { start: () => void; fail: () => void }[] = [];

/** Bound decoder concurrency and the request queue independently of upstream limits. */
export async function runThumbnailJob<T>(task: () => Promise<T>): Promise<T> {
  if (activeJobs >= 4) {
    if (waitingJobs.length >= 24) throw new ThumbnailBusy();
    await new Promise<void>((resolve, reject) => {
      const waiter = {
        start: () => { clearTimeout(timer); resolve(); },
        fail: () => { reject(new ThumbnailBusy()); },
      };
      const timer = setTimeout(() => {
        const index = waitingJobs.indexOf(waiter);
        if (index >= 0) waitingJobs.splice(index, 1);
        waiter.fail();
      }, 5000);
      waitingJobs.push(waiter);
    });
  } else {
    activeJobs++;
  }
  try {
    return await task();
  } finally {
    const next = waitingJobs.shift();
    if (next) next.start(); // transfer the existing slot
    else activeJobs--;
  }
}

export function isDiscoveryThumbnailToken(token: string): boolean {
  return token.length <= 2048 && /^gdt_[A-Za-z0-9_-]{32,}$/.test(token);
}

/** Never buffer an unbounded upstream image or follow an upstream redirect. */
export async function readThumbnailBody(response: Response, maxBytes: number): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new ThumbnailUnavailable();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ThumbnailUnavailable();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ThumbnailUnavailable();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new ThumbnailUnavailable();
  return Buffer.concat(chunks, total);
}

function supportedRaster(bytes: Buffer): boolean {
  return (bytes[0] === 0xff && bytes[1] === 0xd8) ||
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")) ||
    (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
    bytes.subarray(0, 2).toString("ascii") === "BM";
}

export async function makeReportThumbnail(bytes: Buffer): Promise<Buffer> {
  // Do not let an SVG or other arbitrary document reach the image decoder.
  if (!supportedRaster(bytes)) throw new ThumbnailUnavailable();
  const image = await sharp(bytes, {
    limitInputPixels: MAX_THUMBNAIL_PIXELS,
    sequentialRead: true,
    failOn: "error",
  })
    .timeout({ seconds: 3 })
    .rotate()
    .resize({ width: 336, height: 252, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    // No metadata is copied into the thumbnail.
    .webp({ quality: 76, effort: 3 })
    .toBuffer();
  if (image.byteLength > MAX_THUMBNAIL_OUTPUT_BYTES) throw new ThumbnailUnavailable();
  return image;
}

export async function fetchReportThumbnail(
  token: string,
  apiBase: string,
  fetcher: typeof fetch = fetch,
): Promise<Buffer> {
  if (!isDiscoveryThumbnailToken(token)) throw new ThumbnailUnavailable();
  return runThumbnailJob(() => fetchThumbnailMedia(token, apiBase, fetcher));
}

async function retryPause(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new ThumbnailBusy();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new ThumbnailBusy()); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, milliseconds);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function fetchThumbnailMedia(token: string, apiBase: string, fetcher: typeof fetch): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const options = { cache: "no-store" as const, redirect: "error" as const, signal: controller.signal };
  try {
    const base = apiBase.replace(/\/$/, "");
    // The dedicated media route decrypts and validates report-only tokens and
    // rechecks current publication without consuming resolver/detail quotas.
    let original: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      original = await fetcher(`${base}/api/v3/public/report-media?token=${encodeURIComponent(token)}`, {
        ...options, headers: { Accept: "image/*" },
      });
      if (original.status !== 429 && original.status !== 503) break;
      await original.body?.cancel();
      if (attempt === 2) throw new ThumbnailBusy();
      await retryPause(750 * (attempt + 1), controller.signal);
    }
    if (!original) throw new ThumbnailUnavailable();
    if (!original.ok) throw new ThumbnailUnavailable();
    return await makeReportThumbnail(await readThumbnailBody(original, MAX_THUMBNAIL_INPUT_BYTES));
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
