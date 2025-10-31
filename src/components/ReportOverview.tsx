import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ReportWithAnalysis } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import {
  useTranslations,
  getCurrentLocale,
  filterAnalysesByLanguage,
} from "@/lib/i18n";
import { getBrandNameDisplay } from "@/lib/util";
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
  const [fullReport, setFullReport] = useState<any>(reportWithAnalysis);
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-seq?seq=${seq}`
    );

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

  useEffect(() => {
    if (reportItem && !fullReport) {
      fetchFullReport();
    }
  }, [fetchFullReport, fullReport, reportItem, reportWithAnalysis]);

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
    return new Date(timestamp).toLocaleString();
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
            `${t("report")} ${
              report.classification === "physical"
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
                        <a
                          href={getGoogleMapsUrl(
                            location.latitude,
                            location.longitude
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                        >
                          <ReverseGeocodingDisplay
                            address={address}
                            loading={addressLoading}
                            error={addressError}
                            onRetry={refetchAddress}
                          />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  {fullReport?.report?.timestamp && (
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 text-gray-800">
                        {t("time")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatTime(fullReport.report.timestamp)}
                      </p>
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
            {analysis?.description && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-800">
                  {t("description")}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.description}
                </p>
              </div>
            )}

            {/* Summary */}
            {analysis?.summary && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-800">
                  {t("summary")}
                </h3>
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
              {!isDigital && (
                <div>
                  <h3 className="font-semibold text-sm mb-1">
                    {t("location")}
                  </h3>
                  {location && location.latitude && location.longitude && (
                    <a
                      href={getGoogleMapsUrl(
                        location.latitude,
                        location.longitude
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 text-sm underline"
                    >
                      <ReverseGeocodingDisplay
                        address={address}
                        loading={addressLoading}
                        error={addressError}
                        onRetry={refetchAddress}
                      />
                    </a>
                  )}
                </div>
              )}

              {/* Time */}
              {fullReport?.report?.timestamp && (
                <div>
                  <h3 className="font-semibold text-sm mb-1">{t("time")}</h3>
                  <p className="text-sm">
                    {formatTime(fullReport.report.timestamp)}
                  </p>
                </div>
              )}

              {isDigital && (
                <>
                  <Link
                    href={`/digital/${getBrandNameDisplay(analysis).brandName}`}
                    className="text-blue-300 hover:text-blue-400 text-sm underline"
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
                        <div className="flex-1 bg-white/20 rounded-full h-2">
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
                        <div className="flex-1 bg-white/20 rounded-full h-2">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportOverview;
