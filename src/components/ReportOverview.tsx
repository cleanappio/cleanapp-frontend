import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ReportWithAnalysis } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import {
  useTranslations,
  getCurrentLocale,
  filterAnalysesByLanguage,
} from "@/lib/i18n";
import { getBrandNameDisplay, parseBackendDate } from "@/lib/util";
import Link from "next/link";
import { useReverseGeocoding } from "@/hooks/useReverseGeocoding";
import ReverseGeocodingDisplay from "./ReverseGeocodingDisplay";
import TextToImage from "./TextToImage";
import { ReportResponse } from "@/types/reports/api";

interface ReportOverviewProps {
  reportItem?: ReportResponse | null;
  reportWithAnalysis?: ReportWithAnalysis | null;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const ReportOverview: React.FC<ReportOverviewProps> = ({
  reportItem,
  reportWithAnalysis,
}) => {
  const [fullReport, setFullReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();
  const locale = getCurrentLocale();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [isDigital, setIsDigital] = useState(
    reportItem?.classification === "digital"
  );

  const [location, setLocation] = useState<{
    latitude?: number;
    longitude?: number;
  } | null>(null);

  // Classification
  useEffect(() => {
    if (fullReport) {
      if (fullReport.analysis && fullReport.analysis.length > 0) {
        setIsDigital(fullReport.analysis[0]?.classification === "digital");
      } else {
        setIsDigital(false);
      }
    } else if (reportItem) {
      setIsDigital(reportItem.classification === "digital");
    }
  }, [fullReport, reportItem]);

  // Location
  useEffect(() => {
    if (fullReport) {
      setLocation({
        latitude: fullReport.report.latitude,
        longitude: fullReport.report.longitude,
      });
    } else if (reportItem) {
      if (reportItem.classification === "physical") {
        setLocation({
          latitude: reportItem.latitude,
          longitude: reportItem.longitude,
        });
      }
    }
  }, [fullReport, reportItem]);

  // Reverse geocoding hook to get human-readable address
  const {
    address,
    loading: addressLoading,
    error: addressError,
    refetch: refetchAddress,
  } = useReverseGeocoding({
    latitude: location?.latitude,
    longitude: location?.longitude,
    language: locale,
    autoFetch: location?.latitude && location?.longitude ? true : false,
  });

  const fetchPhysicalReport = useCallback(async (seq: number) => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/reports/by-seq?seq=${seq}`);

    try {
      if (response.ok) {
        const data = await response.json();
        setFullReport(data);

        if (data.report.image) {
          setImageUrl(getDisplayableImage(data.report.image));
        } else {
          setImageUrl(null);
        }

        setTitle(
          data.analysis.find((analysis: any) => analysis.language === locale)
            ?.title || data.report.analysis[0].title
        );
      } else {
        console.error("Failed to fetch physical report:", response.status);
        setError(t("failedToFetchReport"));
      }
    } catch (error) {
      console.error("Error fetching physical report:", error);
      setError(t("failedToFetchReport"));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDigitalReport = useCallback(
    async (brand_name: string, n: number = 1) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-brand?brand_name=${brand_name}&n=${n}`
        );

        if (response.ok) {
          const data = await response.json();
          setFullReport(data.reports[0] as ReportWithAnalysis);
          if (data.reports[0].image) {
            setImageUrl(getDisplayableImage(data.reports[0].image));
          } else {
            setImageUrl(null);
          }

          setTitle(
            data.reports[0].analysis.find(
              (analysis: any) => analysis.language === locale
            )?.title || data.reports[0].analysis[0].title
          );
        } else {
          console.error("Failed to fetch digital report:", response.status);
          setError(t("failedToFetchReport"));
        }
      } catch (error) {
        console.error("Error fetching digital report:", error);
        setError(t("failedToFetchReport"));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchFullReport = useCallback(async () => {
    if (!reportItem?.classification) return;

    if (reportItem.classification === "physical") {
      fetchPhysicalReport(reportItem.seq);
    } else {
      fetchDigitalReport(reportItem.brand_name || "");
    }
  }, [fetchDigitalReport, fetchPhysicalReport, reportItem, reportWithAnalysis]);

  // Always fetch full report data when we have a seq to ensure source_timestamp is available
  // This is needed because data passed from the modal (reportWithAnalysis) lacks source_timestamp
  useEffect(() => {
    const seq = reportWithAnalysis?.report?.seq || (reportItem?.classification === 'physical' ? reportItem?.seq : null);
    const brandName = reportItem?.classification === 'digital' ? reportItem?.brand_name : null;

    // If we have a seq and haven't fetched this specific report yet, fetch it
    if (seq && (!fullReport?.report?.source_timestamp || fullReport?.report?.seq !== seq)) {
      fetchPhysicalReport(seq);
    } else if (brandName && !fullReport?.report?.source_timestamp) {
      fetchDigitalReport(brandName);
    } else if (reportItem && !fullReport) {
      fetchFullReport();
    }
  }, [reportItem, reportWithAnalysis]);

  useEffect(() => {
    if (fullReport) {
      setImageUrl(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/rawimage?seq=${fullReport.report.seq}`
      );

      setTitle(
        fullReport.analysis.find(
          (analysis: any) => analysis.language === locale
        )?.title || fullReport.analysis[0].title
      );
    } else if (reportItem) {
      if (reportItem.classification === "physical" && reportItem?.seq) {
        setImageUrl(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/rawimage?seq=${reportItem.seq}`
        );
      } else if (
        reportItem.classification === "digital" &&
        reportItem?.brand_name
      ) {
        setImageUrl(null);
      } else {
        setImageUrl(null);
      }
    } else {
      setImageUrl(null);
    }
  }, [fullReport, reportItem]);

  if (!reportItem && !reportWithAnalysis)
    throw new Error("Either reportItem or reportWithAnalysis must be provided");

  const getGradientColor = (value: number, maxValue: number = 1) => {
    const percentage = (value / maxValue) * 100;
    if (percentage <= 33) return "from-green-500 to-green-400";
    if (percentage <= 66) return "from-yellow-500 to-yellow-400";
    return "from-red-500 to-red-400";
  };

  const formatTime = (timestamp: string) => {
    const reportTime = parseBackendDate(timestamp);
    const currentTime = new Date();
    const timeDifference = currentTime.getTime() - reportTime.getTime();
    const minutes = Math.floor(timeDifference / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours >= 24) {
      return reportTime.toLocaleDateString(getCurrentLocale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    return `just now`;
  };


  // Format original post datetime (e.g., "December 10, 2025 at 14:30 UTC")
  const formatOriginalPostDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const linkify = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  if (!reportItem && !fullReport) {
    return (
      <div className="border rounded-md bg-white shadow-md">
        <div className="p-4">
          <p className="text-lg font-medium">{t("selectAReport")}</p>
          <p className="text-sm text-gray-500">
            {t("selectAReportFromMapToViewDetailedAnalysis")}
          </p>
        </div>
        <div className="relative min-h-[400px] sm:h-96 bg-gray-100 rounded-b-md flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📊</div>
            <p className="text-gray-500">{t("noReportSelected")}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t("clickOnAReportFromTheMapToSeeDetailedInformation")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const report = fullReport?.report ?? reportItem;
  const analysis = fullReport?.analysis?.find(
    (analysis: any) => analysis.language === locale
  );

  var imageComponent;

  if (imageUrl) {
    imageComponent = (
      <Image
        src={imageUrl}
        alt={t("reportAnalysis")}
        width={1000}
        height={1000}
        className="w-full h-full rounded-b-md object-cover"
        onError={(e) => {
          console.error("Failed to load image:", imageUrl);
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.classList.remove("hidden");
          setImageUrl(null);
        }}
      />
    );
  } else {
    const text = analysis?.summary || analysis?.description || "";

    if (text === "") {
      imageComponent = (
        <div className="flex items-center justify-center h-full bg-white">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mr-3 sm:mr-3"></div>
          <p className="text-gray-500 text-sm sm:text-base">{t("loading")}</p>
        </div>
      );
    } else {
      imageComponent = <TextToImage text={text} />;
    }
  }

  return (
    <div className="border rounded-md bg-white shadow-md">
      <div className="p-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          {title ||
            `${t("report")} ${report.classification === "physical"
              ? report.seq
              : report.brand_name
            }`}
        </h1>
      </div>

      <div className="relative min-h-[400px] sm:h-96 overflow-hidden">
        {error ? (
          <div className="w-full h-full bg-red-50 rounded-b-md flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-3xl sm:text-4xl mb-2">⚠️</div>
              <p className="text-red-600 font-medium">
                {t("errorLoadingReport")}
              </p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          imageComponent
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
                  {!isDigital && (
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 text-gray-800">
                        {t("location")}
                      </h3>
                      {location && location.latitude && location.longitude && (
                        <ReverseGeocodingDisplay
                          address={address}
                          loading={addressLoading}
                          error={addressError}
                          onRetry={refetchAddress}
                          textClassName="text-sm text-gray-700"
                        />
                      )}
                    </div>
                  )}

                  {/* Time: Escalated to CleanApp (timestamp - when ingested) */}
                  {fullReport?.report?.timestamp && (
                    <div className="flex-1">
                      <p
                        className="text-sm text-gray-800 relative group"
                        aria-describedby="tooltip-escalated"
                      >
                        <span className="font-semibold">{t("Escalated") || "Escalated"}:</span> {formatTime(fullReport.report.timestamp)}
                        <span
                          id="tooltip-escalated"
                          className="absolute invisible group-hover:visible bg-gray-800 text-white p-2 rounded bottom-full left-1/2 transform -translate-x-1/2 mt-2 font-normal"
                        >
                          {new Date(fullReport.report.timestamp).toLocaleString()}
                        </span>
                      </p>
                      {/* Originally Posted - shown below Escalated */}
                      {fullReport?.report?.source_timestamp && (
                        <p className="text-xs text-gray-600 mt-1">
                          Original post: {parseBackendDate(fullReport.report.source_timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} at {parseBackendDate(fullReport.report.source_timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}





                </div>


                {!isDigital && (
                  <>
                    {/* Litter Probability */}
                    {analysis?.litter_probability !== undefined && (
                      <div>
                        <h3 className="font-semibold text-sm mb-1 text-gray-800">
                          {t("litter")}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-300 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(
                                analysis.litter_probability
                              )}`}
                              style={{
                                width: `${analysis.litter_probability * 100}%`,
                              }}
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
                        <h3 className="font-semibold text-sm mb-1 text-gray-800">
                          {t("hazard")}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-300 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(
                                analysis.hazard_probability
                              )}`}
                              style={{
                                width: `${analysis.hazard_probability * 100}%`,
                              }}
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
                        <h3 className="font-semibold text-sm mb-1 text-gray-800">
                          {t("severity")}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-300 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(
                                analysis.severity_level
                              )}`}
                              style={{
                                width: `${analysis.severity_level * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {(analysis.severity_level * 10).toFixed(0)}/10
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {analysis?.description && analysis.description !== "" && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-800">
                  {t("description")}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed text-wrap break-words">
                  {linkify(analysis.description)}
                </p>

              </div>
            )}

            {/* Summary */}
            {analysis?.summary && analysis.summary !== "" && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-800">
                  {t("summary")}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed text-wrap break-words">
                  {linkify(analysis.summary)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Content overlay on image */}
      <div className="hidden sm:block">
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location */}
            {!isDigital && (
              <div>
                <h3 className="font-semibold text-sm mb-1">{t("location")}</h3>
                {location && location.latitude && location.longitude && (
                  <ReverseGeocodingDisplay
                    address={address}
                    loading={addressLoading}
                    error={addressError}
                    onRetry={refetchAddress}
                    textClassName="text-sm text-gray-700"
                  />
                )}
              </div>
            )}

            {/* Time: Escalated to CleanApp (timestamp - when ingested) */}
            {fullReport?.report?.timestamp && (
              <div>
                <p
                  className="text-sm text-gray-800 relative group"
                  aria-describedby="tooltip-escalated-desktop"
                >
                  <span className="font-semibold">{t("Escalated") || "Escalated"}:</span> {formatTime(fullReport.report.timestamp)}
                  <span
                    id="tooltip-escalated-desktop"
                    className="absolute invisible group-hover:visible bg-gray-800 text-white p-2 rounded bottom-full left-1/2 transform -translate-x-1/2 mt-2 font-normal"
                  >
                    {new Date(fullReport.report.timestamp).toLocaleString()}
                  </span>
                </p>
                {/* Originally Posted - shown below Escalated */}
                {fullReport?.report?.source_timestamp && (
                  <p className="text-xs text-gray-600 mt-1">
                    Original post: {parseBackendDate(fullReport.report.source_timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} at {parseBackendDate(fullReport.report.source_timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )}

            {/* Latest Escalation - enhanced for digital, simple for physical */}



            {isDigital && (
              <>
                <Link
                  href={`/digital/${encodeURIComponent(
                    getBrandNameDisplay(analysis).brandName
                  )}`}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      {t("brandDashboard")}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getBrandNameDisplay(analysis).brandDisplayName}
                      </span>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {!isDigital && (
              <>
                {/* Litter Probability */}
                {analysis?.litter_probability !== undefined && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      {t("litter")}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(
                            analysis.litter_probability
                          )}`}
                          style={{
                            width: `${analysis.litter_probability * 100}%`,
                          }}
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
                    <h3 className="font-semibold text-sm mb-1">
                      {t("hazard")}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(
                            analysis.hazard_probability
                          )}`}
                          style={{
                            width: `${analysis.hazard_probability * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {(analysis.hazard_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {analysis?.description && analysis.description !== "" && (
            <div>
              <p className="font-semibold text-sm mt-8">Description</p>
              <p>{linkify(analysis?.description)}</p>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportOverview;
