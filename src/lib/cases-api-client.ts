import axios, { AxiosInstance } from "axios";
import type { Feature } from "geojson";
import { authApiClient } from "./auth-api-client";
import type { ReportWithAnalysis } from "@/components/GlobeView";

export interface CaseEscalationTarget {
  id: number;
  case_id: string;
  role_type: string;
  organization: string;
  display_name: string;
  channel: string;
  email: string;
  phone: string;
  website: string;
  contact_url: string;
  social_platform: string;
  social_handle: string;
  source_url: string;
  evidence_text: string;
  verification_level: string;
  target_source: string;
  confidence_score: number;
  rationale: string;
  created_at: string;
}

export interface ClusterIncidentHypothesis {
  hypothesis_id: string;
  title: string;
  classification: string;
  representative_report_seq: number;
  report_seqs: number[];
  report_count: number;
  confidence: number;
  severity_score: number;
  urgency_score: number;
  rationale: string[];
}

export interface ClusterStats {
  classification: string;
  report_count: number;
  severity_average: number;
  severity_max: number;
  high_priority_count: number;
  medium_priority_count: number;
  first_seen_at?: string;
  last_seen_at?: string;
  classification_breakdown: Record<string, number>;
}

export interface CaseMatchCandidate {
  case_id: string;
  slug: string;
  title: string;
  status: string;
  classification: string;
  summary: string;
  geometry_json: string;
  aggregate_geometry_json: string;
  aggregate_bbox_json: string;
  anchor_report_seq?: number;
  anchor_lat?: number;
  anchor_lng?: number;
  cluster_count: number;
  linked_report_count: number;
  shared_report_count: number;
  match_score: number;
  match_reasons: string[];
  updated_at: string;
}

export interface ClusterAnalysisResponse {
  scope_type: string;
  classification: string;
  anchor_report_seq?: number;
  geometry?: Feature;
  reports: ReportWithAnalysis[];
  stats: ClusterStats;
  hypotheses: ClusterIncidentHypothesis[];
  suggested_targets: CaseEscalationTarget[];
  candidate_cases: CaseMatchCandidate[];
}

export interface CaseSummary {
  case_id: string;
  slug: string;
  title: string;
  status: string;
  classification: string;
  summary: string;
  severity_score: number;
  urgency_score: number;
  updated_at: string;
  escalation_target_count: number;
  delivery_count: number;
}

export interface ReportCasesResponse {
  seq: number;
  cases: CaseSummary[];
}

export interface CaseReportLink {
  case_id: string;
  seq: number;
  public_id: string;
  link_reason: string;
  confidence: number;
  attached_at: string;
  title: string;
  summary: string;
  classification: string;
  severity_level: number;
  latitude: number;
  longitude: number;
  report_timestamp: string;
  last_email_sent_at?: string;
  recipient_count: number;
}

