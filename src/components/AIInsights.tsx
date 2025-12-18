import { ReportWithAnalysis } from "./GlobeView";

import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { useRouter } from "next/router";
import { FaLock } from "react-icons/fa";

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

export default function AIInsights({
  brandReports,
  totalCount,
  highPriority,
  mediumPriority,
}: {
  brandReports: ReportWithAnalysis[];
  totalCount?: number;
  highPriority?: number;
  mediumPriority?: number;
}) {
  const locale = getCurrentLocale();
  const { t } = useTranslations();
  const router = useRouter();

  return (
    <div>
      {/* AI Insights Card - Keep the premium features section - Mobile responsive */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium">
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
            <h1 className="text-base sm:text-lg font-medium">
              {t("statistics")}
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {totalCount ?? brandReports.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {t("totalReports")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-red-600">
                    {highPriority ?? 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("highPriority")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-yellow-600">
                    {mediumPriority ?? 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("mediumPriority")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium">
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
}
