import React, { useEffect, useState } from "react";
import Image from "next/image";
import router from "next/router";
import { LatestReport } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";

interface ReportOverviewProps {
  reportItem?: LatestReport | null;
}

const ReportOverview: React.FC<ReportOverviewProps> = ({ reportItem }) => {
  const [fullReport, setFullReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportItem?.report?.seq) {
      fetchFullReport();
    } else {
      setFullReport(null);
      setError(null);
    }
  }, [reportItem]);

  const fetchFullReport = async () => {
    if (!reportItem?.report?.seq) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-seq?seq=${reportItem.report.seq}`
      );
      if (response.ok) {
        const data = await response.json();
        setFullReport(data);
      } else {
        setError(`Failed to fetch report: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching full report:", error);
      setError("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const getGradientColor = (value: number, maxValue: number = 1) => {
    const percentage = (value / maxValue) * 100;
    if (percentage <= 33) return "from-green-500 to-green-400";
    if (percentage <= 66) return "from-yellow-500 to-yellow-400";
    return "from-red-500 to-red-400";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  if (!reportItem) {
    return (
      <div className="border rounded-md bg-white shadow-md">
        <div className="p-4">
          <p className="text-lg font-medium">Select a Report</p>
          <p className="text-sm text-gray-500">
            Select a report from the map to view detailed analysis
          </p>
        </div>
        <div className="relative h-96 bg-gray-100 rounded-b-md flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <p className="text-gray-500">No report selected</p>
            <p className="text-sm text-gray-400 mt-2">
              Click on a report from the map to see detailed information
            </p>
          </div>
        </div>
      </div>
    );
  }

  const report = reportItem.report;
  const analysis = reportItem.analysis;
  const imageUrl = getDisplayableImage(fullReport?.report?.image || report?.image);

  return (
    <div className="border rounded-md bg-white shadow-md">
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          {analysis?.title || `Report ${report.seq}`}
        </h1>
      </div>

      <div className="relative h-96">
        {error ? (
          <div className="w-full h-full bg-red-50 rounded-b-md flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-4xl mb-2">⚠️</div>
              <p className="text-red-600 font-medium">Error loading report</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
          </div>
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt="Report Analysis"
            width={1000}
            height={1000}
            className="w-full h-full rounded-b-md object-cover"
            onError={(e) => {
              console.error("Failed to load image:", imageUrl);
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-b-md flex items-center justify-center">
            <p className="text-gray-500">No image available</p>
          </div>
        )}

        {/* Left Panel - Report Details */}
        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg max-w-xs backdrop-blur-sm">
          <div className="space-y-3">
            {/* Location */}
            <div>
              <h3 className="font-semibold text-sm mb-1">Location</h3>
              <a 
                href={getGoogleMapsUrl(report.latitude, report.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 text-xs underline"
              >
                {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
              </a>
            </div>

            {/* Time */}
            <div>
              <h3 className="font-semibold text-sm mb-1">Time</h3>
              <p className="text-xs text-gray-300">{formatTime(report.timestamp)}</p>
            </div>

            {/* Litter Probability */}
            {analysis?.litter_probability !== undefined && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Litter</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.litter_probability)}`}
                      style={{ width: `${analysis.litter_probability * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium">
                    {(analysis.litter_probability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Hazard Probability */}
            {analysis?.hazard_probability !== undefined && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Hazard</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.hazard_probability)}`}
                      style={{ width: `${analysis.hazard_probability * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium">
                    {(analysis.hazard_probability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Severity Level */}
            {analysis?.severity_level !== undefined && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Severity</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.severity_level, 10)}`}
                      style={{ width: `${(analysis.severity_level / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium">
                    {analysis.severity_level.toFixed(1)}/10
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Bottom Panel - Description */}
        {analysis?.description && (
          <div className="absolute bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-xs backdrop-blur-sm">
            <p className="text-xs leading-relaxed">{analysis.description}</p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-b-md">
            <div className="text-white flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
              Loading full report...
            </div>
          </div>
        )}

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div
              className="absolute inset-0 bg-white rounded-xl opacity-20 animate-ping"
              style={{ animationDuration: "3s" }}
            ></div>
            <div
              className="absolute inset-0 bg-white rounded-xl opacity-15 animate-pulse"
              style={{ animationDuration: "4s" }}
            ></div>
            <button
              className="subscribe-button relative bg-gradient-to-r from-green-500 to-green-700 hover:from-green-500/90 hover:to-green-700/90 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 z-10"
              onClick={() => router.push("/pricing")}
            >
              <span className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 3l14 9-14 9V3z"
                  ></path>
                </svg>
                Subscribe for Full Access
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportOverview;
