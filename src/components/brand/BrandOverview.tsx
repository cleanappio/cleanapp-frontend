import { brandLabel } from "@/lib/report-evidence";
import type { PublicDiscoveryBatch } from "@/types/public-discovery";

export default function BrandOverview({ batch, product, locale = "en" }: {
  batch: PublicDiscoveryBatch | null;
  product: string;
  locale?: string;
}) {
  const overview = batch?.overview;
  if (!overview) return null;
  const number = new Intl.NumberFormat(locale);
  const total = number.format(overview.total_reports);
  return (
    <section aria-label="Report overview" className="mb-6 mt-5 border-y border-gray-200 py-5">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-gray-900">
        <strong className="text-4xl font-semibold tracking-tight sm:text-5xl">{total}</strong>
        <span className="text-base">{overview.total_reports === 1 ? "report" : "reports"} in CleanApp</span>
      </p>
      <p className="mt-2 text-sm text-gray-600">
        <span className="font-medium text-gray-900">{number.format(overview.reports_last_30_days)}</span> added in the past 30 days
        {" · "}<span className="font-medium text-gray-900">{number.format(overview.reports_last_7_days)}</span> in the past 7 days
      </p>
      <p className="mt-2 text-xs text-gray-500">{product ? brandLabel(product) : "All products"} · All source types. Related reports are grouped below.</p>
    </section>
  );
}
