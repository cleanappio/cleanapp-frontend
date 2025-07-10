"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

// Dynamically import the entire map component to avoid SSR issues
const MontenegroMap = dynamic(
  () => import('./MontenegroMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }
);

// Sample data for Montenegro
const montenegroData = [
  {
    id: 1,
    name: "Podgorica",
    position: [42.4304, 19.2594] as [number, number],
    type: "capital",
    population: "187085",
    description: "Capital and largest city of Montenegro"
  },
  {
    id: 2,
    name: "Kotor",
    position: [42.4242, 18.7719] as [number, number],
    type: "cultural",
    population: "22124",
    description: "UNESCO World Heritage site with medieval architecture"
  },
  {
    id: 3,
    name: "Budva",
    position: [42.2778, 18.8375] as [number, number],
    type: "tourism",
    population: "19218",
    description: "Popular coastal resort town"
  },
  {
    id: 4,
    name: "Cetinje",
    position: [42.3908, 18.9144] as [number, number],
    type: "historical",
    population: "13872",
    description: "Historical capital and cultural center"
  },
  {
    id: 5,
    name: "Bar",
    position: [42.0964, 19.0897] as [number, number],
    type: "port",
    population: "42048",
    description: "Main seaport of Montenegro"
  },
  {
    id: 6,
    name: "Nikšić",
    position: [42.7731, 18.9445] as [number, number],
    type: "industrial",
    population: "56970",
    description: "Second largest city and industrial center"
  }
];

export default function MontenegroDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [selectedCity, setSelectedCity] = useState<typeof montenegroData[0] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([42.7087, 19.3744]); // Montenegro center

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Montenegro Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/cleanapp-logo.png"
                alt="CleanApp Logo"
                width={150}
                height={45}
                className="h-9 w-auto"
                priority
              />
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Montenegro Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">🇲🇪 Montenegro</span>
            <Link 
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-sm border-r border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Montenegro Cities</h2>
              <div className="space-y-2">
                {montenegroData.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setSelectedCity(city);
                      setMapCenter(city.position);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedCity?.id === city.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{city.name}</h3>
                        <p className="text-sm text-gray-500">{city.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {city.type}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{city.population} pop.</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Map Legend</h3>
              <div className="space-y-2">
                {Object.entries({
                  capital: 'Capital',
                  cultural: 'Cultural',
                  tourism: 'Tourism',
                  historical: 'Historical',
                  port: 'Port',
                  industrial: 'Industrial'
                }).map(([type, label]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{
                        backgroundColor: {
                          capital: '#ff4444',
                          cultural: '#44ff44',
                          tourism: '#4444ff',
                          historical: '#ffff44',
                          port: '#ff44ff',
                          industrial: '#44ffff'
                        }[type]
                      }}
                    ></div>
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Total Cities</p>
                  <p className="font-semibold text-gray-900">{montenegroData.length}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Population</p>
                  <p className="font-semibold text-gray-900">~621,000</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Area</p>
                  <p className="font-semibold text-gray-900">13,812 km²</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Capital</p>
                  <p className="font-semibold text-gray-900">Podgorica</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MontenegroMap 
            mapCenter={mapCenter}
            onCitySelect={(city) => {
              setSelectedCity(city);
              setMapCenter(city.position);
            }}
          />

          {/* Map Controls Overlay */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <div className="space-y-2">
              <button
                onClick={() => setMapCenter([42.7087, 19.3744])}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reset View
              </button>
              <button
                onClick={() => setMapCenter([42.4304, 19.2594])}
                className="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Go to Capital
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 