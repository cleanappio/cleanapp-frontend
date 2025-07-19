"use client";

import { useState } from 'react';
import SearchableMap from './SearchableMap';

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

export default function SearchableMapWithDrawing() {
  const [polygons, setPolygons] = useState<GeoJSONPolygon[]>([]);
  const [enableDrawing, setEnableDrawing] = useState(false);

  const handlePolygonCreated = (polygon: GeoJSONPolygon) => {
    console.log('Polygon created:', polygon);
    setPolygons(prev => [...prev, polygon]);
  };

  const handlePolygonEdited = (polygon: GeoJSONPolygon, index: number) => {
    console.log('Polygon edited:', polygon, 'at index:', index);
    setPolygons(prev => {
      const newPolygons = [...prev];
      newPolygons[index] = polygon;
      return newPolygons;
    });
  };

  const handlePolygonDeleted = (index: number) => {
    console.log('Polygon deleted at index:', index);
    setPolygons(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllPolygons = () => {
    setPolygons([]);
  };

  const exportPolygons = () => {
    const dataStr = JSON.stringify(polygons, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'polygons.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Searchable Map with Drawing Tools
        </h1>
        <p className="text-gray-600 mb-4">
          Draw, edit, and delete custom polygons on the map. Search for locations and see them as markers.
        </p>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-orange-900 mb-2">Drawing Tools:</h2>
          <ul className="text-orange-800 text-sm space-y-1">
            <li>• <strong>Draw Polygon</strong> - Click to create a new polygon</li>
            <li>• <strong>Edit Mode</strong> - Drag vertices to edit existing polygons</li>
            <li>• <strong>Drag Mode</strong> - Move entire polygons</li>
            <li>• <strong>Delete Mode</strong> - Remove polygons</li>
          </ul>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setEnableDrawing(!enableDrawing)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              enableDrawing 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {enableDrawing ? 'Disable Drawing' : 'Enable Drawing'}
          </button>

          {polygons.length > 0 && (
            <>
              <button
                onClick={clearAllPolygons}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear All Polygons
              </button>
              <button
                onClick={exportPolygons}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export Polygons (JSON)
              </button>
            </>
          )}
        </div>

        {/* Polygon Counter */}
        {polygons.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>{polygons.length}</strong> polygon{polygons.length !== 1 ? 's' : ''} drawn
            </p>
          </div>
        )}
      </div>

      <SearchableMap 
        initialCenter={[40.7128, -74.0060]} // New York
        initialZoom={12}
        height="600px"
        polygons={polygons}
        enableDrawing={enableDrawing}
        onPolygonCreated={handlePolygonCreated}
        onPolygonEdited={handlePolygonEdited}
        onPolygonDeleted={handlePolygonDeleted}
      />

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How to Use:</h2>
        <div className="space-y-2 text-gray-700 text-sm">
          <div>
            <h3 className="font-medium text-gray-900">1. Enable Drawing:</h3>
            <p>Click "Enable Drawing" to activate the drawing toolbar on the map.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">2. Draw Polygons:</h3>
            <p>Click the polygon tool (first icon) and then click on the map to create vertices. Double-click to finish the polygon.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">3. Edit Polygons:</h3>
            <p>Click the edit tool (second icon) and drag the vertices to modify the polygon shape.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">4. Move Polygons:</h3>
            <p>Click the drag tool (third icon) and drag the polygon to move it.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">5. Delete Polygons:</h3>
            <p>Click the delete tool (fourth icon) and click on a polygon to remove it.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">6. Export Data:</h3>
            <p>Use the "Export Polygons" button to download your polygons as a JSON file.</p>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg">
        <h3 className="text-white font-semibold mb-2">Console Output:</h3>
        <p className="text-sm">Open your browser's developer console to see polygon creation, editing, and deletion events.</p>
      </div>
    </div>
  );
} 