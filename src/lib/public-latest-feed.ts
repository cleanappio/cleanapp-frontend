import type { PublicDiscoveryBatch, PublicDiscoveryCard } from "@/types/public-discovery";

type Snapshot = {
  items: PublicDiscoveryCard[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
};

const REFRESH_INTERVAL_MS = 30_000;
const MIN_REFRESH_GAP_MS = 5_000;
const REQUEST_TIMEOUT_MS = 15_000;

/** One authoritative list: live events invalidate it rather than merging random tokens. */
export function startPublicLatestFeed(
  load: (signal: AbortSignal) => Promise<PublicDiscoveryBatch>,
  emit: (snapshot: Snapshot) => void,
  initialItems: PublicDiscoveryCard[] = [],
) {
  let stopped = false;
  let inFlight = false;
  let queued = false;
  let loaded = initialItems.length > 0;
  let generation = 0;
  let lastStarted = -Infinity;
  let controller: AbortController | undefined;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let snapshot: Snapshot = { items: initialItems, loading: !loaded, error: null, refreshing: false };
  const visible = () => document.visibilityState !== "hidden";

  function refresh() {
    if (stopped) return;
    if (!visible() || inFlight) {
      queued = true;
      return;
    }
    const delay = Math.max(0, MIN_REFRESH_GAP_MS - (Date.now() - lastStarted));
    if (delay > 0) {
      scheduled ??= setTimeout(() => {
        scheduled = undefined;
        refresh();
      }, delay);
      return;
    }
    if (scheduled !== undefined) clearTimeout(scheduled);
    scheduled = undefined;
    void request();
  }

  async function request() {
    const version = ++generation;
    const abort = new AbortController();
    controller = abort;
    inFlight = true;
    queued = false;
    lastStarted = Date.now();
    snapshot = { ...snapshot, loading: !loaded, error: null, refreshing: true };
    emit(snapshot);
    try {
      const timeout = new Promise<never>((_, reject) => {
        deadline = setTimeout(() => {
          reject(new Error("Latest reports refresh timed out."));
          abort.abort();
        }, REQUEST_TIMEOUT_MS);
      });
      const batch = await Promise.race([load(abort.signal), timeout]);
      if (stopped || version !== generation) return;
      loaded = true;
      snapshot = {
        items: Array.isArray(batch.items) ? batch.items : [],
        loading: false,
        error: null,
        refreshing: false,
      };
      emit(snapshot);
    } catch (error) {
      if (stopped || version !== generation) return;
      snapshot = {
        ...snapshot,
        loading: false,
        error: error instanceof Error ? error.message : "Couldn’t refresh reports.",
        refreshing: false,
      };
      emit(snapshot);
    } finally {
      if (deadline !== undefined) clearTimeout(deadline);
      deadline = undefined;
      if (!stopped && version === generation) {
        controller = undefined;
        inFlight = false;
        if (queued) refresh();
      }
    }
  }

  const onVisibility = () => { if (visible()) refresh(); };
  const interval = setInterval(onVisibility, REFRESH_INTERVAL_MS);
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
  document.addEventListener("visibilitychange", onVisibility);
  refresh();
  return {
    refresh,
    close() {
      stopped = true;
      generation += 1;
      controller?.abort();
      if (scheduled !== undefined) clearTimeout(scheduled);
      if (deadline !== undefined) clearTimeout(deadline);
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
