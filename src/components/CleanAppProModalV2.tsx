import ReportOverview from "@/components/ReportOverview";
import RecentReports from "@/components/RecentReports";
import LatestReports from "@/components/LatestReports";
import React, { useState, useEffect, useMemo } from "react";
import { ReportWithAnalysis } from "@/components/GlobeView";
import { X, Copy, Check } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import { CollapsibleLatestReports } from "./CollapsibleLatestReports";
import { ReportResponse } from "@/types/reports/api";
import { useRouter } from "next/router";

interface CleanAppProModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  report?: ReportResponse | null;
  seq?: number | null;
  reportWithAnalysis?: ReportWithAnalysis | null;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const CleanAppProModalV2: React.FC<CleanAppProModalV2Props> = ({
  isOpen,
  onClose,
  report,
  seq,
  reportWithAnalysis: propReportWithAnalysis,
}) => {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const { t } = useTranslations();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleCloseModal = () => {
    setIsClosing(true);
    // Add a small delay to allow for smooth transition
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  const handleCopyUrl = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setUrlCopied(true);
      setTimeout(() => {
        setUrlCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
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

  // Prevent closing when clicking on the modal content itself
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Semi-transparent overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-150 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleCloseModal}
      />

      {/* Modal content */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-150 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleModalContentClick}
      >
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="fixed inset-0 overflow-y-auto scrollbar-hide">
            {/* Close and Copy URL buttons for mobile */}
            <div className="fixed top-4 right-4 z-[9999] flex gap-2">
              <button
                onClick={handleCopyUrl}
                className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm bg-black/50"
                aria-label={urlCopied ? t("urlCopied") || "URL Copied" : t("copyUrl") || "Copy URL"}
              >
                {urlCopied ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={handleCloseModal}
                className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm bg-black/50"
                aria-label={t("close")}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile content container with transparency */}
            <div className="min-h-screen">
              <div className="px-4 py-6">
                <ReportOverview
                  reportItem={report}
                  reportWithAnalysis={propReportWithAnalysis}
                />
                <div className="mt-6">
                  {!isEmbeddedMode && <RecentReports reportItem={report} />}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Layout */
          <>
            {/* Close and Copy URL buttons */}
            <div className="absolute top-[20px] right-[20px] z-[9999] flex gap-2">
              <button
                onClick={handleCopyUrl}
                className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
                aria-label={urlCopied ? t("urlCopied") || "URL Copied" : t("copyUrl") || "Copy URL"}
                title={urlCopied ? t("urlCopied") || "URL Copied!" : t("copyUrl") || "Copy URL"}
              >
                {urlCopied ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={handleCloseModal}
                className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
                aria-label={t("close")}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="fixed top-[0px] left-[50px] right-[50px] bottom-[0px] overflow-y-auto scrollbar-hide">
              {/* Content */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 lg:mt-8">
                <ReportOverview
                  reportItem={report}
                  reportWithAnalysis={propReportWithAnalysis}
                />
                {!isEmbeddedMode && <RecentReports reportItem={report} />}
              </div>
            </div>

            {/* TODO: Latest Reports in fixed position outside scrollable container - Hidden on mobile */}
            {/* {showLatestReports && (
              <CollapsibleLatestReports
                reports={allReports}
                loading={false}
                onReportClick={onReportChange}
                isModalActive={true}
                report={report}
              />
            )} */}
          </>
        )}
      </div>
    </>
  );
};

export default CleanAppProModalV2;
