"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import SearchableMap from './SearchableMap';
import { MapPin, Trash2 } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { Area } from '@/lib/areas-api-client';
import { areasApiClient } from '@/lib/areas-api-client';

interface AreasSelectionProps {
  onAreasChange?: (selectedAreas: Area[]) => void;
  onDrawnAreasChange?: (drawnAreas: Area[]) => void;
  initialSelectedAreas?: string[];
  onPublicAreasChange?: (publicAreaIds: Set<number>) => void;
}

export default function AreasSelection({ onAreasChange, onDrawnAreasChange, initialSelectedAreas = [], onPublicAreasChange }: AreasSelectionProps) {
  const { t } = useTranslations();
  const [drawnAreas, setDrawnAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Area[]>([]);
  const [fetchedAreas, setFetchedAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [publicAreaIds, setPublicAreaIds] = useState<Set<number>>(new Set());
  const featureGroupRef = useRef<any>(null);

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
    setDrawnAreas(prev => {
      const newDrawnAreas = [...prev, area];
      onDrawnAreasChange?.(newDrawnAreas);
      return newDrawnAreas;
    });
  };

  const handleAreaEdited = (area: Area, index: number) => {
    console.log('Area edited:', area, 'at index:', index);
    setDrawnAreas(prev => {
      const newAreas = [...prev];
      newAreas[index] = area;
      onDrawnAreasChange?.(newAreas);
      return newAreas;
    });
  };

  const handleAreaDeleted = (index: number) => {
    console.log('Area deleted at index:', index);
    setDrawnAreas(prev => {
      const newDrawnAreas = prev.filter((_, i) => i !== index);
      onDrawnAreasChange?.(newDrawnAreas);
      return newDrawnAreas;
    });
  };

  // Handle public checkbox changes
  const handlePublicChange = (areaId: number, isPublic: boolean) => {
    const newPublicAreaIds = new Set(publicAreaIds);
    if (isPublic) {
      newPublicAreaIds.add(areaId);
    } else {
      newPublicAreaIds.delete(areaId);
    }
    setPublicAreaIds(newPublicAreaIds);
    onPublicAreasChange?.(newPublicAreaIds);
  };

  // Fetch areas based on map bounds
  const fetchAreasInBounds = useCallback(async (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => {
    try {
      setIsLoadingAreas(true);
      
      const response = await areasApiClient.getPOIAreasInBounds(
        bounds.latMin,
        bounds.lonMin,
        bounds.latMax,
        bounds.lonMax
      );
      
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
          featureGroupRef={featureGroupRef}
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
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 text-xs text-green-700">
                    <input
                      type="checkbox"
                      checked={publicAreaIds.has(area.id || 0)}
                      onChange={(e) => handlePublicChange(area.id || 0, e.target.checked)}
                      className="w-3 h-3 text-green-600 focus:ring-green-500 border-green-300 rounded"
                    />
                    <span>{t('public')}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAreaDelete(area)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Remove area from selection"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawn Areas Summary */}
      {drawnAreas.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-md font-semibold text-purple-900 mb-2">
            {t('drawnAreas')} ({drawnAreas.length})
          </h3>
          <div className="space-y-1">
            {drawnAreas.map((area, index) => (
              <div key={`drawn-${index}`} className="flex items-center justify-between group">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3 h-3 text-purple-600" />
                  <span className="text-sm text-purple-800">{area.name}</span>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                    {t('custom')}
                  </span>
                </div>
                <label className="flex items-center space-x-1 text-xs text-purple-700">
                  <input
                    type="checkbox"
                    checked={publicAreaIds.has(area.id || 0)}
                    onChange={(e) => handlePublicChange(area.id || 0, e.target.checked)}
                    className="w-3 h-3 text-purple-600 focus:ring-purple-500 border-purple-300 rounded"
                  />
                  <span>{t('public')}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 