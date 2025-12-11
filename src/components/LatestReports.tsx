import React, { useEffect, useState } from "react";
import { ReportWithAnalysis, useIsMobile } from "./GlobeView";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { useReportsByTags } from "@/hooks/useReportsByTag";
import { ReportAnalysis } from "./GlobeView";
interface LatestReportsProps {
  reports: ReportWithAnalysis[];
  loading: boolean;
  onReportClick: (report: ReportWithAnalysis) => void;
  isModalActive?: boolean;
  selectedReport?: ReportWithAnalysis | null;
  showDigitalReports?: boolean;
  digitalReports?: ReportWithAnalysis[];
  disableFetching?: boolean;
  activeTab?: "physical" | "digital";
  onTabChange?: (tab: "physical" | "digital") => void;
}

export const brands = [
  "devconnect",
  "efdevcon",
  "get_para",
  "para",
  "peanut",
  "simplefi",
  "zupass",
  "roamless",
  "lnvpn",
  "ethpandaops",
  "etherfi",
  "betrusty",
  "precog",
  "ready",
  "bankless",
  "edgecity",
  "nomadacafe",
  "vanalaeropuerto",
  "tripsha",
  "alephcloud",
  "koinx",
  "guestgenie",
  "chainstack",
  "metana",
  "forta",
  "savantchat",
  "corpuscore",
  "taikai",
  "proofoftravel",
  "devconnectteam",
  "yourbrand",
];

