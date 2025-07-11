import React, { useState, useEffect } from "react";
import { Report } from "./MontenegroMap";
import { getDisplayableImage } from "@/lib/image-utils";

interface MontenegroReportOverviewProps {
  reportItem: Report | null;
  onClose?: () => void;
}

const MontenegroReportOverview: React.FC<MontenegroReportOverviewProps> = ({ reportItem, onClose }) => {
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
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No report selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading report</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const report = reportItem.report;
  const analysis = reportItem.analysis;
  const imageUrl = getDisplayableImage(fullReport?.report?.image || report?.image);

  return (
    <div className="fixed inset-0 bg-white z-[2000] overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Report #{report.seq}
          </h1>
          <span className="text-sm text-gray-500">
            {formatTime(report.timestamp)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 h-full flex">
        {/* Left Side - Image */}
        <div className="w-1/2 h-full p-6">
          <div className="h-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Report"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error("Failed to load image:", imageUrl);
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <div className="text-gray-400 text-center">
                <p>No image available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Stats and Description */}
        <div className="w-1/2 h-full p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Location Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Latitude:</span>
                  <span className="ml-2 font-medium">{report.latitude.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Longitude:</span>
                  <span className="ml-2 font-medium">{report.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>

            {/* Analysis Stats */}
            {analysis && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Analysis</h3>
                
                {/* Severity Level */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Severity Level</span>
                    <span className="text-sm font-semibold">{(analysis.severity_level * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.severity_level)}`}
                      style={{ width: `${analysis.severity_level * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Litter Probability */}
                {analysis.litter_probability !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Litter Probability</span>
                      <span className="text-sm font-semibold">{(analysis.litter_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.litter_probability)}`}
                        style={{ width: `${analysis.litter_probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Hazard Probability */}
                {analysis.hazard_probability !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Hazard Probability</span>
                      <span className="text-sm font-semibold">{(analysis.hazard_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.hazard_probability)}`}
                        style={{ width: `${analysis.hazard_probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {analysis && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                {analysis.title && (
                  <h4 className="font-medium text-gray-800 mb-2">{analysis.title}</h4>
                )}
                {analysis.description && (
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {analysis.description}
                  </p>
                )}
                {analysis.summary && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Summary</h5>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                )}
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default MontenegroReportOverview; 