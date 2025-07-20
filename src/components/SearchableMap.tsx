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
  selectedAreas = []
}: SearchableMapProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  const [selectedMarker, setSelectedMarker] = useState<SearchResult | null>(null);
  const [isClient, setIsClient] = useState(false);
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

  // Dynamically import map component only on client side
  const MapComponent = isClient ? require('./MapComponent').default : null;

  return (
    <div className="w-full">
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              placeholder="Search for places, addresses, or landmarks..."
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-700">Search Results</h3>
            </div>
            {searchResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleMarkerClick(result)}
                className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{result.name}</h4>
                    <p className="text-sm text-gray-600 truncate">{result.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        className="border border-gray-300 rounded-lg overflow-hidden"
        style={{ height }}
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
            onAreaClick={onAreaClick}
            selectedAreas={selectedAreas}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-gray-500">Loading map...</div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600">
        <p>💡 Tip: Type in the search box to find places, addresses, or landmarks. Results will appear as pins on the map.</p>
      </div>
    </div>
  );
} 