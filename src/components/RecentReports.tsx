import React, { useEffect, useState } from "react";
import { ReportWithAnalysis } from "./GlobeView";
import {
  filterAnalysesByLanguage,
  getCurrentLocale,
  useTranslations,
} from "@/lib/i18n";
import { ReportResponse } from "@/types/reports/api";
import ReportCard from "./RecentReports/ReportCard";
import BlurredReportCard from "./RecentReports/BlurredReportCard";
import LocationsCard from "./RecentReports/LocationsCard";
import StatisticsCard from "./RecentReports/StatisticsCard";
import AIInsightsCard from "./RecentReports/AIInsightsCard";

interface RecentReportsProps {
  reportItem?: ReportResponse | null;
}

const RecentReports: React.FC<RecentReportsProps> = ({ reportItem }) => {
  const [recentReports, setRecentReports] = useState<ReportWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();
  const locale = getCurrentLocale();

  // Create stable key for reportItem to prevent infinite loops
  const reportItemKey = reportItem
    ? reportItem.classification === "digital"
      ? `digital_${reportItem.brand_name}`
      : `physical_${reportItem.latitude?.toFixed(
          4
        )}_${reportItem.longitude?.toFixed(4)}`
    : "default";

  useEffect(() => {
    let cancelled = false;

    const fetchRecentReports = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = "";
        if (
          reportItem &&
          reportItem?.classification === "digital" &&
          reportItem?.brand_name
        ) {
          url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-brand?brand_name=${reportItem.brand_name}&n=10`;
        } else if (reportItem?.classification === "physical") {
          url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-latlng?latitude=${reportItem.latitude}&longitude=${reportItem.longitude}&radius_km=0.5&n=10&lang=${locale}`;
        } else {
          url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/last?n=10&lang=${locale}`;
        }

        const response = await fetch(url);
        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const filteredReports = filterAnalysesByLanguage(
            data.reports || [],
            locale
          );
          if (!cancelled) {
            setRecentReports(filteredReports as ReportWithAnalysis[]);
          }
        } else {
          if (!cancelled) {
            setError(`${t("failedToFetchReports")}: ${response.status}`);
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching recent reports:", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(t("failedToFetchReports"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRecentReports();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportItemKey, locale]); // Only depend on stable values

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto my-6 sm:my-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">
          {t("recentReports")}
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mr-3 sm:mr-3"></div>
            <p className="text-gray-500 text-sm sm:text-base">
              {t("loading")} {t("recentReports").toLowerCase()}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto my-6 sm:my-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">
          {t("recentReports")}
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-red-400 text-3xl sm:text-4xl mb-2">⚠️</div>
            <p className="text-red-600 font-medium text-sm sm:text-base">
              {t("failedToFetchReport")}
            </p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={() => {
                const fetchRecentReports = async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    let url = "";
                    if (
                      reportItem &&
                      reportItem?.classification === "digital" &&
                      reportItem?.brand_name
                    ) {
                      url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-brand?brand_name=${reportItem.brand_name}&n=10`;
                    } else if (reportItem?.classification === "physical") {
                      url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-latlng?latitude=${reportItem.latitude}&longitude=${reportItem.longitude}&radius_km=0.5&n=10&lang=${locale}`;
                    } else {
                      url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/last?n=100&lang=${locale}`;
                    }

                    const response = await fetch(url);
                    if (response.ok) {
                      const data = await response.json();
                      const filteredReports = filterAnalysesByLanguage(
                        data.reports || [],
                        locale
                      );
                      setRecentReports(filteredReports as ReportWithAnalysis[]);
                    } else {
                      setError(
                        `${t("failedToFetchReports")}: ${response.status}`
                      );
                    }
                  } catch (error) {
                    console.error("Error fetching recent reports:", error);
                    if (error instanceof Error) {
                      setError(error.message);
                    } else {
                      setError(t("failedToFetchReports"));
                    }
                  } finally {
                    setLoading(false);
                  }
                };
                fetchRecentReports();
              }}
              className="mt-4 sm:mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-4 sm:py-2 rounded-md transition-colors text-sm"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only show up to 6 reports (3 clear, 3 blurred)
  const visibleReports = recentReports.slice(0, 6);
  const firstRow = visibleReports.slice(0, 3);
  const secondRow = visibleReports.slice(3, 6);

  return (
    <div className="max-w-7xl mx-auto my-6 sm:my-8">
      <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">
        {t("recentReports")}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {firstRow.map((item, index) => (
          <ReportCard
            key={item.report?.seq || index}
            item={item}
            index={index}
            priority={index === 0}
          />
        ))}
        {secondRow.map((item, index) => (
          <BlurredReportCard
            key={item.report?.seq || index + 3}
            item={item}
            index={index + 3}
          />
        ))}
      </div>

      {recentReports.length > 6 && (
        <div className="text-center bg-white mt-8 p-4 rounded-md">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-row items-center justify-center gap-1">
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm">
              {recentReports.length - 6} {t("moreReports")}
            </p>
          </div>
        </div>
      )}

      {/* AI Insights Card - Keep the premium features section - Mobile responsive */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <LocationsCard totalReports={recentReports.length} />
        <StatisticsCard reports={recentReports} />
        <AIInsightsCard />
      </div>
    </div>
  );
};

export default RecentReports;
