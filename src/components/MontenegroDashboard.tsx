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



export default function MontenegroDashboard() {
  const [isClient, setIsClient] = useState(false);
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
      <div className="flex-1">
        {/* Map Container */}
        <div className="h-full relative">
          <MontenegroMap 
            mapCenter={mapCenter}
          />
        </div>
      </div>
    </div>
  );
} 