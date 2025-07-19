"use client";

import SearchableMap from './SearchableMap';

// Sample GeoJSON polygons for demonstration
const samplePolygons = [
  {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [-74.006, 40.7128],
        [-74.006, 40.7228],
        [-73.996, 40.7228],
        [-73.996, 40.7128],
        [-74.006, 40.7128]
      ]]
    },
    properties: {
      name: 'Downtown Manhattan',
      description: 'Financial district and business center',
      color: '#ff4444',
      fillColor: '#ff4444',
      fillOpacity: 0.3,
      weight: 3
    }
  },
  {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [-73.9857, 40.7484],
        [-73.9857, 40.7584],
        [-73.9757, 40.7584],
        [-73.9757, 40.7484],
        [-73.9857, 40.7484]
      ]]
    },
    properties: {
      name: 'Midtown Manhattan',
      description: 'Commercial and entertainment district',
      color: '#44ff44',
      fillColor: '#44ff44',
      fillOpacity: 0.2,
      weight: 2
    }
  },
  {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [-73.9654, 40.7505],
        [-73.9654, 40.7605],
        [-73.9554, 40.7605],
        [-73.9554, 40.7505],
        [-73.9654, 40.7505]
      ]]
    },
    properties: {
      name: 'Upper East Side',
      description: 'Residential area with museums and parks',
      color: '#4444ff',
      fillColor: '#4444ff',
      fillOpacity: 0.25,
      weight: 2
    }
  }
];

export default function SearchableMapWithPolygons() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Searchable Map with Polygons
        </h1>
        <p className="text-gray-600 mb-4">
          This example shows the SearchableMap component with GeoJSON polygons displayed on the map.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Sample Polygons:</h2>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• <span className="text-red-500">Red</span> - Downtown Manhattan (Financial District)</li>
            <li>• <span className="text-green-500">Green</span> - Midtown Manhattan (Commercial District)</li>
            <li>• <span className="text-blue-500">Blue</span> - Upper East Side (Residential Area)</li>
          </ul>
        </div>
      </div>

      <SearchableMap 
        initialCenter={[40.7128, -74.0060]} // New York
        initialZoom={12}
        height="600px"
        polygons={samplePolygons}
      />

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Features:</h2>
        <ul className="text-gray-700 text-sm space-y-1">
          <li>• Search for locations and see them as markers on the map</li>
          <li>• Polygons are displayed with custom colors and styling</li>
          <li>• Click on polygons to see their names and descriptions</li>
          <li>• Polygons support custom properties for styling and popups</li>
        </ul>
      </div>
    </div>
  );
} 