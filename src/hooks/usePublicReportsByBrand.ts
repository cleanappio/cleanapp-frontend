import { useEffect, useState } from "react";
import { fetchPublicBrandReports, type PublicEvidenceQuery } from "@/lib/public-discovery-api";
import { brandLabel, matchesContentKind } from "@/lib/report-evidence";
import { PublicDiscoveryBatch, PublicDiscoveryCard } from "@/types/public-discovery";

export function usePublicReportsByBrand(
  brandName: string,
  locale: string,
  enabled = true,
  query: PublicEvidenceQuery = {},
) {
  const [batch, setBatch] = useState<PublicDiscoveryBatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [completedScope, setCompletedScope] = useState<string | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const { kind = "firsthand", sort = "recent", offset = 0, product } = query;
  const requestScope = JSON.stringify([brandName, locale, kind, sort, offset, product, revision]);
  // Keep later evidence-filter changes from restarting an open subscriber list.
  useEffect(() => { setCompletedScope(null); }, [brandName, locale]);

  useEffect(() => {
    if (!enabled || !brandName) {
      setBatch(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setBatch(null);
    setIsLoading(true);
    setError(null);
    fetchPublicBrandReports(brandName, locale, 12, { kind, sort, offset, product })
      .then((nextBatch) => { if (!cancelled) setBatch(nextBatch); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Load failed"); })
      .finally(() => {
        if (!cancelled) {
          setCompletedScope(JSON.stringify([brandName, locale]));
          setLoadedScope(requestScope);
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [brandName, enabled, locale, kind, sort, offset, product, revision, requestScope]);

  // Suppress prior evidence and counts during the render before effects reset.
  const currentScopeLoaded = enabled && Boolean(brandName) && loadedScope === requestScope;
  const currentBatch = currentScopeLoaded ? batch : null;
  // A legacy API can ignore the new filters. Unknown rows never enter Firsthand.
  const items: PublicDiscoveryCard[] = (currentBatch?.items || []).filter((item) => matchesContentKind(item.evidence?.report_kind, kind));
  const hasScopedCounts = currentBatch?.kind === kind && currentBatch?.counts_exact === true;
  return {
    items,
    batch: currentBatch,
    totalCount: hasScopedCounts ? currentBatch?.total_count ?? items.length : items.length,
    highPriority: currentBatch?.high_priority_count ?? 0,
    mediumPriority: currentBatch?.medium_priority_count ?? 0,
    brandDisplayName: brandLabel(brandName, currentBatch?.items.find((item) => item.brand_name?.toLowerCase() === brandName.toLowerCase())?.brand_display_name),
    isLoading: enabled && Boolean(brandName) && (isLoading || !currentScopeLoaded),
    error: currentScopeLoaded ? error : null,
    hasScopedCounts,
    hasCompletedRequest: enabled && completedScope === JSON.stringify([brandName, locale]),
    refresh: () => setRevision((current) => current + 1),
  };
}
