import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { useReportsByBrand } from "@/hooks/useReportsByBrand";
import { getDisplayableImage } from "@/lib/image-utils";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { useRouter } from "next/router";
import Image from "next/image";
import { FaLock } from "react-icons/fa";

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

export default function DigitalBrandPage() {
  const router = useRouter();
  const { brand_name } = router.query;
  const locale = getCurrentLocale();

  const { t } = useTranslations();

  const { brandReports, isLoading, error, fetchRecentReportsByBrand } =
    useReportsByBrand(brand_name as string, locale);
  if (isLoading) {
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
              {t("errorLoadingReports")}
            </p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={() => fetchRecentReportsByBrand(brand_name as string)}
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
  const visibleReports = brandReports.slice(0, 6);
  const firstRow = visibleReports.slice(0, 3);
  const secondRow = visibleReports.slice(3, 6);

  return (
    <div className="bg-gray-50">
      <PageHeader />
      <div className="max-w-7xl mx-auto my-6 sm:my-8 px-6 md:px-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4">
          {t("recentReports")}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {firstRow.map((item, index) => {
            const report = item.report;
            const analysis = item.analysis;
            const matchingAnalysis =
              analysis?.find((a) => a.language === locale) || analysis?.[0];
            const imageUrl = getDisplayableImage(report?.image || null);
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
                    <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <p className="text-gray-500 text-sm sm:text-sm">
                        {t("noImage")}
                      </p>
                    </div>
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
                      {matchingAnalysis?.brand_display_name?.toUpperCase()}
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
          {secondRow.map((item, index) => {
            const report = item.report;
            const analysis = item.analysis;
            const matchingAnalysis =
              analysis?.find((a) => a.language === locale) || analysis?.[0];
            const imageUrl = getDisplayableImage(report?.image || null);
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
                    <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <p className="text-gray-500 text-sm sm:text-sm">
                        {t("noImage")}
                      </p>
                    </div>
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

        {brandReports.length > 6 && (
          <div className="text-center bg-white mt-8 p-4 rounded-md border border-gray-200">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-row items-center justify-center gap-1">
                <span className="bg-gray-500 rounded-full w-2 h-2"></span>
                <span className="bg-gray-500 rounded-full w-2 h-2"></span>
                <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm">
                {brandReports.length - 6} {t("moreReports")}
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
                    <span>{brandReports.length}</span>
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
                    {brandReports.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {t("totalReports")}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-red-600">
                      {
                        brandReports.filter((r) => {
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
                        brandReports.filter((r) => {
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
                      brandReports.filter((r) => {
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
                  <div className="text-xs text-gray-500">
                    {t("litterIssues")}
                  </div>
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

      <Footer />
    </div>
  );
}
