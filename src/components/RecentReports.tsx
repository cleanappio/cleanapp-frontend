import React, { useCallback, useEffect, useState } from "react";
import { FaLock } from "react-icons/fa";
import Image from "next/image";
import { ReportAnalysis, ReportWithAnalysis } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import { useRouter } from "next/router";
import {
  useTranslations,
  getCurrentLocale,
  filterAnalysesByLanguage,
} from "@/lib/i18n";
import { getBrandNameDisplay } from "@/lib/util";
import TextToImage from "./TextToImage";

interface RecentReportsProps {
  reportItem?: ReportWithAnalysis | null;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const RecentReports: React.FC<RecentReportsProps> = ({ reportItem }) => {
  const [recentReports, setRecentReports] = useState<ReportWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslations();
  const locale = getCurrentLocale();

  const fetchRecentReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // If we have a specific report, fetch recent reports around that ID
      // Otherwise, fetch the latest reports
      let url = "";
      if (reportItem?.analysis[0]?.classification === "digital") {
        const reportAnalysis = reportItem.analysis.find(
          (analysis) => analysis.language === locale
        );
        if (!reportAnalysis) {
          console.error("No report analysis found");
          return;
        }

        const { brandName } = getBrandNameDisplay(reportAnalysis);
        url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-brand?brand_name=${brandName}&n=100&lang=${locale}`;
      } else {
        if (reportItem?.report?.id) {
          url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-latlng?latitude=${reportItem.report.latitude}&longitude=${reportItem.report.longitude}&radius_km=0.5&n=100&lang=${locale}`;
        } else {
          url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/last?n=100&lang=${locale}`;
        }
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
        setError(`${t("failedToFetchReports")}: ${response.status}`);
      }

      // // create a mock api call with a timeout of 2 seconds
      // await new Promise((resolve) => setTimeout(resolve, 2000));
      // console.log("recent reports fetched");
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

  useEffect(() => {
    fetchRecentReports();
  }, [reportItem]);

  const getPriorityColor = (severityLevel: number) => {
    if (severityLevel >= 0.7) return "bg-red-500";
    if (severityLevel >= 0.4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPriorityText = (severityLevel: number) => {
    if (severityLevel >= 0.7) return t("highPriority");
    if (severityLevel >= 0.4) return t("mediumPriority");
    return t("lowPriority");
  };

  const getCategory = (analysis: ReportAnalysis[]) => {
    const matchingAnalysis =
      analysis?.find((a) => a.language === locale) || analysis?.[0];
    if (
      matchingAnalysis?.litter_probability &&
      matchingAnalysis.litter_probability > 0.5
    )
      return t("litter");
    if (
      matchingAnalysis?.hazard_probability &&
      matchingAnalysis.hazard_probability > 0.5
    )
      return t("hazard");
    return t("general");
  };

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
              onClick={fetchRecentReports}
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
        {firstRow.map((item, index) => {
          const report = item.report;
          const analysis = item.analysis;
          const matchingAnalysis =
            analysis?.find((a) => a.language === locale) || analysis?.[0];
          const imageUrl = getDisplayableImage(report?.image || null);
          const text =
            matchingAnalysis?.summary || matchingAnalysis?.description || "";
          return (
            <div
              key={report?.seq || index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow"
            >
              <div className="relative">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={matchingAnalysis?.title || t("report")}
                    width={400}
                    height={160}
                    className="rounded-t-xl w-full h-32 sm:h-40 object-cover"
                    onError={(e) => {
                      console.error("Failed to load image:", imageUrl);
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove(
                        "hidden"
                      );
                    }}
                  />
                ) : (
                  <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
                    {text ? (
                      <TextToImage text={text} />
                    ) : (
                      <p className="text-gray-500 text-sm sm:text-sm">
                        {t("noImage")}
                      </p>
                    )}
                  </div>
                )}
                {matchingAnalysis?.severity_level !== undefined &&
                  matchingAnalysis?.severity_level !== 0 && (
                    <span
                      className={`absolute top-2 right-2 sm:top-3 sm:right-3 ${getPriorityColor(
                        matchingAnalysis.severity_level
                      )} text-white text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1 rounded-full`}
                    >
                      {getPriorityText(matchingAnalysis.severity_level)}
                    </span>
                  )}
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    {matchingAnalysis?.title ||
                      `${t("report")} ${report?.seq || index + 1}`}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-2">
                    {t("reported")}:{" "}
                    {report?.timestamp
                      ? new Date(report.timestamp).toLocaleString()
                      : t("unknown")}
                  </p>
                  <p
                    className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 overflow-hidden text-ellipsis"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {matchingAnalysis?.summary ||
                      matchingAnalysis?.description ||
                      t("noDescriptionAvailable")}
                  </p>
                </div>
                {matchingAnalysis?.classification !== "digital" && (
                  <div className="flex items-center justify-between mt-auto">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-full font-medium">
                      {getCategory(analysis)}
                    </span>
                    <span className="text-xs px-2 py-1 sm:px-3 sm:py-1 text-gray-500">
                      {report?.latitude?.toFixed(4)},{" "}
                      {report?.longitude?.toFixed(4)}
                    </span>
                  </div>
                )}

                {matchingAnalysis?.classification === "digital" && (
                  <div className="flex items-center justify-between mt-auto">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-full font-medium">
                      {matchingAnalysis?.brand_display_name?.toUpperCase()}
                    </span>
                  </div>
                )}
                {!isEmbeddedMode && (
                  <button
                    className="mt-3 sm:mt-6 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm sm:text-lg"
                    onClick={() => router.push("/pricing")}
                  >
                    {t("subscribe")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {secondRow.map((item, index) => {
          const report = item.report;
          const analysis = item.analysis;
          const matchingAnalysis =
            analysis?.find((a) => a.language === locale) || analysis?.[0];
          const imageUrl = getDisplayableImage(report?.image || null);
          const text =
            matchingAnalysis?.summary || matchingAnalysis?.description || "";
          return (
            <div
              key={report?.seq || index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {!isEmbeddedMode && (
                <button
                  className="mt-3 sm:mt-6 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm sm:text-lg absolute z-20 bottom-4 right-4 left-4"
                  onClick={() => router.push("/pricing")}
                >
                  {t("subscribe")}
                </button>
              )}

              {/* Blur overlay */}
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-center">
                  <FaLock className="text-white text-2xl mb-2" />
                  <p className="text-white text-sm font-medium">
                    {t("upgradeToPro")}
                  </p>
                </div>
              </div>

              <div className="relative">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={matchingAnalysis?.title || t("report")}
                    width={400}
                    height={160}
                    className="rounded-t-xl w-full h-32 sm:h-40 object-cover"
                    onError={(e) => {
                      console.error("Failed to load image:", imageUrl);
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove(
                        "hidden"
                      );
                    }}
                  />
                ) : (
                  <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
                    {text ? (
                      <TextToImage text={text} />
                    ) : (
                      <p className="text-gray-500 text-sm sm:text-sm">
                        {t("noImage")}
                      </p>
                    )}
                  </div>
                )}
                {matchingAnalysis?.severity_level !== undefined &&
                  matchingAnalysis?.severity_level !== 0 && (
                    <span
                      className={`absolute top-2 right-2 sm:top-3 sm:right-3 ${getPriorityColor(
                        matchingAnalysis.severity_level
                      )} text-white text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1 rounded-full`}
                    >
                      {getPriorityText(matchingAnalysis.severity_level)}
                    </span>
                  )}
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    {matchingAnalysis?.title ||
                      `${t("report")} ${report?.seq || index + 1}`}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-2">
                    {t("reported")}:{" "}
                    {report?.timestamp
                      ? new Date(report.timestamp).toLocaleString()
                      : t("unknown")}
                  </p>
                  <p
                    className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 overflow-hidden text-ellipsis"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {matchingAnalysis?.summary ||
                      matchingAnalysis?.description ||
                      t("noDescriptionAvailable")}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-full font-medium">
                    {getCategory(analysis)}
                  </span>
                  <span className="text-xs px-2 py-1 sm:px-3 sm:py-1 text-gray-500">
                    {report?.latitude?.toFixed(4)},{" "}
                    {report?.longitude?.toFixed(4)}
                  </span>
                </div>
                {!isEmbeddedMode && (
                  <button
                    className="mt-3 sm:mt-6 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm sm:text-lg"
                    onClick={() => router.push("/pricing")}
                  >
                    {t("subscribe")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium text-white">
              {t("locations")}
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="rounded-t-xl w-full h-32 sm:h-40 flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 relative">
              <span className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full block"></span>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-gray-700 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    {t("monitoringZone")}
                  </h2>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-md">
                    {t("active")}
                  </span>
                </div>

                <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    {t("reportsToday")}:
                  </span>
                  <span>{recentReports.length}</span>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    {t("status")}:
                  </span>
                  <span>{t("liveMonitoring")}</span>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    {t("coverage")}:
                  </span>
                  <span>{t("twentyFourSeven")}</span>
                </div>
                <div className="text-xs sm:text-sm text-green-500 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    {t("system")}:
                  </span>
                  <span>{t("operational")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium text-white">
              {t("statistics")}
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {recentReports.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {t("totalReports")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-red-600">
                    {
                      recentReports.filter((r) => {
                        const matchingAnalysis =
                          r.analysis?.find((a) => a.language === locale) ||
                          r.analysis?.[0];
                        return (
                          matchingAnalysis?.severity_level &&
                          matchingAnalysis.severity_level >= 0.7
                        );
                      }).length
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("highPriority")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-yellow-600">
                    {
                      recentReports.filter((r) => {
                        const matchingAnalysis =
                          r.analysis?.find((a) => a.language === locale) ||
                          r.analysis?.[0];
                        return (
                          matchingAnalysis?.severity_level &&
                          matchingAnalysis.severity_level >= 0.4 &&
                          matchingAnalysis.severity_level < 0.7
                        );
                      }).length
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("mediumPriority")}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-base sm:text-lg font-semibold text-green-600">
                  {
                    recentReports.filter((r) => {
                      const matchingAnalysis =
                        r.analysis?.find((a) => a.language === locale) ||
                        r.analysis?.[0];
                      return (
                        matchingAnalysis?.litter_probability &&
                        matchingAnalysis.litter_probability > 0.5
                      );
                    }).length
                  }
                </div>
                <div className="text-xs text-gray-500">{t("litterIssues")}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium text-white">
              {t("aiInsights")}
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-dashed border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 sm:p-6 h-full">
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
                <FaLock className="text-green-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="font-semibold text-base sm:text-lg mb-2">
                {t("premiumFeatures")}
              </h2>
              <ul className="text-gray-700 text-xs mb-3 sm:mb-4 list-none space-y-1 text-center">
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  {t("predictiveRiskAssessment")}
                </li>
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  {t("costImpactAnalysis")}
                </li>
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  {t("aiPoweredRecommendations")}
                </li>
              </ul>
              {!isEmbeddedMode && (
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 sm:px-5 sm:py-2 rounded-md transition-colors text-sm"
                  onClick={() => router.push("/pricing")}
                >
                  {t("subscribe")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentReports;
