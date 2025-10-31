import React from "react";
import { useTranslations } from "@/lib/i18n";

interface LocationsCardProps {
  totalReports: number;
}

const LocationsCard: React.FC<LocationsCardProps> = ({ totalReports }) => {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-base sm:text-lg font-medium text-white">{t("locations")}</h1>
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
              <span className="font-semibold text-gray-700">{t("reportsToday")}:</span>
              <span>{totalReports}</span>
            </div>
            <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
              <span className="font-semibold text-gray-700">{t("status")}:</span>
              <span>{t("liveMonitoring")}</span>
            </div>
            <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
              <span className="font-semibold text-gray-700">{t("coverage")}:</span>
              <span>{t("twentyFourSeven")}</span>
            </div>
            <div className="text-xs sm:text-sm text-green-500 flex justify-between items-center">
              <span className="font-semibold text-gray-700">{t("system")}:</span>
              <span>{t("operational")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationsCard;

