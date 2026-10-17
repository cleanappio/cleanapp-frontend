import { useCallback, useEffect, useState } from "react";
import { fetchPublicBrandPreview, type PublicBrandPreview } from "@/lib/public-brand-preview";

type PreviewState = { scope: string; preview: PublicBrandPreview | null; isLoading: boolean; error: string | null };

export function usePublicBrandPreview(brandName: string, locale: string) {
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([brandName, locale, revision]);
  const [state, setState] = useState<PreviewState | null>(null);
  const refresh = useCallback(() => setRevision(current => current + 1), []);

  useEffect(() => {
    if (!brandName) return;
    const controller = new AbortController();
    setState({ scope, preview: null, isLoading: true, error: null });
    fetchPublicBrandPreview(brandName, locale, controller.signal)
      .then(preview => {
        if (!controller.signal.aborted) setState({ scope, preview, isLoading: false, error: null });
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ scope, preview: null, isLoading: false, error: error instanceof Error ? error.message : "Brand preview unavailable" });
      });
    return () => controller.abort();
  }, [brandName, locale, scope]);

  const current = state?.scope === scope ? state : null;
  return {
    items: current?.preview?.items || [],
    brandDisplayName: current?.preview?.brandDisplayName,
    isLoading: Boolean(brandName) && (!current || current.isLoading),
    error: current?.error || null,
    refresh,
  };
}
