import type { ReportAnalysis } from "@/components/GlobeView";
import type { ReportEvidence, ReportRecurrence } from "@/types/public-discovery";
import { safeOriginalSourceUrl } from "@/lib/report-evidence";
import { isPublicSeoObject, publicSeoText } from "@/lib/public-seo-fetch";

/** Allowlisted public view data. Never serialize a reader's complete upstream payload. */
export type PublicReportView = {
  report: { public_id: string; image?: string | null };
  analysis: ReportAnalysis[];
  evidence?: ReportEvidence;
  recurrence?: ReportRecurrence;
};

export function safePublicReportId(value: unknown): value is string {
  return typeof value === "string" && /^rpt_[A-Za-z0-9_-]{22}$/.test(value);
}

export function explicitlyNonpublic(value: unknown): boolean {
  return isPublicSeoObject(value) && (value.is_public === false ||
    (typeof value.visibility === "string" && value.visibility !== "public"));
}

function originalText(value: unknown, limit: number): string | null {
  // Preserve literal public wording, including newlines. Oversized malformed
  // fields are omitted instead of silently presenting a truncated quotation.
  return typeof value === "string" && value.length <= limit && value.trim() ? value : null;
}

function date(value: unknown): string | null {
  return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value)) ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function projectPublicEvidence(value: unknown): ReportEvidence | undefined {
  if (!isPublicSeoObject(value)) return undefined;
  const kind = value.report_kind === "firsthand" || value.report_kind === "coverage" ? value.report_kind : "unknown";
  const method = value.intake_method === "cleanapp_submission" || value.intake_method === "imported" ? value.intake_method : "unknown";
  const channel = ["mobile", "web", "share", "legacy_v2", "agent_api"].includes(String(value.intake_channel))
    ? value.intake_channel as ReportEvidence["intake_channel"] : null;
  const relation = ["affected", "dependency", "mentioned"].includes(String(value.entity_relationship))
    ? value.entity_relationship as ReportEvidence["entity_relationship"] : "unknown";
  const platform = typeof value.source_platform === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value.source_platform) ? value.source_platform : null;
  const status = (candidate: unknown) => typeof candidate === "string" && ["open", "closed", "resolved", "unresolved", "unknown"].includes(candidate) ? candidate : "unknown";
  return {
    report_kind: kind, intake_method: method, intake_channel: channel,
    intake_label: method === "cleanapp_submission" ? "CleanApp submission" : method === "imported" ? "Imported public report" : "Report",
    source_platform: platform,
    source_url: safeOriginalSourceUrl(typeof value.source_url === "string" && value.source_url.length <= 2048 ? value.source_url : null),
    source_published_at: date(value.source_published_at), observed_at: date(value.observed_at), ingested_at: date(value.ingested_at),
    excerpt: originalText(value.excerpt, 8192), reported_impact: originalText(value.reported_impact, 2000),
    classification_reason: originalText(value.classification_reason, 2000), entity_relationship: relation,
    validation_status: value.validation_status === "not_independently_reproduced" ? "not_independently_reproduced" : "unknown",
    upstream_status: status(value.upstream_status), resolution_status: status(value.resolution_status),
    why_surfaced: [], evidence_version: integer(value.evidence_version) ?? 0,
    has_original_media: value.has_original_media === true,
  };
}

function projectRecurrence(value: unknown): ReportRecurrence | undefined {
  if (!isPublicSeoObject(value)) return undefined;
  const count = integer(value.supporting_report_count);
  if (count === null) return undefined;
  return {
    supporting_report_count: count, source_account_count: integer(value.source_account_count),
    duplicate_import_count: integer(value.duplicate_import_count) ?? 0,
    independence: value.independence === "verified" ? "verified" : "unassessed",
    related_observation_count: integer(value.related_observation_count), counts_exact: value.counts_exact === true,
    ...(value.grouping === "related_issue_family" || value.grouping === "source_observation" ? { grouping: value.grouping } : {}),
    // Internal family/case IDs and auxiliary source payloads are not needed for
    // this initial public document. Existing interactive readers can load more.
  };
}

export function projectPublicReport(data: unknown, publicId: string, locale = "en"): PublicReportView | null {
  if (!isPublicSeoObject(data) || !isPublicSeoObject(data.report) ||
    data.report.public_id !== publicId || !safePublicReportId(publicId) ||
    explicitlyNonpublic(data) || explicitlyNonpublic(data.report)) return null;
  const rows = Array.isArray(data.analysis) ? data.analysis.filter(isPublicSeoObject) : [];
  const row = rows.find(item => item.language === locale) || rows.find(item => item.language === "en") || rows[0];
  if (!row || (row.classification !== "physical" && row.classification !== "digital")) return null;
  const title = publicSeoText(row.title, 512);
  if (!title) return null;
  const evidence = projectPublicEvidence(data.evidence);
  const recurrence = projectRecurrence(data.recurrence);
  const severity = typeof row.severity_level === "number" && Number.isFinite(row.severity_level) && row.severity_level >= 0 && row.severity_level <= 1 ? row.severity_level : 0;
  return {
    report: { public_id: publicId },
    analysis: [{
      title, summary: publicSeoText(row.summary, 4000) || publicSeoText(row.description, 4000),
      classification: row.classification, severity_level: severity,
      language: publicSeoText(row.language, 16) || "en",
      ...(publicSeoText(row.brand_name, 128) ? { brand_name: publicSeoText(row.brand_name, 128) } : {}),
      ...(publicSeoText(row.brand_display_name, 128) ? { brand_display_name: publicSeoText(row.brand_display_name, 128) } : {}),
    }],
    ...(evidence ? { evidence } : {}), ...(recurrence ? { recurrence } : {}),
  };
}
