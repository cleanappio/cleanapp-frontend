import React from "react";
import { useRouter } from "next/router";
import { FaLock } from "react-icons/fa";
import { ReportAnalysis, ReportWithAnalysis } from "../GlobeView";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import ReportImage from "./ReportImage";

interface BlurredReportCardProps {
  item: ReportWithAnalysis;
  index: number;
}

const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const BlurredReportCard: React.FC<BlurredReportCardProps> = ({ item, index }) => {
  const router = useRouter();
  const { t } = useTranslations();
  const locale = getCurrentLocale();
  const report = item.report;
  const analysis = item.analysis;
  const matchingAnalysis =
    analysis?.find((a) => a.language === locale) || analysis?.[0];

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
    const matching = analysis?.find((a) => a.language === locale) || analysis?.[0];
    if (matching?.litter_probability && matching.litter_probability > 0.5) return t("litter");
    if (matching?.hazard_probability && matching.hazard_probability > 0.5) return t("hazard");
    return t("general");
  };

  const text = matchingAnalysis?.summary || matchingAnalysis?.description || "";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden">
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
          <p className="text-white text-sm font-medium">{t("upgradeToPro")}</p>
        </div>
      </div>

      <div className="relative">
        <ReportImage
          reportSeq={report?.seq}
          image={report?.image || null}
          classification={matchingAnalysis?.classification || "physical"}
          text={text}
          alt={matchingAnalysis?.title || t("report")}
          priority={false}
        />
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
            {matchingAnalysis?.title || `${t("report")} ${report?.seq || index + 1}`}
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
            {report?.latitude?.toFixed(4)}, {report?.longitude?.toFixed(4)}
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
};

export default BlurredReportCard;

