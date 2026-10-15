/** Public browser intake. Keep the payload unchanged when retrying a draft. */
export const MAX_REPORT_TEXT_BYTES = 8192;
export const MAX_REPORT_IMAGE_BYTES = 1024 * 1024;

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_IMAGE_PIXELS = 50_000_000;
const MAX_IMAGE_DIMENSION = 2048;
const SESSION_KEY = "cleanapp_web_report_session_id";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
let memorySessionId: string | undefined;

export type WebReportPayload = {
  version: "1.0";
  channel: "web";
  source_id: string;
  session_id: string;
  annotation: string;
  image?: string;
};

export type WebReportStatus =
  | "received"
  | "accepted"
  | "published"
  | "shadowed"
  | "quarantined"
  | "duplicate";

export type WebReportReceipt = {
  receipt_id: string;
  status: WebReportStatus;
  processing_status?: string;
  publication_status?: string;
  canonical_path?: string;
  public_id?: string;
};

const RECEIPT_STATUSES: ReadonlySet<string> = new Set([
  "received", "accepted", "published", "shadowed", "quarantined", "duplicate",
]);
const FAILED_STATUSES = new Set(["failed", "rejected", "error"]);

function createUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // These identifiers carry no access rights. Older browsers can still report.
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sessionId(): string {
  if (memorySessionId) return memorySessionId;
  if (typeof window !== "undefined") {
    try {
      const existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing && UUID.test(existing)) {
        memorySessionId = existing;
        return existing;
      }
    } catch {
      // Private browsing and storage restrictions must not block reporting.
    }
  }
  memorySessionId = createUuid();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(SESSION_KEY, memorySessionId);
    } catch {
      // Reuse the in-memory session for this page when storage is unavailable.
    }
  }
  return memorySessionId;
}

export function reportApiBase(): string {
  const base = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
  return `${base.replace(/\/+$/, "")}/api/v1/human-reports`;
}

export function validateReportDraft(text: string, hasImage: boolean): string | null {
  const annotation = text.trim();
  if (!annotation && !hasImage) return "Describe the problem or add a photo or screenshot.";
  if (new TextEncoder().encode(annotation).byteLength > MAX_REPORT_TEXT_BYTES) {
    return "That description is too long. Shorten it and try again.";
  }
  return null;
}

/** Create once per draft/attempt; retries reuse source_id and payload bytes. */
export function newWebReportPayload(annotation: string, image?: string): WebReportPayload {
  const error = validateReportDraft(annotation, Boolean(image));
  if (error) throw new Error(error);
  return {
    version: "1.0",
    channel: "web",
    source_id: `web_${createUuid()}`,
    session_id: sessionId(),
    annotation: annotation.trim(),
    ...(image ? { image } : {}),
  };
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Some browsers support more formats in <img> than createImageBitmap.
    }
  }
  if (typeof Image === "undefined") throw new Error("Image uploads need a supported browser.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("We couldn't open that image. Try a JPEG, PNG or WebP file."));
      img.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/jpeg") {
        reject(new Error("We couldn't prepare that image. Try a different photo or screenshot."));
      } else {
        resolve(blob);
      }
    }, "image/jpeg", quality);
  });
}

function imageDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.startsWith("data:image/jpeg;base64,")) {
        resolve(reader.result.slice("data:image/jpeg;base64,".length));
      } else {
        reject(new Error("We couldn't prepare that image. Try a different photo or screenshot."));
      }
    };
    reader.onerror = () => reject(new Error("We couldn't read that image. Try selecting it again."));
    reader.onabort = () => reject(new Error("Image preparation was interrupted. Try selecting it again."));
    reader.readAsDataURL(blob);
  });
}

