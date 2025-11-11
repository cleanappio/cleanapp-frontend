"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
  GeoJSON,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/router";
import { getColorByValue } from "@/lib/util";
import { authApiClient } from "@/lib/auth-api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  useTranslations,
  getCurrentLocale,
  filterAnalysesByLanguage,
} from "@/lib/i18n";
import LatestReports from "./LatestReports";
import CustomDashboardReport from "./CustomDashboardReport";
import { MAX_REPORTS_LIMIT } from "@/constants/app_constants";
import { ReportWithAnalysis } from "./GlobeView";

// ReportStats structure
interface ReportStats {
  reportsNumber: number;
  overallRate: number;
  averageSeverity: number;
}

// AreaAggrData structure from the API
interface AreaAggrData {
  area_id: number;
  name: string;
  reports_count: number;
  reports_max: number;
  reports_mean: number;
  mean_severity: number;
  mean_litter_probability: number;
  mean_hazard_probability: number;
}

// Custom hook to handle map center changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

interface CustomAreaMapProps {
  mapCenter: [number, number];
  apiUrl: string;
  areaName?: string;
  areaZoom?: number;
  requiresAuth?: boolean;
}

function CustomAreaMap({
  mapCenter,
  apiUrl,
  areaName = "Custom Area",
  areaZoom = 7,
  requiresAuth = true,
}: CustomAreaMapProps) {
  const router = useRouter();
  // Only subscribe to the specific auth state properties we need
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [isClient, setIsClient] = useState(false);
  const [countryPolygons, setCountryPolygons] = useState<any[]>([]);
  const [municipalitiesPolygons, setMunicipalitiesPolygons] = useState<any[]>(
    []
  );
  const [viewMode, setViewMode] = useState<"Stats" | "Reports">("Stats");
  const [reports, setReports] = useState<ReportWithAnalysis[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<ReportWithAnalysis | null>(null);
  const [isCleanAppProOpen, setIsCleanAppProOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [areaAggrData, setAreaAggrData] = useState<AreaAggrData[]>([]);
  const [municipalitiesRate, setMunicipalitiesRate] = useState<
    Map<number, ReportStats>
  >(new Map());
  const { t } = useTranslations();
  const locale = getCurrentLocale();

  console.log("CustomAreaMap rendered, requires authentication:", requiresAuth);
  console.log("isAuthenticated:", isAuthenticated);

  // Ref to track if data has been fetched to prevent multiple fetches
  const hasFetchedData = useRef(false);

  // Helper function to create authenticated fetch requests
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    console.log("authenticatedFetch called with URL:", url);

    if (requiresAuth) {
      // Load token from storage first
      authApiClient.loadTokenFromStorage();
      const token = authApiClient.getAuthToken();
      console.log("Token available:", !!token);
      if (!token) {
        throw new Error("No authentication token available");
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      };

      options.headers = headers;
      console.log("Authenticated fetch", url, options);
    } else {
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      options.headers = headers;
      console.log("Unauthenticated fetch", url, options);
    }

    try {
      const response = await fetch(url, options);
      console.log("Fetch response status:", response.status);
      return response;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  };

  // Handle report click from LatestReports
  const handleReportClick = (report: ReportWithAnalysis) => {
    if (requiresAuth && !isAuthenticated) {
      setAuthError(t("authenticationRequired"));
      return;
    }
    setSelectedReport(report);
    setIsCleanAppProOpen(true);
    // Update URL with seq parameter if on home page and report has seq
    if (router.pathname === "/" && report.report.seq) {
      const currentTab = (router.query.tab as string) || "physical";
      router.push(
        {
          pathname: "/",
          query: { ...router.query, tab: currentTab, seq: report.report.seq },
        },
        undefined,
        { shallow: true }
      );
    }
  };

  const handleReportFixed = (reportSeq: number) => {
    // Remove the fixed report from the reports list
    setReports((prevReports) =>
      prevReports.filter((report) => report.report.seq !== reportSeq)
    );

    // If the fixed report was the selected report, clear the selection
    if (selectedReport?.report.seq === reportSeq) {
      setSelectedReport(null);
      setIsCleanAppProOpen(false);
    }
    // Refresh the aggregated data
    fetchAreaAggrData();
  };

  function getMunicipalityColor(osmId: number): string {
    if (!municipalitiesRate) {
      return "#808080";
    }
    const stats = municipalitiesRate.get(osmId);

    if (stats === undefined || stats === null) {
      // Return a default gray color if no stats found
      return "#808080";
    }

    // Use the getColorByValue function to get the appropriate color based on overallRate
    return getColorByValue(stats.overallRate);
  }

  // Fetch reports for the country
  const fetchReportsForCountry = async () => {
    try {
      setReportsLoading(true);
      setAuthError(null);
      console.log("API URL:", apiUrl);
      if (!apiUrl) {
        console.error("API URL not configured");
        return;
      }

      const fullUrl = `${apiUrl}/reports?n=${MAX_REPORTS_LIMIT}`;
      console.log("Full URL:", fullUrl);
      const response = await authenticatedFetch(fullUrl);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched reports for country:", data);

      if (data.reports && Array.isArray(data.reports)) {
        const locale = getCurrentLocale();
        try {
          const filteredReports = filterAnalysesByLanguage(
            data.reports,
            locale
          );
          setReports(filteredReports);
        } catch (filterError) {
          console.error("Error filtering reports by language:", filterError);
          setReports([]);
        }
      } else {
        console.warn("No reports found in response or invalid format");
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      if (
        error instanceof Error &&
        (error.message.includes("authentication") ||
          error.message.includes("Authentication required"))
      ) {
        setAuthError(t("authenticationRequired"));
      }
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch aggregated data for all areas
  const fetchAreaAggrData = async () => {
    try {
      if (!apiUrl) {
        console.error("API URL not configured");
        return;
      }

      const response = await authenticatedFetch(`${apiUrl}/reports_aggr`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched area aggregated data:", data);

      if (Array.isArray(data.areas)) {
        setAreaAggrData(data.areas);

        // Update municipalitiesRate with real data
        const munRate = new Map<number, ReportStats>();
        data.areas.forEach((area: AreaAggrData) => {
          const stats: ReportStats = {
            reportsNumber: area.reports_count,
            overallRate: area.reports_count / Math.max(area.reports_max, 1),
            averageSeverity: area.mean_severity,
          };
          munRate.set(area.area_id, stats);
        });
        setMunicipalitiesRate(munRate);
      } else {
        console.warn("No aggregated data found in response or invalid format");
      }
    } catch (error) {
      console.error("Error fetching area aggregated data:", error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    console.log("isClient", isClient);
  }, []);

  // Reset fetch flag when apiUrl changes
  useEffect(() => {
    hasFetchedData.current = false;
  }, [apiUrl]);

  useEffect(() => {
    console.log("useEffect triggered with:", {
      isClient,
      requiresAuth,
      isAuthenticated,
      apiUrl,
    });

    if (isClient && (!requiresAuth || isAuthenticated) && apiUrl && !hasFetchedData.current) {
      hasFetchedData.current = true;
      console.log("Fetching polygons data");

      // Fetch country polygons
      const fetchCountryPolygons = async () => {
        try {
          const response = await authenticatedFetch(`${apiUrl}/areas`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("Fetched country polygons:", data);

          if (data.areas && Array.isArray(data.areas)) {
            setCountryPolygons(data.areas.map((a: any) => a.area));
          } else {
            console.warn(
              "No country polygons found in response or invalid format"
            );
          }
        } catch (error) {
          console.error("Error fetching country polygons:", error);
        }
      };

      // Fetch municipalities polygons
      const fetchMunicipalitiesPolygons = async () => {
        try {
          const response = await authenticatedFetch(`${apiUrl}/sub_areas`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("Fetched municipalities polygons:", data);

          if (data.areas && Array.isArray(data.areas)) {
            setMunicipalitiesPolygons(data.areas);
          } else {
            console.warn(
              "No municipalities polygons found in response or invalid format"
            );
          }
        } catch (error) {
          console.error("Error fetching municipalities polygons:", error);
        }
      };

      fetchCountryPolygons();
      fetchMunicipalitiesPolygons();
      fetchAreaAggrData();
      fetchReportsForCountry();
    }
  }, [isClient, requiresAuth, isAuthenticated, apiUrl]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {t("loading")} {t("map").toLowerCase()}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Authentication Error Display */}
      {authError && (
        <div className="absolute top-4 right-4 z-[1000] bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {t("authenticationRequired")}
              </h3>
              <p className="mt-1 text-sm text-red-700">{authError}</p>
              <div className="mt-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(
                    window.location.pathname
                  )}`}
                  className="text-sm font-medium text-red-800 hover:text-red-600 underline"
                >
                  {t("goToLogin")} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={areaZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* View Mode Toggle */}
        <div className="absolute top-2 lg:top-4 left-1/2 lg:left-4 transform -translate-x-1/2 lg:translate-x-0 z-[1000] bg-white rounded-lg shadow-lg p-2 lg:p-2">
          <div className="flex space-x-2 lg:space-x-1">
            <button
              onClick={() => setViewMode("Stats")}
              className={`px-4 lg:px-3 py-2 lg:py-1 text-sm lg:text-sm font-medium rounded-md transition-colors ${
                viewMode === "Stats"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("stats")}
            </button>
            <button
              onClick={() => setViewMode("Reports")}
              className={`px-4 lg:px-3 py-2 lg:py-1 text-sm lg:text-sm font-medium rounded-md transition-colors ${
                viewMode === "Reports"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("reports")}
            </button>
          </div>
        </div>

        {/* Municipalities polygons */}
        {municipalitiesPolygons.map((a, index) => (
          <GeoJSON
            key={`polygon-${index}`}
            data={a.area}
            style={{
              color: "#555555",
              weight: 3,
              opacity: 0.8,
              fillColor:
                viewMode === "Stats"
                  ? getMunicipalityColor(a.area_id)
                  : "transparent",
              fillOpacity: viewMode === "Stats" ? 0.7 : 0,
            }}
            eventHandlers={{
              click: (e) => {
                if (viewMode !== "Reports") {
                  // Show stats popup when in Stats mode
                  const stats = municipalitiesRate.get(a.area_id);
                  if (stats) {
                    // Find the corresponding aggregated data for this area
                    const areaData = areaAggrData.find(
                      (area) => area.area_id === a.area_id
                    );

                    const popup = L.popup()
                      .setLatLng(e.latlng)
                      .setContent(
                        `
                      <div style="min-width: 200px; padding: 10px;">
                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">
                          ${a.name}
                        </h3>
                        <div style="margin-bottom: 8px;">
                          <strong>${t("reportsCount")}:</strong> ${
                          stats.reportsNumber
                        }
                        </div>
                        <div style="margin-bottom: 8px;">
                          <strong>${t(
                            "meanSeverity"
                          )}:</strong> ${stats.averageSeverity.toFixed(3)}
                        </div>
                        ${
                          areaData
                            ? `
                        <div style="margin-bottom: 8px;">
                          <strong>${t("meanLitterProbability")}:</strong> ${(
                                areaData.mean_litter_probability * 100
                              ).toFixed(1)}%
                        </div>
                        <div style="margin-bottom: 8px;">
                          <strong>${t("meanHazardProbability")}:</strong> ${(
                                areaData.mean_hazard_probability * 100
                              ).toFixed(1)}%
                        </div>
                        `
                            : ""
                        }
                      </div>
                    `
                      )
                      .openOn(e.target._map);
                  }
                }
              },
            }}
          />
        ))}

        {/* Individual report markers - only show in Reports mode when reports are loaded */}
        {viewMode === "Reports" &&
          reports.map((report) => {
            const reportAnalysis = report.analysis.find(
              (analysis) => analysis.language === locale
            );
            // Calculate severity-based styling using the same logic as GlobeView
            const severity = reportAnalysis?.severity_level || 0.0; // Use actual severity from analysis

            // Use the same color interpolation as GlobeView
            const color = getColorByValue(severity);

            // Use the same radius interpolation as GlobeView
            const baseRadius = severity >= 0.3 ? 8 : 6; // Fixed pixel radius that won't change with zoom

            return (
              <CircleMarker
                key={report.report.seq}
                center={[report.report.latitude, report.report.longitude]}
                radius={baseRadius}
                pathOptions={{
                  color: "#555555",
                  fillColor: color,
                  fillOpacity: 0.8,
                  weight: 2,
                  opacity: 1,
                }}
                eventHandlers={{
                  click: () => {
                    if (requiresAuth && !isAuthenticated) {
                      setAuthError(t("authenticationRequired"));
                      return;
                    }
                    setSelectedReport(report);
                    setIsCleanAppProOpen(true);
                  },
                }}
              />
            );
          })}

        {/* Country polygons */}
        {countryPolygons.map((polygon, index) => (
          <GeoJSON
            key={`polygon-${index}`}
            data={polygon}
            style={{
              color: "#333333",
              weight: 5,
              opacity: 0.8,
              fillOpacity: 0.0,
            }}
          />
        ))}

        <MapController center={mapCenter} />
      </MapContainer>

      {/* Latest Reports - only show in Reports mode on desktop */}
      {viewMode === "Reports" && (
        <div className="hidden lg:block absolute left-4 bottom-8 z-[1000] w-80 h-96">
          <LatestReports
            reports={reports}
            loading={reportsLoading}
            onReportClick={handleReportClick}
            isModalActive={false}
            selectedReport={selectedReport}
          />
        </div>
      )}

      {/* Custom Dashboard Report Overview */}
      {isCleanAppProOpen && selectedReport && (
        <CustomDashboardReport
          reportItem={selectedReport}
          onClose={() => {
            setIsCleanAppProOpen(false);
            // Remove seq from URL when modal closes if on home page
            if (router.pathname === "/") {
              const query = { ...router.query };
              delete query.seq;
              router.push({ pathname: "/", query }, undefined, { shallow: true });
            }
          }}
          onReportFixed={handleReportFixed}
        />
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(CustomAreaMap);