const LatestReports: React.FC<LatestReportsProps> = ({
  reports,
  loading,
  onReportClick,
  isModalActive = false,
  selectedReport = null,
  showDigitalReports = false, // Currently used only in devconnect dashboard
  digitalReports = [],
  disableFetching = false,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslations();
  const locale = getCurrentLocale();
  const isMobile = useIsMobile();

  const [internalSelectedTab, setInternalSelectedTab] = useState<
    "physical" | "digital"
  >("physical");

  const selectedTab = activeTab || internalSelectedTab;

  const handleTabChange = (tab: "physical" | "digital") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalSelectedTab(tab);
    }
  };

  const {
    reports: reportsByTags,
    loading: reportsByTagsLoading,
    error: reportsByTagsError,
  } = useReportsByTags(brands, 10, showDigitalReports && !disableFetching);

  // If fetching is disabled, we rely on props
  const finalDigitalReports = disableFetching
    ? digitalReports
    : reportsByTags.filter(
      (report: ReportWithAnalysis) =>
        report.analysis?.[0]?.classification === "digital"
    );

  const finalPhysicalReports = disableFetching
    ? reports // In disableFetching mode, 'reports' prop is assumed to be the full combined list
    : (() => {
      const physicalReportsbyTags = reportsByTags.filter(
        (report: ReportWithAnalysis) =>
          report.analysis?.[0]?.classification === "physical"
      );

      const combined = [...reports, ...physicalReportsbyTags].filter(
        (report, index, self) =>
          index ===
          self.findIndex((t) => t.report?.seq === report.report?.seq)
      );

      combined.sort((a: ReportWithAnalysis, b: ReportWithAnalysis) => {
        const timeA = a.report?.timestamp
          ? new Date(a.report.timestamp).getTime()
          : 0;
        const timeB = b.report?.timestamp
          ? new Date(b.report.timestamp).getTime()
          : 0;
        return timeB - timeA; // Descending order (newest first)
      });
      return combined;
    })();

  if (showDigitalReports && !disableFetching) {
    finalDigitalReports.sort((a: ReportWithAnalysis, b: ReportWithAnalysis) => {
      const timeA = a.report?.timestamp
        ? new Date(a.report.timestamp).getTime()
        : 0;
      const timeB = b.report?.timestamp
        ? new Date(b.report.timestamp).getTime()
        : 0;
      return timeB - timeA; // Descending order (newest first)
    });
  }

  return (
    <div
      className={`absolute bottom-8 p-1 sm:p-2 ${isMobile ? "h-[50vh] max-h-[250px] left-0" : "h-[40vh] left-4"
        } flex flex-col ${isModalActive ? "z-60" : "z-10"}`}
    >
      {/* Create translucent div with a gradient */}
      <div className="h-full bg-gradient-to-b from-[#14213d] to-black text-white px-3 sm:px-4 py-1 sm:py-2 border border-slate-700 rounded-2xl text-center flex flex-col w-[275px]">
        {!showDigitalReports && (
          <p className="text-slate-300 font-semibold text-sm mt-2 mb-1 sm:mb-3 flex-shrink-0">
            {t("latestReports")}
          </p>
        )}

        {showDigitalReports && (
          <div className="flex flex-row items-center">
            <p
              className={`font-semibold text-sm mt-2 mb-1 sm:mb-3 flex-1 cursor-pointer hover:text-blue-200 ${selectedTab === "physical" ? "text-blue-400" : ""
                }`}
              onClick={() => handleTabChange("physical")}
            >
              {t("physical")}
            </p>

            <p
              className={`font-semibold text-sm mt-2 mb-1 sm:mb-3 flex-1 cursor-pointer hover:text-blue-200 ${selectedTab === "digital" ? "text-blue-400" : ""
                }`}
              onClick={() => handleTabChange("digital")}
            >
              {t("digital")}
            </p>
          </div>
        )}

        {selectedTab === "physical" ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide items-center">
            {loading ? (
              <p className="text-xs text-gray-400">{t("loading")}...</p>
            ) : finalPhysicalReports.length === 0 ? (
              <p className="text-xs text-gray-400">{t("noReportsFound")}.</p>
            ) : (
              finalPhysicalReports.map((item, idx) => {
                const isSelected =
                  selectedReport?.report?.seq === item.report?.seq;

                const title = Array.isArray(item.analysis)
                  ? item.analysis.find(
                    (analysis) => analysis.language === locale
                  )
                  : item.analysis;

                return (
                  <div
                    key={item.report?.seq || idx}
                    onClick={() => onReportClick(item)}
                    className={`flex flex-col gap-1 text-sm border p-2 sm:p-3 rounded-lg mt-2 items-start cursor-pointer max-w-[275px] transition-colors ${isSelected
                        ? "border-blue-400 bg-blue-600/20 text-white"
                        : "border-slate-700 text-slate-300 hover:bg-slate-700/50"
                      }`}
                  >
                    <p className="text-xs">
                      {title?.title || t("report")}
                      {item.report?.timestamp
                        ? `, ${new Date(
                          item.report.timestamp
                        ).toLocaleString()}`
                        : ""}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {Array.isArray(item.analysis)
                        ? item.analysis.find(
                          (analysis) => analysis.language === locale
                        )?.summary ||
                        item.analysis.find(
                          (analysis) => analysis.language === locale
                        )?.description
                        : title?.summary ||
                        title?.description ||
                        t("noSummary")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide items-center">
            {(disableFetching ? loading : reportsByTagsLoading) ? (
              <p className="text-xs text-gray-400">{t("loading")}...</p>
            ) : reportsByTagsError ? (
              <p className="text-xs text-gray-400">{reportsByTagsError}</p>
            ) : finalDigitalReports.length === 0 ? (
              <p className="text-xs text-gray-400">{t("noReportsFound")}.</p>
            ) : (
              finalDigitalReports.map(
                (item: ReportWithAnalysis, idx: number) => {
                  const isSelected =
                    selectedReport?.report?.seq === item.report?.seq;

                  const title = Array.isArray(item.analysis)
                    ? item.analysis.find(
                      (analysis: ReportAnalysis) =>
                        analysis.language === locale
                    )
                    : item.analysis;

                  return (
                    <div
                      key={item.report?.seq || idx}
                      onClick={() => {
                        onReportClick(item);
                      }}
                      className={`flex flex-col gap-1 text-sm border p-2 sm:p-3 rounded-lg mt-2 items-start cursor-pointer max-w-[275px] transition-colors ${isSelected
                          ? "border-blue-400 bg-blue-600/20 text-white"
                          : "border-slate-700 text-slate-300 hover:bg-slate-700/50"
                        }`}
                    >
                      <p className="text-xs">
                        {title?.title || t("report")}
                        {item.report?.timestamp
                          ? `, ${new Date(
                            item.report.timestamp
                          ).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {Array.isArray(item.analysis)
                          ? item.analysis.find(
                            (analysis: ReportAnalysis) =>
                              analysis.language === locale
                          )?.summary ||
                          item.analysis.find(
                            (analysis: ReportAnalysis) =>
                              analysis.language === locale
                          )?.description
                          : title?.summary ||
                          title?.description ||
                          t("noSummary")}
                      </p>
                    </div>
                  );
                }
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestReports;
