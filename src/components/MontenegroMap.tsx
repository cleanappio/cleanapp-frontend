"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';

// Custom hook to handle map center changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

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

// Custom marker icon
const createCustomIcon = (type: string) => {
  const colors = {
    capital: '#ff4444',
    cultural: '#44ff44',
    tourism: '#4444ff',
    historical: '#ffff44',
    port: '#ff44ff',
    industrial: '#44ffff'
  };
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${colors[type as keyof typeof colors] || '#666666'}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

interface MontenegroMapProps {
  mapCenter: [number, number];
  onCitySelect: (city: typeof montenegroData[0]) => void;
}

export default function MontenegroMap({ mapCenter, onCitySelect }: MontenegroMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={mapCenter}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Montenegro boundary highlight */}
      <Circle
        center={[42.7087, 19.3744]}
        radius={50000}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2
        }}
      />

      {/* City markers */}
      {montenegroData.map((city) => (
        <Marker
          key={city.id}
          position={city.position}
          icon={createCustomIcon(city.type)}
          eventHandlers={{
            click: () => {
              onCitySelect(city);
            }
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-lg">{city.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{city.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {city.type}
                </span>
                <span className="text-gray-500">
                  Population: {city.population}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapController center={mapCenter} />
    </MapContainer>
  );
} 