"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import type { Feature } from "geojson";
import { authApiClient } from "@/lib/auth-api-client";
import { navigateToCase } from "@/lib/case-navigation";
import {
  buildCaseDisplaySummary,
  buildCaseDisplayTitle,
  buildCaseScopeLabel,
} from "@/lib/case-display";
import {
  casesApiClient,
  CaseMatchCandidate,
  ClusterAnalysisResponse,
  ClusterIncidentHypothesis,
} from "@/lib/cases-api-client";

interface CaseWorkspacePanelProps {
  scopeLabel: string;
  scopeType: "place" | "area";
  geometry: Feature;
  variant?: "floating" | "embedded";
  onClose?: () => void;
}

function scoreLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

function matchScoreLabel(value: number) {
  return `${Math.round(value * 100)}% match`;
}

export default function CaseWorkspacePanel({
  scopeLabel,
  scopeType,
  geometry,
  variant = "floating",
  onClose,
}: CaseWorkspacePanelProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<ClusterAnalysisResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [creatingHypothesisId, setCreatingHypothesisId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const token = authApiClient.getAuthToken();

  const topHypotheses = useMemo(
    () => (analysis?.hypotheses || []).slice(0, 3),
    [analysis],
  );
  const topCandidateCases = useMemo(
    () => (analysis?.candidate_cases || []).slice(0, 3),
    [analysis],
  );
  const preferredCandidate = useMemo(() => {
    const first = topCandidateCases[0];
    if (!first || first.match_score < 0.58) {
      return null;
    }
    return first;
  }, [topCandidateCases]);
  const displayScopeLabel = useMemo(
    () => buildCaseScopeLabel(scopeLabel, analysis?.suggested_targets),
    [analysis?.suggested_targets, scopeLabel],
  );

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await casesApiClient.analyzeClusterByGeometry({
        geometry,
        classification: "physical",
        n: 250,
      });
      setAnalysis(data);
    } catch (err) {
      console.error("Failed to analyze cluster", err);
      setError("Failed to analyze this scope");
    } finally {
      setLoading(false);
    }
  };

  const createCase = async (
    hypothesis?: ClusterIncidentHypothesis,
    existingCase?: CaseMatchCandidate | null,
    forceNewCase = false,
  ) => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!analysis) {
      return;
    }

    const title =
      hypothesis?.title ||
      existingCase?.title ||
      buildCaseDisplayTitle(
        "selected area incident cluster",
        displayScopeLabel,
      );
    const reportSeqs = hypothesis?.report_seqs?.length
      ? hypothesis.report_seqs
      : analysis.reports.map((item) => item.report.seq);
    const anchorSeq =
      hypothesis?.representative_report_seq || reportSeqs[0] || 0;

    setCreatingHypothesisId(hypothesis?.hypothesis_id || "generic");
    setError(null);
    try {
      const detail = await casesApiClient.upsertFromCluster({
        title,
        type: "incident",
        status: "open",
        classification: analysis.classification,
        summary:
          hypothesis?.rationale?.join(" ") ||
          buildCaseDisplaySummary(
            `Case created from ${scopeType} scope ${scopeLabel}.`,
            displayScopeLabel,
          ),
        geometry,
        anchor_report_seq: anchorSeq,
        report_seqs: reportSeqs,
        existing_case_id: existingCase?.case_id,
        force_new_case: forceNewCase,
        cluster_summary: `Cluster analyzed from ${scopeType} scope around ${displayScopeLabel}.`,
        cluster_source_type: analysis.scope_type,
        cluster_stats: analysis.stats,
        cluster_analysis: {
          hypotheses: analysis.hypotheses,
        },
        escalation_targets: analysis.suggested_targets,
      });
      await navigateToCase(router, detail.case.case_id);
    } catch (err) {
      console.error("Failed to create or attach case", err);
      setError("Failed to save case");
    } finally {
      setCreatingHypothesisId(null);
    }
  };

  const isEmbedded = variant === "embedded";
  const wrapperClassName = isEmbedded
    ? "w-full"
    : "absolute z-20 left-4 right-4 top-24 md:left-auto md:right-4 md:top-28 md:w-[420px]";
  const panelClassName = isEmbedded
    ? "rounded-2xl border border-emerald-600/30 bg-slate-950/95 shadow-xl overflow-hidden"
    : "rounded-2xl border border-emerald-600/40 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden";

  return (
    <div className={wrapperClassName}>
      <div className={panelClassName}>
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/90">
                Cluster Workspace
              </p>
              <h3 className="text-white text-lg font-semibold leading-tight">
                {displayScopeLabel}
              </h3>
              <p className="text-emerald-50/85 text-sm">
                Analyze this {scopeType} scope, group reports into incident
                hypotheses, and grow an existing case when the match is strong.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md border border-emerald-200/30 bg-black/15 px-2 py-1 text-lg leading-none text-white hover:bg-black/25"
                aria-label="Close cluster workspace"
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {!analysis && (
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium px-4 py-3 transition-colors"
            >
              {loading ? "Analyzing cluster..." : "Analyze cluster"}
            </button>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {analysis && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3">
                  <p className="text-slate-400">Reports</p>
                  <p className="text-white text-xl font-semibold">
                    {analysis.stats.report_count}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3">
                  <p className="text-slate-400">High priority</p>
                  <p className="text-white text-xl font-semibold">
                    {analysis.stats.high_priority_count}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3">
                  <p className="text-slate-400">Max severity</p>
                  <p className="text-white text-xl font-semibold">
                    {scoreLabel(analysis.stats.severity_max)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3">
                  <p className="text-slate-400">Targets</p>
                  <p className="text-white text-xl font-semibold">
                    {analysis.suggested_targets.length}
                  </p>
                </div>
              </div>

              {topCandidateCases.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-semibold">
                      Existing nearby cases
                    </h4>
                    <span className="text-xs text-slate-400">
                      Strong matches should absorb this cluster.
                    </span>
                  </div>
                  {topCandidateCases.map((candidate) => (
                    <div
                      key={candidate.case_id}
                      className="rounded-xl border border-sky-500/30 bg-slate-900/70 px-3 py-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-white font-medium">
                            {candidate.title}
                          </h5>
                          <p className="text-sm text-slate-300">
                            {matchScoreLabel(candidate.match_score)} ·{" "}
                            {candidate.linked_report_count} linked reports ·{" "}
                            {candidate.cluster_count} clusters
                          </p>
                        </div>
                        <button
                          onClick={() => createCase(undefined, candidate)}
                          disabled={creatingHypothesisId !== null}
                          className="shrink-0 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-medium px-3 py-2"
                        >
                          Attach cluster
                        </button>
                      </div>
                      {candidate.match_reasons?.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                          {candidate.match_reasons.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-semibold">
                    Suggested incidents
                  </h4>
                  <button
                    onClick={runAnalysis}
                    className="text-sm text-emerald-300 hover:text-emerald-200"
                  >
                    Refresh
                  </button>
                </div>

                {topHypotheses.length === 0 ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-slate-300">
                    No distinct incident hypotheses yet. You can still create or
                    attach the full cluster.
                  </div>
                ) : (
                  topHypotheses.map((hypothesis) => (
                    <div
                      key={hypothesis.hypothesis_id}
                      className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-white font-medium">
                            {hypothesis.title}
                          </h5>
                          <p className="text-sm text-slate-300">
                            {hypothesis.report_count} reports · severity{" "}
                            {scoreLabel(hypothesis.severity_score)} · urgency{" "}
                            {scoreLabel(hypothesis.urgency_score)}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            createCase(hypothesis, preferredCandidate)
                          }
                          disabled={creatingHypothesisId !== null}
                          className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium px-3 py-2"
                        >
                          {creatingHypothesisId === hypothesis.hypothesis_id
                            ? "Saving..."
                            : preferredCandidate
                              ? "Attach"
                              : "Create case"}
                        </button>
                      </div>
                      {preferredCandidate && (
                        <button
                          onClick={() => createCase(hypothesis, null, true)}
                          disabled={creatingHypothesisId !== null}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-60"
                        >
                          Create new case instead
                        </button>
                      )}
                      <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                        {hypothesis.rationale.slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 space-y-2">
                <h4 className="text-white font-semibold">
                  Suggested escalation targets
                </h4>
                {analysis.suggested_targets.length === 0 ? (
                  <p className="text-sm text-slate-300">
                    No targets were inferred yet for this scope.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {analysis.suggested_targets.slice(0, 4).map((target) => (
                      <div
                        key={`${target.email}-${target.organization}`}
                        className="text-sm"
                      >
                        <p className="text-white">
                          {target.display_name ||
                            target.organization ||
                            target.email}
                        </p>
                        <p className="text-slate-400">
                          {target.email || target.phone} ·{" "}
                          {scoreLabel(target.confidence_score || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => createCase(undefined, preferredCandidate)}
                disabled={creatingHypothesisId !== null}
                className="w-full rounded-xl border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-900/60 disabled:opacity-60 text-emerald-100 font-medium px-4 py-3"
              >
                {creatingHypothesisId === "generic"
                  ? "Saving case..."
                  : preferredCandidate
                    ? "Attach full cluster to existing case"
                    : token
                      ? "Create case from full cluster"
                      : "Sign in to create case"}
              </button>
              {preferredCandidate && (
                <button
                  onClick={() => createCase(undefined, null, true)}
                  disabled={creatingHypothesisId !== null}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/60 hover:bg-slate-800/60 disabled:opacity-60 text-slate-100 font-medium px-4 py-3"
                >
                  {creatingHypothesisId === "generic"
                    ? "Saving case..."
                    : token
                      ? "Create a new case from full cluster"
                      : "Sign in to create case"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
