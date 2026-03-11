import { useEffect, useState } from "react";
import { getCurrentLocale } from "@/lib/i18n";
import { fetchPublicLatest } from "@/lib/public-discovery-api";
import { PublicDiscoveryCard } from "@/types/public-discovery";

export function usePublicLatestReports(
  classification: "physical" | "digital",
  n: number = 10,
) {
  const [items, setItems] = useState<PublicDiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const locale = getCurrentLocale();

    setLoading(true);
    setError(null);

    fetchPublicLatest(classification, locale, n)
      .then((batch) => {
        if (!cancelled) {
          setItems(batch.items || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Load failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [classification, n]);

  return { items, loading, error };
}
