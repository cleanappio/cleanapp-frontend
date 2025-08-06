"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import L from "leaflet";
import Link from "next/link";
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

// Report interface from MontenegroMap
export interface Report {
  report: {
    seq: number;
    timestamp: string;
    id: string;
    latitude: number;
    longitude: number;
    image?: number[] | string | null; // Report image as bytes array, URL string, or null
  };
  analysis: {
    seq: number;
    source: string;
    analysis_text: string;
    analysis_image: number[] | string | null; // Can be bytes array, URL string, or null
    title: string;
    description: string;
    litter_probability: number;
    hazard_probability: number;
    severity_level: number;
    summary: string;
    language: string;
    created_at: string;
    updated_at: string;
  };
}

// Custom hook to handle map center changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

interface RedBullMapProps {
  mapCenter: [number, number];
  selectedBrand: string | null;
}

export default function RedBullMap({
  mapCenter,
  selectedBrand,
}: RedBullMapProps) {
  const { isAuthenticated, isLoading, getBrandReports } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isCleanAppProOpen, setIsCleanAppProOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { t } = useTranslations();

  // Helper function to create authenticated fetch requests
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    console.log("authenticatedFetch called with URL:", url);

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
  const handleReportClick = (report: Report) => {
    if (!isAuthenticated) {
      setAuthError(t("authenticationRequired"));
      return;
    }
    setSelectedReport(report);
    setIsCleanAppProOpen(true);
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
  };

  // Fetch reports for selected brand
  const fetchReportsForBrand = useCallback(async () => {
    if (!selectedBrand) {
      setReports([]);
      return;
    }

    try {
      setReportsLoading(true);
      setAuthError(null);

      const reportsData = await getBrandReports(selectedBrand, {
        limit: MAX_REPORTS_LIMIT,
      });
      console.log("Fetched reports for brand:", selectedBrand, reportsData);

      if (Array.isArray(reportsData)) {
        const locale = getCurrentLocale();
        try {
          const filteredReports = filterAnalysesByLanguage(reportsData, locale);
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
        setAuthError("Authentication required");
      }
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [selectedBrand, getBrandReports]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch reports when selectedBrand changes
  useEffect(() => {
    if (isClient && isAuthenticated && !isLoading && selectedBrand) {
      console.log("Making API call for brand:", selectedBrand);
      fetchReportsForBrand();
    } else if (isClient && !isLoading && !isAuthenticated) {
      console.log("User not authenticated, setting auth error");
      setAuthError("Authentication required");
    }
  }, [
    isClient,
    isAuthenticated,
    isLoading,
    selectedBrand,
    fetchReportsForBrand,
  ]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Custom CSS for zoom controls z-index */}
      <style jsx>{`
        :global(.leaflet-control-zoom) {
          z-index: 1000 !important;
        }
        :global(.leaflet-control-zoom-in),
        :global(.leaflet-control-zoom-out) {
          z-index: 1000 !important;
        }
      `}</style>

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
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Individual report markers */}
        {reports.map((report) => {
          // Calculate severity-based styling using the same logic as GlobeView
          const severity = report.analysis?.severity_level || 0.0; // Use actual severity from analysis

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
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2,
                opacity: 1,
              }}
              eventHandlers={{
                click: () => {
                  if (!isAuthenticated) {
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

        <MapController center={mapCenter} />
      </MapContainer>

      {/* Latest Reports - only show on desktop */}
      <div className="hidden lg:block absolute left-4 bottom-8 z-[1000] w-80 h-96">
        <LatestReports
          reports={reports}
          loading={reportsLoading}
          onReportClick={handleReportClick}
          isModalActive={false}
          selectedReport={selectedReport}
        />
      </div>

      {/* Report Overview Modal */}
      {isCleanAppProOpen && selectedReport && (
        <CustomDashboardReport
          reportItem={selectedReport}
          onClose={() => setIsCleanAppProOpen(false)}
          onReportFixed={handleReportFixed}
        />
      )}
    </div>
  );
}
