import type {
  CaseContactObservation,
  CaseEscalationTarget,
  CaseNotifyPlan,
  NotifyExecutionTask,
  NotifyOutcome,
  SubjectRoutingProfile,
} from "@/lib/cases-api-client";
import { reportOrganizations } from "@/lib/report-contact-summary";

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

export default function ReportContactStrategyPanel({ strategy, loading, error, compact = false }: Props) {
  const organizations = reportOrganizations(strategy);
  return (
    <section className={`mb-6 border-b border-gray-200 ${compact ? "pb-4" : "pb-6"}`}>
      <h2 className="text-lg font-semibold text-gray-900">Relevant organizations</h2>
      {loading ? <p className="mt-2 text-sm text-gray-500">Loading organizations…</p> : null}
      {!loading && error ? <p className="mt-2 text-sm text-gray-500">Organizations unavailable.</p> : null}
      {!loading && !error ? (
        <p className="mt-2 text-sm text-gray-700">
          {organizations.length ? organizations.join(" · ") : "No organizations identified yet."}
        </p>
      ) : null}
    </section>
  );
}
