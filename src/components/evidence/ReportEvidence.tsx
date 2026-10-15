import { cleanAppSubmissionLabel, contentKind, evidenceDate, safeOriginalSourceUrl } from "@/lib/report-evidence";
import type { ReportEvidence as Evidence, ReportRecurrence } from "@/types/public-discovery";

const KIND_LABELS = { firsthand: "Personal experience", coverage: "News & discussion", unknown: "Other report" };
const RELATIONSHIP_LABELS = { affected: "Affected product or place", dependency: "Connected service", mentioned: "Mentioned in source", unknown: "Unknown" };

export default function ReportEvidence({ evidence, recurrence, locale = "en", summary }: {
  evidence?: Evidence;
  recurrence?: ReportRecurrence;
  locale?: string;
  summary?: string;
}) {
  const kind = contentKind(evidence?.report_kind);
  const sourceUrl = safeOriginalSourceUrl(evidence?.source_url);
  const sourceLabel = ({ bluesky: "Bluesky", github: "GitHub", x: "X", reddit: "Reddit" }[evidence?.source_platform?.toLowerCase() || ""] || evidence?.source_platform || "source");
  const count = recurrence?.counts_exact ? recurrence.supporting_report_count : null;
  const validation = evidence?.validation_status === "not_independently_reproduced"
    ? "Not independently reproduced"
    : "Independent validation unknown";
  const excerpt = evidence?.excerpt?.trim();
  const published = evidenceDate(evidence?.source_published_at, locale);
  const observed = evidenceDate(evidence?.observed_at, locale);
  const intake = cleanAppSubmissionLabel(evidence) || (evidence?.intake_method === "imported" ? `Imported${sourceLabel !== "source" ? ` from ${sourceLabel}` : ""}` : null);

  return (
    <div className="text-sm text-gray-600">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-semibold text-green-800">{KIND_LABELS[kind]}</span>
        {intake && <span>{intake}</span>}
        {observed !== "Unknown" ? <span>Observed {observed}</span> : published !== "Unknown" ? <span>Published {published}</span> : null}
      </div>
      {evidence?.reported_impact && (
        <p className="mb-3 leading-6"><strong className="font-medium text-gray-900">Impact: </strong>{evidence.reported_impact}</p>
      )}
      <div className="mb-3 rounded-lg border-l-2 border-green-600 bg-green-50 px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-green-800">{excerpt ? "From the original report" : "Original report"}</p>
        {excerpt ? (
          <blockquote className="whitespace-pre-wrap break-words text-base leading-6 text-gray-900">“{excerpt}”</blockquote>
        ) : evidence?.has_original_media ? (
          <p className="leading-6">Original image available in report details.</p>
        ) : (
          <p className="leading-6">Original text unavailable.{sourceUrl ? " Read the linked source." : " Original source unconfirmed."}</p>
        )}
      </div>
      {count !== null && count > 1 && <p className="text-xs leading-5">{count} related source reports · May describe the same incident</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center font-semibold text-green-800 underline decoration-green-300 underline-offset-4 transition-colors hover:decoration-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
            Read original {sourceLabel} ↗
          </a>
        )}
        <details className="group w-full border-t border-gray-200 pt-1">
          <summary className="cursor-pointer py-3 font-medium text-gray-800 transition-colors hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">Details & sources</summary>
          <div className="space-y-4 pb-4 pt-1">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-gray-900">How received</dt><dd>{intake || "Unknown"}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Source published</dt><dd>{evidenceDate(evidence?.source_published_at, locale)}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Observed</dt><dd>{observed}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Added to CleanApp</dt><dd>{evidenceDate(evidence?.ingested_at, locale)}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Product connection</dt><dd>{RELATIONSHIP_LABELS[evidence?.entity_relationship || "unknown"]}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Original issue status</dt><dd>{!evidence?.upstream_status || evidence.upstream_status === "unknown" ? "Unknown" : evidence.upstream_status}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Resolution</dt><dd>{!evidence?.resolution_status || evidence.resolution_status === "unknown" ? "Unknown" : evidence.resolution_status}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Verification</dt><dd>{validation}</dd></div>
            </dl>
            <p className="text-xs">{count ? `${count} source ${count === 1 ? "report" : "reports"}` : "Source count unknown"}{recurrence?.source_account_count !== null && recurrence?.source_account_count !== undefined ? ` · ${recurrence.source_account_count} source accounts` : ""}{count !== null && count > 1 && recurrence?.independence !== "verified" ? " · Sources not checked for independence" : ""}</p>
            {recurrence?.related_observation_count !== null && recurrence?.related_observation_count !== undefined && recurrence.related_observation_count > 1 && <p className="text-xs">{recurrence.related_observation_count} related reports in a case{recurrence.case_id && <> · <a href={`/cases/${encodeURIComponent(recurrence.case_id)}`} className="font-medium text-green-800 underline underline-offset-4">View case</a></>}</p>}
            {evidence?.classification_reason && <p><strong className="font-medium text-gray-900">Why this source type: </strong>{evidence.classification_reason}</p>}
            {!!recurrence?.supporting_sources?.length && <div><h4 className="mb-2 text-xs font-semibold text-gray-900">Related sources</h4><ul className="space-y-3">{recurrence.supporting_sources.map((source, index) => {
              const href = safeOriginalSourceUrl(source.source_url);
              return <li key={`${source.source_url || "source"}-${index}`}><p className="break-words">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{source.title || "Original source"} ↗</a> : source.title || "Original source unavailable"}</p><p className="text-xs">{KIND_LABELS[contentKind(source.report_kind)]} · Source published: {evidenceDate(source.source_published_at, locale)}</p></li>;
            })}</ul><p className="mt-2 text-xs">Related reports may describe different problems. Their connection has not been independently verified.</p></div>}
            {summary && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">CleanApp AI summary</h4><p className="whitespace-pre-wrap break-words leading-6">{summary}</p></div>}
            {!!recurrence?.duplicate_import_count && <p>{recurrence.duplicate_import_count} duplicate imports excluded from the source count.</p>}
            <p className="text-xs">Report counts are not affected-user counts. A closed original issue does not confirm a fix.</p>
          </div>
        </details>
      </div>
    </div>
  );
}
