import React from "react";
import { LatestReport } from "./GlobeView";
import { useTranslations } from "@/lib/i18n";

interface LatestReportsProps {
  reports: LatestReport[];
  loading: boolean;
  onReportClick: (report: LatestReport) => void;
  isModalActive?: boolean;
  selectedReport?: LatestReport | null;
}

const LatestReports: React.FC<LatestReportsProps> = ({
  reports,
  loading,
  onReportClick,
  isModalActive = false,
  selectedReport = null,
}) => {
  const { t } = useTranslations();

  return (
    <div
      className={`absolute left-4 bottom-8 p-2 h-[40vh] flex flex-col ${
        isModalActive ? "z-60" : "z-10"
      }`}
    >
      {/* Create translucent div with a gradient */}
      <div className="h-full bg-gradient-to-b from-[#14213d] to-black text-white px-4 py-2 border border-slate-700 rounded-2xl text-center flex flex-col w-[300px]">
        <p className="text-slate-300 font-semibold text-sm mt-2 mb-3 flex-shrink-0">
          {t("latestReports")}
        </p>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <p className="text-xs text-gray-400">{t("loading")}...</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-gray-400">{t("noReportsFound")}.</p>
          ) : (
            reports.map((item, idx) => {
              const isSelected =
                selectedReport?.report?.seq === item.report?.seq;
              return (
                <div
                  key={item.report?.seq || idx}
                  onClick={() => onReportClick(item)}
                  className={`flex flex-col gap-1 text-sm border p-3 rounded-lg mt-2 items-start cursor-pointer max-w-[275px] transition-colors ${
                    isSelected
                      ? "border-blue-400 bg-blue-600/20 text-white"
                      : "border-slate-700 text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <p className="text-xs">
                    {item.analysis?.title || t("report")}
                    {item.report?.timestamp
                      ? `, ${new Date(item.report.timestamp).toLocaleString()}`
                      : ""}
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {item.analysis?.summary ||
                      item.analysis?.description ||
                      t("noSummary")}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LatestReports;
