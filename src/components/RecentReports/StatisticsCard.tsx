import React, { useMemo } from "react";
import { ReportWithAnalysis } from "../GlobeView";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";

interface StatisticsCardProps {
  reports: ReportWithAnalysis[];
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ reports }) => {
  const { t } = useTranslations();
  const locale = getCurrentLocale();

  const stats = useMemo(() => {
    const highPriority = reports.filter((r) => {
      const matchingAnalysis =
        r.analysis?.find((a) => a.language === locale) || r.analysis?.[0];
      return (
        matchingAnalysis?.severity_level && matchingAnalysis.severity_level >= 0.7
      );
    }).length;

    const mediumPriority = reports.filter((r) => {
      const matchingAnalysis =
        r.analysis?.find((a) => a.language === locale) || r.analysis?.[0];
      return (
        matchingAnalysis?.severity_level &&
        matchingAnalysis.severity_level >= 0.4 &&
        matchingAnalysis.severity_level < 0.7
      );
    }).length;

    const litterIssues = reports.filter((r) => {
      const matchingAnalysis =
        r.analysis?.find((a) => a.language === locale) || r.analysis?.[0];
      return (
        matchingAnalysis?.litter_probability &&
        matchingAnalysis.litter_probability > 0.5
      );
    }).length;

    return { highPriority, mediumPriority, litterIssues };
  }, [reports, locale]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-base sm:text-lg font-medium text-white">{t("statistics")}</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {reports.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">{t("totalReports")}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-base sm:text-lg font-semibold text-red-600">
                {stats.highPriority}
              </div>
              <div className="text-xs text-gray-500">{t("highPriority")}</div>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-lg font-semibold text-yellow-600">
                {stats.mediumPriority}
              </div>
              <div className="text-xs text-gray-500">{t("mediumPriority")}</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-base sm:text-lg font-semibold text-green-600">
              {stats.litterIssues}
            </div>
            <div className="text-xs text-gray-500">{t("litterIssues")}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCard;

