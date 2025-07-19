"use client";

import SearchableMapWithDrawing from '@/components/SearchableMapWithDrawing';
import Layout from '@/components/Layout';

export default function SearchableMapDrawingDemo() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Searchable Map with Drawing Tools Demo
          </h1>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">
              🗺️ Interactive Map with Search + Drawing Tools
            </h2>
            <p className="text-purple-800 mb-4">
              This demo showcases the SearchableMap component enhanced with drawing and editing capabilities using Leaflet-Geoman.
            </p>
            <div className="bg-purple-100 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Enhanced Features:</h3>
              <ul className="text-purple-800 space-y-1 text-sm">
                <li>• Real-time search with Google Maps Places API</li>
                <li>• Interactive polygon drawing tools</li>
                <li>• Polygon editing and reshaping</li>
                <li>• Polygon dragging and moving</li>
                <li>• Polygon deletion</li>
                <li>• Export drawn polygons as GeoJSON</li>
                <li>• Real-time polygon counter</li>
                <li>• Console logging for all polygon events</li>
              </ul>
            </div>
          </div>

          <SearchableMapWithDrawing />

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Drawing Tools Overview
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Available Tools:</h3>
                <ul className="text-gray-700 text-sm space-y-2">
                  <li>
                    <strong>Draw Polygon</strong> - Create new polygons by clicking points on the map
                  </li>
                  <li>
                    <strong>Edit Mode</strong> - Modify existing polygon shapes by dragging vertices
                  </li>
                  <li>
                    <strong>Drag Mode</strong> - Move entire polygons to new locations
                  </li>
                  <li>
                    <strong>Delete Mode</strong> - Remove unwanted polygons
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Features:</h3>
                <ul className="text-gray-700 text-sm space-y-2">
                  <li>
                    <strong>Auto-naming</strong> - Polygons are automatically named "Polygon 1", "Polygon 2", etc.
                  </li>
                  <li>
                    <strong>Custom Styling</strong> - Drawn polygons have orange color scheme
                  </li>
                  <li>
                    <strong>Event Callbacks</strong> - Get notified when polygons are created, edited, or deleted
                  </li>
                  <li>
                    <strong>Export Functionality</strong> - Download all polygons as GeoJSON file
                  </li>
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

function MyComponent() {
  const [polygons, setPolygons] = useState([]);
  const [enableDrawing, setEnableDrawing] = useState(false);

  const handlePolygonCreated = (polygon) => {
    setPolygons(prev => [...prev, polygon]);
  };

  const handlePolygonEdited = (polygon, index) => {
    setPolygons(prev => {
      const newPolygons = [...prev];
      newPolygons[index] = polygon;
      return newPolygons;
    });
  };

  const handlePolygonDeleted = (index) => {
    setPolygons(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SearchableMap 
      initialCenter={[40.7128, -74.0060]}
      initialZoom={12}
      height="600px"
      enableDrawing={enableDrawing}
      onPolygonCreated={handlePolygonCreated}
      onPolygonEdited={handlePolygonEdited}
      onPolygonDeleted={handlePolygonDeleted}
    />
  );
}`}
            </pre>
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">
              Technical Details
            </h2>
            <div className="space-y-3 text-yellow-800">
              <div>
                <h3 className="font-medium text-yellow-900">Library Used:</h3>
                <p className="text-sm">Leaflet-Geoman (free version) for drawing and editing functionality</p>
              </div>
              <div>
                <h3 className="font-medium text-yellow-900">Event Handling:</h3>
                <p className="text-sm">All polygon events (create, edit, delete) are handled through callback functions</p>
              </div>
              <div>
                <h3 className="font-medium text-yellow-900">Data Format:</h3>
                <p className="text-sm">Polygons are stored in GeoJSON Feature format with Polygon geometry type</p>
              </div>
              <div>
                <h3 className="font-medium text-yellow-900">Styling:</h3>
                <p className="text-sm">Drawn polygons use orange color scheme by default, but can be customized</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 