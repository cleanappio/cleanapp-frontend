import type { PublicDiscoveryBatch } from "@/types/public-discovery";
import { brandLabel } from "@/lib/report-evidence";

export default function BrandOverview({ batch, locale = "en", brandName, brandDisplayName }: {
  batch: PublicDiscoveryBatch | null;
  locale?: string;
  brandName?: string;
  brandDisplayName?: string;
}) {
  const overview = batch?.overview;
  if (!overview) return null;
  const number = new Intl.NumberFormat(locale);
  const total = number.format(overview.total_reports);
  const scopeName = batch?.scope?.product || batch?.scope?.brand_name || brandName;
  const scopeLabel = scopeName ? brandLabel(scopeName, scopeName.toLowerCase() === brandName?.toLowerCase() ? brandDisplayName : undefined) : null;
  const hasRecentActivity = overview.reports_last_30_days > 0 || overview.reports_last_7_days > 0;
  return (
    <section aria-label="Report overview" className="mb-6 mt-5 border-y border-gray-200 py-5">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-gray-900">
        <strong className="text-4xl font-semibold tracking-tight sm:text-5xl">{total}</strong>
        <span className="text-base">{overview.total_reports === 1 ? "report" : "reports"}{scopeLabel ? ` about ${scopeLabel}` : ""} in CleanApp</span>
      </p>
      <p className="relative isolate mt-2 inline-block text-sm text-gray-600">
        {hasRecentActivity && <span aria-hidden="true" className="brand-recent-sheen" />}
        <span className="font-medium text-gray-900">{number.format(overview.reports_last_30_days)}</span> added in the past 30 days
        {" · "}<span className="font-medium text-gray-900">{number.format(overview.reports_last_7_days)}</span> in the past 7 days
      </p>
    </section>
  );
}