export interface SavedCluster {
  cluster_id: string;
  source_type: string;
  classification: string;
  geometry_json: string;
  seed_report_seq?: number;
  report_count: number;
  summary: string;
  stats_json: string;
  analysis_json: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CaseEscalationAction {
  id: number;
  case_id: string;
  target_id?: number;
  channel: string;
  status: string;
  subject: string;
  body: string;
  attachments_json: string;
  sent_by_user_id: string;
  provider_message_id: string;
  sent_at?: string;
  created_at: string;
}

export interface CaseEmailDelivery {
  id: number;
  case_id: string;
  action_id?: number;
  target_id?: number;
  recipient_email: string;
  delivery_status: string;
  delivery_source: string;
  provider: string;
  provider_message_id: string;
  sent_at?: string;
  error_message: string;
  created_at: string;
}

export interface CaseDetail {
  case: {
    case_id: string;
    slug: string;
    title: string;
    type: string;
    status: string;
    classification: string;
    summary: string;
    uncertainty_notes: string;
    geometry_json: string;
    aggregate_geometry_json: string;
    aggregate_bbox_json: string;
    anchor_report_seq?: number;
    anchor_lat?: number;
    anchor_lng?: number;
    severity_score: number;
    urgency_score: number;
    confidence_score: number;
    exposure_score: number;
    criticality_score: number;
    trend_score: number;
    cluster_count: number;
    linked_report_count: number;
    first_seen_at?: string;
    last_seen_at?: string;
    last_cluster_at?: string;
    merged_into_case_id?: string;
    created_by_user_id: string;
    created_at: string;
    updated_at: string;
  };
  linked_reports: CaseReportLink[];
  clusters: SavedCluster[];
  escalation_targets: CaseEscalationTarget[];
  escalation_actions: CaseEscalationAction[];
  email_deliveries: CaseEmailDelivery[];
  resolution_signals: Array<Record<string, unknown>>;
  audit_events: Array<Record<string, unknown>>;
}

export interface CaseEscalationDraftResponse {
  case_id: string;
  subject: string;
  body: string;
  cc_emails: string[];
  targets: CaseEscalationTarget[];
  linked_count: number;
}

export interface CaseEscalationSendResponse {
  case_id: string;
  subject: string;
  body: string;
  cc_emails: string[];
  actions: CaseEscalationAction[];
  deliveries: CaseEmailDelivery[];
}

export interface CaseEscalationsResponse {
  case_id: string;
  targets: CaseEscalationTarget[];
  actions: CaseEscalationAction[];
  deliveries: CaseEmailDelivery[];
  linked_count: number;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function parseJsonIfPossible<T = unknown>(value: T): T | unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  if (
    !(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
    !(trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeAuditEvent(event: Record<string, unknown>) {
  return {
    ...event,
    payload_json: parseJsonIfPossible(event?.payload_json),
  };
}

function normalizeResolutionSignal(signal: Record<string, unknown>) {
  return {
    ...signal,
    payload_json: parseJsonIfPossible(signal?.payload_json),
  };
}

function normalizeCaseDetail(data: CaseDetail): CaseDetail {
  return {
    ...data,
    linked_reports: asArray(data?.linked_reports),
    clusters: asArray(data?.clusters),
    escalation_targets: asArray(data?.escalation_targets),
    escalation_actions: asArray(data?.escalation_actions),
    email_deliveries: asArray(data?.email_deliveries),
    resolution_signals: asArray(data?.resolution_signals).map((signal) =>
      normalizeResolutionSignal(signal as Record<string, unknown>),
    ),
    audit_events: asArray(data?.audit_events).map((event) =>
      normalizeAuditEvent(event as Record<string, unknown>),
    ),
  };
}

class CasesApiClient {
  private axios: AxiosInstance;

  constructor() {
    const baseURL =
      process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
    this.axios = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    this.axios.interceptors.request.use((config) => {
      const token = authApiClient.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async analyzeClusterByGeometry(payload: {
    geometry: Feature;
    classification?: string;
    n?: number;
  }): Promise<ClusterAnalysisResponse> {
    const { data } = await this.axios.post<ClusterAnalysisResponse>(
      "/api/v3/clusters/analyze",
      payload,
    );
    return data;
  }

  async analyzeClusterFromReport(payload: {
    seq: number;
    radius_km?: number;
    n?: number;
    classification?: string;
  }): Promise<ClusterAnalysisResponse> {
    const { data } = await this.axios.post<ClusterAnalysisResponse>(
      "/api/v3/clusters/from-report",
      payload,
    );
    return data;
  }

  async matchCluster(payload: {
    geometry?: Feature;
    classification?: string;
    report_seqs?: number[];
    title?: string;
    summary?: string;
    n?: number;
  }): Promise<{
    classification: string;
    candidate_cases: CaseMatchCandidate[];
  }> {
    const { data } = await this.axios.post<{
      classification: string;
      candidate_cases: CaseMatchCandidate[];
    }>("/api/v3/cases/match-cluster", payload);
    return data;
  }

  async createCase(payload: Record<string, unknown>): Promise<CaseDetail> {
    const { data } = await this.axios.post<CaseDetail>(
      "/api/v3/cases",
      payload,
    );
    return normalizeCaseDetail(data);
  }

  async upsertFromCluster(
    payload: Record<string, unknown>,
  ): Promise<CaseDetail> {
    const { data } = await this.axios.post<CaseDetail>(
      "/api/v3/cases/upsert-from-cluster",
      payload,
    );
    return normalizeCaseDetail(data);
  }

  async mergeCases(payload: {
    target_case_id: string;
    source_case_ids: string[];
  }): Promise<CaseDetail> {
    const { data } = await this.axios.post<CaseDetail>(
      "/api/v3/cases/merge",
      payload,
    );
    return normalizeCaseDetail(data);
  }

  async getCase(caseId: string): Promise<CaseDetail> {
    const { data } = await this.axios.get<CaseDetail>(
      `/api/v3/cases/${caseId}`,
      {
        timeout: 8000,
      },
    );
    return normalizeCaseDetail(data);
  }

  async getCaseEscalations(
    caseId: string,
    options?: {
      refreshTargets?: boolean;
    },
  ): Promise<CaseEscalationsResponse> {
    const { data } = await this.axios.get<CaseEscalationsResponse>(
      `/api/v3/cases/${caseId}/escalations`,
      {
        params: options?.refreshTargets ? { refresh_targets: "1" } : undefined,
        timeout: options?.refreshTargets ? 8000 : 5000,
      },
    );
    return data;
  }

  async draftCaseEscalation(
    caseId: string,
    payload: {
      target_ids: number[];
      cc_emails?: string[];
      subject?: string;
      body?: string;
    },
  ): Promise<CaseEscalationDraftResponse> {
    const { data } = await this.axios.post<CaseEscalationDraftResponse>(
      `/api/v3/cases/${caseId}/escalations/draft`,
      payload,
    );
    return data;
  }

  async sendCaseEscalation(
    caseId: string,
    payload: {
      target_ids: number[];
      cc_emails?: string[];
      subject: string;
      body: string;
    },
  ): Promise<CaseEscalationSendResponse> {
    const { data } = await this.axios.post<CaseEscalationSendResponse>(
      `/api/v3/cases/${caseId}/escalations/send`,
      payload,
    );
    return data;
  }

  async getCasesByReportSeq(seq: number): Promise<ReportCasesResponse> {
    const { data } = await this.axios.get<ReportCasesResponse>(
      "/api/v3/reports/cases",
      { params: { seq } },
    );
    return data;
  }
}

export const casesApiClient = new CasesApiClient();
