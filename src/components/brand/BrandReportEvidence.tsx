import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cleanAppSubmissionLabel, contentKind, evidenceDate, safePublicReferenceUrl } from "@/lib/report-evidence";
import { brandReportDate, compactReportSummary, reportSourceLabel } from "@/lib/brand-report-presentation";
import type { PublicDiscoveryCard } from "@/types/public-discovery";

const KIND_LABELS = { firsthand: "Personal experience", coverage: "News & discussion", unknown: "Other report" };
const RELATIONSHIP_LABELS = { affected: "Affected product or place", dependency: "Connected service", mentioned: "Mentioned in source", unknown: "Unknown" };
const CLIENT_LABELS: Record<string, string> = { grok: "Grok", chatgpt: "ChatGPT", claude: "Claude", codex: "Codex", other: "Other agent" };

export default function BrandReportEvidence({ item, productLabel, locale = "en", action, showSourceKind = false, notification }: {
  item: PublicDiscoveryCard;
  productLabel?: string | null;
  locale?: string;
  action: ReactNode;
  showSourceKind?: boolean;
  notification?: ReactNode;
}) {
  const { evidence, recurrence } = item;
  const excerpt = evidence?.excerpt?.trim();
  const date = brandReportDate(evidence, locale);
  const sourceUrl = safePublicReferenceUrl(evidence?.source_url);
  const sourceLabel = reportSourceLabel(evidence);
  const submissionLabel = cleanAppSubmissionLabel(evidence);
  const imported = evidence?.intake_method === "imported";
  const agentAssisted = evidence?.intake_channel === "agent_api";
  const references = (Array.isArray(evidence?.source_references) ? evidence.source_references.slice(0, 32) : []).filter(source => source && ["declared_source", "linked_post"].includes(source.kind) && safePublicReferenceUrl(source.url));
  const referenceUrls = new Set(references.map(source => safePublicReferenceUrl(source.url)));
  const submittedLinks = [...new Set((Array.isArray(evidence?.referenced_urls) ? evidence.referenced_urls.slice(0, 32) : []).map(safePublicReferenceUrl).filter((url): url is string => Boolean(url)))].filter(url => !referenceUrls.has(url) && url !== sourceUrl);
  const linkedPost = references.some(source => safePublicReferenceUrl(source.url) === sourceUrl && source.kind === "linked_post");
  const derivedPostDate = evidence?.source_published_at_basis === "derived_x_status_id";
  const client = evidence?.submission_client && evidence.submission_client_claimed ? CLIENT_LABELS[evidence.submission_client] : null;
  const sourceCount = typeof evidence?.source_reference_count === "number" && Number.isSafeInteger(evidence.source_reference_count) && evidence.source_reference_count >= 0 ? evidence.source_reference_count : null;
  const sourceAction = linkedPost ? `Read linked ${sourceLabel || "source"} post` : agentAssisted || references.length ? "Read supplied source reference" : "Read original source";
  const count = recurrence?.counts_exact ? recurrence.supporting_report_count : null;
  const summary = compactReportSummary(item.summary, item.title);
  const hasDetails = Boolean(evidence || recurrence || summary);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-gray-500">
        {productLabel && <span className="font-semibold text-green-800">{productLabel}</span>}
        {showSourceKind && <span className="font-medium text-gray-700">{KIND_LABELS[contentKind(evidence?.report_kind)]}</span>}
        {date && <time dateTime={date.value}>{date.label} {date.formatted}</time>}
        {submissionLabel ? <span>{submissionLabel}</span> : sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-gray-300 underline-offset-4 transition-colors hover:text-green-800 hover:decoration-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
            {linkedPost ? `Linked ${sourceLabel || "source"} post` : sourceLabel ? `From ${sourceLabel}` : "Source reference"} <span aria-hidden="true">↗</span>
          </a>
        ) : imported ? <span>{sourceLabel ? `From ${sourceLabel}` : "Imported report"}</span> : null}
        {notification}
        {count !== null && count > 1 && <span className="font-medium text-gray-700">{count.toLocaleString(locale)} related reports</span>}
      </div>

      {excerpt ? (
        <blockquote aria-label="Original report wording" className="line-clamp-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-800 [overflow-wrap:anywhere] sm:text-base">
          “{excerpt}”
        </blockquote>
      ) : !evidence?.has_original_media && summary ? (
        <div>
          <p className="mb-1 text-[11px] font-medium text-gray-500">AI summary</p>
          <p className="line-clamp-2 break-words text-sm leading-6 text-gray-700 [overflow-wrap:anywhere]">{summary}</p>
        </div>
      ) : null}

      <div className="relative clear-both pt-3">
        <div className="absolute right-0 top-3">{action}</div>
        {hasDetails ? (
          <details className="group">
            <summary className="flex min-h-[44px] w-fit cursor-pointer list-none items-center gap-1.5 pr-32 text-xs font-medium text-gray-500 transition-colors hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 [&::-webkit-details-marker]:hidden">
              Evidence details <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="space-y-4 border-t border-gray-200 pb-1 pt-4 text-sm leading-6 text-gray-600">
              {excerpt && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">Original wording</h4><blockquote className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">“{excerpt}”</blockquote></div>}
              {evidence?.reported_impact && <p><strong className="font-medium text-gray-900">Impact: </strong>{evidence.reported_impact}</p>}
              {summary && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">CleanApp AI summary</h4><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.summary}</p></div>}
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-gray-900">Source type</dt><dd>{KIND_LABELS[contentKind(evidence?.report_kind)]}</dd></div>
                <div><dt className="text-xs font-medium text-gray-900">How received</dt><dd>{submissionLabel || (imported ? `Imported${sourceLabel ? ` from ${sourceLabel}` : ""}` : "Submission channel not recorded")}</dd></div>
                {(evidence?.observed_at || agentAssisted) && <div><dt className="text-xs font-medium text-gray-900">Observed</dt><dd>{evidenceDate(evidence?.observed_at, locale) === "Unknown" ? "Observation time not supplied" : evidenceDate(evidence?.observed_at, locale)}</dd></div>}
                {(evidence?.source_published_at || agentAssisted) && <div><dt className="text-xs font-medium text-gray-900">{derivedPostDate ? "Post URL timestamp" : "Published"}</dt><dd>{evidenceDate(evidence?.source_published_at, locale) === "Unknown" ? "No separate publication date supplied" : <>{evidenceDate(evidence?.source_published_at, locale)}{derivedPostDate && <span className="block text-xs">Derived from the linked X post ID; publication not independently checked.</span>}</>}</dd></div>}
                {evidence?.ingested_at && <div><dt className="text-xs font-medium text-gray-900">Received by CleanApp</dt><dd>{evidenceDate(evidence.ingested_at, locale)}</dd></div>}
                {agentAssisted && <div><dt className="text-xs font-medium text-gray-900">Submitting client</dt><dd>{client ? `${client} (declared, not identity-verified)` : "Not recorded by the submitting adapter"}</dd></div>}
                {(evidence?.reporter_context === "firsthand" || evidence?.reporter_context === "relayed") && <div><dt className="text-xs font-medium text-gray-900">Reporter context</dt><dd>{evidence.reporter_context === "firsthand" ? "Firsthand observation (declared)" : "Relayed source material (declared)"}</dd></div>}
                {evidence?.reported_product_or_site && <div><dt className="text-xs font-medium text-gray-900">Affected product or site</dt><dd className="break-words">{evidence.reported_product_or_site}<span className="block text-xs">As supplied in the report</span></dd></div>}
                <div><dt className="text-xs font-medium text-gray-900">Verification</dt><dd>{evidence?.validation_status === "not_independently_reproduced" ? "Not independently reproduced" : "Unknown"}</dd></div>
                {evidence?.entity_relationship && evidence.entity_relationship !== "unknown" && <div><dt className="text-xs font-medium text-gray-900">Product connection</dt><dd>{RELATIONSHIP_LABELS[evidence.entity_relationship]}</dd></div>}
                {evidence?.upstream_status && evidence.upstream_status !== "unknown" && <div><dt className="text-xs font-medium text-gray-900">Original issue status</dt><dd>{evidence.upstream_status}</dd></div>}
                {evidence?.resolution_status && evidence.resolution_status !== "unknown" && <div><dt className="text-xs font-medium text-gray-900">Resolution</dt><dd>{evidence.resolution_status}</dd></div>}
              </dl>
              {evidence?.classification_reason && <p>{evidence.classification_reason}</p>}
              <p>1 submitted report{sourceCount === null ? " · Linked source total not available" : ` · ${sourceCount} linked source ${sourceCount === 1 ? "reference" : "references"}`}</p>
              {!!references.length && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">Supplied source references</h4><ul className="space-y-2">{references.map((source, index) => {
                const href = safePublicReferenceUrl(source.url);
                return href ? <li key={`${href}-${index}`} className="break-words"><span className="text-xs">{source.kind === "linked_post" ? "Post linked in the submitted report" : "Source reference supplied with the report"}</span><br /><a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{href} ↗</a></li> : null;
              })}</ul></div>}
              {!!submittedLinks.length && <div><h4 className="mb-1 text-xs font-semibold text-gray-900">Links in the submitted report</h4><ul className="space-y-2">{submittedLinks.map(href => <li key={href} className="break-words"><a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{href} ↗</a></li>)}</ul><p className="text-xs">These may identify affected pages or other context; a link alone is not independent verification.</p></div>}
              {count !== null && count > 1 && <p>{count.toLocaleString(locale)} related source reports.{recurrence?.independence !== "verified" ? " Sources have not been checked for independence." : ""} Report counts do not represent people.</p>}
              {recurrence?.source_account_count !== null && recurrence?.source_account_count !== undefined && <p>{recurrence.source_account_count.toLocaleString(locale)} source accounts.</p>}
              {recurrence?.related_observation_count !== null && recurrence?.related_observation_count !== undefined && recurrence.related_observation_count > 1 && <p>{recurrence.related_observation_count.toLocaleString(locale)} reports in a related case.{recurrence.case_id && <> <a href={`/cases/${encodeURIComponent(recurrence.case_id)}`} className="font-medium text-green-800 underline underline-offset-4">View case</a></>}</p>}
              {!!recurrence?.duplicate_import_count && <p>{recurrence.duplicate_import_count.toLocaleString(locale)} duplicate imports excluded.</p>}
              {!!recurrence?.supporting_sources?.length && (
                <div><h4 className="mb-2 text-xs font-semibold text-gray-900">Related sources</h4><ul className="space-y-3">{recurrence.supporting_sources.map((source, index) => {
                  const href = safePublicReferenceUrl(source.source_url);
                  const published = evidenceDate(source.source_published_at, locale);
                  return <li key={`${source.source_url || "source"}-${index}`}>
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-green-800 underline underline-offset-4">{source.title || "Original source"} ↗</a> : <span>{source.title || "Original source unavailable"}</span>}
                    {published !== "Unknown" && <p className="text-xs text-gray-500">Published {published}</p>}
                  </li>;
                })}</ul></div>
              )}
              {sourceUrl && submissionLabel && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline underline-offset-4">{sourceAction} ↗</a>}
            </div>
          </details>
        ) : <div className="h-11" />}
      </div>
    </div>
  );
}
