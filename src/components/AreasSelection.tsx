"use client";

import { useState } from 'react';
import SearchableMap from './SearchableMap';
import { MapPin, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

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

// Area interface for the dummy data
interface Area {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
  polygon?: GeoJSONPolygon;
  isSelected: boolean;
}



interface AreasSelectionProps {
  onAreasChange?: (selectedAreas: Area[]) => void;
  initialSelectedAreas?: string[];
}

export default function AreasSelection({ onAreasChange, initialSelectedAreas = [] }: AreasSelectionProps) {
  const { t } = useTranslations();
  const [areas, setAreas] = useState<Area[]>([]);
  const [polygons, setPolygons] = useState<GeoJSONPolygon[]>([]);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDescription, setNewAreaDescription] = useState('');

  const handleAreaToggle = (areaId: string) => {
    const updatedAreas = areas.map(area => 
      area.id === areaId ? { ...area, isSelected: !area.isSelected } : area
    );
    setAreas(updatedAreas);
    
    if (onAreasChange) {
      onAreasChange(updatedAreas.filter(area => area.isSelected));
    }
  };

  const toggleAreaSelection = (areaId: string) => {
    handleAreaToggle(areaId);
  };

  const handlePolygonCreated = (polygon: GeoJSONPolygon) => {
    console.log('Polygon created:', polygon);
    setPolygons(prev => [...prev, polygon]);
    
    // If we're editing an area, assign the polygon to it and select it
    if (editingArea) {
      const updatedAreas = areas.map(area => 
        area.id === editingArea 
          ? { ...area, polygon, isSelected: true } 
          : area
      );
      setAreas(updatedAreas);
      setEditingArea(null);
      setNewAreaName('');
      setNewAreaDescription('');
      
      // Notify parent component of the change
      if (onAreasChange) {
        onAreasChange(updatedAreas.filter(area => area.isSelected));
      }
    }
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

  const startEditingArea = (areaId: string) => {
    setEditingArea(areaId);
    const area = areas.find(a => a.id === areaId);
    if (area) {
      setNewAreaName(area.name);
      setNewAreaDescription(area.description);
    }
  };

  const cancelEditing = () => {
    setEditingArea(null);
    setNewAreaName('');
    setNewAreaDescription('');
  };

  const saveAreaChanges = () => {
    if (editingArea && newAreaName.trim()) {
      const updatedAreas = areas.map(area => 
        area.id === editingArea 
          ? { 
              ...area, 
              name: newAreaName.trim(),
              description: newAreaDescription.trim() || area.description
            } 
          : area
      );
      setAreas(updatedAreas);
      setEditingArea(null);
      setNewAreaName('');
      setNewAreaDescription('');
    }
  };

  const deleteArea = (areaId: string) => {
    setAreas(prev => prev.filter(area => area.id !== areaId));
  };

  const selectedAreas = areas.filter(area => area.isSelected);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          {t('selectServiceAreas')}
        </h2>
        <p className="text-blue-800 text-sm">
          {t('areasSelectionDescription')}
        </p>
      </div>



      {/* Editing Form */}
      {editingArea && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-md font-semibold text-yellow-900 mb-3">
            {areas.find(a => a.id === editingArea)?.name === 'New Custom Area' 
              ? t('createNewArea') 
              : t('editArea')
            }
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-yellow-800 mb-1">
                {t('areaName')}
              </label>
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder={t('areaNamePlaceholder')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-yellow-800 mb-1">
                {t('areaDescription')}
              </label>
              <input
                type="text"
                value={newAreaDescription}
                onChange={(e) => setNewAreaDescription(e.target.value)}
                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder={t('areaDescriptionPlaceholder')}
              />
            </div>
            
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                {t('drawingInstructions')}
              </p>
            </div>
          </div>
        </div>
      )}

              {/* Map Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900">
              {t('mapView')}
            </h3>
            

          </div>

        {/* Map */}
        <SearchableMap 
          initialCenter={[40.7128, -74.0060]} // New York
          initialZoom={12}
          height="400px"
          polygons={polygons}
          enableDrawing={true}
          onPolygonCreated={handlePolygonCreated}
          onPolygonEdited={handlePolygonEdited}
          onPolygonDeleted={handlePolygonDeleted}
        />
      </div>

      {/* Selected Areas Summary */}
      {selectedAreas.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-md font-semibold text-green-900 mb-2">
            {t('selectedAreas')} ({selectedAreas.length})
          </h3>
          <div className="space-y-1">
            {selectedAreas.map((area) => (
              <div key={area.id} className="flex items-center space-x-2">
                <MapPin className="w-3 h-3 text-green-600" />
                <span className="text-sm text-green-800">{area.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 