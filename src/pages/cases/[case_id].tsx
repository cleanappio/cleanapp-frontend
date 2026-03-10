"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function CaseDetailPage() {
  const router = useRouter();
  const { case_id } = router.query;

  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [draft, setDraft] = useState<CaseEscalationDraftResponse | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    if (!case_id || typeof case_id !== "string") {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      authApiClient.loadTokenFromStorage();
      const data = await casesApiClient.getCase(case_id);
      setDetail(data);
      const ids = data.escalation_targets
        .filter((target) => !!target.email)
        .map((target) => target.id);
      setSelectedTargetIds(ids);
    } catch (err) {
      console.error("Failed to load case", err);
      setError("Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [case_id]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const selectedTargets = useMemo(() => {
    if (!detail) return [];
    return detail.escalation_targets.filter((target) =>
      selectedTargetIds.includes(target.id)
    );
  }, [detail, selectedTargetIds]);

  const timelineItems = useMemo(() => {
    if (!detail) return [];

    const items = [
      ...detail.audit_events.map((event: any) => ({
        key: `audit-${event.id || event.created_at || Math.random()}`,
        ts: event.created_at,
        title: humanizeAuditEvent(event.event_type || "case_updated"),
        description:
          summarizePayload(event.payload_json) ||
          (event.actor_user_id
            ? `Action by ${event.actor_user_id}`
            : "Case event recorded."),
        kind: "audit" as const,
      })),
      ...detail.escalation_actions.map((action) => ({
        key: `action-${action.id}`,
        ts: action.sent_at || action.created_at,
        title: action.sent_at ? "Escalation email sent" : "Escalation drafted",
        description: action.subject || "Escalation action recorded.",
        kind: "action" as const,
      })),
      ...detail.email_deliveries.map((delivery) => ({
        key: `delivery-${delivery.id}`,
        ts: delivery.sent_at || delivery.created_at,
        title:
          delivery.delivery_status === "sent"
            ? `Delivered to ${delivery.recipient_email}`
            : `Delivery ${delivery.delivery_status}`,
        description:
          delivery.delivery_source
            ? `${delivery.delivery_source} · ${delivery.provider || "email"}`
            : delivery.provider || "email",
        kind: "delivery" as const,
      })),
      ...detail.resolution_signals.map((signal: any, index) => ({
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

    return items;
  }, [detail]);

  const toggleTarget = (target: CaseEscalationTarget) => {
    setSelectedTargetIds((current) =>
      current.includes(target.id)
        ? current.filter((id) => id !== target.id)
        : [...current, target.id]
    );
  };

  const handleDraft = async () => {
    if (!case_id || typeof case_id !== "string") return;
    setDrafting(true);
    setError(null);
    try {
      const nextDraft = await casesApiClient.draftCaseEscalation(case_id, {
        target_ids: selectedTargetIds,
        subject,
        body,
      });
      setDraft(nextDraft);
      setSubject(nextDraft.subject);
      setBody(nextDraft.body);
    } catch (err) {
      console.error("Failed to draft escalation", err);
      setError("Failed to draft escalation");
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!case_id || typeof case_id !== "string") return;
    setSending(true);
    setError(null);
    try {
      await casesApiClient.sendCaseEscalation(case_id, {
        target_ids: selectedTargetIds,
        subject,
        body,
      });
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

  const { case: caseRecord } = detail;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">
                Case
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                {caseRecord.title}
              </h1>
              <p className="text-slate-600 mt-2 max-w-3xl">
                {caseRecord.summary || "No summary provided yet."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <MetricCard label="Status" value={caseRecord.status} />
              <MetricCard label="Reports" value={String(detail.linked_reports.length)} />
              <MetricCard
                label="Severity"
                value={`${Math.round(caseRecord.severity_score * 100)}%`}
              />
              <MetricCard
                label="Urgency"
                value={`${Math.round(caseRecord.urgency_score * 100)}%`}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Linked reports
              </h2>
              <div className="space-y-3">
                {detail.linked_reports.map((report) => (
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
                        <p className="text-xs text-slate-500">
                          Severity {Math.round(report.severity_level * 100)}%
                        </p>
                        <Link
                          href={`/?tab=${report.classification}&seq=${report.seq}`}
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
                          <p className="font-medium text-slate-900">{item.title}</p>
                          {item.description && (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">
                          {new Date(item.ts).toLocaleString()}
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
                {detail.email_deliveries.length === 0 ? (
                  <p className="text-slate-600">No escalation deliveries yet.</p>
                ) : (
                  detail.email_deliveries.map((delivery) => (
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
                            {delivery.delivery_status} · {delivery.delivery_source}
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
                {detail.escalation_targets.length === 0 ? (
                  <p className="text-slate-600">
                    No escalation targets suggested yet.
                  </p>
                ) : (
                  detail.escalation_targets.map((target) => (
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
                          {target.display_name || target.organization || target.email}
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
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Escalation subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
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
                disabled={sending || selectedTargets.length === 0 || !subject || !body}
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
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
    default:
      return eventType
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function summarizePayload(payload: unknown) {
  if (!payload) return "";
  if (typeof payload === "string") {
    return payload;
  }
  if (typeof payload === "object") {
    const map = payload as Record<string, unknown>;
    if (typeof map.summary === "string") return map.summary;
    if (typeof map.subject === "string") return map.subject;
    if (Array.isArray(map.report_seqs) && map.report_seqs.length > 0) {
      return `Reports: ${map.report_seqs.join(", ")}`;
    }
  }
  return "";
}
