"use client";

import { getDisplayableImage } from "@/lib/image-utils";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import Image from "next/image";
import { ReportWithAnalysis } from "../../components/GlobeView";

export default function SubscribedBrandDashboard({
  brandReports,
}: {
  brandReports: ReportWithAnalysis[];
}) {
  const locale = getCurrentLocale();
  const { t } = useTranslations();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {brandReports.map((item, index) => {
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
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
