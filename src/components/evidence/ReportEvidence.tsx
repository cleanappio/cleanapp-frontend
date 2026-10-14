import { contentKind, evidenceDate, safeOriginalSourceUrl } from "@/lib/report-evidence";
import type { ReportEvidence as Evidence, ReportRecurrence } from "@/types/public-discovery";

const KIND_LABELS = { firsthand: "Firsthand account", coverage: "Coverage", unknown: "Unclassified source" };
const RELATIONSHIP_LABELS = { affected: "Affected product / property", dependency: "Integration dependency", mentioned: "Mentioned in source", unknown: "Relationship unconfirmed" };

export default function ReportEvidence({ evidence, recurrence, locale = "en", summary }: {
  evidence?: Evidence;
  recurrence?: ReportRecurrence;
  locale?: string;
  summary?: string;
}) {
  const kind = contentKind(evidence?.report_kind);
  const sourceUrl = safeOriginalSourceUrl(evidence?.source_url);
  const sourceLabel = evidence?.source_platform || "Original source";
  const count = recurrence?.counts_exact ? recurrence.supporting_report_count : null;
  const validation = evidence?.validation_status === "not_independently_reproduced"
    ? "Not independently reproduced"
    : "Independent validation unknown";
  const excerpt = evidence?.excerpt?.trim();

  return (
    <div className="text-sm text-gray-600">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-semibold text-green-800">{KIND_LABELS[kind]}</span>
        <span>{evidence?.intake_label || "Intake unknown"}</span>
        <span>{sourceLabel}</span>
      </div>
      {evidence?.reported_impact && (
        <p className="mb-3 leading-6"><strong className="font-medium text-gray-900">Reported impact: </strong>{evidence.reported_impact}</p>
      )}
      <div className="mb-3 rounded-lg border-l-2 border-green-600 bg-green-50 px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-green-800">{excerpt ? "Original source wording" : "Original evidence"}</p>
        {excerpt ? (
          <blockquote className="whitespace-pre-wrap break-words text-base leading-6 text-gray-900">“{excerpt}”</blockquote>
        ) : evidence?.has_original_media ? (
          <p className="leading-6">Original image is available in report details. No original text excerpt is available.</p>
        ) : (
          <p className="leading-6">Original wording is not available in CleanApp.{sourceUrl ? " Inspect the linked source." : " Source evidence has not been established."}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5">
        <span>Source published: {evidenceDate(evidence?.source_published_at, locale)}</span>
        <span>Observed: {evidenceDate(evidence?.observed_at, locale)}</span>
        <span>{validation}</span>
      </div>
      <p className="mt-2 text-xs leading-5">
        {count ? count === 1 ? "Single source report" : `${count} supporting source reports` : "Supporting source count unconfirmed"}
        {count !== null && count > 1 && recurrence?.independence !== "verified" ? " · Independence unassessed" : ""}
        {recurrence?.source_account_count !== null && recurrence?.source_account_count !== undefined ? ` · ${recurrence.source_account_count} source accounts` : ""}
      </p>
      {recurrence?.related_observation_count !== null && recurrence?.related_observation_count !== undefined && recurrence.related_observation_count > 1 && <p className="mt-1 text-xs leading-5">{recurrence.related_observation_count} related observations in a case · Independence unassessed{recurrence.case_id && <> · <a href={`/cases/${encodeURIComponent(recurrence.case_id)}`} className="font-medium text-green-800 underline underline-offset-4">View related case</a></>}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center font-semibold text-green-800 underline decoration-green-300 underline-offset-4 transition-colors hover:decoration-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
            Open original {sourceLabel === "Original source" ? "source" : sourceLabel} ↗
          </a>
        )}
        <details className="group w-full border-t border-gray-200 pt-1">
          <summary className="cursor-pointer py-3 font-medium text-gray-800 transition-colors hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">Inspect evidence</summary>
          <div className="space-y-4 pb-4 pt-1">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-gray-900">Source published</dt><dd>{evidenceDate(evidence?.source_published_at, locale)}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Observed / occurred</dt><dd>{evidenceDate(evidence?.observed_at, locale)}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Added to CleanApp</dt><dd>{evidenceDate(evidence?.ingested_at, locale)}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Entity relationship</dt><dd>{RELATIONSHIP_LABELS[evidence?.entity_relationship || "unknown"]}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Upstream status</dt><dd>{!evidence?.upstream_status || evidence.upstream_status === "unknown" ? "Unknown" : evidence.upstream_status}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Resolution</dt><dd>{!evidence?.resolution_status || evidence.resolution_status === "unknown" ? "Unknown" : evidence.resolution_status}</dd></div>
            </dl>
            {evidence?.classification_reason && <p><strong className="font-medium text-gray-900">Source classification: </strong>{evidence.classification_reason}</p>}
            {!!recurrence?.supporting_sources?.length && <div><h4 className="mb-2 text-xs font-semibold text-gray-900">Supporting original sources</h4><ul className="space-y-3">{recurrence.supporting_sources.map((source, index) => {
              const href = safeOriginalSourceUrl(source.source_url);
              return <li key={`${source.source_url || "source"}-${index}`}><p className="break-words">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{source.title || "Original source"} ↗</a> : source.title || "Original source unavailable"}</p><p className="text-xs">{KIND_LABELS[contentKind(source.report_kind)]} · Source published: {evidenceDate(source.source_published_at, locale)}</p></li>;
            })}</ul><p className="mt-2 text-xs">Related sources form an issue family; the association does not establish an identical defect or independent corroboration.</p></div>}
            {summary && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">CleanApp AI summary</h4><p className="whitespace-pre-wrap break-words leading-6">{summary}</p></div>}
            {!!recurrence?.duplicate_import_count && <p>{recurrence.duplicate_import_count} duplicate imports excluded from the supporting report count.</p>}
            <p className="text-xs">An upstream closure does not establish a fix. Supporting source reports do not establish affected-user totals.</p>
          </div>
        </details>
      </div>
      {!!evidence?.why_surfaced?.length && <p className="border-t border-gray-100 pt-3 text-xs leading-5"><strong className="font-medium text-gray-900">Why surfaced: </strong>{evidence.why_surfaced.join(" · ")}</p>}
    </div>
  );
}
