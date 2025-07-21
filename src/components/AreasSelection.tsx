"use client";

import { useState, useEffect, useCallback } from 'react';
import SearchableMap from './SearchableMap';
import { MapPin, Trash2 } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { Area } from '@/lib/areas-api-client';
import { areasApiClient } from '@/lib/areas-api-client';

interface AreasSelectionProps {
  onAreasChange?: (selectedAreas: Area[]) => void;
  initialSelectedAreas?: string[];
}

export default function AreasSelection({ onAreasChange, initialSelectedAreas = [] }: AreasSelectionProps) {
  const { t } = useTranslations();
  const [drawnAreas, setDrawnAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Area[]>([]);
  const [fetchedAreas, setFetchedAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);

  // Handle area click for selection/deselection
  const handleAreaClick = (area: Area) => {
    console.log('Area clicked:', area);
    setSelectedAreas(prev => {
      const isSelected = prev.some(selectedArea => selectedArea.id === area.id);
      if (isSelected) {
        // Remove from selection
        const newSelection = prev.filter(selectedArea => selectedArea.id !== area.id);
        onAreasChange?.(newSelection);
        return newSelection;
      } else {
        // Add to selection
        const newSelection = [...prev, area];
        onAreasChange?.(newSelection);
        return newSelection;
      }
    });
  };

  // Handle area deletion from selected areas list
  const handleAreaDelete = (areaToDelete: Area) => {
    console.log('Deleting area from selection:', areaToDelete);
    setSelectedAreas(prev => {
      const newSelection = prev.filter(area => area.id !== areaToDelete.id);
      onAreasChange?.(newSelection);
      return newSelection;
    });
  };

  const handleAreaCreated = (area: Area) => {
    console.log('Area created:', area);
    setDrawnAreas(prev => [...prev, area]);
  };

  const handleAreaEdited = (area: Area, index: number) => {
    console.log('Area edited:', area, 'at index:', index);
    setDrawnAreas(prev => {
      const newAreas = [...prev];
      newAreas[index] = area;
      return newAreas;
    });
  };

  const handleAreaDeleted = (index: number) => {
    console.log('Area deleted at index:', index);
    setDrawnAreas(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch areas based on map bounds
  const fetchAreasInBounds = useCallback(async (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => {
    try {
      setIsLoadingAreas(true);
      console.log('Fetching areas in bounds:', bounds);
      
      const response = await areasApiClient.getPOIAreasInBounds(
        bounds.latMin,
        bounds.lonMin,
        bounds.latMax,
        bounds.lonMax
      );
      
      console.log('Fetched areas:', response.areas);
      setFetchedAreas(response.areas);
    } catch (error: any) {
      console.error('Error fetching areas in bounds:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      setFetchedAreas([]);
    } finally {
      setIsLoadingAreas(false);
    }
  }, []);

  // Handle bounds change from map
  const handleBoundsChange = useCallback((bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => {
    fetchAreasInBounds(bounds);
  }, [fetchAreasInBounds]);

  return (
    <div className="w-full space-y-6">

      <div className="bg-white border border-gray-200 rounded-lg p-4">

        {/* Map */}
                <SearchableMap 
          initialCenter={[40.7128, -74.0060]} // New York
          initialZoom={12}
          height="400px"
          enableDrawing={true}
          onAreaCreated={handleAreaCreated}
          onAreaEdited={handleAreaEdited}
          onAreaDeleted={handleAreaDeleted}
          onBoundsChange={handleBoundsChange}
          areas={fetchedAreas}
          onAreaClick={handleAreaClick}
          selectedAreas={selectedAreas}
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
              <div key={area.id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3 h-3 text-green-600" />
                  <span className="text-sm text-green-800">{area.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAreaDelete(area)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Remove area from selection"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 