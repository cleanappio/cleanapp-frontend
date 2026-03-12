"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import {
  casesApiClient,
  CaseDetail,
  CaseEscalationDraftResponse,
  CaseMatchCandidate,
  CaseEscalationTarget,
  CaseNotifyPlan,
} from "@/lib/cases-api-client";
import { authApiClient } from "@/lib/auth-api-client";
import {
  buildCaseDisplaySummary,
  buildCaseDisplayTitle,
  deriveCaseLandmarkLabel,
} from "@/lib/case-display";
import { getCanonicalReportPath } from "@/lib/report-links";
import { bboxToFeature } from "@/lib/place-search";

type ResponsiblePartyCard = CaseEscalationTarget & {
  preview_only?: boolean;
};

type ResponsiblePartySection = {
  key: string;
  title: string;
  description: string;
  targets: ResponsiblePartyCard[];
};

type MiniMapOverlay = {
  caseId: string;
  label: string;
  href: string;
  polygons: Position[][];
  point: Position | null;
  severityScore: number;
  linkedReportCount: number;
  matchScore?: number;
  tone: "current" | "nearby";
};

type FeatureLike = Feature | FeatureCollection;

const INITIAL_CASE_LOAD_BUDGET_MS = 12000;
const CASE_LOADING_TICK_MS = 100;

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

function deriveSelectableTargetIds(
  targets: CaseEscalationTarget[] | null | undefined,
  notifyPlan?: CaseNotifyPlan | null,
): number[] {
  const availableTargets = (targets ?? []).filter((target) => !!target.email);
  const availableIds = new Set(availableTargets.map((target) => target.id));
  const plannedIds = (notifyPlan?.items ?? [])
    .filter((item) => item.selected && typeof item.target_id === "number")
    .map((item) => item.target_id as number)
    .filter((targetId) => availableIds.has(targetId))
    .sort((left, right) => left - right);
  if (plannedIds.length > 0) {
    return plannedIds;
  }
  return availableTargets
    .map((target) => target.id)
    .sort((left, right) => left - right);
}

