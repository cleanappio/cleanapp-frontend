import React, { useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import SearchableMap from '@/components/SearchableMap';
import { MapPin } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { Area } from '@/lib/areas-api-client';
import { areasApiClient } from '@/lib/areas-api-client';

export default function AreasMapPage() {
  const { t } = useTranslations();
  const [drawnAreas, setDrawnAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Area[]>([]);
  const [fetchedAreas, setFetchedAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [publicAreaIds, setPublicAreaIds] = useState<Set<number>>(new Set());
  const [clickedAreaId, setClickedAreaId] = useState<number | null>(null);
  const featureGroupRef = useRef<any>(null);

  const handleAreaCreated = async (area: Area) => {
    console.log('Area created:', area);
    try {
      const response = await areasApiClient.createArea(area);
      console.log('Area created successfully:', response);
      
      // Update the area with the ID returned from the server
      const createdArea = { ...area, id: response.area_id };
      
      setDrawnAreas(prev => {
        const newDrawnAreas = [...prev, createdArea];
        return newDrawnAreas;
      });
    } catch (error: any) {
      console.error('Error creating area:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      // Still add to local state even if API call fails
      setDrawnAreas(prev => {
        const newDrawnAreas = [...prev, area];
        return newDrawnAreas;
      });
    }
  };

  const handleAreaEdited = async (area: Area, index: number) => {
    console.log('Area edited:', area, 'at index:', index);
    try {
      const response = await areasApiClient.updateArea(area);
      console.log('Area updated successfully:', response);
      
      setDrawnAreas(prev => {
        const newAreas = [...prev];
        newAreas[index] = area;
        return newAreas;
      });
    } catch (error: any) {
      console.error('Error updating area:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      // Still update local state even if API call fails
      setDrawnAreas(prev => {
        const newAreas = [...prev];
        newAreas[index] = area;
        return newAreas;
      });
    }
  };

  const handleAreaDeleted = (index: number) => {
    console.log('Area deleted at index:', index);
    // Note: No delete API method available, so we only remove from local state
    setDrawnAreas(prev => {
      const newDrawnAreas = prev.filter((_, i) => i !== index);
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

  // Handle area click for selection/deselection and color change
  const handleAreaClick = async (area: Area) => {
    console.log('Area clicked:', area);
    setClickedAreaId(area.id || null);
    
    // Toggle area selection
    setSelectedAreas(prev => {
      const isSelected = prev.some(selectedArea => selectedArea.id === area.id);
      if (isSelected) {
        // Remove from selection and feature group
        if (featureGroupRef.current) {
          // Find and remove the layer from feature group
          featureGroupRef.current.eachLayer((layer: any) => {
            if (layer.areaId === area.id) {
              featureGroupRef.current.removeLayer(layer);
            }
          });
        }
        return prev.filter(selectedArea => selectedArea.id !== area.id);
      } else {
        // Add to selection and feature group
        if (featureGroupRef.current && area.coordinates) {
          // Dynamically import Leaflet only on client side
          if (typeof window !== 'undefined') {
            import('leaflet').then((L) => {
              try {
                // Create a GeoJSON layer from the area coordinates
                const geoJsonLayer = L.default.geoJSON(area.coordinates, {
                  style: {
                    color: '#ae11c6',
                    fillColor: '#ae11c6',
                    fillOpacity: 0.3,
                    weight: 3
                  }
                });
                
                // Add area ID to the layer for identification
                (geoJsonLayer as any).areaId = area.id;
                
                // Add to feature group
                featureGroupRef.current.addLayer(geoJsonLayer);
              } catch (error) {
                console.error('Error adding area to feature group:', error);
              }
            }).catch((error) => {
              console.error('Error importing Leaflet:', error);
            });
          }
        }
        return [...prev, area];
      }
    });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Standard CleanApp Header */}
      <PageHeader />
      
      {/* Full-page SearchableMap with Areas Management */}
      <div className="flex-1 flex flex-col relative">
        {/* Map */}
        <div className="flex-1">
          <SearchableMap
            initialCenter={[40.7128, -74.0060]} // Default to New York
            initialZoom={13}
            height="calc(100vh - 80px)"
            enableDrawing={true}
            onAreaCreated={handleAreaCreated}
            onAreaEdited={handleAreaEdited}
            onAreaDeleted={handleAreaDeleted}
            onBoundsChange={handleBoundsChange}
            areas={fetchedAreas}
            onAreaClick={handleAreaClick}
            selectedAreas={selectedAreas}
            featureGroupRef={featureGroupRef}
            fullScreen={true}
          />
        </div>

        {/* Summary Sections - Overlay on bottom */}
        <div className="absolute bottom-4 left-4 right-4 space-y-2 z-10">
          {/* Selected Areas Summary */}
          {selectedAreas.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
              <h3 className="text-md font-semibold text-green-900 mb-2">
                {t('selectedAreas')} ({selectedAreas.length})
              </h3>
              <div className="space-y-1">
                {selectedAreas.map((area, index) => (
                  <div key={`selected-${area.id}-${index}`} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3 text-green-600" />
                      <span className="text-sm text-green-800">{area.name}</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        {area.is_custom ? t('custom') : t('public')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAreaClick(area)}
                      className="text-xs text-green-700 hover:text-green-900 underline"
                    >
                      {t('deselect')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drawn Areas Summary */}
          {drawnAreas.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 shadow-lg">
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
      </div>
    </div>
  );
}
