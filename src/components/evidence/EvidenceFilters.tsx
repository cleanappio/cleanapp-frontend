import type { ReportKindFilter, ReportSignalSort } from "@/lib/report-evidence";
import type { PublicDiscoveryBatch } from "@/types/public-discovery";

const FILTERS: { value: ReportKindFilter; label: string }[] = [
  { value: "firsthand", label: "Firsthand" },
  { value: "coverage", label: "Coverage" },
  { value: "unknown", label: "Unclassified" },
  { value: "all", label: "All sources" },
];

export default function EvidenceFilters({ kind, sort, product, batch, onKind, onSort, onProduct }: {
  kind: ReportKindFilter;
  sort: ReportSignalSort;
  product: string;
  batch: PublicDiscoveryBatch | null;
  onKind: (kind: ReportKindFilter) => void;
  onSort: (sort: ReportSignalSort) => void;
  onProduct: (product: string) => void;
}) {
  return (
    <div className="mb-4 border-b border-gray-200">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex max-w-full gap-x-4 overflow-x-auto" role="group" aria-label="Source type">
          {FILTERS.map((filter) => (
            <button key={filter.value} type="button" aria-pressed={kind === filter.value} onClick={() => onKind(filter.value)} className={`min-h-[44px] shrink-0 border-b-2 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 ${kind === filter.value ? "border-green-700 font-semibold text-green-800" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
              {filter.label}{batch?.counts_exact && batch.kind_counts ? <span className="ml-1 text-xs font-normal">({batch.kind_counts[filter.value]})</span> : null}
            </button>
          ))}
        </div>
        <div className="mb-1 flex max-w-full flex-wrap gap-3">
          {!!batch?.scope?.products.length && <label className="flex items-center gap-2 text-xs text-gray-600"><span className="sr-only sm:not-sr-only">Product</span><select aria-label="Product" value={product} onChange={(event) => onProduct(event.target.value)} className="min-h-[44px] max-w-[136px] sm:max-w-[190px] rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"><option value="">All products</option>{batch.scope.products.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
          <label className="flex items-center gap-2 text-xs text-gray-600"><span className="sr-only sm:not-sr-only">Sort</span><select aria-label="Sort reports" value={sort} onChange={(event) => onSort(event.target.value as ReportSignalSort)} className="min-h-[44px] rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900"><option value="signal">Signal</option><option value="recent">Recent</option><option value="recurrence">Recurrence</option></select></label>
        </div>
      </div>
    </div>
  );
}
