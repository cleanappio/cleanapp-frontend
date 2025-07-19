"use client";

import SearchableMap from './SearchableMap';

export default function SearchableMapExample() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Searchable Map Example
        </h1>
        <p className="text-gray-600">
          Search for any location and see it displayed on the map with interactive markers.
        </p>
      </div>

      <SearchableMap 
        initialCenter={[51.505, -0.09]} // London
        initialZoom={10}
        height="600px"
      />
    </div>
  );
} 