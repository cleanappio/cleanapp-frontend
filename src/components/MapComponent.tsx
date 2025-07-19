"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { DrawControl } from './useMapWithDraw';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Search result interface
interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// GeoJSON Polygon interface
interface GeoJSONPolygon {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties?: {
    name?: string;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    opacity?: number;
    [key: string]: any;
  };
}

// Map controller component to handle map updates
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  searchResults: SearchResult[];
  selectedMarker: SearchResult | null;
  onMarkerClick: (result: SearchResult) => void;
  polygons?: GeoJSONPolygon[];
  enableDrawing?: boolean;
  onPolygonCreated?: (polygon: GeoJSONPolygon) => void;
  onPolygonEdited?: (polygon: GeoJSONPolygon, index: number) => void;
  onPolygonDeleted?: (index: number) => void;
}

export default function MapComponent({
  center,
  zoom,
  searchResults,
  selectedMarker,
  onMarkerClick,
  polygons = [],
  enableDrawing = false,
  onPolygonCreated,
  onPolygonEdited,
  onPolygonDeleted,
}: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const [drawnPolygons, setDrawnPolygons] = useState<GeoJSONPolygon[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle polygon events
  const handlePolygonCreated = (polygon: GeoJSONPolygon) => {
    setDrawnPolygons(prev => [...prev, polygon]);
    onPolygonCreated?.(polygon);
  };

  const handlePolygonEdited = (polygon: GeoJSONPolygon, index: number) => {
    setDrawnPolygons(prev => {
      const newPolygons = [...prev];
      newPolygons[index] = polygon;
      return newPolygons;
    });
    onPolygonEdited?.(polygon, index);
  };

  const handlePolygonDeleted = (index: number) => {
    setDrawnPolygons(prev => prev.filter((_, i) => i !== index));
    onPolygonDeleted?.(index);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Map Controller for programmatic updates */}
      <MapController center={center} zoom={zoom} />

      {/* Draw Control for drawing tools */}
      <DrawControl 
        enableDrawing={enableDrawing}
        onPolygonCreated={handlePolygonCreated}
        onPolygonEdited={handlePolygonEdited}
        onPolygonDeleted={handlePolygonDeleted}
      />

      {/* Render markers for search results */}
      {searchResults.map((result) => (
        <Marker
          key={result.id}
          position={[result.lat, result.lng]}
          eventHandlers={{
            click: () => onMarkerClick(result),
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-gray-900">{result.name}</h3>
              <p className="text-sm text-gray-600">{result.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Selected marker with different styling */}
      {selectedMarker && (
        <Marker
          position={[selectedMarker.lat, selectedMarker.lng]}
          icon={new Icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          })}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-gray-900">{selectedMarker.name}</h3>
              <p className="text-sm text-gray-600">{selectedMarker.address}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Render GeoJSON polygons */}
      {polygons.map((polygon, index) => (
        <GeoJSON
          key={`polygon-${index}`}
          data={polygon}
          style={{
            color: polygon.properties?.color || '#ff8800',
            fillColor: polygon.properties?.fillColor || '#ff8800',
            fillOpacity: polygon.properties?.fillOpacity || 0.3,
            weight: polygon.properties?.weight || 2,
            opacity: polygon.properties?.opacity || 1,
          }}
          onEachFeature={(feature, layer) => {
            if (polygon.properties?.name) {
              layer.bindPopup(`
                <div class="p-2">
                  <h3 class="font-semibold text-gray-900">${polygon.properties.name}</h3>
                  ${polygon.properties.description ? `<p class="text-sm text-gray-600">${polygon.properties.description}</p>` : ''}
                </div>
              `);
            }
          }}
        />
      ))}
    </MapContainer>
  );
} 