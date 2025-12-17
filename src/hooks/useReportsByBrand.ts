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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-brand?brand_name=${brand_name}&n=100&lang=${locale}`
      );
      const data = await response.json();
      setBrandReports(data.reports);
      setTotalCount(data.total_count || data.reports?.length || 0);
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
