"use client";

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { getColorByValue } from '@/lib/util';
import { authApiClient } from '@/lib/auth-api-client';
import { useAuthStore } from '@/lib/auth-store';
import LatestReports from './LatestReports';
import MontenegroReportOverview from './MontenegroReportOverview';

// ReportStats structure
interface ReportStats {
  reportsNumber: number;
  overallRate: number;
  averageSeverity: number;
}

// AreaAggrData structure from the API
interface AreaAggrData {
  osm_id: number;
  name: string;
  reports_count: number;
  reports_max: number;
  reports_mean: number;
  mean_severity: number;
  mean_litter_probability: number;
  mean_hazard_probability: number;
}

// Report interface from GlobeView
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

interface MontenegroMapProps {
  mapCenter: [number, number];
}

export default function MontenegroMap({ mapCenter }: MontenegroMapProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [countryPolygons, setCountryPolygons] = useState<any[]>([]);
  const [municipalitiesPolygons, setMunicipalitiesPolygons] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'Stats' | 'Reports'>('Stats');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isCleanAppProOpen, setIsCleanAppProOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [areaAggrData, setAreaAggrData] = useState<AreaAggrData[]>([]);
  const [municipalitiesRate, setMunicipalitiesRate] = useState<Map<number, ReportStats>>(new Map());

  // Helper function to create authenticated fetch requests
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    console.log('authenticatedFetch called with URL:', url);

    // Load token from storage first
    authApiClient.loadTokenFromStorage();
    const token = authApiClient.getAuthToken();
    console.log('Token available:', !!token);

    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    options.headers = headers;
    console.log("Authenticated fetch", url, options);

    try {
      const response = await fetch(url, options);
      console.log('Fetch response status:', response.status);
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // Handle report click from LatestReports
  const handleReportClick = (report: Report) => {
    if (!isAuthenticated) {
      setAuthError('Authentication required to view report details.');
      return;
    }
    setSelectedReport(report);
    setIsCleanAppProOpen(true);
  };

  function getMunicipalityColor(osmId: number): string {
    if (!municipalitiesRate) {
      return '#808080';
    }
    const stats = municipalitiesRate.get(osmId);

    if (stats === undefined || stats === null) {
      // Return a default gray color if no stats found
      return '#808080';
    }

    // Use the getColorByValue function to get the appropriate color based on overallRate
    return getColorByValue(stats.overallRate);
  }

  // Fetch reports for Montenegro country
  const fetchReportsForMontenegro = async () => {
    try {
      setReportsLoading(true);
      setAuthError(null);
      const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
      console.log('API URL:', apiUrl);
      if (!apiUrl) {
        console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
        return;
      }

      const fullUrl = `${apiUrl}/reports?osm_id=-53296&n=100`;
      console.log('Full URL:', fullUrl);
      const response = await authenticatedFetch(fullUrl);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched reports for Montenegro:', data);

      if (data.reports && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        console.warn('No reports found in response or invalid format');
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (error instanceof Error && (error.message.includes('authentication') || error.message.includes('Authentication required'))) {
        setAuthError('Authentication required. Please log in to view reports.');
      }
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch reports for a specific municipality
  const fetchReportsForMunicipality = async (osmId: number) => {
    try {
      setReportsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
      if (!apiUrl) {
        console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
        return;
      }

      const response = await authenticatedFetch(`${apiUrl}/reports?osm_id=${osmId}&n=100`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched reports for municipality:', osmId, data);

      if (data.reports && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        console.warn('No reports found in response or invalid format');
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch aggregated data for all areas
  const fetchAreaAggrData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
      if (!apiUrl) {
        console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
        return;
      }

      const response = await authenticatedFetch(`${apiUrl}/reports_aggr`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched area aggregated data:', data);

      if (Array.isArray(data.areas)) {
        setAreaAggrData(data.areas);

        // Update municipalitiesRate with real data
        const munRate = new Map<number, ReportStats>();
        data.areas.forEach((area: AreaAggrData) => {
          const stats: ReportStats = {
            reportsNumber: area.reports_count,
            overallRate: area.reports_count / Math.max(area.reports_max, 1),
            averageSeverity: area.mean_severity
          };
          munRate.set(area.osm_id, stats);
        });
        setMunicipalitiesRate(munRate);
      } else {
        console.warn('No aggregated data found in response or invalid format');
      }
    } catch (error) {
      console.error('Error fetching area aggregated data:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch Montenegro reports and aggregated data on mount
  useEffect(() => {
    if (isClient && isAuthenticated && !isLoading) {
      console.log('Making API call - user is authenticated');
      fetchReportsForMontenegro();
      fetchAreaAggrData();
    } else if (isClient && !isLoading && !isAuthenticated) {
      console.log('User not authenticated, setting auth error');
      setAuthError('Authentication required. Please log in to view reports.');
    }
  }, [isClient, isAuthenticated, isLoading]);

  // Fetch Montenegro country polygon
  useEffect(() => {
    const fetchCountryPolygons = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
        if (!apiUrl) {
          console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
          return;
        }

        const response = await authenticatedFetch(`${apiUrl}/areas?admin_level=2`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched polygons:', data);

        if (data.areas && Array.isArray(data.areas)) {
          setCountryPolygons(data.areas.map((a: any) => (a.area)));
        } else {
          console.warn('No areas found in response or invalid format');
        }
      } catch (error) {
        console.error('Error fetching polygons:', error);
      }
    };

    if (isClient && isAuthenticated && !isLoading) {
      fetchCountryPolygons();
    }
  }, [isClient, isAuthenticated, isLoading]);

  // Fetch Montenegro municipalities polygons
  useEffect(() => {
    const fetchMunicipalitiesPolygons = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
        if (!apiUrl) {
          console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
          return;
        }

        const response = await authenticatedFetch(`${apiUrl}/areas?admin_level=6`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched polygons:', data);

        if (data.areas && Array.isArray(data.areas)) {
          setMunicipalitiesPolygons(data.areas);
        } else {
          console.warn('No areas found in response or invalid format');
        }
      } catch (error) {
        console.error('Error fetching polygons:', error);
      }
    };

    if (isClient && isAuthenticated && !isLoading) {
      fetchMunicipalitiesPolygons();
    }
  }, [isClient, isAuthenticated, isLoading]);

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
      {/* Authentication Error Display */}
      {authError && (
        <div className="absolute top-4 right-4 z-[1000] bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Authentication Required</h3>
              <p className="mt-1 text-sm text-red-700">{authError}</p>
              <div className="mt-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                  className="text-sm font-medium text-red-800 hover:text-red-600 underline"
                >
                  Go to Login →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Control */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2">
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            onClick={() => setViewMode('Stats')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'Stats'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Stats
          </button>
          <button
            onClick={() => setViewMode('Reports')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'Reports'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Reports
          </button>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={viewMode === 'Reports'
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />

        {/* Montenegro municipalities polygons */}
        {municipalitiesPolygons.map((a, index) => (
          <GeoJSON
            key={`polygon-${index}`}
            data={a.area}
            style={{
              color: '#555555',
              weight: 3,
              opacity: 0.8,
              fillColor: viewMode === 'Stats' ? getMunicipalityColor(a.osm_id) : 'transparent',
              fillOpacity: viewMode === 'Stats' ? 0.7 : 0
            }}
            eventHandlers={{
              click: (e) => {
                if (viewMode !== 'Reports') {
                  // Show stats popup when in Stats mode
                  const stats = municipalitiesRate.get(a.osm_id);
                  if (stats) {
                    // Find the corresponding aggregated data for this area
                    const areaData = areaAggrData.find(area => area.osm_id === a.osm_id);

                    const popup = L.popup()
                      .setLatLng(e.latlng)
                      .setContent(`
                      <div style="min-width: 200px; padding: 10px;">
                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">
                          ${a.name}
                        </h3>
                        <div style="margin-bottom: 8px;">
                          <strong>Reports Count:</strong> ${stats.reportsNumber}
                        </div>
                        <div style="margin-bottom: 8px;">
                          <strong>Mean Severity:</strong> ${stats.averageSeverity.toFixed(3)}
                        </div>
                        ${areaData ? `
                        <div style="margin-bottom: 8px;">
                          <strong>Mean Litter Probability:</strong> ${(areaData.mean_litter_probability * 100).toFixed(1)}%
                        </div>
                        <div style="margin-bottom: 8px;">
                          <strong>Mean Hazard Probability:</strong> ${(areaData.mean_hazard_probability * 100).toFixed(1)}%
                        </div>
                        ` : ''}
                      </div>
                    `)
                      .openOn(e.target._map);
                  }
                }
              }
            }}
          />
        ))}



        {/* Individual report markers - only show in Reports mode when reports are loaded */}
        {viewMode === 'Reports' && reports.map((report) => {
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
                opacity: 1
              }}
              eventHandlers={{
                click: () => {
                  if (!isAuthenticated) {
                    setAuthError('Authentication required to view report details.');
                    return;
                  }
                  setSelectedReport(report);
                  setIsCleanAppProOpen(true);
                }
              }}
            />
          );
        })}

        {/* Montenegro country polygons */}
        {countryPolygons.map((polygon, index) => (
          <GeoJSON
            key={`polygon-${index}`}
            data={polygon}
            style={{
              color: '#333333',
              weight: 5,
              opacity: 0.8,
              fillOpacity: 0.3
            }}
          />
        ))}

        <MapController center={mapCenter} />
      </MapContainer>

      {/* Latest Reports - only show in Reports mode */}
      {viewMode === 'Reports' && (
        <div className="absolute left-4 bottom-8 z-[1000] w-80 h-96">
          <LatestReports
            reports={reports}
            loading={reportsLoading}
            onReportClick={handleReportClick}
            isModalActive={false}
            selectedReport={selectedReport}
          />
        </div>
      )}

      {/* Montenegro Report Overview */}
      {isCleanAppProOpen && selectedReport && (
        <MontenegroReportOverview
          reportItem={selectedReport}
          onClose={() => setIsCleanAppProOpen(false)}
        />
      )}
    </div>
  );
}