"use client";

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import L from 'leaflet';
import { getColorByValue } from '@/lib/util';

// ReportStats structure
interface ReportStats {
  reportsNumber: number;
  overallRate: number;
  averageSeverity: number;
}

// Report interface from GlobeView
interface Report {
  seq: number;
  timestamp: string;
  id: string;
  latitude: number;
  longitude: number;
  image?: number[] | string | null;
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
  const [isClient, setIsClient] = useState(false);
  const [countryPolygons, setCountryPolygons] = useState<any[]>([]);
  const [municipalitiesPolygons, setMunicipalitiesPolygons] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'Stats' | 'Reports'>('Stats');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const municipalitiesRate = useRef<Map<number, ReportStats>>(new Map());

  function getMunicipalityColor(osmId: number): string {
    if (!municipalitiesRate.current) {
      return '#808080';
    }
    const stats = municipalitiesRate.current.get(osmId);
    
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
      const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
      if (!apiUrl) {
        console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
        return;
      }

      const response = await fetch(`${apiUrl}/reports?osm_id=-53296&n=100`);
      if (!response.ok) {
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

      const response = await fetch(`${apiUrl}/reports?osm_id=${osmId}&n=100`);
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
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch Montenegro reports on mount
  useEffect(() => {
    if (isClient) {
      fetchReportsForMontenegro();
    }
  }, [isClient]);

  // Fetch Montenegro country polygon
  useEffect(() => {
    const fetchCountryPolygons = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
        if (!apiUrl) {
          console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
          return;
        }

        const response = await fetch(`${apiUrl}/areas?admin_level=2`);
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

    if (isClient) {
      fetchCountryPolygons();
    }
  }, [isClient]);

  // Fetch Montenegro municipalities polygons
  useEffect(() => {
    const fetchMunicipalitiesPolygons = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_MONTENEGRO_API_URL;
        if (!apiUrl) {
          console.error('NEXT_PUBLIC_MONTENEGRO_API_URL not configured');
          return;
        }

        const response = await fetch(`${apiUrl}/areas?admin_level=6`);
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

        // DEBUG
        data.areas.forEach((a: any) => {
          console.log('osmId', a.osm_id);
          const stats: ReportStats = {
            reportsNumber: Math.floor(Math.random() * 100) + 1,
            overallRate: Math.random(),
            averageSeverity: Math.random()
          };
          console.log('stats', stats);
          municipalitiesRate.current.set(a.osm_id, stats);
        });
      } catch (error) {
        console.error('Error fetching polygons:', error);
      }
    };

    if (isClient) {
      fetchMunicipalitiesPolygons();
    }
  }, [isClient]);

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
      {/* Toggle Control */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2">
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            onClick={() => setViewMode('Stats')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'Stats'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setViewMode('Reports')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'Reports'
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
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
                  const stats = municipalitiesRate.current.get(a.osm_id);
                  if (stats) {
                    const popup = L.popup()
                      .setLatLng(e.latlng)
                      .setContent(`
                        <div style="min-width: 200px; padding: 10px;">
                          <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">
                            ${a.name}
                          </h3>
                          <div style="margin-bottom: 8px;">
                            <strong>Reports:</strong> ${stats.reportsNumber}
                          </div>
                          <div style="margin-bottom: 8px;">
                            <strong>Average Severity:</strong> ${stats.averageSeverity.toFixed(3)}
                          </div>
                          <div style="margin-bottom: 8px;">
                            <strong>Overall Rate:</strong> ${stats.overallRate.toFixed(3)}
                          </div>
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
          // Calculate severity-based styling similar to GlobeView
          const severity = 0.5; // Default severity, you might want to get this from report data
          const baseRadius = severity >= 0.3 ? 8 : 6; // Fixed pixel radius that won't change with zoom
          
          // Color based on severity (similar to GlobeView)
          let color = '#10b981'; // green for low severity
          if (severity >= 0.3) {
            color = '#f59e0b'; // yellow for medium severity
          }
          if (severity >= 0.5) {
            color = '#ef4444'; // red for high severity
          }

          return (
            <CircleMarker
              key={report.seq}
              center={[report.latitude, report.longitude]}
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
                  console.log('Report clicked:', report);
                }
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px', padding: '10px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '16px', fontWeight: 'bold' }}>
                    Report #{report.seq}
                  </h3>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>ID:</strong> {report.id}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Timestamp:</strong> {new Date(report.timestamp).toLocaleString()}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Location:</strong> {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Severity:</strong> {severity.toFixed(2)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        
        {/* Montenegro country polygons */}
        {countryPolygons.map((polygon, index) => (
          <GeoJSON
            key={`polygon-${index}`}
            data={polygon}
            style={{
              color: '#555555',
              weight: 5,
              opacity: 0.8,
              fillOpacity: 0
            }}
          />
        ))}
        
        <MapController center={mapCenter} />
      </MapContainer>
    </div>
  );
} 