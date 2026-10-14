import { ReportWithAnalysis } from "@/components/GlobeView";
import { useTranslations } from "@/lib/i18n";
import { getPreferredReportLanguage } from "@/lib/report-language";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBrandReportInventory, type BrandReportInventoryPage } from "@/lib/brand-report-inventory";

export const useReportsByBrand = (
  brand_name: string,
  locale: string,
  enabled: boolean = true,
) => {
  const [brandReports, setBrandReports] = useState<ReportWithAnalysis[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [highPriority, setHighPriority] = useState<number>(0);
  const [mediumPriority, setMediumPriority] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const { t } = useTranslations();
  const scope = JSON.stringify([brand_name, locale]);

  const fetchRecentReportsByBrand = useCallback(async (brand_name: string) => {
    if (!enabled || !brand_name) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const isCurrent = () => activeRequest.current === controller && !controller.signal.aborted;
    setIsLoading(true);
    setLoadedScope(null);
    setError(null);
    try {
      const lang = getPreferredReportLanguage(brand_name, locale);
      const data = await fetchBrandReportInventory(async ({ n, offset }) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-brand?brand_name=${encodeURIComponent(brand_name)}&n=${n}&offset=${offset}&lang=${encodeURIComponent(lang)}&full_data=false&kind=all&sort=recent`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Brand inventory request failed: ${response.status}`);
        return response.json() as Promise<BrandReportInventoryPage>;
      });
      if (!isCurrent()) return;
      setBrandReports(data.reports);
      setTotalCount(data.total_count ?? data.reports.length);
      setHighPriority(data.high_priority_count ?? 0);
      setMediumPriority(data.medium_priority_count ?? 0);
      setHasMore(Boolean(data.has_more));
    } catch (error) {
      if (!isCurrent()) return;
      setError(t("failedToFetchReports"));
      setBrandReports([]);
      setHasMore(false);
      console.error(error);
    } finally {
      if (isCurrent()) {
        setLoadedScope(JSON.stringify([brand_name, locale]));
        setIsLoading(false);
      }
    }
  }, [enabled, locale, t]);

  useEffect(() => {
    if (!enabled || !brand_name) {
      setBrandReports([]);
      setTotalCount(0);
      setHighPriority(0);
      setMediumPriority(0);
      setIsLoading(false);
      setHasMore(false);
      setLoadedScope(null);
      setError(null);
      return;
    }
    void fetchRecentReportsByBrand(brand_name);
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [brand_name, enabled, fetchRecentReportsByBrand]);

  const currentScopeLoaded = enabled && loadedScope === scope;
  return {
    brandReports: currentScopeLoaded ? brandReports : [],
    totalCount: currentScopeLoaded ? totalCount : 0,
    highPriority: currentScopeLoaded ? highPriority : 0,
    mediumPriority: currentScopeLoaded ? mediumPriority : 0,
    isLoading: enabled && Boolean(brand_name) && (isLoading || !currentScopeLoaded),
    error: currentScopeLoaded ? error : null,
    hasMore: currentScopeLoaded && hasMore,
    fetchRecentReportsByBrand,
  };
};
