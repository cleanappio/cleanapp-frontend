import { useEffect, useState } from "react";
import { fetchPublicBrandReports, type PublicEvidenceQuery } from "@/lib/public-discovery-api";
import { brandLabel, matchesContentKind } from "@/lib/report-evidence";
import type { PublicBrandMetadata, PublicDiscoveryBatch, PublicDiscoveryCard } from "@/types/public-discovery";

const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const isDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

function matchesScope(batch: PublicDiscoveryBatch, brand: string, product?: string) {
  return batch.scope?.brand_name?.toLowerCase() === brand.toLowerCase() &&
    (batch.scope.product || "") === (product || "");
}

function exactMetadata(batch: PublicDiscoveryBatch): PublicBrandMetadata | null {
  if (batch.counts_exact !== true || !batch.kind_counts ||
    !batch.kind || !isCount(batch.total_count) || batch.kind_counts[batch.kind] !== batch.total_count ||
    !["firsthand", "coverage", "unknown", "all"].every(kind => isCount(batch.kind_counts?.[kind as keyof typeof batch.kind_counts])) ||
    !Array.isArray(batch.scope?.products) || !batch.scope.products.every(product => typeof product === "string")) return null;
  const overview = batch.overview;
  const validOverview = overview &&
    [overview.total_reports, overview.reports_last_30_days, overview.reports_last_7_days, overview.reports_previous_7_days].every(isCount) &&
    overview.classification === "digital" && overview.date_basis === "added_to_cleanapp" && isDate(overview.as_of) &&
    (overview.latest_report_at === null || isDate(overview.latest_report_at));
  if (!validOverview) return null;
  return {
    counts_exact: true, kind_counts: batch.kind_counts, scope: batch.scope, overview,
    ...(isDate(batch.snapshot_at) ? { snapshot_at: batch.snapshot_at } : {}),
  };
}

type BrandRequest = { scope: string };
type CountSnapshot = { metadata: PublicBrandMetadata; request: BrandRequest; receivedAt: string };
type ReportPage = { view: string; batch: PublicDiscoveryBatch; preview: boolean };

export function usePublicReportsByBrand(
  brandName: string,
  locale: string,
  enabled = true,
  query: PublicEvidenceQuery = {},
  initialBatch?: PublicDiscoveryBatch | null,
) {
  const { kind = "firsthand", sort = "recent", offset = 0 } = query;
  const product = query.product || undefined;
  const brandScope = JSON.stringify([brandName, locale]);
  const countScope = JSON.stringify([brandName, locale, product]);
  const viewScope = JSON.stringify([countScope, kind, sort, offset]);
  const seedMatches = kind === "firsthand" && sort === "recent" && offset === 0 && !product &&
    Boolean(initialBatch && (initialBatch.brand_name ? initialBatch.brand_name.toLowerCase() === brandName.toLowerCase() :
      initialBatch.items.length > 0 && initialBatch.items.every(item => item.brand_name?.toLowerCase() === brandName.toLowerCase())));
  const seedDisplayName = seedMatches ? initialBatch?.brand_display_name || initialBatch?.items.find(item => item.brand_name?.toLowerCase() === brandName.toLowerCase())?.brand_display_name : undefined;
  const [page, setPage] = useState<ReportPage | null>(seedMatches && initialBatch ? { view: viewScope, batch: initialBatch, preview: true } : null);
  const [snapshots, setSnapshots] = useState<Record<string, CountSnapshot>>({});
  const [displayNames, setDisplayNames] = useState<Record<string, string>>(seedDisplayName ? { [brandScope]: seedDisplayName } : {});
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const requestScope = JSON.stringify([viewScope, revision]);
  const [attempt, setAttempt] = useState<BrandRequest | null>(null);
  const [finishedRequest, setFinishedRequest] = useState<BrandRequest | null>(null);
  const [completedScope, setCompletedScope] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !brandName) return;
    const controller = new AbortController();
    const request = { scope: requestScope };
    setAttempt(request);
    if (seedMatches && initialBatch) {
      setPage(current => current?.view === viewScope ? current : { view: viewScope, batch: initialBatch, preview: true });
      if (seedDisplayName) setDisplayNames(current => current[brandScope] === seedDisplayName ? current : { ...current, [brandScope]: seedDisplayName });
    }
    setError(null);
    fetchPublicBrandReports(brandName, locale, 12, { kind, sort, offset, product }, controller.signal)
      .then(nextBatch => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(nextBatch.items) || !matchesScope(nextBatch, brandName, product) ||
          nextBatch.kind !== kind || nextBatch.sort !== sort || nextBatch.offset !== offset) {
          throw new Error("Brand report response did not match the selected view");
        }
        setPage({ view: viewScope, batch: nextBatch, preview: false });
        const displayName = nextBatch.brand_name?.toLowerCase() === brandName.toLowerCase() ? nextBatch.brand_display_name :
          nextBatch.items.find(item => item.brand_name?.toLowerCase() === brandName.toLowerCase())?.brand_display_name;
        if (displayName) setDisplayNames(current => ({ ...current, [brandScope]: displayName }));
        const metadata = exactMetadata(nextBatch);
        if (metadata) setSnapshots(current => ({
          ...current, [countScope]: { metadata, request, receivedAt: new Date().toISOString() },
        }));
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Load failed"); })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCompletedScope(brandScope);
          setFinishedRequest(request);
        }
      });
    return () => controller.abort();
  }, [brandName, enabled, locale, kind, sort, offset, product, requestScope, brandScope, countScope, viewScope, initialBatch, seedMatches, seedDisplayName]);

  // A retry can retain the identical view; another kind, sort, product or page
  // can only show its own response. Metadata uses the broader count scope.
  const active = enabled && Boolean(brandName);
  const currentPage = active && page?.view === viewScope ? page : null;
  const currentBatch = currentPage?.batch || null;
  const snapshot = active ? snapshots[countScope] : undefined;
  const fetching = active && (attempt?.scope !== requestScope || finishedRequest !== attempt);
  const items: PublicDiscoveryCard[] = (currentBatch?.items || []).filter(item => matchesContentKind(item.evidence?.report_kind, kind));
  const hasScopedCounts = currentBatch?.counts_exact === true && isCount(currentBatch.total_count) &&
    isCount(currentBatch.kind_counts?.[kind]) && currentBatch.total_count === currentBatch.kind_counts?.[kind];
  return {
    items, batch: currentBatch,
    metadata: snapshot?.metadata || null,
    metadataRetained: Boolean(snapshot && snapshot.request !== attempt),
    metadataReceivedAt: snapshot?.receivedAt,
    isPreview: Boolean(currentPage?.preview),
    totalCount: hasScopedCounts ? currentBatch!.total_count! : items.length,
    highPriority: currentBatch?.high_priority_count ?? 0,
    mediumPriority: currentBatch?.medium_priority_count ?? 0,
    brandDisplayName: brandLabel(brandName, displayNames[brandScope] || seedDisplayName),
    isLoading: fetching && !currentPage,
    isRefreshing: fetching && Boolean(currentPage),
    error: attempt?.scope === requestScope && finishedRequest === attempt ? error : null,
    hasScopedCounts,
    hasCompletedRequest: active && completedScope === brandScope,
    refresh: () => setRevision(current => current + 1),
  };
}
