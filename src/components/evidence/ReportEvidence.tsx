import { cleanAppSubmissionLabel, contentKind, evidenceDate, safePublicReferenceUrl } from "@/lib/report-evidence";
import type { ReportEvidence as Evidence, ReportRecurrence } from "@/types/public-discovery";

const KIND_LABELS = { firsthand: "Personal experience", coverage: "News & discussion", unknown: "Other report" };
const RELATIONSHIP_LABELS = { affected: "Affected product or place", dependency: "Connected service", mentioned: "Mentioned in source", unknown: "Unknown" };
const CLIENT_LABELS: Record<string, string> = { grok: "Grok", chatgpt: "ChatGPT", claude: "Claude", codex: "Codex", other: "Other agent" };

function dateDetail(value: string | null | undefined, locale: string): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return `${new Date(value).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

export default function ReportEvidence({ evidence, recurrence, locale = "en", summary }: {
  evidence?: Evidence;
  recurrence?: ReportRecurrence;
  locale?: string;
  summary?: string;
}) {
  const kind = contentKind(evidence?.report_kind);
  const sourceUrl = safePublicReferenceUrl(evidence?.source_url);
  const sourceLabel = ({ bluesky: "Bluesky", github: "GitHub", x: "X", reddit: "Reddit" }[evidence?.source_platform?.toLowerCase() || ""] || evidence?.source_platform || "source");
  const count = recurrence?.counts_exact ? recurrence.supporting_report_count : null;
  const validation = evidence?.validation_status === "not_independently_reproduced"
    ? "Not independently reproduced"
    : "Independent validation unknown";
  const excerpt = evidence?.excerpt?.trim();
  const published = evidenceDate(evidence?.source_published_at, locale);
  const observed = evidenceDate(evidence?.observed_at, locale);
  const intake = cleanAppSubmissionLabel(evidence) || (evidence?.intake_method === "imported" ? `Imported${sourceLabel !== "source" ? ` from ${sourceLabel}` : ""}` : null);
  const agentAssisted = evidence?.intake_channel === "agent_api";
  const references = (Array.isArray(evidence?.source_references) ? evidence.source_references.slice(0, 32) : []).filter(item => item && ["declared_source", "linked_post"].includes(item.kind) && safePublicReferenceUrl(item.url));
  const referenceUrls = new Set(references.map(item => item.url));
  const submittedLinks = [...new Set(Array.isArray(evidence?.referenced_urls) ? evidence.referenced_urls.slice(0, 32) : [])].filter(url => safePublicReferenceUrl(url) && !referenceUrls.has(url) && url !== sourceUrl);
  const sourceDate = dateDetail(evidence?.source_published_at, locale);
  const derivedPostDate = evidence?.source_published_at_basis === "derived_x_status_id";
  const client = evidence?.submission_client && evidence.submission_client_claimed ? CLIENT_LABELS[evidence.submission_client] : null;

  return (
    <div className="text-sm text-gray-600">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-semibold text-green-800">{KIND_LABELS[kind]}</span>
        {intake && <span>{intake}</span>}
        {observed !== "Unknown" ? <span>Observed {observed}</span> : published !== "Unknown" ? <span>{derivedPostDate ? "Linked post URL date" : "Published"} {published}{derivedPostDate ? " (derived)" : ""}</span> : null}
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
            {references.some(item => item.url === sourceUrl && item.kind === "linked_post") ? `Read linked ${sourceLabel} post` : `Read original ${sourceLabel}`} ↗
          </a>
        )}
        <details className="group w-full border-t border-gray-200 pt-1">
          <summary className="cursor-pointer py-3 font-medium text-gray-800 transition-colors hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">Details & sources</summary>
          <div className="space-y-4 pb-4 pt-1">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-gray-900">How received</dt><dd>{intake || "Submission channel not recorded"}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">{derivedPostDate ? "Post URL timestamp" : "Source published"}</dt><dd>{sourceDate ? <>{sourceDate}{derivedPostDate && <span className="block text-xs">Derived from the linked X post ID; publication not independently checked.</span>}</> : agentAssisted ? "No separate publication date supplied" : "Not supplied by the source"}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Observed</dt><dd>{dateDetail(evidence?.observed_at, locale) || "Observation time not supplied"}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Received by CleanApp</dt><dd>{dateDetail(evidence?.ingested_at, locale) || "Receipt time unavailable"}</dd></div>
              {agentAssisted && <div><dt className="text-xs font-semibold text-gray-900">Submitting client</dt><dd>{client ? `${client} (declared, not identity-verified)` : "Not recorded by the submitting adapter"}</dd></div>}
              {evidence?.reporter_context && evidence.reporter_context !== "unknown" && <div><dt className="text-xs font-semibold text-gray-900">Reporter context</dt><dd>{evidence.reporter_context === "firsthand" ? "Firsthand observation (declared)" : "Relayed source material (declared)"}</dd></div>}
              {evidence?.reported_product_or_site && <div><dt className="text-xs font-semibold text-gray-900">Affected product or site</dt><dd className="break-words">{evidence.reported_product_or_site}<span className="block text-xs">As supplied in the report</span></dd></div>}
              <div><dt className="text-xs font-semibold text-gray-900">Product connection</dt><dd>{evidence?.entity_relationship === "unknown" || !evidence?.entity_relationship ? "Connection not classified" : RELATIONSHIP_LABELS[evidence.entity_relationship]}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Original issue status</dt><dd>{!evidence?.upstream_status || evidence.upstream_status === "unknown" ? "No upstream issue status supplied" : evidence.upstream_status}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Resolution</dt><dd>{!evidence?.resolution_status || evidence.resolution_status === "unknown" ? "No resolution recorded" : evidence.resolution_status}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-900">Verification</dt><dd>{validation}</dd></div>
            </dl>
            <p className="text-xs">1 submitted report{evidence?.source_reference_count !== null && evidence?.source_reference_count !== undefined ? ` · ${evidence.source_reference_count} linked source ${evidence.source_reference_count === 1 ? "reference" : "references"}` : " · Linked source total not available"}</p>
            <p className="text-xs">{count !== null ? `${count} ${count === 1 ? "report" : "reports"} in this source group` : "Related report total not available for this view"}{recurrence?.source_account_count !== null && recurrence?.source_account_count !== undefined ? ` · ${recurrence.source_account_count} source accounts` : ""}{count !== null && count > 1 && recurrence?.independence !== "verified" ? " · Sources not checked for independence" : ""}</p>
            {!!references.length && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">Supplied source references</h4><ul className="space-y-2">{references.map((source, index) => {
              const href = safePublicReferenceUrl(source.url);
              return href ? <li key={`${href}-${index}`} className="break-words"><span className="text-xs">{source.kind === "linked_post" ? "Post linked in the submitted report" : "Source reference supplied with the report"}</span><br /><a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{href} ↗</a></li> : null;
            })}</ul></div>}
            {!!submittedLinks.length && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">Links in the submitted report</h4><ul className="space-y-2">{submittedLinks.map(href => <li key={href} className="break-words"><a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{href} ↗</a></li>)}</ul><p className="mt-1 text-xs">These may identify affected pages or other context; a link alone is not independent verification.</p></div>}
            {recurrence?.related_observation_count !== null && recurrence?.related_observation_count !== undefined && recurrence.related_observation_count > 1 && <p className="text-xs">{recurrence.related_observation_count} related reports in a case{recurrence.case_id && <> · <a href={`/cases/${encodeURIComponent(recurrence.case_id)}`} className="font-medium text-green-800 underline underline-offset-4">View case</a></>}</p>}
            {evidence?.classification_reason && <p><strong className="font-medium text-gray-900">Why this source type: </strong>{evidence.classification_reason}</p>}
            {!!recurrence?.supporting_sources?.length && <div><h4 className="mb-2 text-xs font-semibold text-gray-900">Related sources</h4><ul className="space-y-3">{recurrence.supporting_sources.map((source, index) => {
              const href = safePublicReferenceUrl(source.source_url);
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
