import { useEffect, useState } from "react";
import { fetchPublicBrandReports } from "@/lib/public-discovery-api";
import { PublicDiscoveryBatch, PublicDiscoveryCard } from "@/types/public-discovery";

export function usePublicReportsByBrand(
  brandName: string,
  locale: string,
  enabled: boolean = true,
) {
  const [items, setItems] = useState<PublicDiscoveryCard[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [highPriority, setHighPriority] = useState<number>(0);
  const [mediumPriority, setMediumPriority] = useState<number>(0);
  const [brandDisplayName, setBrandDisplayName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !brandName) {
      setItems([]);
      setTotalCount(0);
      setHighPriority(0);
      setMediumPriority(0);
      setBrandDisplayName("");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPublicBrandReports(brandName, locale, 12)
      .then((batch: PublicDiscoveryBatch) => {
        if (cancelled) {
          return;
        }
        const nextItems = batch.items || [];
        setItems(nextItems);
        setTotalCount(batch.total_count || nextItems.length || 0);
        setHighPriority(batch.high_priority_count || 0);
        setMediumPriority(batch.medium_priority_count || 0);
        setBrandDisplayName(
          nextItems[0]?.brand_display_name || brandName,
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Load failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [brandName, enabled, locale]);

  return {
    items,
    totalCount,
    highPriority,
    mediumPriority,
    brandDisplayName,
    isLoading,
    error,
  };
}
