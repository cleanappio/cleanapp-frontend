import { brandLabel, evidenceDate } from "@/lib/report-evidence";
import type { PublicDiscoveryCard, ReportEvidence } from "@/types/public-discovery";

export function reportSourceLabel(evidence?: ReportEvidence): string | null {
  const platform = evidence?.source_platform?.trim();
  if (!platform || ["sensor", "unknown"].includes(platform.toLowerCase())) return null;
  return ({ bluesky: "Bluesky", github: "GitHub", x: "X", twitter: "X", reddit: "Reddit" }[platform.toLowerCase()] || platform);
}

export function brandReportDate(evidence?: ReportEvidence, locale = "en"): { label: string; value: string; formatted: string } | null {
  const candidates = [
    { label: "Observed", value: evidence?.observed_at },
    { label: "Published", value: evidence?.source_published_at },
    ...(evidence?.intake_method === "cleanapp_submission" ? [{ label: "Added", value: evidence.ingested_at }] : []),
  ];
  for (const { label, value } of candidates) {
    if (!value) continue;
    const formatted = evidenceDate(value, locale);
    if (formatted !== "Unknown") return { label, value, formatted };
  }
  return null;
}

export function rowProductLabel(item: PublicDiscoveryCard, pageBrand?: string): string | null {
  if (!item.brand_name) return null;
  const label = brandLabel(item.brand_name, item.brand_display_name);
  if (pageBrand && (item.brand_name.toLowerCase() === pageBrand.toLowerCase() || label.toLowerCase() === brandLabel(pageBrand).toLowerCase())) return null;
  return label;
}

/** Only generated summaries are shortened; original wording is always preserved. */
export function compactReportSummary(summary?: string, title?: string): string | null {
  const value = summary?.trim();
  if (!value || value === title?.trim()) return null;
  if (title && value.toLowerCase().startsWith(`${title.trim().toLowerCase()}:`)) {
    return value.slice(title.trim().length + 1).trim() || null;
  }
  return value;
}

/** Only fresh public report paths supplied by the public preview can be linked. */
export function publicReportHref(value: unknown): string | null {
  return typeof value === "string" && /^\/(physical|digital)\/report\/rpt_[A-Za-z0-9_-]{22}$/.test(value) ? value : null;
}
