import React, { useEffect, useState } from "react";
import Image from "next/image";
import router from "next/router";
import { LatestReport } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";

interface PropertyOverviewProps {
  reportItem?: LatestReport | null;
}

const PropertyOverview: React.FC<PropertyOverviewProps> = ({ reportItem }) => {
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

  if (!reportItem) {
    return (
      <div className="border rounded-md bg-white shadow-md">
        <div className="p-4">
          <p className="text-lg font-medium">Property Overview</p>
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
  const imageUrl = getDisplayableImage(fullReport?.analysis?.analysis_image || analysis?.analysis_image);

  return (
    <div className="border rounded-md bg-white shadow-md">
      <div className="p-4">
        <p className="text-lg font-medium">Property Overview</p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-500">
              {analysis?.title || "Report Analysis"}
            </p>
            <p className="text-sm text-gray-700">
              {analysis?.description || "No description available"}
            </p>
          </div>
        </div>
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

        {/* Report Info Overlay */}
        <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg max-w-xs">
          <h3 className="font-semibold text-sm mb-2">Report Details</h3>
          <div className="text-xs space-y-1">
            <p><span className="font-medium">ID:</span> {report.id}</p>
            <p><span className="font-medium">Seq:</span> {report.seq}</p>
            <p><span className="font-medium">Coordinates:</span> {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
            <p><span className="font-medium">Timestamp:</span> {new Date(report.timestamp).toLocaleString()}</p>
            {analysis?.litter_probability !== undefined && (
              <p><span className="font-medium">Litter Probability:</span> {(analysis.litter_probability * 100).toFixed(1)}%</p>
            )}
            {analysis?.hazard_probability !== undefined && (
              <p><span className="font-medium">Hazard Probability:</span> {(analysis.hazard_probability * 100).toFixed(1)}%</p>
            )}
            {analysis?.severity_level !== undefined && (
              <p><span className="font-medium">Severity Level:</span> {analysis.severity_level}</p>
            )}
          </div>
        </div>

        {/* Analysis Summary Overlay */}
        {analysis?.summary && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white p-3 rounded-lg max-w-xs">
            <h3 className="font-semibold text-sm mb-2">AI Analysis</h3>
            <p className="text-xs">{analysis.summary}</p>
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

export default PropertyOverview;
