import type { GetServerSideProps } from "next";
import type { PublicDiscoveryBatch, PublicDiscoveryCard } from "@/types/public-discovery";
import { brandLabel } from "@/lib/report-evidence";
import { fetchPublicSeoJson, isPublicSeoObject, publicSeoText, publicSeoUnavailable } from "@/lib/public-seo-fetch";
import { explicitlyNonpublic, projectPublicEvidence, safePublicReportId } from "@/lib/public-report-projection";

export type BrandSeoProps = {
  seo: { title: string; description: string; path: string; found: boolean; unavailable?: boolean };
  initialPreview: PublicDiscoveryBatch | null;
};
const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
const PREVIEW_LIMIT = 6;

function previewCard(value: unknown, brandName: string, display: string): PublicDiscoveryCard | null {
  if (!isPublicSeoObject(value) || explicitlyNonpublic(value) || !safePublicReportId(value.public_id)) return null;
  const match = typeof value.canonical_path === "string" ? value.canonical_path.match(/^\/(physical|digital)\/report\/(rpt_[A-Za-z0-9_-]{22})$/) : null;
  if (!match || match[2] !== value.public_id || value.report_kind !== "firsthand") return null;
  const title = publicSeoText(value.title, 512);
  if (!title) return null;
  const evidence = projectPublicEvidence({
    report_kind: value.report_kind, intake_method: value.intake_method, intake_channel: value.intake_channel,
    source_url: value.source_url, source_platform: value.source_platform, source_published_at: value.source_published_at,
    excerpt: value.excerpt, observed_at: value.observed_at, ingested_at: value.ingested_at,
  });
  return {
    canonical_path: value.canonical_path as string, discovery_token: "",
    title, summary: publicSeoText(value.summary, 4000), classification: match[1] as "physical" | "digital",
    severity_level: 0, timestamp: "", brand_name: brandName, brand_display_name: display,
    ...(evidence ? { evidence } : {}), notification_count: { state: "unavailable" },
  };
}

export const getBrandSeoProps: GetServerSideProps<BrandSeoProps> = async ({ params, res }) => {
  res.setHeader("Cache-Control", "no-store");
  const name = typeof params?.brand_name === "string" ? params.brand_name.trim() : "";
  if (!name || name.length > 128 || name === "." || name === ".." || /[\u0000-\u001f\u007f]/.test(name)) return { notFound: true };
  const fallback: BrandSeoProps = {
    seo: { title: "Brand reports temporarily unavailable | CleanApp", description: "Public brand reports are temporarily unavailable. Please try again shortly.", path: `/digital/${encodeURIComponent(name)}`, found: false, unavailable: true },
    initialPreview: null,
  };
  try {
    const query = new URLSearchParams({ brand_name: name, lang: "en", n: String(PREVIEW_LIMIT), evidence_kind: "firsthand" });
    const { status, data } = await fetchPublicSeoJson(`${LIVE_API}/api/v3/public/discovery/brand-preview?${query}`);
    if ([404, 410].includes(status)) return { notFound: true };
    if (status !== 200 || !isPublicSeoObject(data)) { publicSeoUnavailable(res); return { props: fallback }; }
    if (explicitlyNonpublic(data) || data.brand_found === false) return { notFound: true };
    if (data.brand_found !== true || data.classification !== "digital" || data.evidence_kind !== "firsthand" ||
      typeof data.brand_name !== "string" || data.brand_name.trim().toLowerCase() !== name.toLowerCase() || !Array.isArray(data.reports)) {
      publicSeoUnavailable(res); return { props: fallback };
    }
    const canonicalName = data.brand_name.trim();
    const display = brandLabel(canonicalName, publicSeoText(data.brand_display_name, 128) || canonicalName);
    const seen = new Set<string>();
    const items = data.reports.slice(0, PREVIEW_LIMIT).map(value => previewCard(value, canonicalName, display))
      .filter((item): item is PublicDiscoveryCard => Boolean(item))
      .filter(item => { if (seen.has(item.canonical_path!)) return false; seen.add(item.canonical_path!); return true; });
    if (data.reports.length > 0 && items.length === 0) { publicSeoUnavailable(res); return { props: fallback }; }
    return { props: {
      seo: { title: `${display} reports | CleanApp`, description: `Explore recent firsthand reports associated with ${display}, their original source context and clearly labeled AI summaries.`, path: `/digital/${encodeURIComponent(canonicalName)}`, found: true },
      initialPreview: { items, count: items.length, kind: "firsthand", sort: "recent", offset: 0, has_more: false, counts_exact: false },
    } };
  } catch {
    publicSeoUnavailable(res);
    return { props: fallback };
  }
};
