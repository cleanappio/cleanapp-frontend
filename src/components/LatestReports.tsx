import React, { useEffect, useState } from "react";
import { ReportWithAnalysis, useIsMobile } from "./GlobeView";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";

interface LatestReportsProps {
  reports: ReportWithAnalysis[];
  loading: boolean;
  onReportClick: (report: ReportWithAnalysis) => void;
  isModalActive?: boolean;
  selectedReport?: ReportWithAnalysis | null;
  showDigitalReports?: boolean;
}

const LatestReports: React.FC<LatestReportsProps> = ({
  reports,
  loading,
  onReportClick,
  isModalActive = false,
  selectedReport = null,
  showDigitalReports = false,
}) => {
  const { t } = useTranslations();
  const locale = getCurrentLocale();
  const isMobile = useIsMobile();
  const [digitalReports, setDigitalReports] = useState<ReportWithAnalysis[]>(
    []
  );

  const [isDigitalReportsLoading, setIsDigitalReportsLoading] = useState(false);
  const [digitalReportsError, setDigitalReportsError] = useState<string | null>(
    null
  );

  const [selectedTab, setSelectedTab] = useState<"physical" | "digital">(
    "physical"
  );

  useEffect(() => {
    const fetchDigitalReports = async () => {
      try {
        setIsDigitalReportsLoading(true);
        setDigitalReportsError(null);

        const brands = [
          "devconnect",
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

        const requests = brands.map((brand) =>
          fetch(
            `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-brand?brand_name=${brand}&n=10`
          )
            .then(async (response) => {
              if (response.ok) {
                const data = await response.json();
                return { brand, success: true, reports: data.reports || [] };
              } else {
                console.error(
                  `Failed to fetch digital reports for ${brand}:`,
                  response.status
                );
                return {
                  brand,
                  success: false,
                  reports: [],
                  error: `HTTP ${response.status}`,
                };
              }
            })
            .catch((error) => {
              console.error(
                `Error fetching digital reports for ${brand}:`,
                error
              );
              return {
                brand,
                success: false,
                reports: [],
                error: error instanceof Error ? error.message : "Unknown error",
              };
            })
        );

        const results = await Promise.allSettled(requests);
        const allReports: ReportWithAnalysis[] = [];
        const errors: string[] = [];

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const { brand, success, reports, error } = result.value;
            if (success && Array.isArray(reports)) {
              allReports.push(...reports);
            } else if (error) {
              errors.push(`Failed to fetch reports for ${brand}: ${error}`);
            }
          } else {
            console.error(`Promise rejected for brand request:`, result.reason);
            errors.push(
              `Error: ${
                result.reason instanceof Error
                  ? result.reason.message
                  : "Unknown error"
              }`
            );
          }
        });

        setDigitalReports(allReports);

        // Only set error state if all requests failed
        if (allReports.length === 0 && errors.length > 0) {
          setDigitalReportsError(errors.join("; "));
        }
      } catch (error) {
        console.error("Error fetching digital reports:", error);
        setDigitalReportsError(
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setIsDigitalReportsLoading(false);
      }
    };
    fetchDigitalReports();
  }, []);

  return (
    <div
      className={`absolute bottom-8 p-1 sm:p-2 ${
        isMobile ? "h-[50vh] max-h-[250px] left-0" : "h-[40vh] left-4"
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
              className={`font-semibold text-sm mt-2 mb-1 sm:mb-3 flex-1 cursor-pointer hover:text-blue-200 ${
                selectedTab === "physical" ? "text-blue-400" : ""
              }`}
              onClick={() => setSelectedTab("physical")}
            >
              {t("physical")}
            </p>

            <p
              className={`font-semibold text-sm mt-2 mb-1 sm:mb-3 flex-1 cursor-pointer hover:text-blue-200 ${
                selectedTab === "digital" ? "text-blue-400" : ""
              }`}
              onClick={() => setSelectedTab("digital")}
            >
              {t("digital")}
            </p>
          </div>
        )}

        {selectedTab === "physical" ? (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <p className="text-xs text-gray-400">{t("loading")}...</p>
            ) : reports.length === 0 ? (
              <p className="text-xs text-gray-400">{t("noReportsFound")}.</p>
            ) : (
              reports.map((item, idx) => {
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
                    className={`flex flex-col gap-1 text-sm border p-2 sm:p-3 rounded-lg mt-2 items-start cursor-pointer max-w-[275px] transition-colors ${
                      isSelected
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
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {isDigitalReportsLoading ? (
              <p className="text-xs text-gray-400">{t("loading")}...</p>
            ) : digitalReportsError ? (
              <p className="text-xs text-gray-400">{digitalReportsError}</p>
            ) : digitalReports.length === 0 ? (
              <p className="text-xs text-gray-400">{t("noReportsFound")}.</p>
            ) : (
              digitalReports.map((item, idx) => {
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
                    className={`flex flex-col gap-1 text-sm border p-2 sm:p-3 rounded-lg mt-2 items-start cursor-pointer max-w-[275px] transition-colors ${
                      isSelected
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
        )}
      </div>
    </div>
  );
};

export default LatestReports;