/** Re-encode pixels, discarding source metadata; the original file is never sent. */
export async function prepareReportImage(file: File): Promise<string> {
  if (!file.size) throw new Error("That image is empty. Choose another photo or screenshot.");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("Choose an image smaller than 20 MB.");
  const knownExtension = /\.(jpe?g|png|webp|avif|gif|heic|heif|bmp)$/i.test(file.name);
  if ((!file.type.startsWith("image/") && !(file.type === "" && knownExtension)) || file.type === "image/svg+xml") {
    throw new Error("Choose a photo or screenshot, such as a JPEG, PNG or WebP image.");
  }

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    throw new Error("We couldn't open that image. Try a JPEG, PNG or WebP file.");
  }
  let canvas: HTMLCanvasElement | undefined;
  try {
    const { width, height } = decoded;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error("We couldn't read that image's dimensions. Choose another image.");
    }
    if (width * height > MAX_SOURCE_IMAGE_PIXELS) {
      throw new Error("Choose an image smaller than 50 megapixels.");
    }
    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("We couldn't prepare that image. Try another browser.");
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    for (let sizeAttempt = 0; sizeAttempt < 5; sizeAttempt++) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.76, 0.64, 0.52, 0.4]) {
        const blob = await canvasJpeg(canvas, quality);
        if (blob.size > 0 && blob.size <= MAX_REPORT_IMAGE_BYTES) return await imageDataUrl(blob);
      }
      scale *= 0.7;
    }
    throw new Error("That image is still too large. Try a smaller photo or screenshot.");
  } catch (error) {
    if (error instanceof Error && /^(We couldn't |Choose an |That image |Image preparation )/.test(error.message)) throw error;
    throw new Error("We couldn't prepare that image. Try a different photo or screenshot.");
  } finally {
    decoded.release();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

function safeToken(value: unknown, maximum = 160): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && /^[a-zA-Z0-9_-]+$/.test(value);
}

/** A successful HTTP code is not a receipt. Preserve only recognized safe fields. */
export function readReportReceipt(data: unknown): WebReportReceipt | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (!safeToken(value.receipt_id) || typeof value.status !== "string" || !RECEIPT_STATUSES.has(value.status)) return null;
  for (const key of ["processing_status", "publication_status"] as const) {
    if (value[key] !== undefined && (!safeToken(value[key], 64) || FAILED_STATUSES.has(value[key].toLowerCase()))) return null;
  }
  return {
    receipt_id: value.receipt_id,
    status: value.status as WebReportStatus,
    ...(typeof value.processing_status === "string" ? { processing_status: value.processing_status } : {}),
    ...(typeof value.publication_status === "string" ? { publication_status: value.publication_status } : {}),
    ...(typeof value.canonical_path === "string" && /^\/(physical|digital)\/report\/[a-zA-Z0-9_-]+$/.test(value.canonical_path)
      ? { canonical_path: value.canonical_path }
      : {}),
    ...(safeToken(value.public_id) ? { public_id: value.public_id } : {}),
  };
}

export function submissionError(status: number): string {
  if (status === 429) return "Too many reports right now. Wait a moment and try again.";
  if (status === 413) return "That image is too large. Choose a smaller image and try again.";
  if (status === 400 || status === 422) return "Check your report text and image, then try again.";
  if (status === 401 || status === 403) return "Reporting is unavailable right now. Please try again later.";
  if (status === 408 || status === 504) return "The connection timed out. Try sending again.";
  if (status === 0) return "Check your connection, then try sending again.";
  return "We couldn't send your report. Please try again.";
}

/** Existing optional analytics sinks; never include report content or identifiers. */
export function trackReportEvent(event: string, surface: "widget" | "page", status?: string | number): void {
  if (typeof window === "undefined" || !/^[a-z][a-z0-9_]{0,63}$/.test(event)) return;
  if (surface !== "widget" && surface !== "page") return;
  const payload: { surface: "widget" | "page"; status?: string | number } = { surface };
  if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
    payload.status = status;
  } else if (typeof status === "string" && (RECEIPT_STATUSES.has(status) || ["success", "error", "network_error", "validation_error"].includes(status))) {
    payload.status = status;
  }
  const details = { event, ...payload };
  const analyticsWindow = window as typeof window & {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  };
  try {
    if (Array.isArray(analyticsWindow.dataLayer)) analyticsWindow.dataLayer.push(details);
  } catch { /* Analytics must never interrupt reporting. */ }
  try {
    if (typeof analyticsWindow.gtag === "function") analyticsWindow.gtag("event", event, payload);
  } catch { /* Analytics must never interrupt reporting. */ }
  try {
    window.dispatchEvent(new CustomEvent("cleanapp:report", { detail: details }));
  } catch { /* Optional event listeners must never interrupt reporting. */ }
}
