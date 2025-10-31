import ReportOverview from "@/components/ReportOverview";
import RecentReports from "@/components/RecentReports";
import LatestReports from "@/components/LatestReports";
import React, { useState, useEffect, useMemo } from "react";
import { ReportWithAnalysis } from "@/components/GlobeView";
import { X } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import { CollapsibleLatestReports } from "./CollapsibleLatestReports";
import { ReportResponse } from "@/types/reports/api";

interface CleanAppProModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  report?: ReportResponse | null;
  seq?: number | null;
  reportWithAnalysis?: ReportWithAnalysis | null;
  // allReports: ReportResponse[];
  // onReportChange: (report: ReportResponse) => void;
  // showLatestReports?: boolean;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const CleanAppProModalV2: React.FC<CleanAppProModalV2Props> = ({
  isOpen,
  onClose,
  report,
  seq,
  reportWithAnalysis: propReportWithAnalysis,
  // allReports,
  // onReportChange,
  // showLatestReports = true,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslations();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportWithAnalysis, setReportWithAnalysis] =
    useState<ReportWithAnalysis | null>(null);

  // Determine the report to use for ReportOverview
  // const reportForOverview = useMemo(() => {
  //   // If we have reportWithAnalysis from props, convert it to ReportResponse format
  //   if (propReportWithAnalysis) {
  //     return {
  //       ...propReportWithAnalysis.report,
  //       classification:
  //         propReportWithAnalysis.analysis[0]?.classification || "physical",
  //       severity_level: propReportWithAnalysis.analysis[0]?.severity_level,
  //       brand_name: propReportWithAnalysis.analysis[0]?.brand_name,
  //       brand_display_name:
  //         propReportWithAnalysis.analysis[0]?.brand_display_name,
  //     } as ReportResponse;
  //   }
  //   // Otherwise use the report prop directly
  //   return report;
  // }, [propReportWithAnalysis, report]);

  // Fetch report only if we don't have reportWithAnalysis and need more data
  // useEffect(() => {
  //   // If we already have reportWithAnalysis from props, no need to fetch
  //   if (propReportWithAnalysis) {
  //     setReportWithAnalysis(propReportWithAnalysis);
  //     return;
  //   }

  //   // If we don't have enough data, fetch it
  //   const fetchReport = async () => {
  //     // Determine what to fetch based on available data
  //     if (!report && !seq) {
  //       // No data to fetch
  //       setReportWithAnalysis(null);
  //       return;
  //     }

  //     try {
  //       setLoading(true);
  //       setError(null);
  //       let url = "";

  //       // Priority: use report data if available
  //       if (report?.classification === "physical" && seq) {
  //         // Physical report: fetch by seq
  //         url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-seq?seq=${seq}`;
  //       } else if (report?.classification === "digital" && report.brand_name) {
  //         // Digital report: fetch by brand_name (get first report as example)
  //         url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-brand?brand_name=${report.brand_name}&n=1`;
  //       } else if (seq) {
  //         // Fallback: try to fetch by seq
  //         url = `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-seq?seq=${seq}`;
  //       } else {
  //         setLoading(false);
  //         return;
  //       }

  //       const response = await fetch(url);
  //       if (response.ok) {
  //         const data = await response.json();

  //         // Handle different response formats
  //         if (
  //           report?.classification === "digital" &&
  //           Array.isArray(data.reports)
  //         ) {
  //           // Digital reports return array - convert first one to ReportWithAnalysis format
  //           if (data.reports.length > 0) {
  //             setReportWithAnalysis(data.reports[0]);
  //           }
  //         } else {
  //           // Physical reports return single ReportWithAnalysis
  //           setReportWithAnalysis(data);
  //         }
  //       } else {
  //         setError(`Failed to fetch report: ${response.status}`);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching report:", error);
  //       setError(
  //         error instanceof Error ? error.message : "Failed to fetch report"
  //       );
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchReport();
  // }, [propReportWithAnalysis, report, seq]);

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
                  <div className="flex justify-center items-center h-full bg-white">
                    <p>Loading...</p>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center h-full bg-white">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : (
                  <ReportOverview
                    reportItem={report}
                    reportWithAnalysis={propReportWithAnalysis}
                  />
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
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-[20px] right-[20px] z-[9999] p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
              aria-label={t("close")}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="fixed top-[0px] left-[50px] right-[50px] bottom-[0px] overflow-y-auto scrollbar-hide">
              {/* Content */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 lg:mt-8">
                {loading ? (
                  <div className="flex justify-center items-center h-full min-h-[400px] bg-white rounded-md">
                    <p>Loading...</p>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center h-full min-h-[400px] bg-white rounded-md">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : (
                  <ReportOverview
                    reportItem={report}
                    reportWithAnalysis={propReportWithAnalysis}
                  />
                )}
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
