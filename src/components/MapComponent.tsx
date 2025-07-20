"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { DrawControl } from './useMapWithDraw';
import { Area } from '@/lib/areas-api-client';

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

// Map controller component to handle map updates
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

// Bounds change handler component
function BoundsChangeHandler({ onBoundsChange }: { onBoundsChange?: (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!onBoundsChange) return;

    const handleBoundsChange = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        latMin: bounds.getSouth(),
        lonMin: bounds.getWest(),
        latMax: bounds.getNorth(),
        lonMax: bounds.getEast(),
      });
    };

    // Initial bounds
    handleBoundsChange();

    // Listen for bounds changes
    map.on('moveend', handleBoundsChange);
    map.on('zoomend', handleBoundsChange);

    return () => {
      map.off('moveend', handleBoundsChange);
      map.off('zoomend', handleBoundsChange);
    };
  }, [map, onBoundsChange]);

  return null;
}

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  searchResults: SearchResult[];
  selectedMarker: SearchResult | null;
  onMarkerClick: (result: SearchResult) => void;
  enableDrawing?: boolean;
  onAreaCreated?: (area: Area) => void;
  onAreaEdited?: (area: Area, index: number) => void;
  onAreaDeleted?: (index: number) => void;
  onBoundsChange?: (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => void;
  areas?: Area[];
}

export default function MapComponent({
  center,
  zoom,
  searchResults,
  selectedMarker,
  onMarkerClick,
  enableDrawing = false,
  onAreaCreated,
  onAreaEdited,
  onAreaDeleted,
  onBoundsChange,
  areas = [],
}: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const [drawnAreas, setDrawnAreas] = useState<Area[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle polygon events
  const handlePolygonCreated = (area: Area) => {
    setDrawnAreas(prev => [...prev, area]);
    onAreaCreated?.(area);
  };

  const handlePolygonEdited = (area: Area, index: number) => {
    setDrawnAreas(prev => {
      const newAreas = [...prev];
      newAreas[index] = area;
      return newAreas;
    });
    onAreaEdited?.(area, index);
  };

  const handlePolygonDeleted = (index: number) => {
    setDrawnAreas(prev => prev.filter((_, i) => i !== index));
    onAreaDeleted?.(index);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  console.log('areas in map component', areas);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      minZoom={4}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Map Controller for programmatic updates */}
      <MapController center={center} zoom={zoom} />

      {/* Bounds Change Handler */}
      <BoundsChangeHandler onBoundsChange={onBoundsChange} />

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
      {areas.map((area, index) => (
        <GeoJSON
          key={`area-${area.id}`}
          data={area.coordinates}
          style={{
            color: '#0023d6',
            fillColor: '#0023d6',
            fillOpacity: 0.3,
            weight: 2,
            opacity: 1,
          }}
          onEachFeature={(feature, layer) => {
            console.log('feature', feature.type);
            if (area.name) {
              layer.bindPopup(`
                <div class="p-2">
                  <h3 class="font-semibold text-gray-900">${area.name}</h3>
                  ${area.description ? `<p class="text-sm text-gray-600">${area.description}</p>` : ''}
                </div>
              `);
            }
          }}
        />
      ))}
    </MapContainer>
  );
} 