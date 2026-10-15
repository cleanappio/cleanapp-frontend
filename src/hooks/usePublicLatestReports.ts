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
  const initialLimit = Math.min(50, Math.max(1, n));
  const scope = JSON.stringify([classification, locale, initialLimit]);
  const [limitState, setLimitState] = useState({ scope, limit: initialLimit });
  const limit = limitState.scope === scope ? limitState.limit : initialLimit;
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    items: PublicDiscoveryCard[];
    loading: boolean;
    error: string | null;
    refreshing: boolean;
    loadedLimit: number;
  }>({ scope, items: [], loading: true, error: null, refreshing: false, loadedLimit: 0 });
  const latestSnapshot = useRef(snapshot);
  const refresher = useRef<ReturnType<typeof startPublicLatestFeed> | null>(null);
  const refresh = useCallback(() => {
    refresher.current?.refresh();
  }, []);

  useEffect(() => {
    setLimitState((previous) => previous.scope === scope
      ? previous
      : { scope, limit: initialLimit });
  }, [scope, initialLimit]);

  useEffect(() => {
    const retained = latestSnapshot.current.scope === scope ? latestSnapshot.current : null;
    let loadedLimit = retained?.loadedLimit ?? 0;
    const feed = startPublicLatestFeed(
      (signal) => fetchPublicLatest(classification, locale, limit, signal),
      (next) => {
        if (!next.refreshing && !next.error) loadedLimit = limit;
        const updated = { scope, ...next, loadedLimit };
        latestSnapshot.current = updated;
        setSnapshot(updated);
      },
      retained?.items,
    );
    refresher.current = feed;
    return () => {
      feed.close();
      if (refresher.current === feed) refresher.current = null;
    };
  }, [classification, locale, limit, scope]);

  const current = snapshot.scope === scope;
  const hasMore = current && snapshot.loadedLimit > 0 && snapshot.loadedLimit < 50 && snapshot.items.length >= snapshot.loadedLimit;
  const loadingMore = current && snapshot.items.length > 0 && limit > snapshot.loadedLimit && !snapshot.error;
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    if (limit > snapshot.loadedLimit) {
      refresh(); // Retry an expansion without skipping its failed page size.
      return;
    }
    setLimitState({ scope, limit: snapshot.loadedLimit < 30 ? 30 : 50 });
  }, [hasMore, loadingMore, limit, snapshot.loadedLimit, scope, refresh]);

  return current
    ? { items: snapshot.items, loading: snapshot.loading, error: snapshot.error, refresh, hasMore, loadingMore, loadMore }
    : { items: [], loading: true, error: null, refresh, hasMore: false, loadingMore: false, loadMore };
}
