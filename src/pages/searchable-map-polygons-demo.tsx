"use client";

import { useState } from 'react';
import SearchableMapWithPolygons from '@/components/SearchableMapWithPolygons';
import Layout from '@/components/Layout';

export default function SearchableMapPolygonsDemo() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Searchable Map with Polygons Demo
          </h1>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-green-900 mb-4">
              🗺️ Interactive Map with Search + GeoJSON Polygons
            </h2>
            <p className="text-green-800 mb-4">
              This demo showcases the SearchableMap component enhanced with GeoJSON polygon rendering capabilities.
            </p>
            <div className="bg-green-100 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Enhanced Features:</h3>
              <ul className="text-green-800 space-y-1 text-sm">
                <li>• Real-time search with Google Maps Places API</li>
                <li>• GeoJSON polygon rendering with custom styling</li>
                <li>• Interactive polygon popups with names and descriptions</li>
                <li>• Customizable polygon colors, opacity, and line weights</li>
                <li>• Debounced search input (500ms delay)</li>
                <li>• Responsive design with Tailwind CSS</li>
              </ul>
            </div>
          </div>

          <SearchableMapWithPolygons />

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Polygon Configuration
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900">GeoJSON Format:</h3>
                <p className="text-sm">Polygons should be provided in GeoJSON Feature format with Polygon geometry type.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Styling Properties:</h3>
                <ul className="text-sm space-y-1">
                  <li>• <code className="bg-gray-200 px-1 rounded">color</code> - Border color (hex, rgb, or named color)</li>
                  <li>• <code className="bg-gray-200 px-1 rounded">fillColor</code> - Fill color</li>
                  <li>• <code className="bg-gray-200 px-1 rounded">fillOpacity</code> - Fill opacity (0-1)</li>
                  <li>• <code className="bg-gray-200 px-1 rounded">weight</code> - Border line width</li>
                  <li>• <code className="bg-gray-200 px-1 rounded">opacity</code> - Border opacity (0-1)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Popup Properties:</h3>
                <ul className="text-sm space-y-1">
                  <li>• <code className="bg-gray-200 px-1 rounded">name</code> - Displayed in popup title</li>
                  <li>• <code className="bg-gray-200 px-1 rounded">description</code> - Displayed in popup body</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              Usage Example
            </h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`import SearchableMap from '@/components/SearchableMap';

const polygons = [
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
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
  }
];

function MyComponent() {
  return (
    <SearchableMap 
      initialCenter={[40.7128, -74.0060]}
      initialZoom={12}
      height="600px"
      polygons={polygons}
    />
  );
}`}
            </pre>
          </div>
        </div>
      </div>
    </Layout>
  );
} 