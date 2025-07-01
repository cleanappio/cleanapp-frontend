import React, { useEffect, useState } from "react";
import { FaLock } from "react-icons/fa";
import Image from "next/image";
import { LatestReport } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";

interface RecentReportsProps {
  reportItem?: LatestReport | null;
}

const RecentReports: React.FC<RecentReportsProps> = ({ reportItem }) => {
  const [recentReports, setRecentReports] = useState<LatestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (severityLevel >= 7) return "bg-red-500";
    if (severityLevel >= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPriorityText = (severityLevel: number) => {
    if (severityLevel >= 7) return "High Priority";
    if (severityLevel >= 4) return "Medium Priority";
    return "Low Priority";
  };

  const getCategory = (analysis: any) => {
    if (analysis?.litter_probability > 0.5) return "Litter";
    if (analysis?.hazard_probability > 0.5) return "Hazard";
    return "General";
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto my-8">
        <h1 className="text-2xl font-medium mb-4">Recent Reports</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-gray-500">Loading recent reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto my-8">
        <h1 className="text-2xl font-medium mb-4">Recent Reports</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-2">⚠️</div>
            <p className="text-red-600 font-medium">Error loading reports</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button 
              onClick={fetchRecentReports}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto my-8">
      <h1 className="text-2xl font-medium mb-4">
        Recent Reports ({recentReports.length}):
      </h1>
      
      {recentReports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-500">No recent reports found.</p>
            <p className="text-sm text-gray-400 mt-1">Reports will appear here as they are generated.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReports.map((item, index) => {
            const report = item.report;
            const analysis = item.analysis;
            const imageUrl = getDisplayableImage(analysis?.analysis_image);
            
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
                      className="rounded-t-xl w-full h-40 object-cover"
                      onError={(e) => {
                        console.error("Failed to load image:", imageUrl);
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="rounded-t-xl w-full h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <p className="text-gray-500 text-sm">No Image</p>
                    </div>
                  )}
                  
                  {analysis?.severity_level && (
                    <span className={`absolute top-3 right-3 ${getPriorityColor(analysis.severity_level)} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                      {getPriorityText(analysis.severity_level)}
                    </span>
                  )}
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="font-semibold text-lg mb-1">
                      {analysis?.title || `Report ${report?.seq || index + 1}`}
                    </h2>
                    <p className="text-gray-500 text-sm mb-2">
                      Reported: {report?.timestamp ? new Date(report.timestamp).toLocaleString() : "Unknown"}
                    </p>
                    <p className="text-gray-700 text-sm mb-4 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {analysis?.summary || analysis?.description || "No description available"}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                      {getCategory(analysis)}
                    </span>
                    <span className="text-xs px-3 py-1 text-gray-500">
                      {report?.latitude?.toFixed(4)}, {report?.longitude?.toFixed(4)}
                    </span>
                  </div>
                  
                  {analysis && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {analysis.litter_probability !== undefined && (
                          <div>
                            <span className="text-gray-500">Litter:</span>
                            <span className="ml-1 font-medium">
                              {(analysis.litter_probability * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        {analysis.hazard_probability !== undefined && (
                          <div>
                            <span className="text-gray-500">Hazard:</span>
                            <span className="ml-1 font-medium">
                              {(analysis.hazard_probability * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        {analysis.severity_level !== undefined && (
                          <div>
                            <span className="text-gray-500">Severity:</span>
                            <span className="ml-1 font-medium">
                              {analysis.severity_level}/10
                            </span>
                          </div>
                        )}
                        {report?.seq && (
                          <div>
                            <span className="text-gray-500">Seq:</span>
                            <span className="ml-1 font-medium">{report.seq}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights Card - Keep the premium features section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-lg font-medium">Locations</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="rounded-t-xl w-full h-40 flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 relative">
              <span className="w-6 h-6 bg-red-500 rounded-full block"></span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-gray-700 text-sm mb-2 flex justify-between items-center">
                  <h2 className="font-semibold text-lg mb-1">Monitoring Zone</h2>
                  <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-md">
                    Active
                  </span>
                </div>

                <div className="text-gray-500 text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Reports Today:
                  </span>
                  <span>{recentReports.length}</span>
                </div>
                <div className="text-gray-500 text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span>Live Monitoring</span>
                </div>
                <div className="text-gray-500 text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Coverage:
                  </span>
                  <span>24/7</span>
                </div>
                <div className="text-sm text-green-500 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    System:
                  </span>
                  <span>Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-lg font-medium">Statistics</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full p-4">
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{recentReports.length}</div>
                <div className="text-sm text-gray-500">Total Reports</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {recentReports.filter(r => r.analysis?.severity_level >= 7).length}
                  </div>
                  <div className="text-xs text-gray-500">High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600">
                    {recentReports.filter(r => r.analysis?.severity_level >= 4 && r.analysis?.severity_level < 7).length}
                  </div>
                  <div className="text-xs text-gray-500">Medium Priority</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {recentReports.filter(r => r.analysis?.litter_probability > 0.5).length}
                </div>
                <div className="text-xs text-gray-500">Litter Issues</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-lg font-medium">AI Insights</h1>
          </div>

          <div className="bg-white rounded-xl shadow-dashed border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 h-full">
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-4 mb-4">
                <FaLock className="text-green-600 text-2xl" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Premium Features</h2>
              <ul className="text-gray-700 text-xs mb-4 list-none space-y-1 text-center">
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
              <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md transition-colors text-sm">
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
