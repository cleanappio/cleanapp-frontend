import { ReportWithAnalysis } from "@/components/GlobeView";
import { useTranslations } from "@/lib/i18n";
import { useEffect, useState, useCallback } from "react";

export const useReportsByBrand = (brand_name: string, locale: string) => {
  const [brandReports, setBrandReports] = useState<ReportWithAnalysis[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();

  const fetchRecentReportsByBrand = async (brand_name: string) => {
    setIsLoading(true);
    try {
      // Fetch reports (limited to 100 for display)
      const reportsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-brand?brand_name=${brand_name}&n=100&lang=${locale}`
      );
      const reportsData = await reportsResponse.json();
      setBrandReports(reportsData.reports);

      // Fetch actual total count from brands/summary endpoint (same as globe search uses)
      const apiUrl = process.env.NEXT_PUBLIC_RENDERER_API_URL || process.env.NEXT_PUBLIC_LIVE_API_URL;
      const summaryResponse = await fetch(
        `${apiUrl}/api/v4/brands/summary?classification=digital&lang=${locale}`
      );
      const summaryData = await summaryResponse.json();

      // Find matching brand and get its total
      const matchingBrand = summaryData?.find(
        (b: { brand_name: string; total: number }) =>
          b.brand_name.toLowerCase() === brand_name.toLowerCase()
      );

      if (matchingBrand?.total) {
        setTotalCount(matchingBrand.total);
      } else {
        // Fallback to API total_count or reports length
        setTotalCount(reportsData.total_count || reportsData.reports?.length || 0);
      }
    } catch (error) {
      setError(t("failedToFetchReports"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (brand_name) {
      fetchRecentReportsByBrand(brand_name);
    }
  }, [brand_name]);

  return { brandReports, totalCount, isLoading, error, fetchRecentReportsByBrand };
};

