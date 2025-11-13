"use client";

import { getDisplayableImage } from "@/lib/image-utils";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { useRouter } from "next/router";
import { FaLock } from "react-icons/fa";
import { ReportWithAnalysis } from "../../components/GlobeView";
import ImageDisplay from "../ImageDisplay";
import TextToImage from "../TextToImage";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

export default function PublicBrandDashboard({
  brandReports,
}: {
  brandReports: ReportWithAnalysis[];
}) {
  const locale = getCurrentLocale();
  const { t } = useTranslations();
  const router = useRouter();

  const [urlCopied, setUrlCopied] = useState(false);
  const [currentSeq, setCurrentSeq] = useState<number | null>(null);

  const handleCopyUrl = async (seq?: number) => {
    if (!seq) {
      console.error("No seq provided");
      return;
    }

    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(`${currentUrl}/report/${seq}`);
      setUrlCopied(true);
      setTimeout(() => {
        setUrlCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = `${window.location.href}/report/${seq}`;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setUrlCopied(true);
        setTimeout(() => {
          setUrlCopied(false);
        }, 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Only show up to 6 reports (3 clear, 3 blurred)
  const visibleReports = brandReports.slice(0, 6);
  const firstRow = visibleReports.slice(0, 3);
  const secondRow = visibleReports.slice(3, 6);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {firstRow.map((item, index) => {
          const report = item.report;
          const analysis = item.analysis;
          const matchingAnalysis =
            analysis?.find((a) => a.language === locale) || analysis?.[0];
          const imageUrl = getDisplayableImage(report?.image || null);
          const text =
            matchingAnalysis?.summary || matchingAnalysis?.description || "";
          return (
            <div
              key={report?.seq || index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow"
            >
              <div className="relative">
                {imageUrl ? (
                  <ImageDisplay imageUrl={imageUrl} className="h-40 sm:h-40" />
                ) : (
                  <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
                    {text ? (
                      <TextToImage text={text} />
                    ) : (
                      <p className="text-gray-500 text-sm sm:text-sm">
                        {t("noImage")}
                      </p>
                    )}
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => {
                      handleCopyUrl(report?.seq);
                      setCurrentSeq(report?.seq || null);
                    }}
                    className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm bg-black/50"
                    aria-label={
                      urlCopied && currentSeq === report?.seq
                        ? t("urlCopied") || "URL Copied"
                        : t("copyUrl") || "Copy URL"
                    }
                  >
                    {urlCopied && currentSeq === report?.seq ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Copy className="w-6 h-6" />
                    )}
                  </button>
                </div>
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
          const text =
            matchingAnalysis?.summary || matchingAnalysis?.description || "";
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
                  <ImageDisplay imageUrl={imageUrl} className="h-40 sm:h-40" />
                ) : (
                  <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
                    {text ? (
                      <TextToImage text={text} />
                    ) : (
                      <p className="text-gray-500 text-sm sm:text-sm">
                        {t("noImage")}
                      </p>
                    )}
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
    </>
  );
}
