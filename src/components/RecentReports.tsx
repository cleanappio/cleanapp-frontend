import React, { useEffect, useState } from "react";
import { FaLock } from "react-icons/fa";
import Image from "next/image";
import { LatestReport } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import { useRouter } from "next/router";

interface RecentReportsProps {
  reportItem?: LatestReport | null;
}

const RecentReports: React.FC<RecentReportsProps> = ({ reportItem }) => {
  const [recentReports, setRecentReports] = useState<LatestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRecentReports();
  }, [reportItem]);

  const fetchRecentReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // If we have a specific report, fetch recent reports around that ID
      // Otherwise, fetch the latest reports
      const url = reportItem?.report?.id
        ? `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-id?id=${reportItem.report.id}&n=10`
        : `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/last?n=10`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRecentReports(data.reports || []);
      } else {
        setError(`Failed to fetch reports: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching recent reports:", error);
      setError("Failed to fetch recent reports");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (severityLevel: number) => {
    if (severityLevel >= 0.7) return "bg-red-500";
    if (severityLevel >= 0.4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPriorityText = (severityLevel: number) => {
    if (severityLevel >= 0.7) return "High Priority";
    if (severityLevel >= 0.4) return "Medium Priority";
    return "Low Priority";
  };

  const getCategory = (analysis: any) => {
    if (analysis?.litter_probability > 0.5) return "Litter";
    if (analysis?.hazard_probability > 0.5) return "Hazard";
    return "General";
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto my-6 sm:my-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">Recent Reports</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mr-3 sm:mr-3"></div>
            <p className="text-gray-500 text-sm sm:text-base">Loading recent reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto my-6 sm:my-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">Recent Reports</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-red-400 text-3xl sm:text-4xl mb-2">⚠️</div>
            <p className="text-red-600 font-medium text-sm sm:text-base">Error loading reports</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={fetchRecentReports}
              className="mt-4 sm:mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-4 sm:py-2 rounded-md transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only show up to 6 reports (3 clear, 3 blurred)
  const visibleReports = recentReports.slice(0, 6);
  const firstRow = visibleReports.slice(0, 3);
  const secondRow = visibleReports.slice(3, 6);

  return (
    <div className="max-w-7xl mx-auto my-6 sm:my-8">
      <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">Recent Reports</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {firstRow.map((item, index) => {
          const report = item.report;
          const analysis = item.analysis;
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
                    alt={analysis?.title || "Report"}
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
                    <p className="text-gray-500 text-sm sm:text-sm">No Image</p>
                  </div>
                )}
                {analysis?.severity_level !== undefined &&
                  analysis?.severity_level !== 0 && (
                    <span
                      className={`absolute top-2 right-2 sm:top-3 sm:right-3 ${getPriorityColor(
                        analysis.severity_level
                      )} text-white text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1 rounded-full`}
                    >
                      {getPriorityText(analysis.severity_level)}
                    </span>
                  )}
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    {analysis?.title || `Report ${report?.seq || index + 1}`}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-2">
                    Reported:{" "}
                    {report?.timestamp
                      ? new Date(report.timestamp).toLocaleString()
                      : "Unknown"}
                  </p>
                  <p
                    className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 overflow-hidden text-ellipsis"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {analysis?.summary ||
                      analysis?.description ||
                      "No description available"}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-full font-medium">
                    {getCategory(analysis)}
                  </span>
                  <span className="text-xs px-2 py-1 sm:px-3 sm:py-1 text-gray-500">
                    {report?.latitude?.toFixed(4)},{" "}
                    {report?.longitude?.toFixed(4)}
                  </span>
                </div>
                <button
                  className="mt-3 sm:mt-6 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm sm:text-lg"
                  onClick={() => router.push("/pricing")}
                >
                  Subscribe
                </button>
              </div>
            </div>
          );
        })}
        {secondRow.map((item, index) => {
          const report = item.report;
          const analysis = item.analysis;
          const imageUrl = getDisplayableImage(report?.image || null);
          return (
            <div
              key={report?.seq || `blurred-${index}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden"
            >
              <div className="relative">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={analysis?.title || "Report"}
                    width={400}
                    height={160}
                    className="rounded-t-xl w-full h-32 sm:h-40 object-cover"
                  />
                ) : (
                  <div className="rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <p className="text-gray-500 text-sm sm:text-sm">No Image</p>
                  </div>
                )}
                {analysis?.severity_level !== undefined &&
                  analysis?.severity_level !== 0 && (
                    <span
                      className={`absolute top-2 right-2 sm:top-3 sm:right-3 ${getPriorityColor(
                        analysis.severity_level
                      )} text-white text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1 rounded-full`}
                    >
                      {getPriorityText(analysis.severity_level)}
                    </span>
                  )}
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    {analysis?.title || `Report ${report?.seq || index + 4}`}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-2">
                    Reported:{" "}
                    {report?.timestamp
                      ? new Date(report.timestamp).toLocaleString()
                      : "Unknown"}
                  </p>
                  <p
                    className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4 overflow-hidden text-ellipsis"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {analysis?.summary ||
                      analysis?.description ||
                      "No description available"}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-full font-medium">
                    {getCategory(analysis)}
                  </span>
                  <span className="text-xs px-2 py-1 sm:px-3 sm:py-1 text-gray-500">
                    {report?.latitude?.toFixed(4)},{" "}
                    {report?.longitude?.toFixed(4)}
                  </span>
                </div>
              </div>
              {/* Blur overlay */}
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col justify-end items-center">
                <button
                  className="mb-3 sm:mb-6 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm sm:text-lg"
                  onClick={() => router.push("/pricing")}
                >
                  Subscribe
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Insights Card - Keep the premium features section - Mobile responsive */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium text-white">Locations</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="rounded-t-xl w-full h-32 sm:h-40 flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 relative">
              <span className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full block"></span>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-gray-700 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    Monitoring Zone
                  </h2>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 sm:px-3 sm:py-1 rounded-md">
                    Active
                  </span>
                </div>

                <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Reports Today:
                  </span>
                  <span>{recentReports.length}</span>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span>Live Monitoring</span>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Coverage:</span>
                  <span>24/7</span>
                </div>
                <div className="text-xs sm:text-sm text-green-500 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">System:</span>
                  <span>Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium text-white">Statistics</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {recentReports.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Total Reports</div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-red-600">
                    {
                      recentReports.filter(
                        (r) => r.analysis?.severity_level >= 0.7
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-500">High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-yellow-600">
                    {
                      recentReports.filter(
                        (r) =>
                          r.analysis?.severity_level >= 0.4 &&
                          r.analysis?.severity_level < 0.7
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-500">Medium Priority</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-base sm:text-lg font-semibold text-green-600">
                  {
                    recentReports.filter(
                      (r) => r.analysis?.litter_probability > 0.5
                    ).length
                  }
                </div>
                <div className="text-xs text-gray-500">Litter Issues</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-medium text-white">AI Insights</h1>
          </div>

          <div className="bg-white rounded-xl shadow-dashed border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 sm:p-6 h-full">
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
                <FaLock className="text-green-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="font-semibold text-base sm:text-lg mb-2">Premium Features</h2>
              <ul className="text-gray-700 text-xs mb-3 sm:mb-4 list-none space-y-1 text-center">
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  Predictive Risk Assessment
                </li>
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span> Cost
                  Impact Analysis
                </li>
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  AI-Powered Recommendations
                </li>
              </ul>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 sm:px-5 sm:py-2 rounded-md transition-colors text-sm"
                onClick={() => router.push("/pricing")}
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentReports;
