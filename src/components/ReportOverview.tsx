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
import { useRouter } from "next/router";
import { useReverseGeocoding } from "@/hooks/useReverseGeocoding";
import ReverseGeocodingDisplay from "./ReverseGeocodingDisplay";
import TextToImage from "./TextToImage";
import { ReportResponse } from "@/types/reports/api";
import { authApiClient } from "@/lib/auth-api-client";
import {
  casesApiClient,
  CaseSummary,
} from "@/lib/cases-api-client";

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
  const router = useRouter();
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
  const [relatedCases, setRelatedCases] = useState<CaseSummary[]>([]);
  const [caseContextLoading, setCaseContextLoading] = useState(false);
  const [caseContextError, setCaseContextError] = useState<string | null>(null);
  const [creatingCase, setCreatingCase] = useState(false);

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

  const report = fullReport?.report ?? reportItem ?? null;
  const analysis = fullReport?.analysis?.find(
    (analysis: any) => analysis.language === locale
  );
  const selectedSeq =
    fullReport?.report?.seq ??
    reportWithAnalysis?.report?.seq ??
    (reportItem?.classification === "physical" ? reportItem.seq : null);
  const authToken = authApiClient.getAuthToken();

  useEffect(() => {
    let cancelled = false;
    const loadCases = async () => {
      if (!selectedSeq) {
        setRelatedCases([]);
        setCaseContextError(null);
        setCaseContextLoading(false);
        return;
      }
      setCaseContextLoading(true);
      setCaseContextError(null);
      try {
        const response = await casesApiClient.getCasesByReportSeq(selectedSeq);
        if (!cancelled) {
          setRelatedCases(response.cases || []);
        }
      } catch (err) {
        console.error("Failed to load related cases", err);
        if (!cancelled) {
          setCaseContextError("Failed to load related cases");
          setRelatedCases([]);
        }
      } finally {
        if (!cancelled) {
          setCaseContextLoading(false);
        }
      }
    };
    loadCases();
    return () => {
      cancelled = true;
    };
  }, [selectedSeq]);

  const createCaseFromReport = useCallback(async () => {
    if (!selectedSeq || !report) {
      return;
    }
    if (!authToken) {
      router.push("/login");
      return;
    }

    setCreatingCase(true);
    setCaseContextError(null);
    try {
      const cluster = await casesApiClient.analyzeClusterFromReport({
        seq: selectedSeq,
        radius_km: 0.35,
        n: 75,
        classification: isDigital ? "digital" : "physical",
      });

      const strongestHypothesis =
        cluster.hypotheses
          .slice()
          .sort(
            (a, b) =>
              b.urgency_score + b.severity_score -
              (a.urgency_score + a.severity_score)
          )[0] || null;

      const reportSeqs =
        strongestHypothesis?.report_seqs?.length
          ? strongestHypothesis.report_seqs
          : cluster.reports.map((item) => item.report.seq);

      const caseTitle =
        strongestHypothesis?.title ||
        title ||
        `${
          isDigital ? report.brand_name : `Report #${selectedSeq}`
        } incident case`;

      const caseDetail = await casesApiClient.createCase({
        title: caseTitle,
        type: "incident",
        status: "open",
        classification: cluster.classification,
        summary:
          strongestHypothesis?.rationale?.join(" ") ||
          analysis?.summary ||
          analysis?.description ||
          `Case created from report ${selectedSeq}.`,
        anchor_report_seq:
          strongestHypothesis?.representative_report_seq || selectedSeq,
        report_seqs: reportSeqs,
        cluster_summary: `Cluster analyzed from report ${selectedSeq}.`,
        cluster_source_type: cluster.scope_type,
        cluster_stats: cluster.stats,
        cluster_analysis: {
          hypotheses: cluster.hypotheses,
        },
        escalation_targets: cluster.suggested_targets,
      });

      router.push(`/cases/${caseDetail.case.case_id}`);
    } catch (err) {
      console.error("Failed to create case from report", err);
      setCaseContextError("Failed to create case from this report");
    } finally {
      setCreatingCase(false);
    }
  }, [selectedSeq, report, authToken, router, isDigital, title, analysis]);

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

            <CaseContextPanel
              relatedCases={relatedCases}
              loading={caseContextLoading}
              error={caseContextError}
              selectedSeq={selectedSeq}
              canCreateCase={!!selectedSeq}
              creatingCase={creatingCase}
              authenticated={!!authToken}
              onCreateCase={createCaseFromReport}
            />
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
                {/* Original Post - for digital reports from external sources (Bluesky, Twitter, etc.) */}
                {fullReport?.report?.source_timestamp ? (
                  <p className="text-xs text-gray-600 mt-1">
                    Original post: {parseBackendDate(fullReport.report.source_timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} at {parseBackendDate(fullReport.report.source_timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ) : (fullReport?.analysis?.[0]?.created_at && isDigital) && (
                  <p className="text-xs text-gray-600 mt-1">
                    Original post: {parseBackendDate(fullReport.analysis[0].created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} at {parseBackendDate(fullReport.analysis[0].created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
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

          <CaseContextPanel
            relatedCases={relatedCases}
            loading={caseContextLoading}
            error={caseContextError}
            selectedSeq={selectedSeq}
            canCreateCase={!!selectedSeq}
            creatingCase={creatingCase}
            authenticated={!!authToken}
            onCreateCase={createCaseFromReport}
            compact
          />
        </div>
      </div>
    </div>
  );
};

function CaseContextPanel({
  relatedCases,
  loading,
  error,
  selectedSeq,
  canCreateCase,
  creatingCase,
  authenticated,
  onCreateCase,
  compact = false,
}: {
  relatedCases: CaseSummary[];
  loading: boolean;
  error: string | null;
  selectedSeq: number | null;
  canCreateCase: boolean;
  creatingCase: boolean;
  authenticated: boolean;
  onCreateCase: () => void;
  compact?: boolean;
}) {
  if (!selectedSeq) {
    return null;
  }

  return (
    <div className={`${compact ? "mt-8" : ""} rounded-lg border border-blue-100 bg-blue-50/60 p-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-sm text-slate-900">Case context</h3>
          <p className="mt-1 text-sm text-slate-600">
            See whether this report is already part of a broader incident, or create a new case from it.
          </p>
        </div>
        {canCreateCase && (
          <button
            onClick={onCreateCase}
            disabled={creatingCase}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2 text-sm font-medium"
          >
            {creatingCase
              ? "Creating..."
              : authenticated
                ? "Create case from report"
                : "Sign in to create case"}
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-3 text-sm text-slate-500">Loading related cases...</p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && relatedCases.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">
          No existing cases are linked to this report yet.
        </p>
      )}

      {relatedCases.length > 0 && (
        <div className="mt-3 space-y-3">
          {relatedCases.map((caseItem) => (
            <Link
              key={caseItem.case_id}
              href={`/cases/${caseItem.case_id}`}
              className="block rounded-lg border border-blue-100 bg-white px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{caseItem.title}</p>
                  {caseItem.summary && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {caseItem.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{caseItem.status}</span>
                    <span>{Math.round(caseItem.severity_score * 100)}% severity</span>
                    <span>{caseItem.escalation_target_count || 0} targets</span>
                    <span>{caseItem.delivery_count || 0} deliveries</span>
                  </div>
                </div>
                <span className="text-sm text-blue-600 shrink-0">Open case</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportOverview;
