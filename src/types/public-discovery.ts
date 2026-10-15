import type { ReportKindFilter, ReportSignalSort } from "@/lib/report-evidence";

export type ReportEvidence = {
  report_kind: "firsthand" | "coverage" | "unknown";
  intake_method: "cleanapp_submission" | "imported" | "unknown";
  intake_channel?: "mobile" | "web" | "share" | "legacy_v2" | "agent_api" | null;
  intake_label: string;
  source_platform: string | null;
  source_url: string | null;
  source_published_at: string | null;
  observed_at: string | null;
  ingested_at: string | null;
  excerpt: string | null;
  reported_impact: string | null;
  classification_reason: string | null;
  entity_relationship: "affected" | "dependency" | "mentioned" | "unknown";
  validation_status: string;
  upstream_status: string;
  resolution_status: string;
  why_surfaced: string[];
  evidence_version: number;
  has_original_media?: boolean;
};

export type ReportRecurrence = {
  issue_id: string;
  case_id: string | null;
  supporting_report_count: number;
  source_account_count: number | null;
  duplicate_import_count: number;
  independence: "unassessed" | "verified";
  related_observation_count: number | null;
  counts_exact: boolean;
  grouping?: "related_issue_family" | "source_observation";
  supporting_sources?: { title: string; source_url: string | null; report_kind: "firsthand" | "coverage" | "unknown"; source_published_at: string | null }[];
};

/** Recorded accepted email sends for this report, not its related report family. */
export type PublicNotificationCount =
  | { state: "sent"; email_count: number }
  | { state: "none_recorded"; email_count: 0 }
  | { state: "unavailable"; email_count?: never };

export type PublicDiscoveryCard = {
  discovery_token: string;
  title: string;
  summary: string;
  classification: "physical" | "digital";
  severity_level: number;
  timestamp: string;
  brand_name?: string;
  brand_display_name?: string;
  latitude?: number;
  longitude?: number;
  evidence?: ReportEvidence;
  recurrence?: ReportRecurrence;
  notification_count?: PublicNotificationCount;
};

export type PublicDiscoveryBatch = {
  items: PublicDiscoveryCard[];
  count: number;
  total_count?: number;
  high_priority_count?: number;
  medium_priority_count?: number;
  kind?: ReportKindFilter;
  sort?: ReportSignalSort;
  offset?: number;
  has_more?: boolean;
  kind_counts?: Record<ReportKindFilter, number>;
  counts_exact?: boolean;
  overview?: {
    total_reports: number;
    reports_last_30_days: number;
    reports_last_7_days: number;
    reports_previous_7_days: number;
    latest_report_at: string | null;
    as_of: string;
    classification: "digital";
    date_basis: "added_to_cleanapp";
  };
  scope?: {
    brand_name: string;
    product: string | null;
    includes_products: boolean;
    products: string[];
  };
};

export type PublicPhysicalPoint = {
  kind: "point" | "cluster";
  classification: "physical";
  marker_token?: string;
  latitude: number;
  longitude: number;
  severity_level: number;
  count?: number;
};

export type PublicBrandSummary = {
  classification: "digital";
  discovery_token: string;
  brand_name: string;
  brand_display_name: string;
  total: number;
};

export type PublicDiscoveryResolveResponse = {
  kind: "report" | "brand";
  classification: "physical" | "digital";
  public_id?: string;
  brand_name?: string;
  canonical_path: string;
};

export type PublicLiveAnalysis = {
  severity_level: number;
  classification: "physical" | "digital";
  language: string;
  title: string;
  summary: string;
  brand_name?: string;
  brand_display_name?: string;
};

export type PublicLiveReport = {
  discovery_token: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  analysis: PublicLiveAnalysis[];
};

export type PublicLiveReportBatch = {
  reports: PublicLiveReport[];
  count: number;
};