function sameIdSet(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function reconcileSelectedTargetIds(
  currentSelectedIds: number[],
  previousTargets: CaseEscalationTarget[],
  previousNotifyPlan: CaseNotifyPlan | null | undefined,
  nextTargets: CaseEscalationTarget[],
  nextNotifyPlan: CaseNotifyPlan | null | undefined,
): number[] {
  const previousAutoSelection = deriveSelectableTargetIds(
    previousTargets,
    previousNotifyPlan,
  );
  const nextAutoSelection = deriveSelectableTargetIds(nextTargets, nextNotifyPlan);
  const normalizedCurrentSelection = [...currentSelectedIds].sort(
    (left, right) => left - right,
  );
  if (sameIdSet(normalizedCurrentSelection, previousAutoSelection)) {
    return nextAutoSelection;
  }

  const nextTargetIds = new Set(nextTargets.map((target) => target.id));
  const preservedSelection = normalizedCurrentSelection.filter((targetId) =>
    nextTargetIds.has(targetId),
  );
  if (preservedSelection.length > 0) {
    return preservedSelection;
  }
  return nextAutoSelection;
}

export default function CaseDetailPage() {
  const router = useRouter();
  const caseId = useMemo(() => resolveCaseId(router), [router]);
  const previewMode =
    process.env.NODE_ENV !== "production" && router.query.mock === "1";
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
  const [loadingElapsedMs, setLoadingElapsedMs] = useState(0);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshingEscalationData, setRefreshingEscalationData] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [hasManualDraftEdits, setHasManualDraftEdits] = useState(false);
  const [nearbyCases, setNearbyCases] = useState<CaseMatchCandidate[]>([]);
  const [loadingNearbyCases, setLoadingNearbyCases] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const [showAllResponsibleParties, setShowAllResponsibleParties] =
    useState(false);
  const autoDraftKeyRef = useRef("");

  const refreshEscalationData = useCallback(
    async (
      nextCaseId: string,
      currentTargets: CaseEscalationTarget[],
      currentNotifyPlan?: CaseNotifyPlan | null,
    ) => {
      if (previewMode) {
        return;
      }
      setRefreshingEscalationData(true);
      try {
        const nextEscalations = await casesApiClient.getCaseEscalations(
          nextCaseId,
          {
            refreshTargets: true,
          },
        );
        setDetail((current) => {
          if (!current || current.case.case_id !== nextCaseId) {
            return current;
          }
          return {
            ...current,
            escalation_targets: nextEscalations.targets,
            contact_observations: nextEscalations.observations,
            notify_plan: nextEscalations.notify_plan ?? null,
            routing_profile: nextEscalations.routing_profile ?? null,
            execution_tasks: nextEscalations.execution_tasks,
            notify_outcomes: nextEscalations.notify_outcomes,
            escalation_actions: nextEscalations.actions,
            email_deliveries: nextEscalations.deliveries,
          };
        });
        setSelectedTargetIds((currentSelectedIds) =>
          reconcileSelectedTargetIds(
            currentSelectedIds,
            currentTargets,
            currentNotifyPlan,
            nextEscalations.targets,
            nextEscalations.notify_plan ?? null,
          ),
        );
      } catch (err) {
        console.error("Failed to refresh case escalation data", err);
      } finally {
        setRefreshingEscalationData(false);
      }
    },
    [previewMode],
  );

  const loadCase = useCallback(async () => {
    if (!caseId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (previewMode) {
        const data = buildMockCaseDetail(caseId);
        setDetail(data);
        setDraft(null);
        setSubject("");
        setBody("");
        setCCInput("");
      setHasManualDraftEdits(false);
      autoDraftKeyRef.current = "";
      setSelectedTargetIds(
        deriveSelectableTargetIds(data.escalation_targets, data.notify_plan),
      );
      return;
      }

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
      const ids = deriveSelectableTargetIds(
        data.escalation_targets,
        data.notify_plan,
      );
      setSelectedTargetIds(ids);
      void refreshEscalationData(
        caseId,
        data.escalation_targets,
        data.notify_plan ?? null,
      );
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
  }, [caseId, previewMode, refreshEscalationData, router]);

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

  useEffect(() => {
    if (!loading) {
      setLoadingElapsedMs(0);
      return;
    }
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    setLoadingElapsedMs(0);
    const timerId = window.setInterval(() => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      setLoadingElapsedMs(now - startedAt);
    }, CASE_LOADING_TICK_MS);
    return () => window.clearInterval(timerId);
  }, [caseId, loading]);

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
  const caseView = detail?.case ?? null;
  const linkedReports = useMemo(
    () =>
      [...(detail?.linked_reports ?? [])].sort((a, b) => {
        if (b.severity_level !== a.severity_level) {
          return b.severity_level - a.severity_level;
        }
        return (
          new Date(b.report_timestamp).getTime() -
          new Date(a.report_timestamp).getTime()
        );
      }),
    [detail],
  );
  const emailDeliveries = useMemo(
    () => detail?.email_deliveries ?? [],
    [detail],
  );
  const escalationTargets = useMemo(
    () => detail?.escalation_targets ?? [],
    [detail],
  );
  const routingProfile = useMemo(
    () => detail?.routing_profile ?? null,
    [detail],
  );
  const executionTasks = useMemo(
    () => detail?.execution_tasks ?? [],
    [detail],
  );
  const notifyOutcomes = useMemo(
    () => detail?.notify_outcomes ?? [],
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
  const responsibleParties = useMemo(
    () =>
      buildResponsiblePartyCards(
        escalationTargets,
        detail?.notify_plan ?? null,
        linkedReports,
        landmarkLabel,
        previewMode,
      ),
    [
      detail?.notify_plan,
      escalationTargets,
      linkedReports,
      landmarkLabel,
      previewMode,
    ],
  );
  const holisticSummary = useMemo(
    () =>
      buildHolisticClusterSummary(
        displayTitle,
        landmarkLabel,
        linkedReports,
        detail?.case.classification || "physical",
      ),
    [detail?.case.classification, displayTitle, landmarkLabel, linkedReports],
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
  const visibleLinkedReports = useMemo(
    () => (showAllReports ? linkedReports : linkedReports.slice(0, 3)),
    [linkedReports, showAllReports],
  );
  const responsiblePartySections = useMemo(
    () =>
      buildResponsiblePartySections(
        responsibleParties,
        detail?.notify_plan ?? null,
        selectedTargetIds,
        showAllResponsibleParties,
      ),
    [
      detail?.notify_plan,
      responsibleParties,
      selectedTargetIds,
      showAllResponsibleParties,
    ],
  );
  const nearbyCaseCards = useMemo(
    () =>
      nearbyCases
        .filter((candidate) => candidate.case_id !== caseId)
        .slice(0, 5),
    [caseId, nearbyCases],
  );

  useEffect(() => {
    if (!detail || !caseId) {
      setNearbyCases([]);
      setLoadingNearbyCases(false);
      return;
    }

    if (previewMode) {
      setNearbyCases(buildMockNearbyCases(caseId));
      setLoadingNearbyCases(false);
      return;
    }

    const geometry = resolveCaseMatchFeature(detail.case);
    if (!geometry) {
      setNearbyCases([]);
      setLoadingNearbyCases(false);
      return;
    }

    let cancelled = false;
    setLoadingNearbyCases(true);

    void casesApiClient
      .matchCluster({
        geometry,
        classification: detail.case.classification,
        report_seqs: linkedReports.map((report) => report.seq).slice(0, 100),
        title: detail.case.title,
        summary: detail.case.summary,
        n: 12,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }
        const deduped = new Map<string, CaseMatchCandidate>();
        (response.candidate_cases || [])
          .filter((candidate) => candidate.case_id !== caseId)
          .forEach((candidate) => {
            const existing = deduped.get(candidate.case_id);
            if (!existing || candidate.match_score > existing.match_score) {
              deduped.set(candidate.case_id, candidate);
            }
          });
        setNearbyCases(
          [...deduped.values()].sort((a, b) => {
            if (b.match_score !== a.match_score) {
              return b.match_score - a.match_score;
            }
            return (
              (b.linked_report_count || 0) - (a.linked_report_count || 0)
            );
          }),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load nearby cases", err);
          setNearbyCases([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingNearbyCases(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, detail, linkedReports, previewMode]);

  const clusterMapOverlays = useMemo<MiniMapOverlay[]>(() => {
    const currentFeature = resolveCaseFeature(caseView);
    const overlays: MiniMapOverlay[] = [];

    if (currentFeature && caseView) {
      overlays.push({
        caseId: caseView.case_id,
        label: displayTitle,
        href: `/cases/${caseView.case_id}`,
        polygons: extractPolygonRings(currentFeature),
        point:
          typeof caseView.anchor_lng === "number" &&
          typeof caseView.anchor_lat === "number"
            ? [caseView.anchor_lng, caseView.anchor_lat]
            : null,
        severityScore: caseView.severity_score || 0,
        linkedReportCount: caseView.linked_report_count || linkedReports.length,
        tone: "current",
      });
    }

    nearbyCaseCards.forEach((candidate) => {
      const feature = resolveCandidateFeature(candidate);
      overlays.push({
        caseId: candidate.case_id,
        label: candidate.title || "Nearby cluster",
        href: `/cases/${candidate.case_id}`,
        polygons: feature ? extractPolygonRings(feature) : [],
        point:
          typeof candidate.anchor_lng === "number" &&
          typeof candidate.anchor_lat === "number"
            ? [candidate.anchor_lng, candidate.anchor_lat]
            : null,
        severityScore:
          candidate.match_score && candidate.match_score > 0
            ? candidate.match_score
            : 0.5,
        linkedReportCount: candidate.linked_report_count || 0,
        matchScore: candidate.match_score,
        tone: "nearby",
      });
    });

    return overlays;
  }, [caseId, caseView, displayTitle, linkedReports.length, nearbyCaseCards]);

  useEffect(() => {
    setBannerIndex(0);
  }, [bannerCandidates.length, caseRecord?.case_id]);

  useEffect(() => {
    setShowAllReports(false);
    setShowAllResponsibleParties(false);
  }, [caseId]);

  const timelineItems = useMemo(() => {
    if (!detail) return [];

    const auditEvents = detail.audit_events ?? [];
    const escalationActions = detail.escalation_actions ?? [];
    const emailDeliveries = detail.email_deliveries ?? [];
    const notifyOutcomes = detail.notify_outcomes ?? [];
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
        ...notifyOutcomes.map((outcome) => ({
          key: `outcome-${outcome.id}`,
          ts: outcome.recorded_at,
          title: humanizeOutcomeType(outcome.outcome_type),
          description:
            outcome.source_ref ||
            outcome.endpoint_key ||
            summarizePayload(outcome.evidence_json),
          kind: "outcome" as const,
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
        if (previewMode) {
          const nextDraft = buildMockCaseEscalationDraft(
            caseId,
            displayTitle,
            selectedTargets,
            nextSubject,
            nextBody,
            parseEmailList(nextCCInput),
          );
          setDraft(nextDraft);
          setSubject(nextDraft.subject);
          setBody(nextDraft.body);
          setCCInput(formatEmailList(nextDraft.cc_emails));
          setHasManualDraftEdits(false);
          return;
        }
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
    [
      body,
      caseId,
      ccInput,
      displayTitle,
      previewMode,
      selectedTargetIds,
      selectedTargets,
      subject,
    ],
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

  const loadingCountdownSeconds = Math.max(
    0,
    Math.ceil((INITIAL_CASE_LOAD_BUDGET_MS - loadingElapsedMs) / 1000),
  );
  const loadingElapsedSeconds = (loadingElapsedMs / 1000).toFixed(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-600">
              Loading case
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-8">
              <div>
                <p className="text-4xl font-semibold text-slate-900">
                  {loadingCountdownSeconds}s
                </p>
                <p className="text-sm text-slate-500">budget remaining</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-slate-700">
                  {loadingElapsedSeconds}s
                </p>
                <p className="text-sm text-slate-500">elapsed</p>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">
              Core case details load first. Responsible parties and escalation
              context continue to refresh after the case opens, so you do not
              have to wait on slower enrichment.
            </p>
            <div className="mt-6 space-y-3">
              <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
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
            <MetricCard label="Status" value={caseView!.status} />
            <MetricCard label="Reports" value={String(linkedReports.length)} />
            <MetricCard
              label="Severity"
              value={`${Math.round(caseView!.severity_score * 100)}%`}
              tone={scoreTone(caseView!.severity_score)}
            />
            <MetricCard
              label="Urgency"
              value={`${Math.round(caseView!.urgency_score * 100)}%`}
              tone={scoreTone(caseView!.urgency_score)}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Summary
                  </h2>
                  {routingProfile && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <RouteBadge>{formatRoutingBadge(routingProfile.defect_class)}</RouteBadge>
                      <RouteBadge>{formatRoutingBadge(routingProfile.asset_class)}</RouteBadge>
                      <RouteBadge>{formatRoutingBadge(routingProfile.exposure_mode)}</RouteBadge>
                      <RouteBadge>{formatRoutingBadge(routingProfile.urgency_band)}</RouteBadge>
                    </div>
                  )}
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {holisticSummary}
                  </p>
                </div>
                {previewMode && (
                  <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    localhost preview
                  </span>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Linked reports
                </h2>
                {linkedReports.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllReports((current) => !current)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    {showAllReports
                      ? "Show fewer"
                      : `Show all ${linkedReports.length}`}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {visibleLinkedReports.map((report) => (
                  <div
                    key={`${report.case_id}-${report.seq}`}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    {(() => {
                      const reportHref =
                        getCanonicalReportPath(
                          report.classification === "digital"
                            ? "digital"
                            : "physical",
                          report.public_id,
                        ) || `/?tab=${report.classification}&seq=${report.seq}`;

                      return (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link
                              href={reportHref}
                              className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                            >
                              {report.title || `Report #${report.seq}`}
                            </Link>
                            <p className="text-sm text-slate-600 mt-1">
                              {report.summary || "No summary available."}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              Link reason:{" "}
                              {report.link_reason || "cluster_match"} ·
                              confidence {Math.round(report.confidence * 100)}%
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${scorePillTone(report.severity_level)}`}
                            >
                              Severity {Math.round(report.severity_level * 100)}
                              %
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Outcome timeline
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
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Cluster area
              </h2>
              <div className="grid gap-4 xl:grid-cols-[1fr,1.1fr]">
                <CaseClusterMiniMap
                  overlays={clusterMapOverlays}
                  onSelectCase={(nextCaseId) => router.push(`/cases/${nextCaseId}`)}
                />
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      Current case footprint
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {caseView!.cluster_count} cluster
                      {caseView!.cluster_count === 1 ? "" : "s"} ·{" "}
                      {linkedReports.length} linked report
                      {linkedReports.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Nearby clusters
                      </p>
                      {loadingNearbyCases && (
                        <span className="text-xs text-slate-500">
                          Loading...
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {nearbyCaseCards.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                          No nearby open clusters matched this area yet.
                        </p>
                      ) : (
                        nearbyCaseCards.map((candidate) => (
                          <Link
                            key={candidate.case_id}
                            href={`/cases/${candidate.case_id}`}
                            className="block rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900">
                                  {candidate.title || "Nearby cluster"}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {candidate.linked_report_count} reports ·
                                  match {Math.round(candidate.match_score * 100)}
                                  %
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                                Open
                              </span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Responsible parties
              </h2>
              {detail?.notify_plan?.summary && (
                <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {detail.notify_plan.summary}
                </p>
              )}
              {refreshingEscalationData && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Refreshing official contacts and escalation routes...
                </p>
              )}
              {responsibleParties.length > 3 && (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllResponsibleParties((current) => !current)
                    }
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    {showAllResponsibleParties
                      ? "Show fewer"
                      : `Show all ${responsibleParties.length}`}
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {responsibleParties.length === 0 ? (
                  <p className="text-slate-600">
                    No responsible parties identified yet.
                  </p>
                ) : (
                  responsiblePartySections.map((section) => (
                    <div key={section.key} className="space-y-3">
                      <div className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {section.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {section.description}
                        </p>
                      </div>
                      {section.targets.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                          No contacts routed into this bucket yet.
                        </p>
                      ) : (
                        section.targets.map((target) => {
                          const selectable = !!target.email && !target.preview_only;
                          const checked = selectable
                            ? selectedTargetIds.includes(target.id)
                            : false;
                          return (
                            <label
                              key={`${section.key}-${target.id}`}
                              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                                selectable
                                  ? "cursor-pointer border-slate-200"
                                  : "border-slate-100 bg-slate-50/70"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!selectable}
                                onChange={() => toggleTarget(target)}
                                className="mt-1"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-slate-900">
                                    {target.display_name ||
                                      target.organization ||
                                      target.email ||
                                      target.website}
                                  </p>
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                                    {formatRoleType(target.role_type)}
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                                    {formatDecisionScope(target.decision_scope)}
                                  </span>
                                  {target.send_eligibility && (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] ${
                                        target.send_eligibility === "auto"
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : target.send_eligibility === "review"
                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                            : "border-slate-200 bg-slate-50 text-slate-600"
                                      }`}
                                    >
                                      {target.send_eligibility}
                                    </span>
                                  )}
                                  {target.verification_level && (
                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-700">
                                      {formatVerificationLevel(target.verification_level)}
                                    </span>
                                  )}
                                  {target.preview_only && (
                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-700">
                                      preview
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                  {target.organization &&
                                  target.organization !== target.display_name
                                    ? target.organization
                                    : formatTargetSourceLabel(target.target_source)}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                  {target.email && (
                                    <a
                                      href={`mailto:${target.email}`}
                                      className="text-blue-600 hover:text-blue-500 hover:underline"
                                    >
                                      {target.email}
                                    </a>
                                  )}
                                  {target.phone && (
                                    <a
                                      href={`tel:${target.phone}`}
                                      className="text-blue-600 hover:text-blue-500 hover:underline"
                                    >
                                      {target.phone}
                                    </a>
                                  )}
                                  {target.website && (
                                    <a
                                      href={target.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-500 hover:underline"
                                    >
                                      Official site
                                    </a>
                                  )}
                                  {target.contact_url &&
                                    target.contact_url !== target.website && (
                                      <a
                                        href={target.contact_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-500 hover:underline"
                                      >
                                        Source page
                                      </a>
                                    )}
                                  {target.source_url &&
                                    target.source_url !== target.contact_url &&
                                    target.source_url !== target.website && (
                                      <a
                                        href={target.source_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-500 hover:underline"
                                      >
                                        Evidence page
                                      </a>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                  {target.channel || "contact"} · {formatAttributionClass(target.attribution_class)} · confidence{" "}
                                  {Math.round((target.confidence_score || 0) * 100)}%
                                </p>
                                {target.reason_selected && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {target.reason_selected}
                                  </p>
                                )}
                                {target.evidence_text && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Evidence: {target.evidence_text}
                                  </p>
                                )}
                                {target.rationale && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {target.rationale}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Execution queue
                </h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {executionTasks.length} task{executionTasks.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Structured follow-ups for channels that should be reviewed or handled manually.
              </p>
              <div className="mt-4 space-y-3">
                {executionTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                    No pending execution tasks.
                  </p>
                ) : (
                  executionTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {task.summary || "Follow-up task"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Wave {task.wave_number} · {formatExecutionMode(task.execution_mode)} · {formatTaskStatus(task.task_status)}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">
                          {task.due_at
                            ? `Due ${new Date(task.due_at).toLocaleString()}`
                            : "Queued"}
                        </p>
                      </div>
                    </div>
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
              {refreshingEscalationData && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Updating contacts in the background. New recipients will appear
                  here as they are verified.
                </p>
              )}

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
                  previewMode ||
                  sending ||
                  selectedTargets.length === 0 ||
                  !subject ||
                  !body
                }
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-3 font-medium"
              >
                {previewMode
                  ? "Preview mode"
                  : sending
                    ? "Sending..."
                    : "Send escalation"}
              </button>
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
        </div>
      </div>
      <Footer />
    </div>
  );
}

function CaseClusterMiniMap({
  overlays,
  onSelectCase,
}: {
  overlays: MiniMapOverlay[];
  onSelectCase: (caseId: string) => void;
}) {
  const canvasWidth = 320;
  const canvasHeight = 220;
  const bounds = computeOverlayBounds(overlays);

  if (!bounds) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No mappable case geometry is available yet.
      </div>
    );
  }

  const projected = overlays.map((overlay) => ({
    ...overlay,
    projectedPolygons: overlay.polygons.map((ring) =>
      ring.map((position) =>
        projectPosition(position, bounds, canvasWidth, canvasHeight),
      ),
    ),
    projectedPoint: overlay.point
      ? projectPosition(overlay.point, bounds, canvasWidth, canvasHeight)
      : null,
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#eef2ff)]">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Area thumbnail</p>
          <p className="text-xs text-slate-500">
            Current case in green. Nearby clusters are clickable.
          </p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="block h-[220px] w-full"
        role="img"
        aria-label="Case area overview with nearby clusters"
      >
        <defs>
          <pattern
            id="case-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="rgba(148,163,184,0.2)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#case-grid)"
        />
        {projected.map((overlay) => {
          const isCurrent = overlay.tone === "current";
          const fill = isCurrent
            ? "rgba(16, 185, 129, 0.18)"
            : "rgba(59, 130, 246, 0.10)";
          const stroke = isCurrent
            ? "rgba(5, 150, 105, 0.95)"
            : "rgba(37, 99, 235, 0.85)";
          return (
            <g key={overlay.caseId}>
              {overlay.projectedPolygons.map((ring, index) => (
                <path
                  key={`${overlay.caseId}-${index}`}
                  d={ringToPath(ring)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isCurrent ? 3 : 2}
                  className={!isCurrent ? "cursor-pointer" : undefined}
                  onClick={
                    isCurrent ? undefined : () => onSelectCase(overlay.caseId)
                  }
                />
              ))}
              {overlay.projectedPoint && (
                <circle
                  cx={overlay.projectedPoint[0]}
                  cy={overlay.projectedPoint[1]}
                  r={isCurrent ? 5.5 : 4}
                  fill={stroke}
                  className={!isCurrent ? "cursor-pointer" : undefined}
                  onClick={
                    isCurrent ? undefined : () => onSelectCase(overlay.caseId)
                  }
                />
              )}
            </g>
          );
        })}
      </svg>
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

function buildMockCaseDetail(caseId: string): CaseDetail {
  return {
    case: {
      case_id: caseId,
      slug: "incident-cluster-at-schulhaus-kopfholz",
      title: "Incident cluster at Schulhaus Kopfholz",
      type: "incident",
      status: "open",
      classification: "physical",
      summary: "Case created from area scope around Schulhaus Kopfholz.",
      uncertainty_notes: "",
      geometry_json: "",
      aggregate_geometry_json: "",
      aggregate_bbox_json: "",
      anchor_report_seq: 1160263,
      severity_score: 1,
      urgency_score: 1,
      confidence_score: 0.92,
      exposure_score: 0.88,
      criticality_score: 0.94,
      trend_score: 0.73,
      cluster_count: 3,
      linked_report_count: 18,
      first_seen_at: "2026-02-23T12:13:31Z",
      last_seen_at: "2026-03-11T18:47:29Z",
      last_cluster_at: "2026-03-11T18:47:29Z",
      created_by_user_id: "preview",
      created_at: "2026-03-11T07:37:57Z",
      updated_at: "2026-03-11T18:47:29Z",
    },
    linked_reports: [
      {
        case_id: caseId,
        seq: 1160263,
        public_id: "rpt_mock_1160263",
        link_reason: "initial_selection",
        confidence: 1,
        attached_at: "2026-03-11T07:37:57Z",
        title:
          "Extreme Structural Hazard: Bricks Separating from Primary School Facade",
        summary:
          "The facade of a primary school building exhibits significant structural separation, with bricks at imminent risk of falling onto occupied school grounds.",
        classification: "physical",
        severity_level: 1,
        latitude: 47.3085,
        longitude: 8.53375,
        report_timestamp: "2026-02-23T12:13:31Z",
        recipient_count: 0,
      },
      {
        case_id: caseId,
        seq: 1160312,
        public_id: "rpt_mock_1160312",
        link_reason: "cluster_match",
        confidence: 0.95,
        attached_at: "2026-03-11T18:47:29Z",
        title:
          "Structural Defect: Significant Vertical Crack in Building Facade",
        summary:
          "A deep vertical crack is visible along the exterior facade, exposing substrate and suggesting escalating masonry failure.",
        classification: "physical",
        severity_level: 0.9,
        latitude: 47.30849,
        longitude: 8.53376,
        report_timestamp: "2026-03-10T14:06:00Z",
        recipient_count: 0,
      },
      {
        case_id: caseId,
        seq: 14036,
        public_id: "rpt_mock_14036",
        link_reason: "merged_from:case_287e7b4a3c08c00273ddedd8",
        confidence: 1,
        attached_at: "2026-03-11T18:35:44Z",
        title: "Visible Crack in Building Structure",
        summary:
          "Visible cracking and joint separation recur across multiple vantage points, reinforcing a school-facade failure pattern.",
        classification: "physical",
        severity_level: 0.8,
        latitude: 47.30848,
        longitude: 8.53374,
        report_timestamp: "2026-03-09T10:11:00Z",
        recipient_count: 0,
      },
    ],
    clusters: [],
    escalation_targets: [
      {
        id: 101,
        case_id: caseId,
        role_type: "operator",
        decision_scope: "site_ops",
        organization: "Schulhaus Kopfholz",
        display_name: "Schulverwaltung Adliswil",
        channel: "email",
        email: "schulverwaltung@adliswil.ch",
        phone: "+41447112020",
        website: "https://www.schule-adliswil.ch/",
        contact_url: "https://www.schule-adliswil.ch/area_contact",
        social_platform: "",
        social_handle: "",
        source_url:
          "https://www.schule-adliswil.ch/schule-adliswil/ueberblick/kontakt/p-183677/",
        evidence_text: "Schule Adliswil · Kontakt",
        verification_level: "official_site_page",
        attribution_class: "official_direct",
        target_source: "web_search",
        confidence_score: 0.93,
        actionability_score: 0.96,
        notify_tier: 1,
        send_eligibility: "auto",
        reason_selected:
          "School administration can act directly at the site and was identified from an official contact page.",
        rationale:
          "Official school administration contact identified from the school website for the affected campus.",
        created_at: "2026-03-11T18:47:29Z",
      },
      {
        id: 102,
        case_id: caseId,
        role_type: "architect",
        decision_scope: "project_party",
        organization: "Anderegg Partner AG",
        display_name: "Anderegg Partner AG",
        channel: "website",
        email: "",
        phone: "+41437112233",
        website: "https://andereggpartner.ch/",
        contact_url:
          "https://andereggpartner.ch/referenzen/objekt/2026-erweiterung-schulanlage-kopfholz-adlisiwl",
        social_platform: "",
        social_handle: "",
        source_url:
          "https://andereggpartner.ch/referenzen/objekt/2026-erweiterung-schulanlage-kopfholz-adlisiwl",
        evidence_text: "Project reference page for Kopfholz school extension",
        verification_level: "web_search_result",
        attribution_class: "heuristic",
        target_source: "web_search",
        confidence_score: 0.83,
        actionability_score: 0.47,
        notify_tier: 3,
        send_eligibility: "review",
        reason_selected:
          "Project-chain stakeholder relevant for a structural hazard, but requires review before outreach.",
        rationale:
          "Project-page search result links the firm to the Kopfholz school extension and points to its official contact surface.",
        created_at: "2026-03-11T18:47:29Z",
      },
      {
        id: 103,
        case_id: caseId,
        role_type: "contractor",
        decision_scope: "project_party",
        organization: "Example Bauunternehmung AG",
        display_name: "Example Bauunternehmung AG",
        channel: "website",
        email: "",
        phone: "+41445550000",
        website: "https://contractor.example/",
        contact_url: "https://contractor.example/referenzen/schulhaus-kopfholz",
        social_platform: "",
        social_handle: "",
        source_url: "https://contractor.example/referenzen/schulhaus-kopfholz",
        evidence_text: "Preview contractor reference page",
        verification_level: "web_search_result",
        attribution_class: "heuristic",
        target_source: "localhost_preview",
        confidence_score: 0.78,
        actionability_score: 0.43,
        notify_tier: 3,
        send_eligibility: "review",
        reason_selected:
          "Project-chain stakeholder relevant for a structural hazard, but requires review before outreach.",
        rationale:
          "Preview contractor card showing how a construction stakeholder would render when discovered from project references.",
        created_at: "2026-03-11T18:47:29Z",
      },
      {
        id: 104,
        case_id: caseId,
        role_type: "building_authority",
        decision_scope: "regulator",
        organization: "Stadt Adliswil",
        display_name: "Adliswil building office",
        channel: "website",
        email: "",
        phone: "+41447112000",
        website: "https://www.adliswil.ch/",
        contact_url: "https://www.adliswil.ch/de/verwaltung/bau",
        social_platform: "",
        social_handle: "",
        source_url: "https://www.adliswil.ch/aemter/13394",
        evidence_text: "Hochbau · Stadt Adliswil",
        verification_level: "official_authority_page",
        attribution_class: "official_direct",
        target_source: "web_search",
        confidence_score: 0.77,
        actionability_score: 0.79,
        notify_tier: 2,
        send_eligibility: "review",
        reason_selected:
          "Structural hazard warrants authority oversight even if the first notify wave stays narrower.",
        rationale:
          "Municipal building authority identified from the city administration website for local structural-hazard escalation.",
        created_at: "2026-03-11T18:47:29Z",
      },
    ],
    contact_observations: [
      {
        id: 7001,
        case_id: caseId,
        role_type: "operator",
        decision_scope: "site_ops",
        organization_name: "Schulhaus Kopfholz",
        person_name: "Schulverwaltung Adliswil",
        channel_type: "email",
        channel_value: "schulverwaltung@adliswil.ch",
        email: "schulverwaltung@adliswil.ch",
        phone: "+41447112020",
        website: "https://www.schule-adliswil.ch/",
        contact_url:
          "https://www.schule-adliswil.ch/schule-adliswil/ueberblick/kontakt/p-183677/",
        social_platform: "",
        social_handle: "",
        source_url:
          "https://www.schule-adliswil.ch/schule-adliswil/ueberblick/kontakt/p-183677/",
        evidence_text: "Schule Adliswil · Kontakt",
        verification_level: "official_site_page",
        attribution_class: "official_direct",
        confidence_score: 0.93,
        target_source: "web_search",
        discovered_at: "2026-03-11T18:47:29Z",
      },
    ],
    notify_plan: {
      id: 5001,
      case_id: caseId,
      plan_version: 1,
      hazard_mode: "emergency",
      status: "active",
      summary:
        "Immediate-response plan prioritizes 1 direct operators/owners first, with 1 authority targets ready in the next wave.",
      created_at: "2026-03-11T18:47:29Z",
      updated_at: "2026-03-11T18:47:29Z",
      items: [
        {
          id: 6001,
          plan_id: 5001,
          target_id: 101,
          observation_id: 7001,
          wave_number: 1,
          priority_rank: 1,
          role_type: "operator",
          decision_scope: "site_ops",
          actionability_score: 0.96,
          send_eligibility: "auto",
          reason_selected:
            "School administration can act directly at the site and was identified from an official contact page.",
          selected: true,
          created_at: "2026-03-11T18:47:29Z",
        },
        {
          id: 6002,
          plan_id: 5001,
          target_id: 104,
          observation_id: undefined,
          wave_number: 2,
          priority_rank: 1,
          role_type: "building_authority",
          decision_scope: "regulator",
          actionability_score: 0.79,
          send_eligibility: "review",
          reason_selected:
            "Structural hazard warrants authority oversight even if the first notify wave stays narrower.",
          selected: false,
          created_at: "2026-03-11T18:47:29Z",
        },
      ],
    },
    routing_profile: {
      id: 4001,
      subject_kind: "case",
      subject_ref: caseId,
      classification: "physical",
      defect_class: "physical_structural",
      defect_mode: "emergency",
      asset_class: "school",
      jurisdiction_key: "adliswil",
      exposure_mode: "public_exposure",
      severity_band: "critical",
      urgency_band: "immediate",
      context_json:
        '{"structural":true,"severe":true,"urgent":true,"immediate_danger":true}',
      refreshed_at: "2026-03-11T18:47:29Z",
    },
    execution_tasks: [
      {
        id: 7101,
        subject_kind: "case",
        subject_ref: caseId,
        target_id: 102,
        wave_number: 3,
        role_type: "architect",
        channel_type: "website",
        execution_mode: "task",
        task_status: "pending",
        summary: "Review architect contact path",
        payload_json:
          '{"target_id":102,"organization":"Anderegg Partner AG","channel":"website"}',
        assigned_user_id: "",
        created_at: "2026-03-11T18:47:29Z",
        updated_at: "2026-03-11T18:47:29Z",
      },
    ],
    notify_outcomes: [
      {
        id: 7201,
        subject_kind: "case",
        subject_ref: caseId,
        target_id: 101,
        endpoint_key: "email:schulverwaltung@adliswil.ch",
        outcome_type: "sent",
        source_type: "case_email_delivery",
        source_ref: "schulverwaltung@adliswil.ch",
        evidence_json:
          '{"recipient_email":"schulverwaltung@adliswil.ch","delivery_status":"sent"}',
        recorded_at: "2026-03-11T18:16:12Z",
      },
    ],
    escalation_actions: [],
    email_deliveries: [
      {
        id: 901,
        case_id: caseId,
        action_id: 801,
        target_id: 101,
        recipient_email: "schulverwaltung@adliswil.ch",
        delivery_status: "sent",
        delivery_source: "case_target",
        provider: "sendgrid",
        provider_message_id: "preview-message-1",
        sent_at: "2026-03-11T18:16:12Z",
        error_message: "",
        created_at: "2026-03-11T18:16:12Z",
      },
    ],
    resolution_signals: [],
    audit_events: [],
  };
}

function buildMockCaseEscalationDraft(
  caseId: string,
  displayTitle: string,
  targets: CaseEscalationTarget[],
  subject: string,
  body: string,
  ccEmails: string[],
): CaseEscalationDraftResponse {
  const permalink = `https://www.cleanapp.io/cases/${caseId}`;
  const nextSubject =
    subject.trim() || `[Preview] Immediate review requested: ${displayTitle}`;
  const nextBody =
    body.trim() ||
    `Guten Tag,\n\nCleanApp has aggregated multiple high-severity structural hazard reports tied to this location. The attached case indicates repeated evidence of facade separation and falling-brick risk near an occupied school site.\n\nCase link: ${permalink}\n\nBitte prüfen Sie die Situation kurzfristig und koordinieren Sie die appropriate technical response.\n`;
  return {
    case_id: caseId,
    subject: nextSubject,
    body: nextBody,
    cc_emails: ccEmails,
    targets,
    linked_count: 3,
  };
}

function buildMockNearbyCases(caseId: string): CaseMatchCandidate[] {
  return [
    {
      case_id: "case_preview_nearby_1",
      slug: "falling-debris-at-adjacent-playground",
      title: "Falling debris at adjacent playground",
      status: "open",
      classification: "physical",
      summary: "Potential overlap with the same masonry-failure zone.",
      geometry_json:
        '{"type":"Polygon","coordinates":[[[8.53395,47.30862],[8.53429,47.30851],[8.53419,47.30818],[8.53382,47.30828],[8.53395,47.30862]]]}',
      aggregate_geometry_json: "",
      aggregate_bbox_json: "[8.53382,47.30818,8.53429,47.30862]",
      anchor_report_seq: 1160312,
      anchor_lat: 47.30843,
      anchor_lng: 8.53404,
      cluster_count: 1,
      linked_report_count: 4,
      shared_report_count: 2,
      match_score: 0.74,
      match_reasons: ["overlapping area", "similar structural language"],
      updated_at: "2026-03-11T18:47:29Z",
    },
    {
      case_id: "case_preview_nearby_2",
      slug: "turnhalle-kopfholz-facade-cracking",
      title: "Turnhalle Kopfholz facade cracking",
      status: "investigating",
      classification: "physical",
      summary: "Related facade concerns on the same campus edge.",
      geometry_json:
        '{"type":"Polygon","coordinates":[[[8.53332,47.30815],[8.53377,47.30805],[8.53358,47.30779],[8.53318,47.30793],[8.53332,47.30815]]]}',
      aggregate_geometry_json: "",
      aggregate_bbox_json: "[8.53318,47.30779,8.53377,47.30815]",
      anchor_report_seq: 14036,
      anchor_lat: 47.30798,
      anchor_lng: 8.53349,
      cluster_count: 1,
      linked_report_count: 3,
      shared_report_count: 1,
      match_score: 0.61,
      match_reasons: ["same location"],
      updated_at: "2026-03-11T17:30:00Z",
    },
  ].filter((candidate) => candidate.case_id !== caseId);
}

function buildResponsiblePartyCards(
  targets: CaseEscalationTarget[],
  notifyPlan: CaseNotifyPlan | null,
  linkedReports: CaseDetail["linked_reports"],
  landmarkLabel: string | null,
  previewMode: boolean,
): ResponsiblePartyCard[] {
  const selectedTargetIds = new Set(
    (notifyPlan?.items ?? [])
      .filter((item) => item.selected && typeof item.target_id === "number")
      .map((item) => item.target_id as number),
  );
  const preferred = targets.filter(
    (target) => target.target_source !== "inferred_contact",
  );
  const base = preferred.length > 0 ? preferred : targets;
  if (!previewMode || !looksStructuralCase(linkedReports)) {
    return sortResponsibleParties(base, selectedTargetIds);
  }
  const hasStructuralStakeholder = base.some((target) =>
    ["architect", "contractor", "engineer", "building_authority"].includes(
      target.role_type,
    ),
  );
  if (hasStructuralStakeholder) {
    return sortResponsibleParties(base, selectedTargetIds);
  }

  const label = landmarkLabel || "the affected site";
  return sortResponsibleParties([
    ...base,
    {
      id: -101,
      case_id: "",
      role_type: "architect",
      decision_scope: "project_party",
      organization: `Project architect for ${label}`,
      display_name: `${label} design architect`,
      channel: "website",
      email: "",
      phone: "",
      website: "https://architect.example/contact",
      contact_url: "https://architect.example/projects",
      social_platform: "",
      social_handle: "",
      source_url: "https://architect.example/projects",
      evidence_text: "Preview architect project page",
      verification_level: "web_search_result",
      attribution_class: "heuristic",
      target_source: "localhost_preview",
      confidence_score: 0.82,
      actionability_score: 0.44,
      notify_tier: 3,
      send_eligibility: "review",
      reason_selected:
        "Project-chain stakeholder relevant for structural hazard review.",
      rationale:
        "Preview-only localhost card for a structurally relevant architect stakeholder.",
      created_at: "",
      preview_only: true,
    },
    {
      id: -102,
      case_id: "",
      role_type: "contractor",
      decision_scope: "project_party",
      organization: `General contractor for ${label}`,
      display_name: `${label} build contractor`,
      channel: "website",
      email: "",
      phone: "",
      website: "https://contractor.example/contact",
      contact_url: "https://contractor.example/references",
      social_platform: "",
      social_handle: "",
      source_url: "https://contractor.example/references",
      evidence_text: "Preview contractor reference page",
      verification_level: "web_search_result",
      attribution_class: "heuristic",
      target_source: "localhost_preview",
      confidence_score: 0.79,
      actionability_score: 0.41,
      notify_tier: 3,
      send_eligibility: "review",
      reason_selected:
        "Project-chain stakeholder relevant for structural hazard review.",
      rationale:
        "Preview-only localhost card for a structurally relevant contractor stakeholder.",
      created_at: "",
      preview_only: true,
    },
    {
      id: -103,
      case_id: "",
      role_type: "building_authority",
      decision_scope: "regulator",
      organization: `${label} municipal building office`,
      display_name: "Local building authority",
      channel: "website",
      email: "",
      phone: "",
      website: "https://municipality.example/building-office",
      contact_url: "https://municipality.example/emergency-reporting",
      social_platform: "",
      social_handle: "",
      source_url: "https://municipality.example/emergency-reporting",
      evidence_text: "Preview municipal building office contact page",
      verification_level: "official_authority_page",
      attribution_class: "official_direct",
      target_source: "localhost_preview",
      confidence_score: 0.74,
      actionability_score: 0.62,
      notify_tier: 2,
      send_eligibility: "review",
      reason_selected:
        "Authority oversight is relevant for structural defects affecting the public.",
      rationale:
        "Preview-only localhost card showing how a municipal authority would appear.",
      created_at: "",
      preview_only: true,
    },
  ], selectedTargetIds);
}

function sortResponsibleParties(
  targets: ResponsiblePartyCard[],
  selectedTargetIds: Set<number>,
): ResponsiblePartyCard[] {
  return [...targets].sort((a, b) => {
    const selectedDelta =
      Number(selectedTargetIds.has(b.id)) - Number(selectedTargetIds.has(a.id));
    if (selectedDelta !== 0) {
      return selectedDelta;
    }
    const tierDelta = (a.notify_tier || 99) - (b.notify_tier || 99);
    if (tierDelta !== 0) {
      return tierDelta;
    }
    const roleDelta = responsibleRolePriority(b.role_type) -
      responsibleRolePriority(a.role_type);
    if (roleDelta !== 0) {
      return roleDelta;
    }
    const actionabilityDelta =
      (b.actionability_score || 0) - (a.actionability_score || 0);
    if (actionabilityDelta !== 0) {
      return actionabilityDelta;
    }
    const confidenceDelta =
      (b.confidence_score || 0) - (a.confidence_score || 0);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }
    return (a.display_name || a.organization || "").localeCompare(
      b.display_name || b.organization || "",
    );
  });
}

function buildResponsiblePartySections(
  targets: ResponsiblePartyCard[],
  notifyPlan: CaseNotifyPlan | null,
  selectedTargetIds: number[],
  showAll: boolean,
): ResponsiblePartySection[] {
  const selectedIds = new Set(selectedTargetIds);
  const planSelectedIds = new Set(
    (notifyPlan?.items ?? [])
      .filter((item) => item.selected && typeof item.target_id === "number")
      .map((item) => item.target_id as number),
  );
  const notifyNow = targets.filter(
    (target) => planSelectedIds.has(target.id) || selectedIds.has(target.id),
  );
  const authorities = targets.filter(
    (target) =>
      !notifyNow.some((selected) => selected.id === target.id) &&
      target.decision_scope === "regulator",
  );
  const others = targets.filter(
    (target) =>
      !notifyNow.some((selected) => selected.id === target.id) &&
      !authorities.some((authority) => authority.id === target.id),
  );
  return [
    {
      key: "notify-now",
      title: "Notify now",
      description:
        "These are the smallest set of actors the routing engine thinks should be contacted first.",
      targets: visibleResponsiblePartyTargets(notifyNow, selectedIds, showAll),
    },
    {
      key: "authorities",
      title: "Authorities & oversight",
      description:
        "Official regulators, safety, and oversight stakeholders relevant to the case if escalation broadens.",
      targets: visibleResponsiblePartyTargets(authorities, selectedIds, showAll),
    },
    {
      key: "other-stakeholders",
      title: "Other stakeholders",
      description:
        "Additional project, owner, or context-specific stakeholders that may matter if the first wave is insufficient.",
      targets: visibleResponsiblePartyTargets(others, selectedIds, showAll),
    },
  ];
}

function visibleResponsiblePartyTargets(
  targets: ResponsiblePartyCard[],
  selectedTargetIds: Set<number>,
  showAll: boolean,
): ResponsiblePartyCard[] {
  if (showAll || targets.length <= 3) {
    return targets;
  }
  const top = targets.slice(0, 3);
  const selected = targets.filter((target) => selectedTargetIds.has(target.id));
  const deduped = new Map<number, ResponsiblePartyCard>();
  [...top, ...selected].forEach((target) => {
    deduped.set(target.id, target);
  });
  return [...deduped.values()];
}

function responsibleRolePriority(roleType: string): number {
  switch (roleType) {
    case "operator":
    case "operator_admin":
    case "site_leadership":
      return 6;
    case "public_safety":
    case "building_authority":
    case "fire_authority":
      return 5;
    case "facility_manager":
      return 4;
    case "architect":
    case "engineer":
    case "contractor":
      return 3;
    default:
      return 1;
  }
}

function resolveCaseFeature(
  caseView: CaseDetail["case"] | null | undefined,
): FeatureLike | null {
  if (!caseView) {
    return null;
  }
  return (
    parseFeatureLike(caseView.aggregate_geometry_json) ||
    parseFeatureLike(caseView.geometry_json) ||
    parseBBoxFeature(caseView.aggregate_bbox_json)
  );
}

function resolveCaseMatchFeature(
  caseView: CaseDetail["case"] | null | undefined,
): Feature | null {
  if (!caseView) {
    return null;
  }
  return (
    (parseFeatureLike(caseView.geometry_json) as Feature | null) ||
    (parseBBoxFeature(caseView.aggregate_bbox_json) as Feature | null)
  );
}

function resolveCandidateFeature(
  candidate: CaseMatchCandidate,
): FeatureLike | null {
  return (
    parseFeatureLike(candidate.aggregate_geometry_json) ||
    parseFeatureLike(candidate.geometry_json) ||
    parseBBoxFeature(candidate.aggregate_bbox_json)
  );
}

function parseBBoxFeature(value?: string | null): FeatureLike | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.length === 4 &&
      parsed.every((item) => typeof item === "number")
    ) {
      return bboxToFeature(parsed as [number, number, number, number]);
    }
  } catch {
    return null;
  }
  return null;
}

function parseFeatureLike(value?: string | null): FeatureLike | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (parsed.type === "Feature") {
      return parsed as Feature;
    }
    if (parsed.type === "FeatureCollection") {
      return parsed as FeatureCollection;
    }
    if (typeof parsed.type === "string") {
      return {
        type: "Feature",
        properties: {},
        geometry: parsed as Geometry,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function extractPolygonRings(feature: FeatureLike): Position[][] {
  return walkFeatureGeometry(feature).flatMap((geometry) => {
    if (geometry.type === "Polygon") {
      return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .map((polygon) => polygon[0])
        .filter(Boolean) as Position[][];
    }
    return [];
  });
}

function walkFeatureGeometry(feature: FeatureLike): Geometry[] {
  const source =
    feature.type === "FeatureCollection"
      ? feature.features
          .map((item) => item.geometry)
          .filter((geometry): geometry is Geometry => Boolean(geometry))
      : feature.geometry
        ? [feature.geometry]
        : [];

  const geometries: Geometry[] = [];
  source.forEach((geometry) => {
    geometries.push(...flattenGeometry(geometry));
  });
  return geometries;
}

function flattenGeometry(geometry: Geometry): Geometry[] {
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(flattenGeometry);
  }
  return [geometry];
}

function computeOverlayBounds(
  overlays: MiniMapOverlay[],
): [number, number, number, number] | null {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  overlays.forEach((overlay) => {
    overlay.polygons.forEach((ring) => {
      ring.forEach(([lng, lat]) => {
        west = Math.min(west, lng);
        south = Math.min(south, lat);
        east = Math.max(east, lng);
        north = Math.max(north, lat);
      });
    });
    if (overlay.point) {
      west = Math.min(west, overlay.point[0]);
      south = Math.min(south, overlay.point[1]);
      east = Math.max(east, overlay.point[0]);
      north = Math.max(north, overlay.point[1]);
    }
  });

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north)
  ) {
    return null;
  }

  const lngPadding = Math.max((east - west) * 0.1, 0.0004);
  const latPadding = Math.max((north - south) * 0.1, 0.0004);
  return [
    west - lngPadding,
    south - latPadding,
    east + lngPadding,
    north + latPadding,
  ];
}

function projectPosition(
  position: Position,
  bounds: [number, number, number, number],
  width: number,
  height: number,
): [number, number] {
  const [west, south, east, north] = bounds;
  const lngSpan = Math.max(east - west, 0.0001);
  const latSpan = Math.max(north - south, 0.0001);
  const x = ((position[0] - west) / lngSpan) * width;
  const y = height - ((position[1] - south) / latSpan) * height;
  return [x, y];
}

function ringToPath(ring: [number, number][]): string {
  if (ring.length === 0) {
    return "";
  }
  return ring
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ")
    .concat(" Z");
}

function buildHolisticClusterSummary(
  displayTitle: string,
  landmarkLabel: string | null,
  linkedReports: CaseDetail["linked_reports"],
  classification: string,
): string {
  if (linkedReports.length === 0) {
    return `No linked reports are available yet for ${landmarkLabel || "this case"}.`;
  }

  const highestSeverity = linkedReports[0]?.severity_level || 0;
  const severeCount = linkedReports.filter(
    (report) => report.severity_level >= 0.8,
  ).length;
  const recurringThemes = topThemeTerms(linkedReports, 3);
  const firstSeen = linkedReports
    .map((report) => new Date(report.report_timestamp))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const lastSeen = linkedReports
    .map((report) => new Date(report.report_timestamp))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const place = landmarkLabel || "the affected site";
  const timeWindow =
    firstSeen && lastSeen
      ? ` Reports span from ${firstSeen.toLocaleDateString()} to ${lastSeen.toLocaleDateString()}.`
      : "";
  const themes =
    recurringThemes.length > 0
      ? ` Repeated themes include ${recurringThemes.join(", ")}.`
      : "";

  if (looksStructuralCase(linkedReports)) {
    return `${linkedReports.length} linked reports converge on a structural hazard at ${place}. ${severeCount} reports are already in the highest-severity band, and the strongest evidence in "${displayTitle}" points to falling-material risk near an occupied public site.${themes}${timeWindow}`;
  }

  return `${linkedReports.length} linked ${classification} reports around ${place} point to a recurring incident pattern rather than a one-off event. The strongest report severity is ${Math.round(highestSeverity * 100)}%.${themes}${timeWindow}`;
}

function topThemeTerms(
  linkedReports: CaseDetail["linked_reports"],
  limit: number,
): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "with",
    "from",
    "this",
    "that",
    "building",
    "school",
    "hazard",
    "incident",
    "structural",
    "report",
    "reports",
    "primary",
    "exterior",
  ]);
  const counts = new Map<string, number>();
  for (const report of linkedReports) {
    const tokens = `${report.title} ${report.summary}`
      .toLowerCase()
      .match(/[a-zà-ÿ]{4,}/g);
    if (!tokens) {
      continue;
    }
    for (const token of tokens) {
      if (stopWords.has(token)) {
        continue;
      }
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function looksStructuralCase(
  linkedReports: CaseDetail["linked_reports"],
): boolean {
  const keywords = [
    "brick",
    "bricks",
    "crack",
    "cracks",
    "cracking",
    "facade",
    "wall",
    "concrete",
    "masonry",
    "structural",
    "collapse",
    "falling",
    "roof",
    "beam",
  ];
  return linkedReports.some((report) => {
    const text = `${report.title} ${report.summary}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
}

function formatRoleType(roleType: string): string {
  switch (roleType) {
    case "building_authority":
      return "Building authority";
    case "fire_authority":
      return "Fire authority";
    case "facility_manager":
      return "Facility manager";
    case "operator_admin":
      return "Operator admin";
    case "site_leadership":
      return "Site leadership";
    case "public_safety":
      return "Public safety";
    case "communications":
      return "Communications";
    default:
      return roleType
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function formatDecisionScope(scope: string): string {
  switch (scope) {
    case "site_ops":
      return "Site ops";
    case "asset_owner":
      return "Owner";
    case "regulator":
      return "Authority";
    case "project_party":
      return "Project party";
    default:
      return scope
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function formatVerificationLevel(level: string): string {
  switch (level) {
    case "official_site_page":
      return "Official page";
    case "official_authority_page":
      return "Official authority";
    case "mapped_area_contact":
      return "Mapped area";
    case "directory_listing":
      return "Directory";
    case "openstreetmap":
      return "OSM";
    case "web_search_result":
      return "Web reference";
    case "authority_reference":
      return "Authority ref";
    case "inferred":
      return "Inferred";
    default:
      return level
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function formatAttributionClass(attributionClass: string): string {
  switch (attributionClass) {
    case "official_direct":
      return "Official direct";
    case "official_registry":
      return "Official registry";
    case "heuristic":
      return "Heuristic";
    default:
      return attributionClass
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function formatTargetSourceLabel(source: string): string {
  switch (source) {
    case "area_contact":
      return "Mapped local contact";
    case "osm_reverse":
      return "OpenStreetMap contact";
    case "osm_poi":
      return "Nearby place contact";
    case "google_places":
      return "Google Places contact";
    case "web_search":
      return "Web-discovered stakeholder";
    case "localhost_preview":
      return "Local preview stakeholder";
    default:
      return source
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function formatRoutingBadge(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatExecutionMode(mode: string): string {
  switch (mode) {
    case "auto":
      return "Auto";
    case "task":
      return "Task";
    case "review":
      return "Review";
    case "hold":
      return "Hold";
    default:
      return formatRoutingBadge(mode || "pending");
  }
}

function formatTaskStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    default:
      return formatRoutingBadge(status || "pending");
  }
}

function humanizeOutcomeType(outcomeType: string): string {
  switch (outcomeType) {
    case "sent":
      return "Contact delivered";
    case "bounced":
      return "Contact bounced";
    case "acknowledged":
      return "Acknowledged";
    case "fixed":
      return "Marked fixed";
    case "misrouted":
      return "Misrouted";
    case "no_response":
      return "No response";
    default:
      return formatRoutingBadge(outcomeType || "outcome");
  }
}

function RouteBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
      {children}
    </span>
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
