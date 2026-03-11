"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import {
  casesApiClient,
  CaseDetail,
  CaseEscalationDraftResponse,
  CaseEscalationTarget,
} from "@/lib/cases-api-client";
import { authApiClient } from "@/lib/auth-api-client";
import {
  buildCaseDisplaySummary,
  buildCaseDisplayTitle,
  deriveCaseLandmarkLabel,
} from "@/lib/case-display";
import { getCanonicalReportPath } from "@/lib/report-links";

function resolveCaseId(router: ReturnType<typeof useRouter>): string | null {
  const queryCaseId = router.query.case_id;
  if (typeof queryCaseId === "string" && queryCaseId.trim()) {
    return queryCaseId.trim();
  }

  const pathname =
    typeof window !== "undefined"
      ? window.location.pathname
      : router.asPath?.split("?")[0] || "";

  const match = pathname.match(/\/cases\/([^/?#]+)/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function CaseDetailPage() {
  const router = useRouter();
  const caseId = useMemo(() => resolveCaseId(router), [router]);
  const canonicalizedRef = useRef(false);

  useEffect(() => {
    if (canonicalizedRef.current || !caseId || typeof window === "undefined") {
      return;
    }
    const host = window.location.hostname.toLowerCase();
    if (host !== "cleanapp.io") {
      return;
    }
    canonicalizedRef.current = true;
    const nextUrl = `https://www.cleanapp.io/cases/${encodeURIComponent(caseId)}${window.location.search}${window.location.hash}`;
    window.location.replace(nextUrl);
  }, [caseId]);

  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [draft, setDraft] = useState<CaseEscalationDraftResponse | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ccInput, setCCInput] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [hasManualDraftEdits, setHasManualDraftEdits] = useState(false);
  const autoDraftKeyRef = useRef("");

  const loadCase = useCallback(async () => {
    if (!caseId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      authApiClient.loadTokenFromStorage();
      const token = authApiClient.getAuthToken();
      if (!token) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/cases/${caseId}`)}`,
        );
        return;
      }

      const data = await casesApiClient.getCase(caseId);
      setDetail(data);
      setDraft(null);
      setSubject("");
      setBody("");
      setCCInput("");
      setHasManualDraftEdits(false);
      autoDraftKeyRef.current = "";
      const ids = data.escalation_targets
        .filter((target) => !!target.email)
        .map((target) => target.id);
      setSelectedTargetIds(ids);
    } catch (err) {
      console.error("Failed to load case", err);
      const status = (err as any)?.response?.status;
      if (status === 401) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/cases/${caseId}`)}`,
        );
        return;
      }
      if (status === 404) {
        setError("Case not found");
        return;
      }
      setError("Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [caseId, router]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    if (!caseId) {
      setLoading(false);
      setError("Case not found");
    }
  }, [caseId, router.isReady]);

  const selectedTargets = useMemo(() => {
    if (!detail) return [];
    return (detail.escalation_targets ?? []).filter((target) =>
      selectedTargetIds.includes(target.id),
    );
  }, [detail, selectedTargetIds]);
  const selectedTargetKey = useMemo(
    () => [...selectedTargetIds].sort((a, b) => a - b).join(","),
    [selectedTargetIds],
  );

  const caseRecord = detail?.case ?? null;
  const linkedReports = useMemo(() => detail?.linked_reports ?? [], [detail]);
  const emailDeliveries = useMemo(
    () => detail?.email_deliveries ?? [],
    [detail],
  );
  const escalationTargets = useMemo(
    () => detail?.escalation_targets ?? [],
    [detail],
  );
  const landmarkLabel = useMemo(
    () => deriveCaseLandmarkLabel(escalationTargets),
    [escalationTargets],
  );
  const displayTitle = useMemo(
    () => buildCaseDisplayTitle(caseRecord?.title, landmarkLabel),
    [caseRecord?.title, landmarkLabel],
  );
  const displaySummary = useMemo(
    () => buildCaseDisplaySummary(caseRecord?.summary, landmarkLabel),
    [caseRecord?.summary, landmarkLabel],
  );
  const bannerCandidates = useMemo(
    () =>
      [...linkedReports]
        .filter((report) => !!report.public_id)
        .sort((a, b) => {
          if (b.severity_level !== a.severity_level) {
            return b.severity_level - a.severity_level;
          }
          return (
            new Date(b.report_timestamp).getTime() -
            new Date(a.report_timestamp).getTime()
          );
        }),
    [linkedReports],
  );
  const activeBannerReport = bannerCandidates[bannerIndex] || null;
  const activeBannerImageUrl = activeBannerReport
    ? `${
        process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io"
      }/api/v3/reports/rawimage/by-public-id?public_id=${encodeURIComponent(
        activeBannerReport.public_id,
      )}`
    : null;

  useEffect(() => {
    setBannerIndex(0);
  }, [bannerCandidates.length, caseRecord?.case_id]);

  const timelineItems = useMemo(() => {
    if (!detail) return [];

    const auditEvents = detail.audit_events ?? [];
    const escalationActions = detail.escalation_actions ?? [];
    const emailDeliveries = detail.email_deliveries ?? [];
    const resolutionSignals = detail.resolution_signals ?? [];

    try {
      const items = [
        ...auditEvents.map((event: any) => ({
          key: `audit-${event.id || event.created_at || Math.random()}`,
          ts: event.created_at,
          title: humanizeAuditEvent(event.event_type || "case_updated"),
          description: describeAuditEvent(event),
          kind: "audit" as const,
        })),
        ...escalationActions.map((action) => ({
          key: `action-${action.id}`,
          ts: action.sent_at || action.created_at,
          title: action.sent_at
            ? "Escalation email sent"
            : "Escalation drafted",
          description: action.subject || "Escalation action recorded.",
          kind: "action" as const,
        })),
        ...emailDeliveries.map((delivery) => ({
          key: `delivery-${delivery.id}`,
          ts: delivery.sent_at || delivery.created_at,
          title:
            delivery.delivery_status === "sent"
              ? `Delivered to ${delivery.recipient_email}`
              : `Delivery ${delivery.delivery_status}`,
          description: delivery.delivery_source
            ? `${delivery.delivery_source} · ${delivery.provider || "email"}`
            : delivery.provider || "email",
          kind: "delivery" as const,
        })),
        ...resolutionSignals.map((signal: any, index) => ({
          key: `resolution-${index}`,
          ts: signal.created_at,
          title: signal.source_type
            ? `Resolution signal: ${signal.source_type}`
            : "Resolution signal",
          description: signal.summary || summarizePayload(signal.payload_json),
          kind: "resolution" as const,
        })),
      ]
        .filter((item) => !!item.ts)
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      return items.map((item) => ({
        ...item,
        ts: typeof item.ts === "string" ? item.ts : "",
        title: typeof item.title === "string" ? item.title : String(item.title),
        description:
          typeof item.description === "string" ? item.description : "",
      }));
    } catch (err) {
      console.error("Failed to build case timeline", err);
      return [];
    }
  }, [detail]);

  const toggleTarget = (target: CaseEscalationTarget) => {
    setSelectedTargetIds((current) =>
      current.includes(target.id)
        ? current.filter((id) => id !== target.id)
        : [...current, target.id],
    );
  };

  const requestDraft = useCallback(
    async ({
      nextSubject = subject,
      nextBody = body,
      nextCCInput = ccInput,
      silent = false,
    }: {
      nextSubject?: string;
      nextBody?: string;
      nextCCInput?: string;
      silent?: boolean;
    } = {}) => {
      if (!caseId) return;
      setDrafting(true);
      if (!silent) {
        setError(null);
      }
      try {
        const nextDraft = await casesApiClient.draftCaseEscalation(caseId, {
          target_ids: selectedTargetIds,
          cc_emails: parseEmailList(nextCCInput),
          subject: nextSubject,
          body: nextBody,
        });
        setDraft(nextDraft);
        setSubject(nextDraft.subject);
        setBody(nextDraft.body);
        setCCInput(formatEmailList(nextDraft.cc_emails));
        setHasManualDraftEdits(false);
      } catch (err) {
        console.error("Failed to draft escalation", err);
        if (!silent) {
          setError("Failed to draft escalation");
        }
      } finally {
        setDrafting(false);
      }
    },
    [body, caseId, ccInput, selectedTargetIds, subject],
  );

  useEffect(() => {
    if (!detail || !caseId || !selectedTargetKey || hasManualDraftEdits) {
      return;
    }
    const nextKey = `${caseId}:${selectedTargetKey}`;
    if (autoDraftKeyRef.current === nextKey) {
      return;
    }
    autoDraftKeyRef.current = nextKey;
    void requestDraft({
      nextSubject: "",
      nextBody: "",
      nextCCInput: ccInput,
      silent: true,
    });
  }, [
    caseId,
    ccInput,
    detail,
    hasManualDraftEdits,
    requestDraft,
    selectedTargetKey,
  ]);

  const handleDraft = async () => {
    if (!caseId) return;
    await requestDraft();
  };

  const handleSend = async () => {
    if (!caseId) return;
    setSending(true);
    setError(null);
    try {
      await casesApiClient.sendCaseEscalation(caseId, {
        target_ids: selectedTargetIds,
        cc_emails: parseEmailList(ccInput),
        subject,
        body,
      });
      setDraft(null);
      await loadCase();
    } catch (err) {
      console.error("Failed to send escalation", err);
      setError("Failed to send escalation");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader />
        <div className="max-w-6xl mx-auto px-6 py-10 text-slate-700">
          Loading case...
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <p className="text-red-600 font-semibold">
              {error || "Case not found"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2"
            >
              Back to map
            </button>
          </div>
        </div>
      </div>
    );
  }

  const caseView = detail.case;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="relative min-h-[260px]">
            {activeBannerImageUrl ? (
              <Image
                src={activeBannerImageUrl}
                alt={activeBannerReport?.title || displayTitle}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1152px"
                priority
                unoptimized
                onError={() =>
                  setBannerIndex((current) =>
                    current + 1 < bannerCandidates.length
                      ? current + 1
                      : bannerCandidates.length,
                  )
                }
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.45),_transparent_38%),linear-gradient(135deg,_#0f172a,_#111827_55%,_#1e293b)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-slate-900/20" />
            <div className="relative z-10 flex min-h-[260px] flex-col justify-end gap-4 p-6 md:p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                  Case
                </p>
                <h1 className="mt-2 max-w-3xl text-3xl font-bold text-white md:text-4xl">
                  {displayTitle}
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
                  {displaySummary}
                </p>
                {activeBannerReport && (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-300">
                    Cover image from report {activeBannerReport.seq}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-slate-200 bg-white p-6 md:grid-cols-4">
            <MetricCard label="Status" value={caseView.status} />
            <MetricCard label="Reports" value={String(linkedReports.length)} />
            <MetricCard
              label="Severity"
              value={`${Math.round(caseView.severity_score * 100)}%`}
              tone={scoreTone(caseView.severity_score)}
            />
            <MetricCard
              label="Urgency"
              value={`${Math.round(caseView.urgency_score * 100)}%`}
              tone={scoreTone(caseView.urgency_score)}
            />
            {bannerCandidates.length > 1 && (
              <div className="md:col-span-4 flex flex-wrap gap-2 pt-1">
                {bannerCandidates.slice(0, 5).map((report, index) => (
                  <button
                    key={`banner-${report.seq}`}
                    type="button"
                    onClick={() => setBannerIndex(index)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      index === bannerIndex
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    Report {report.seq}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Linked reports
              </h2>
              <div className="space-y-3">
                {linkedReports.map((report) => (
                  <div
                    key={`${report.case_id}-${report.seq}`}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {report.title || `Report #${report.seq}`}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {report.summary || "No summary available."}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Link reason: {report.link_reason || "cluster_match"} ·
                          confidence {Math.round(report.confidence * 100)}%
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${scorePillTone(report.severity_level)}`}
                        >
                          Severity {Math.round(report.severity_level * 100)}%
                        </p>
                        <Link
                          href={
                            getCanonicalReportPath(
                              report.classification === "digital"
                                ? "digital"
                                : "physical",
                              report.public_id,
                            ) ||
                            `/?tab=${report.classification}&seq=${report.seq}`
                          }
                          className="text-sm text-blue-600 hover:text-blue-500"
                        >
                          Open report
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Case timeline
              </h2>
              {timelineItems.length === 0 ? (
                <p className="text-slate-600">No case activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {timelineItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">
                          {formatTimelineTimestamp(item.ts)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Escalation activity
              </h2>
              <div className="space-y-3">
                {emailDeliveries.length === 0 ? (
                  <p className="text-slate-600">
                    No escalation deliveries yet.
                  </p>
                ) : (
                  emailDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {delivery.recipient_email}
                          </p>
                          <p className="text-sm text-slate-600">
                            {delivery.delivery_status} ·{" "}
                            {delivery.delivery_source}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {delivery.sent_at
                            ? new Date(delivery.sent_at).toLocaleString()
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Escalation targets
              </h2>
              <div className="space-y-3">
                {escalationTargets.length === 0 ? (
                  <p className="text-slate-600">
                    No escalation targets suggested yet.
                  </p>
                ) : (
                  escalationTargets.map((target) => (
                    <label
                      key={target.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTargetIds.includes(target.id)}
                        onChange={() => toggleTarget(target)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-slate-900">
                          {target.display_name ||
                            target.organization ||
                            target.email}
                        </p>
                        <p className="text-sm text-slate-600">{target.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {target.target_source} · confidence{" "}
                          {Math.round((target.confidence_score || 0) * 100)}%
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Escalation draft
                </h2>
                <button
                  onClick={handleDraft}
                  disabled={drafting || selectedTargets.length === 0}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2"
                >
                  {drafting ? "Drafting..." : "Draft"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => {
                    setHasManualDraftEdits(true);
                    setSubject(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Escalation subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  CC
                </label>
                <input
                  value={ccInput}
                  onChange={(e) => {
                    setHasManualDraftEdits(true);
                    setCCInput(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Additional copy recipients, separated by commas"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Additional recipients receive the same escalation copy.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setHasManualDraftEdits(true);
                    setBody(e.target.value);
                  }}
                  rows={12}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Escalation body"
                />
              </div>

              {draft && (
                <p className="text-sm text-slate-500">
                  Draft prepared for {draft.targets.length} selected target
                  {draft.targets.length === 1 ? "" : "s"} across{" "}
                  {draft.linked_count} linked reports.
                </p>
              )}

              <button
                onClick={handleSend}
                disabled={
                  sending || selectedTargets.length === 0 || !subject || !body
                }
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-3 font-medium"
              >
                {sending ? "Sending..." : "Send escalation"}
              </button>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "border-slate-200 bg-slate-50 text-slate-900",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 0.85) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (score >= 0.65) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (score >= 0.4) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function scorePillTone(score: number) {
  if (score >= 0.85) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (score >= 0.65) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (score >= 0.4) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function parseEmailList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,\n;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

function formatEmailList(emails: string[] | null | undefined): string {
  return (emails || []).join(", ");
}

function humanizeAuditEvent(eventType: string) {
  switch (eventType) {
    case "case_created":
      return "Case created";
    case "reports_added":
      return "Reports added";
    case "status_changed":
      return "Case status changed";
    case "case_escalation_drafted":
      return "Escalation drafted";
    case "case_escalation_sent":
      return "Escalation sent";
    case "case_escalation_requested":
      return "Escalation requested";
    case "case_escalation_recorded":
      return "Escalation recorded";
    default:
      return eventType
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function describeAuditEvent(event: any) {
  const payload = parseEventPayload(event?.payload_json);

  switch (event?.event_type) {
    case "case_created": {
      const reportCount = Array.isArray(payload?.report_seqs)
        ? payload?.report_seqs.length
        : 0;
      const targetCount =
        typeof payload?.target_count === "number" ? payload.target_count : 0;
      if (reportCount > 0 || targetCount > 0) {
        return `Created from ${reportCount} linked report${reportCount === 1 ? "" : "s"} and ${targetCount} suggested target${targetCount === 1 ? "" : "s"}.`;
      }
      return "Case workspace created.";
    }
    case "reports_added": {
      const reportCount = Array.isArray(payload?.report_seqs)
        ? payload?.report_seqs.length
        : 0;
      if (reportCount > 0) {
        return `Added ${reportCount} report${reportCount === 1 ? "" : "s"} to the case.`;
      }
      return "Reports linked to the case.";
    }
    case "status_changed": {
      const from =
        typeof payload?.from_status === "string" ? payload.from_status : "";
      const to =
        typeof payload?.to_status === "string" ? payload.to_status : "";
      if (from && to) {
        return `Status changed from ${from} to ${to}.`;
      }
      if (to) {
        return `Status changed to ${to}.`;
      }
      return "Case status updated.";
    }
    case "case_escalation_drafted": {
      const targetCount =
        typeof payload?.target_count === "number" ? payload.target_count : 0;
      if (targetCount > 0) {
        return `Prepared an escalation draft for ${targetCount} target${targetCount === 1 ? "" : "s"}.`;
      }
      return "Prepared an escalation draft.";
    }
    case "case_escalation_sent": {
      const recipientCount =
        typeof payload?.recipient_count === "number"
          ? payload.recipient_count
          : 0;
      if (recipientCount > 0) {
        return `Sent escalation to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`;
      }
      return "Sent escalation email.";
    }
    case "case_escalation_requested": {
      const targetCount =
        typeof payload?.target_count === "number" ? payload.target_count : 0;
      if (targetCount > 0) {
        return `Queued escalation for ${targetCount} target${targetCount === 1 ? "" : "s"}.`;
      }
      return "Queued escalation request.";
    }
    case "case_escalation_recorded": {
      const deliveryCount =
        typeof payload?.delivery_count === "number"
          ? payload.delivery_count
          : 0;
      if (deliveryCount > 0) {
        return `Recorded ${deliveryCount} email deliver${deliveryCount === 1 ? "y" : "ies"}.`;
      }
      return "Recorded escalation delivery results.";
    }
    default:
      return summarizePayload(payload);
  }
}

function summarizePayload(payload: unknown) {
  if (!payload) return "";
  if (typeof payload === "string") {
    const parsed = parseEventPayload(payload);
    if (parsed && typeof parsed === "object") {
      return summarizePayload(parsed);
    }
    return "";
  }
  if (typeof payload === "object") {
    const map = payload as Record<string, unknown>;
    if (typeof map.summary === "string") return map.summary;
    if (typeof map.subject === "string") return map.subject;
    if (typeof map.retry_reason === "string") return map.retry_reason;
    if (typeof map.to_status === "string") {
      return `Status set to ${map.to_status}`;
    }
    if (typeof map.target_count === "number") {
      return `Targets: ${map.target_count}`;
    }
    if (typeof map.delivery_count === "number") {
      return `Deliveries: ${map.delivery_count}`;
    }
    if (Array.isArray(map.report_seqs) && map.report_seqs.length > 0) {
      return `Reports linked: ${map.report_seqs.length}`;
    }
  }
  return "";
}

function parseEventPayload(payload: unknown) {
  if (!payload || typeof payload !== "string") {
    return typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  }

  const trimmed = payload.trim();
  if (
    !(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
    !(trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function formatTimelineTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
