import { useEffect, useState } from "react";
import { fetchPublicBrandReports, type PublicEvidenceQuery } from "@/lib/public-discovery-api";
import { matchesContentKind } from "@/lib/report-evidence";
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
  const { kind = "firsthand", sort = "signal", offset = 0, product } = query;

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
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [brandName, enabled, locale, kind, sort, offset, product, revision]);

  // A legacy API can ignore the new filters. Unknown rows never enter Firsthand.
  const items: PublicDiscoveryCard[] = (batch?.items || []).filter((item) => matchesContentKind(item.evidence?.report_kind, kind));
  const hasScopedCounts = batch?.kind === kind && batch?.counts_exact === true;
  return {
    items,
    batch,
    totalCount: hasScopedCounts ? batch?.total_count ?? items.length : items.length,
    highPriority: batch?.high_priority_count ?? 0,
    mediumPriority: batch?.medium_priority_count ?? 0,
    brandDisplayName: batch?.items.find((item) => item.brand_name?.toLowerCase() === brandName.toLowerCase())?.brand_display_name || ({ openai: "OpenAI", anthropic: "Anthropic", claude: "Claude", grok: "Grok", xai: "xAI" }[brandName.toLowerCase()] ?? brandName),
    isLoading,
    error,
    hasScopedCounts,
    refresh: () => setRevision((current) => current + 1),
  };
}
