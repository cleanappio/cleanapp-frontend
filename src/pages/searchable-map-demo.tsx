"use client";

import { useState } from 'react';
import SearchableMap from '@/components/SearchableMap';
import Layout from '@/components/Layout';

export default function SearchableMapDemo() {
  const [showMap, setShowMap] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowMap(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Searchable Map Demo
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              🗺️ Interactive Map with Google Places Search
            </h2>
            <p className="text-blue-800 mb-4">
              This component demonstrates a Leaflet map integrated with Google Maps Places API for location search functionality.
            </p>
            <div className="bg-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Features:</h3>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>• Real-time search with Google Maps Places API</li>
                <li>• Debounced search input (500ms delay)</li>
                <li>• Interactive search results list</li>
                <li>• Clickable markers with popups</li>
                <li>• Automatic map centering on search results</li>
                <li>• Responsive design with Tailwind CSS</li>
              </ul>
            </div>
          </div>

          {!showMap ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Setup Required
              </h2>
              <p className="text-gray-600 mb-4">
                To use this component, you need to configure the Google Maps API key on the server side.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">How to set up the API key:</h3>
                <ol className="text-yellow-800 text-sm space-y-1">
                  <li>1. Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>2. Create a new project or select an existing one</li>
                  <li>3. Enable the "Places API" from the API Library</li>
                  <li>4. Create credentials (API Key) in the Credentials section</li>
                  <li>5. Add the API key to your environment variables: <code className="bg-yellow-100 px-1 rounded">GOOGLE_MAPS_API_KEY</code></li>
                </ol>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Load Map
                </button>
              </form>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Environment Variable:</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Add this to your <code className="bg-gray-200 px-1 rounded">.env.local</code> file:
                </p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded block">
                  GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ This API key is kept secure on the server side and not exposed to the client.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Interactive Searchable Map
                </h2>
                <button
                  onClick={() => setShowMap(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Change API Key
                </button>
              </div>
              
              <SearchableMap 
                initialCenter={[40.7128, -74.0060]} // New York
                initialZoom={10}
                height="700px"
              />
            </div>
          )}

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Usage Instructions
            </h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900">Search Functionality:</h3>
                <p className="text-sm">Type in the search box to find places, addresses, landmarks, or businesses. The search is debounced, so it will wait 500ms after you stop typing before making the API call.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Search Results:</h3>
                <p className="text-sm">Results appear in a dropdown list below the search box. Click on any result to center the map on that location and display a marker.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Map Interaction:</h3>
                <p className="text-sm">Click on markers to see detailed information in popups. The map automatically centers on the first search result and zooms in for better visibility.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">API Integration:</h3>
                <p className="text-sm">This component uses the Google Maps Places API Text Search endpoint to find locations based on user queries. The API returns formatted addresses and precise coordinates.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 