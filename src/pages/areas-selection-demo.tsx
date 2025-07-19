import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import AreasSelection from '@/components/AreasSelection';
import { useTranslations } from '@/lib/i18n';

// Area interface for the demo
interface Area {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
  polygon?: any;
  isSelected: boolean;
}

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

export default function AreasSelectionDemo() {
  const { t } = useTranslations();
  const [selectedAreas, setSelectedAreas] = useState<Area[]>([]);
  const [drawnPolygons, setDrawnPolygons] = useState<GeoJSONPolygon[]>([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Areas Selection Demo
            </h1>
            <p className="text-gray-600 mb-6">
              This demo showcases the areas selection functionality with a SearchableMap component. 
              You can draw custom service zones directly on the map using the drawing tools.
            </p>
            
            {selectedAreas.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold text-green-900 mb-2">
                  {t('selectedAreas')} ({selectedAreas.length})
                </h2>
                <div className="space-y-1">
                  {selectedAreas.map((area) => (
                    <div key={area.id} className="text-sm text-green-800">
                      • {area.name} - {area.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <AreasSelection
            onAreasChange={setSelectedAreas}
            onDrawnPolygonsChange={setDrawnPolygons}
            initialSelectedAreas={[]}
            initialDrawnPolygons={[]}
          />

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Features Included:
            </h2>
            <ul className="space-y-2 text-blue-800">
              <li>• <strong>Direct Drawing:</strong> Draw custom polygons directly on the map using drawing tools</li>
              <li>• <strong>Area Editing:</strong> Edit area names and descriptions</li>
              <li>• <strong>Area Deletion:</strong> Remove unwanted areas</li>
              <li>• <strong>Searchable Map:</strong> Search for locations and see them as markers</li>
              <li>• <strong>Drawing Tools:</strong> Always-enabled polygon drawing, editing, and deletion tools</li>
              <li>• <strong>Automatic Selection:</strong> Areas are automatically selected when created</li>
              <li>• <strong>Responsive Design:</strong> Works on desktop and mobile devices</li>
            </ul>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-3">
              Integration Notes:
            </h2>
            <ul className="space-y-2 text-yellow-800">
              <li>• Areas are created directly on the map using drawing tools</li>
              <li>• Selected areas are passed to the parent component via <code>onAreasChange</code> callback</li>
              <li>• Areas can be initialized with <code>initialSelectedAreas</code> prop</li>
              <li>• Backend integration would require API endpoints to save/retrieve user areas</li>
              <li>• The component is ready to be integrated into the checkout flow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 