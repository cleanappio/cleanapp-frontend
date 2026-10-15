import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentLocale } from "@/lib/i18n";
import { fetchPublicLatest } from "@/lib/public-discovery-api";
import { PublicDiscoveryCard } from "@/types/public-discovery";
import { startPublicLatestFeed } from "@/lib/public-latest-feed";

export function usePublicLatestReports(
  classification: "physical" | "digital",
  n: number = 10,
) {
  const locale = getCurrentLocale();
  const scope = JSON.stringify([classification, locale, n]);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    items: PublicDiscoveryCard[];
    loading: boolean;
    error: string | null;
  }>({ scope, items: [], loading: true, error: null });
  const refresher = useRef<ReturnType<typeof startPublicLatestFeed> | null>(null);
  const refresh = useCallback(() => {
    refresher.current?.refresh();
  }, []);

  useEffect(() => {
    const feed = startPublicLatestFeed(
      (signal) => fetchPublicLatest(classification, locale, n, signal),
      (next) => setSnapshot({ scope, ...next }),
    );
    refresher.current = feed;
    return () => {
      feed.close();
      if (refresher.current === feed) refresher.current = null;
    };
  }, [classification, locale, n, scope]);

  return snapshot.scope === scope
    ? { items: snapshot.items, loading: snapshot.loading, error: snapshot.error, refresh }
    : { items: [], loading: true, error: null, refresh };
}
