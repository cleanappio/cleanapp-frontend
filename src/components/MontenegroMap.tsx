"use client";

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, GeoJSON } from 'react-leaflet';
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

// Custom hook to handle map center changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

// Custom marker icon
const createCustomIcon = (type: string) => {
  const colors = {
    capital: '#ff4444',
    cultural: '#44ff44',
    tourism: '#4444ff',
    historical: '#ffff44',
    port: '#ff44ff',
    industrial: '#44ffff'
  };
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${colors[type as keyof typeof colors] || '#666666'}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

interface MontenegroMapProps {
  mapCenter: [number, number];
}

export default function MontenegroMap({ mapCenter }: MontenegroMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [countryPolygons, setCountryPolygons] = useState<any[]>([]);
  const [municipalitiesPolygons, setMunicipalitiesPolygons] = useState<any[]>([]);
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
  
  useEffect(() => {
    setIsClient(true);
  }, []);

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
            fillColor: getMunicipalityColor(a.osm_id),
            fillOpacity: 0.7
          }}
          eventHandlers={{
            click: (e) => {
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
          }}
        />
      ))}
      
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
  );
} 