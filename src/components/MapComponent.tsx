"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { DrawControl } from './useMapWithDraw';
import { Area } from '@/lib/areas-api-client';

// Custom zoom control component
function CustomZoomControl() {
  const map = useMap();

  useEffect(() => {
    // Add CSS for zoom control positioning
    const addZoomControlCSS = () => {
      const existingStyle = document.getElementById('zoom-control-fix');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'zoom-control-fix';
        style.textContent = `
          .leaflet-control-zoom {
            position: absolute !important;
            bottom: 10px !important;
            left: 10px !important;
            right: auto !important;
            top: auto !important;
            z-index: 10000 !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    // Move zoom control to bottom left with a delay to ensure it's rendered
    const moveZoomControl = () => {
      const zoomControl = document.querySelector('.leaflet-control-zoom') as HTMLElement;
      if (zoomControl) {
        zoomControl.style.position = 'absolute';
        zoomControl.style.bottom = '10px';
        zoomControl.style.left = '10px';
        zoomControl.style.right = 'auto';
        zoomControl.style.top = 'auto';
        zoomControl.style.zIndex = '10000';
      } else {
        // Retry if not found yet
        setTimeout(moveZoomControl, 100);
      }
    };

    // Add CSS first
    addZoomControlCSS();
    
    // Initial attempt
    moveZoomControl();
    
    // Also try after map is ready
    setTimeout(moveZoomControl, 500);
  }, [map]);

  return null;
}

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
  onAreaClick?: (area: Area) => void;
  selectedAreas?: Area[];
  clickedAreaId?: number | null;
  featureGroupRef: React.RefObject<any>;
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
  onAreaClick,
  selectedAreas = [],
  clickedAreaId = null,
  featureGroupRef,
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

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      minZoom={4}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Map Controller for programmatic updates */}
      <MapController center={center} zoom={zoom} />

      {/* Custom Zoom Control Position */}
      <CustomZoomControl />

      {/* Bounds Change Handler */}
      <BoundsChangeHandler onBoundsChange={onBoundsChange} />

      {/* Draw Control for drawing tools */}
      <FeatureGroup ref={featureGroupRef}>
        <DrawControl 
          enableDrawing={enableDrawing}
          onAreaCreated={handlePolygonCreated}
          onAreaEdited={handlePolygonEdited}
          onAreaDeleted={handlePolygonDeleted}
          featureGroupRef={featureGroupRef}
        />
      </FeatureGroup>

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
      {areas.map((area, index) => {
        const isSelected = selectedAreas.some(selectedArea => selectedArea.id === area.id);
        const isClicked = clickedAreaId === area.id;
        return (
          <GeoJSON
            key={`area-${area.id}`}
            data={area.coordinates}
            style={{
              color: isClicked ? '#8b5cf6' : (isSelected ? '#10b981' : '#0023d6'),
              fillColor: isClicked ? '#8b5cf6' : (isSelected ? '#10b981' : '#0023d6'),
              fillOpacity: isClicked ? 0.6 : (isSelected ? 0.5 : 0.3),
              weight: isClicked ? 4 : (isSelected ? 3 : 2),
              opacity: 1,
            }}
            onEachFeature={(feature, layer) => {
              // Add click handler for area selection
              if (onAreaClick) {
                layer.on('click', () => {
                  onAreaClick(area);
                });
              }
              
              // Add tooltip for area name on hover
              layer.on('mouseover', (e) => {
                const layer = e.target;
                layer.bindTooltip(area.name, {
                  permanent: false,
                  direction: 'top',
                  className: 'area-tooltip'
                }).openTooltip();
              });
              
              layer.on('mouseout', (e) => {
                const layer = e.target;
                layer.closeTooltip();
              });
            }}
          />
        );
      })}
    </MapContainer>
  );
} 