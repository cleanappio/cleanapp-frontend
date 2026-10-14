import { ReportWithAnalysis } from "@/components/GlobeView";
import { useTranslations } from "@/lib/i18n";
import { getPreferredReportLanguage } from "@/lib/report-language";
import { useEffect, useState } from "react";
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
  const { t } = useTranslations();

  const fetchRecentReportsByBrand = async (brand_name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const lang = getPreferredReportLanguage(brand_name, locale);
      const data = await fetchBrandReportInventory(async ({ n, offset }) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-brand?brand_name=${encodeURIComponent(brand_name)}&n=${n}&offset=${offset}&lang=${encodeURIComponent(lang)}&full_data=false&kind=all&sort=recent`
        );
        if (!response.ok) throw new Error(`Brand inventory request failed: ${response.status}`);
        return response.json() as Promise<BrandReportInventoryPage>;
      });
      setBrandReports(data.reports);
      setTotalCount(data.total_count ?? data.reports.length);
      setHighPriority(data.high_priority_count ?? 0);
      setMediumPriority(data.medium_priority_count ?? 0);
      setHasMore(Boolean(data.has_more));
    } catch (error) {
      setError(t("failedToFetchReports"));
      setBrandReports([]);
      setHasMore(false);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setBrandReports([]);
      setTotalCount(0);
      setHighPriority(0);
      setMediumPriority(0);
      setIsLoading(false);
      setHasMore(false);
      return;
    }
    if (brand_name) {
      fetchRecentReportsByBrand(brand_name);
    }
    // Intentionally not depending on t(): the translation function is recreated
    // per render in i18n hook and would retrigger fetch loops/flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand_name, enabled, locale]);

  return { brandReports, totalCount, highPriority, mediumPriority, isLoading, error, hasMore, fetchRecentReportsByBrand };
};
