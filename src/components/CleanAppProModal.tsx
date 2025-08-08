import ReportOverview from "@/components/ReportOverview";
import RecentReports from "@/components/RecentReports";
import LatestReports from "@/components/LatestReports";
import React, { useState, useEffect } from "react";
import { LatestReport, Report, ReportAnalysis } from "@/components/GlobeView";
import { X } from "lucide-react";
import {
  filterAnalysesByLanguage,
  getCurrentLocale,
  useTranslations,
} from "@/lib/i18n";

interface CleanAppProModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  allReports: LatestReport[];
  onReportChange: (report: LatestReport) => void;
  showLatestReports?: boolean;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const CleanAppProModal: React.FC<CleanAppProModalProps> = ({
  isOpen,
  onClose,
  report,
  allReports,
  onReportChange,
  showLatestReports = true,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslations();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {/* Close button for mobile */}
            <button
              onClick={handleCloseModal}
              className="fixed top-4 right-4 z-[9999] p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm bg-black/50"
              aria-label={t("close")}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Mobile content container with transparency */}
            <div className="min-h-screen">
              <div className="px-4 py-6">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <p>Loading...</p>
                  </div>
                ) : (
                  <ReportOverview reportItem={report} />
                )}
                <div className="mt-6">
                  {!isEmbeddedMode && <RecentReports reportItem={report} />}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Layout */
          <>
            <div className="fixed top-[0px] left-[50px] right-[50px] bottom-[0px] overflow-y-auto scrollbar-hide">
              {/* Close button */}
              <button
                onClick={handleCloseModal}
                className="fixed top-[20px] right-[20px] z-[9999] p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
                aria-label={t("close")}
              >
                <X className="w-6 h-6" />
              </button>

              {/* Content */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 lg:mt-8">
                <ReportOverview reportItem={report} />
                {!isEmbeddedMode && <RecentReports reportItem={report} />}
              </div>
            </div>

            {/* Latest Reports in fixed position outside scrollable container - Hidden on mobile */}
            {showLatestReports && (
              <LatestReports
                reports={allReports}
                loading={false}
                onReportClick={onReportChange}
                isModalActive={true}
                selectedReport={{
                  report: report as Report,
                  analysis: {} as ReportAnalysis,
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default CleanAppProModal;
