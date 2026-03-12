import type {
  CaseContactObservation,
  CaseEscalationTarget,
  CaseNotifyPlan,
  NotifyExecutionTask,
  NotifyOutcome,
  SubjectRoutingProfile,
} from "@/lib/cases-api-client";
import { useMemo, useState } from "react";

export type ReportContactStrategyResponse = {
  report_seq: number;
  public_id: string;
  escalation_targets: CaseEscalationTarget[];
  contact_observations: CaseContactObservation[];
  notify_plan: CaseNotifyPlan | null;
  routing_profile?: SubjectRoutingProfile | null;
  execution_tasks?: NotifyExecutionTask[];
  notify_outcomes?: NotifyOutcome[];
  refreshed: boolean;
  contact_strategy_stale?: boolean;
};

type Props = {
  strategy: ReportContactStrategyResponse | null;
  loading: boolean;
  error: string | null;
  compact?: boolean;
};

type StrategySection = {
  key: string;
  title: string;
  description: string;
  targets: CaseEscalationTarget[];
};

export default function ReportContactStrategyPanel({
  strategy,
  loading,
  error,
  compact = false,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const selectedTargetIds = useMemo(() => {
    const ids = new Set<number>();
    strategy?.notify_plan?.items?.forEach((item) => {
      if (item.selected && item.target_id) {
        ids.add(item.target_id);
      }
    });
    return ids;
  }, [strategy?.notify_plan]);

  const sections = useMemo(() => {
    const targets = [...(strategy?.escalation_targets ?? [])].sort((a, b) => {
      const aSelected = selectedTargetIds.has(a.id);
      const bSelected = selectedTargetIds.has(b.id);
      if (aSelected !== bSelected) {
        return aSelected ? -1 : 1;
      }
      if ((a.notify_tier ?? 9) !== (b.notify_tier ?? 9)) {
        return (a.notify_tier ?? 9) - (b.notify_tier ?? 9);
      }
      if ((a.actionability_score ?? 0) !== (b.actionability_score ?? 0)) {
        return (b.actionability_score ?? 0) - (a.actionability_score ?? 0);
      }
      return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
    });

    const notifyNow = targets.filter(
      (target) =>
        selectedTargetIds.has(target.id) ||
        ["site_ops", "asset_owner"].includes(target.decision_scope ?? ""),
    );
    const authorities = targets.filter(
      (target) =>
        target.decision_scope === "regulator" && !notifyNow.includes(target),
    );
    const others = targets.filter(
      (target) => !notifyNow.includes(target) && !authorities.includes(target),
    );

    return [
      {
        key: "notify-now",
        title: "Notify now",
        description:
          "Primary operators or owners who can act immediately on this report.",
        targets: visibleTargets(notifyNow, showAll),
      },
      {
        key: "authorities",
        title: "Authorities & oversight",
        description:
          "Regulators, safety authorities, or municipal oversight stakeholders.",
        targets: visibleTargets(authorities, showAll),
      },
      {
        key: "others",
        title: "Other stakeholders",
        description:
          "Additional project-chain or contextual stakeholders discovered for this report.",
        targets: visibleTargets(others, showAll),
      },
    ].filter((section) => section.targets.length > 0);
  }, [selectedTargetIds, showAll, strategy?.escalation_targets]);

  const hiddenCount = Math.max(
    0,
    (strategy?.escalation_targets?.length ?? 0) -
      sections.reduce((sum, section) => sum + section.targets.length, 0),
  );

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Responsible parties
          </h2>
          <p className="text-sm text-slate-600">
            Official operators, authorities, and other stakeholders relevant to
            this report.
          </p>
          {strategy?.notify_plan?.summary ? (
            <p className="mt-2 text-sm text-slate-700">
              {strategy.notify_plan.summary}
            </p>
          ) : null}
          {strategy?.routing_profile ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                strategy.routing_profile.defect_class,
                strategy.routing_profile.asset_class,
                strategy.routing_profile.exposure_mode,
                strategy.routing_profile.urgency_band,
              ]
                .filter(Boolean)
                .map((token) => (
                  <span
                    key={token}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600"
                  >
                    {formatTokenLabel(token)}
                  </span>
                ))}
            </div>
          ) : null}
        </div>
        {strategy?.contact_strategy_stale ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Using cached contacts while refresh completes
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : null}

      {!loading && error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      {!loading && !error && sections.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No responsible parties identified yet for this report.
        </p>
      ) : null}

      {!loading && !error && sections.length > 0 ? (
        <div className="mt-4 space-y-5">
          {sections.map((section) => (
            <StrategySectionCard
              key={section.key}
              section={section}
              selectedTargetIds={selectedTargetIds}
            />
          ))}
          {(strategy?.execution_tasks?.length ?? 0) > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Execution queue
              </h3>
              <div className="mt-3 space-y-2">
                {strategy?.execution_tasks?.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <p className="font-medium text-slate-900">
                      {task.summary || "Follow-up task"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Wave {task.wave_number} · {formatTokenLabel(task.execution_mode)} · {formatTokenLabel(task.task_status)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {(strategy?.notify_outcomes?.length ?? 0) > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recent outcomes
              </h3>
              <div className="mt-3 space-y-2">
                {strategy?.notify_outcomes?.slice(0, 5).map((outcome) => (
                  <div
                    key={outcome.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <p className="font-medium text-slate-900">
                      {formatTokenLabel(outcome.outcome_type)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {outcome.source_ref || outcome.endpoint_key || "Recorded outcome"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {(hiddenCount > 0 || (strategy?.escalation_targets?.length ?? 0) > 3) ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showAll ? "Show fewer" : "Show all responsible parties"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StrategySectionCard({
  section,
  selectedTargetIds,
}: {
  section: StrategySection;
  selectedTargetIds: Set<number>;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {section.title}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{section.description}</p>
      </div>
      <div className="space-y-3">
        {section.targets.map((target) => {
          const selected = selectedTargetIds.has(target.id);
          return (
            <article
              key={`${section.key}-${target.id}-${target.email || target.phone || target.display_name || target.organization}`}
              className={`rounded-2xl border px-4 py-4 ${
                selected
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {target.display_name || target.organization || "Contact"}
                    </p>
                    {selected ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Notify now
                      </span>
                    ) : null}
                    {target.role_type ? (
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {formatRoleLabel(target.role_type)}
                      </span>
                    ) : null}
                  </div>
                  {target.organization &&
                  target.display_name &&
                  target.organization !== target.display_name ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {target.organization}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                  {Math.round((target.confidence_score ?? 0) * 100)}% confidence
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-700">
                {target.email ? (
                  <p>
                    <a
                      href={`mailto:${target.email}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {target.email}
                    </a>
                  </p>
                ) : null}
                {target.phone ? <p>{target.phone}</p> : null}
                {target.contact_url ? (
                  <p>
                    <a
                      href={target.contact_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Contact page
                    </a>
                  </p>
                ) : null}
                {!target.contact_url && target.website ? (
                  <p>
                    <a
                      href={target.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Official site
                    </a>
                  </p>
                ) : null}
              </div>

              {target.reason_selected ? (
                <p className="mt-3 text-sm text-slate-600">
                  {target.reason_selected}
                </p>
              ) : null}

              {target.source_url ? (
                <p className="mt-2 text-xs text-slate-500">
                  Source:{" "}
                  <a
                    href={target.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {target.source_url}
                  </a>
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function visibleTargets(targets: CaseEscalationTarget[], showAll: boolean) {
  if (showAll || targets.length <= 3) {
    return targets;
  }
  return targets.slice(0, 3);
}

function formatRoleLabel(role: string) {
  return role.replace(/_/g, " ");
}

function formatTokenLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
