import type { PublicDiscoveryCard } from "@/types/public-discovery";
import { brandLabel } from "@/lib/report-evidence";
import { isPublicSeoObject, publicSeoText } from "@/lib/public-seo-fetch";
import { explicitlyNonpublic, projectPublicEvidence, safePublicReportId } from "@/lib/public-report-projection";

const apiBase = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
export const PUBLIC_BRAND_PREVIEW_LIMIT = 6;
const PREVIEW_TIMEOUT_MS = 4000;

export type PublicBrandPreview = {
  brandName: string;
  brandDisplayName: string;
  items: PublicDiscoveryCard[];
};

function previewCard(value: unknown, brandName: string, display: string): PublicDiscoveryCard | null {
  if (!isPublicSeoObject(value) || explicitlyNonpublic(value) || !safePublicReportId(value.public_id)) return null;
  if (value.canonical_path !== `/digital/report/${value.public_id}` ||
    (value.classification !== undefined && value.classification !== "digital") ||
    !["firsthand", "coverage", "unknown"].includes(String(value.report_kind))) return null;
  const title = publicSeoText(value.title, 512);
  if (!title) return null;
  const evidence = projectPublicEvidence({
    report_kind: value.report_kind, intake_method: value.intake_method, intake_channel: value.intake_channel,
    source_url: value.source_url, source_platform: value.source_platform, source_published_at: value.source_published_at,
    excerpt: value.excerpt, observed_at: value.observed_at, ingested_at: value.ingested_at,
  });
  return {
    canonical_path: value.canonical_path, discovery_token: "",
    title, summary: publicSeoText(value.summary, 4000), classification: "digital",
    severity_level: 0, timestamp: "", brand_name: brandName, brand_display_name: display,
    ...(evidence ? { evidence } : {}), notification_count: { state: "unavailable" },
  };
}

function projectPreview(data: unknown, brandName: string): PublicBrandPreview {
  if (!isPublicSeoObject(data) || explicitlyNonpublic(data) || data.brand_found !== true ||
    data.classification !== "digital" || data.evidence_kind !== "all" ||
    typeof data.brand_name !== "string" || data.brand_name.trim().toLowerCase() !== brandName ||
    !Array.isArray(data.reports)) throw new Error("Invalid public brand preview");
  const display = brandLabel(brandName, publicSeoText(data.brand_display_name, 128) || brandName);
  const seen = new Set<string>();
  const items = data.reports.slice(0, PUBLIC_BRAND_PREVIEW_LIMIT)
    .map(value => previewCard(value, brandName, display))
    .filter((item): item is PublicDiscoveryCard => Boolean(item))
    .filter(item => {
      if (seen.has(item.canonical_path!)) return false;
      seen.add(item.canonical_path!);
      return true;
    });
  if (data.reports.length && !items.length) throw new Error("Invalid public brand preview reports");
  // A sample has no total, recurrence, or inferred inventory count.
  return { brandName, brandDisplayName: display, items };
}

function cancelledPreview(): Error {
  const error = new Error("Brand preview request cancelled");
  error.name = "AbortError";
  return error;
}

export async function fetchPublicBrandPreview(brand: string, locale: string, signal?: AbortSignal): Promise<PublicBrandPreview> {
  const brandName = brand.trim().toLowerCase();
  if (!brandName || brandName.length > 255 || /[\u0000-\u001f\u007f]/.test(brandName)) throw new Error("Invalid brand name");
  if (signal?.aborted) throw cancelledPreview();
  const query = new URLSearchParams({ brand_name: brandName, lang: locale, n: String(PUBLIC_BRAND_PREVIEW_LIMIT), evidence_kind: "all" });
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Brand preview request timed out. Please retry."));
      controller.abort();
    }, PREVIEW_TIMEOUT_MS);
    onAbort = () => { reject(cancelledPreview()); controller.abort(); };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(`${apiBase}/api/v3/public/discovery/brand-preview?${query}`, {
          headers: { Accept: "application/json" }, cache: "no-store", credentials: "omit", signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Brand preview unavailable: ${response.status}`);
        return projectPreview(await response.json() as unknown, brandName);
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}
