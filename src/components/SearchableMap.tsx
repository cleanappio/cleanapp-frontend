"use client";

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Area } from '@/lib/areas-api-client';

// Google Maps API response types
interface GoogleMapsPlace {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name: string;
}

interface GoogleMapsResponse {
  results: GoogleMapsPlace[];
  status: string;
}

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

interface SearchableMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  height?: string;
  enableDrawing?: boolean;
  onAreaCreated?: (area: Area) => void;
  onAreaEdited?: (area: Area, index: number) => void;
  onAreaDeleted?: (index: number) => void;
  onBoundsChange?: (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => void;
  areas?: Area[];
  onAreaClick?: (area: Area) => void;
  selectedAreas?: Area[];
  featureGroupRef: React.RefObject<any>;
  fullScreen?: boolean;
}

export default function SearchableMap({ 
  initialCenter = [40.7128, -74.0060], // Default to New York
  initialZoom = 13,
  height = "600px",
  enableDrawing = false,
  onAreaCreated,
  onAreaEdited,
  onAreaDeleted,
  onBoundsChange,
  areas = [],
  onAreaClick,
  selectedAreas = [],
  featureGroupRef,
  fullScreen = false
}: SearchableMapProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  const [selectedMarker, setSelectedMarker] = useState<SearchResult | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [clickedAreaId, setClickedAreaId] = useState<number | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Search function using our API route to avoid CORS issues
  const searchPlaces = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `/api/places-search?query=${encodedQuery}`;
      
      const response = await fetch(url);
      const data: GoogleMapsResponse = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const results: SearchResult[] = data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        }));

        setSearchResults(results);
        
        // Center map on first result
        if (results.length > 0) {
          const firstResult = results[0];
          setMapCenter([firstResult.lat, firstResult.lng]);
          setMapZoom(15);
        }
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPlaces(query);
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      searchPlaces(searchQuery);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  // Handle marker click
  const handleMarkerClick = (result: SearchResult) => {
    setSelectedMarker(result);
    setMapCenter([result.lat, result.lng]);
    setMapZoom(16);
  };

  // Clear search results
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMarker(null);
  };

  // Handle area click
  const handleAreaClick = (area: Area) => {
    console.log('Area clicked in SearchableMap:', area);
    setClickedAreaId(area.id || null);
    onAreaClick?.(area);
  };

  // Dynamically import map component only on client side
  const MapComponent = isClient ? require('./MapComponent').default : null;

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div 
        className={fullScreen ? "overflow-hidden" : "border border-gray-300 rounded-lg overflow-hidden"}
        style={{ height: height }}
      >
        {isClient && MapComponent ? (
          <MapComponent
            center={mapCenter}
            zoom={mapZoom}
            searchResults={searchResults}
            selectedMarker={selectedMarker}
            onMarkerClick={handleMarkerClick}
            enableDrawing={enableDrawing}
            onAreaCreated={onAreaCreated}
            onAreaEdited={onAreaEdited}
            onAreaDeleted={onAreaDeleted}
            onBoundsChange={onBoundsChange}
            areas={areas}
            onAreaClick={handleAreaClick}
            selectedAreas={selectedAreas}
            clickedAreaId={clickedAreaId}
            featureGroupRef={featureGroupRef}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-gray-500">Loading map...</div>
          </div>
        )}
      </div>

      {/* Search Box Overlay - Top Left */}
      <div className="absolute top-4 left-4 z-[10000]">
        <div className="flex bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              placeholder="Search for places, addresses, or landmarks..."
              className="w-80 pl-10 pr-12 py-3 border-0 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="bg-blue-600 text-white px-4 py-3 rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
            disabled={isSearching}
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 