"use client";

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Dynamically import the map components
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const EditControl = dynamic(
  () => import('react-leaflet-draw').then((mod) => mod.EditControl),
  { ssr: false }
);

const FeatureGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.FeatureGroup),
  { ssr: false }
);

export default function DrawTest() {
  const [isClient, setIsClient] = useState(false);
  const [polygons, setPolygons] = useState<any[]>([]);
  const featureGroupRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCreated = (e: any) => {
    console.log('Polygon created:', e);
    const layer = e.layer;
    const coordinates = layer.toGeoJSON().geometry.coordinates;
    
    const newPolygon = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: coordinates
      },
      properties: {
        name: `Polygon ${Date.now()}`,
        description: 'Custom drawn polygon',
        color: '#ff8800',
        fillColor: '#ff8800',
        fillOpacity: 0.3,
        weight: 2
      }
    };

    setPolygons(prev => [...prev, newPolygon]);
  };

  const handleEdited = (e: any) => {
    console.log('Polygon edited:', e);
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const coordinates = layer.toGeoJSON().geometry.coordinates;
      const newPolygon = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coordinates
        },
        properties: {
          name: `Edited Polygon`,
          description: 'Custom drawn polygon',
          color: '#ff8800',
          fillColor: '#ff8800',
          fillOpacity: 0.3,
          weight: 2
        }
      };
      
      setPolygons(prev => {
        const newPolygons = [...prev];
        newPolygons[0] = newPolygon;
        return newPolygons;
      });
    });
  };

  const handleDeleted = (e: any) => {
    console.log('Polygon deleted:', e);
    setPolygons(prev => prev.filter((_, i) => i !== 0));
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 border-2 border-green-500 relative">
      <div className="absolute top-2 left-2 z-50 bg-green-300 p-2 rounded text-xs">
        Draw Test: Look for drawing tools in top-left
      </div>
      
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: {
                allowIntersection: false,
                drawError: {
                  color: '#e1e100',
                  message: '<strong>Oh snap!<strong> you can\'t draw that!'
                },
                shapeOptions: {
                  color: '#ff8800',
                  fillColor: '#ff8800',
                  fillOpacity: 0.3,
                  weight: 2
                }
              }
            }}
            edit={{
              featureGroup: featureGroupRef.current,
              remove: true,
              edit: {
                selectedPathOptions: {
                  maintainColor: true,
                  dashArray: '10, 10'
                }
              }
            }}
          />
        </FeatureGroup>
      </MapContainer>
      
      <div className="absolute bottom-2 right-2 z-50 bg-white p-2 rounded text-xs border">
        <div>Polygons drawn: {polygons.length}</div>
      </div>
    </div>
  );
} 