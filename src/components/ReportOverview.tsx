import React, { useEffect, useState } from "react";
import Image from "next/image";
import router from "next/router";
import { LatestReport } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import { useTranslations, getCurrentLocale, filterAnalysesByLanguage } from '@/lib/i18n';

interface ReportOverviewProps {
  reportItem?: LatestReport | null;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === 'true';

const ReportOverview: React.FC<ReportOverviewProps> = ({ reportItem }) => {
  const [fullReport, setFullReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();

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
      const locale = getCurrentLocale();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-seq?seq=${reportItem.report.seq}&lang=${locale}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter analyses by language and convert to single analysis format
        const filteredData = filterAnalysesByLanguage([data], locale);
        setFullReport(filteredData[0] || data);
      } else {
        setError(`${t('failedToFetchReport')}: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching full report:", error);
      setError(t('failedToFetchReport'));
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
          <p className="text-lg font-medium">{t('selectAReport')}</p>
          <p className="text-sm text-gray-500">
            {t('selectAReportFromMapToViewDetailedAnalysis')}
          </p>
        </div>
        <div className="relative min-h-[400px] sm:h-96 bg-gray-100 rounded-b-md flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📊</div>
            <p className="text-gray-500">{t('noReportSelected')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('clickOnAReportFromTheMapToSeeDetailedInformation')}
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
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          {analysis?.title || `${t('report')} ${report.seq}`}
        </h1>
      </div>

      <div className="relative min-h-[400px] sm:h-96">
        {error ? (
          <div className="w-full h-full bg-red-50 rounded-b-md flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-3xl sm:text-4xl mb-2">⚠️</div>
              <p className="text-red-600 font-medium">{t('errorLoadingReport')}</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
          </div>
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={t('reportAnalysis')}
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
            <p className="text-gray-500">{t('noImageAvailable')}</p>
          </div>
        )}

        {/* Mobile Layout - Content below image */}
        <div className="sm:hidden">

          {/* Content sections below image */}
          <div className="p-4 space-y-4">
            {/* Top section with report details */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="space-y-3">
                {/* Location and Time - Horizontal layout */}
                <div className="flex gap-4">
                  {/* Location */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1 text-gray-800">{t('location')}</h3>
                    <a 
                      href={getGoogleMapsUrl(report.latitude, report.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                    >
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </a>
                  </div>

                  {/* Time */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1 text-gray-800">{t('time')}</h3>
                    <p className="text-sm text-gray-600">{formatTime(report.timestamp)}</p>
                  </div>
                </div>

                {/* Litter Probability */}
                {analysis?.litter_probability !== undefined && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1 text-gray-800">{t('litter')}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-300 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.litter_probability)}`}
                          style={{ width: `${analysis.litter_probability * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {(analysis.litter_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Hazard Probability */}
                {analysis?.hazard_probability !== undefined && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1 text-gray-800">{t('hazard')}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-300 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.hazard_probability)}`}
                          style={{ width: `${analysis.hazard_probability * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {(analysis.hazard_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Severity Level */}
                {analysis?.severity_level !== undefined && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1 text-gray-800">{t('severity')}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-300 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.severity_level)}`}
                          style={{ width: `${analysis.severity_level * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {(analysis.severity_level * 10).toFixed(0)}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {analysis?.description && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-800">{t('description')}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.description}
                </p>
              </div>
            )}

            {/* Summary */}
            {analysis?.summary && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-800">{t('summary')}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.summary}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout - Content overlay on image */}
        <div className="hidden sm:block">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-white">
              {/* Location */}
              <div>
                <h3 className="font-semibold text-sm mb-1">{t('location')}</h3>
                <a 
                  href={getGoogleMapsUrl(report.latitude, report.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 text-sm underline"
                >
                  {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                </a>
              </div>

              {/* Time */}
              <div>
                <h3 className="font-semibold text-sm mb-1">{t('time')}</h3>
                <p className="text-sm">{formatTime(report.timestamp)}</p>
              </div>

              {/* Litter Probability */}
              {analysis?.litter_probability !== undefined && (
                <div>
                  <h3 className="font-semibold text-sm mb-1">{t('litter')}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.litter_probability)}`}
                        style={{ width: `${analysis.litter_probability * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {(analysis.litter_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Hazard Probability */}
              {analysis?.hazard_probability !== undefined && (
                <div>
                  <h3 className="font-semibold text-sm mb-1">{t('hazard')}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.hazard_probability)}`}
                        style={{ width: `${analysis.hazard_probability * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {(analysis.hazard_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportOverview;
