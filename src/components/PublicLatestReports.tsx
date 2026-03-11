import React from "react";
import { useTranslations } from "@/lib/i18n";
import { PublicDiscoveryCard } from "@/types/public-discovery";
import { useIsMobile } from "./GlobeView";

interface PublicLatestReportsProps {
  items: PublicDiscoveryCard[];
  loading: boolean;
  error?: string | null;
  onItemClick: (item: PublicDiscoveryCard) => void | Promise<void>;
}

const PublicLatestReports: React.FC<PublicLatestReportsProps> = ({
  items,
  loading,
  error,
  onItemClick,
}) => {
  const { t } = useTranslations();
  const isMobile = useIsMobile();

  return (
    <div
      className={`absolute bottom-8 p-1 sm:p-2 ${isMobile ? "h-[50vh] max-h-[250px] left-0" : "h-[40vh] left-4"} flex flex-col z-10`}
    >
      <div className="h-full bg-gradient-to-b from-[#14213d] to-black text-white px-3 sm:px-4 py-1 sm:py-2 border border-slate-700 rounded-2xl text-center flex flex-col w-[275px]">
        <p className="text-slate-300 font-semibold text-sm mt-2 mb-1 sm:mb-3 flex-shrink-0">
          {t("latestReports")}
        </p>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide items-center">
          {loading ? (
            <p className="text-xs text-gray-400">{t("loading")}...</p>
          ) : error ? (
            <p className="text-xs text-gray-400">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400">{t("noReportsFound")}.</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${item.discovery_token}-${idx}`}
                onClick={() => {
                  void onItemClick(item);
                }}
                className="flex flex-col gap-1 text-sm border p-3 rounded-lg mt-2 mx-2 cursor-pointer transition-colors text-center border-slate-700 text-slate-300 hover:bg-slate-700/50"
              >
                <p className="text-xs font-medium">
                  {item.title || t("report")}
                </p>
                {item.timestamp && (
                  <p className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-gray-400 line-clamp-2">
                  {item.summary || t("noSummary")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicLatestReports;
