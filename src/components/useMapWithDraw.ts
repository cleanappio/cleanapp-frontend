import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { FeatureGroup } from 'react-leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Area } from '@/lib/areas-api-client';

// CSS styles to fix z-index issues
const drawStyles = `
  /* Ensure map tiles don't cover controls */
  .leaflet-tile-pane {
    z-index: 200 !important;
  }
  
  .leaflet-overlay-pane {
    z-index: 400 !important;
  }
  
  .leaflet-marker-pane {
    z-index: 600 !important;
  }
  
  .leaflet-tooltip-pane {
    z-index: 650 !important;
  }
  
  .leaflet-popup-pane {
    z-index: 700 !important;
  }
  
  /* Force controls to be above everything */
  .leaflet-control-pane {
    z-index: 1000 !important;
  }
  
  .leaflet-draw-toolbar,
  .leaflet-draw-toolbar *,
  .leaflet-draw-toolbar .leaflet-draw-toolbar-single,
  .leaflet-draw-toolbar .leaflet-draw-toolbar-single *,
  .leaflet-draw-toolbar .leaflet-draw-toolbar-single a,
  .leaflet-draw-toolbar .leaflet-draw-toolbar-single a.leaflet-draw-draw-polygon,
  .leaflet-draw-toolbar .leaflet-draw-toolbar-single a.leaflet-draw-edit-edit,
  .leaflet-draw-toolbar .leaflet-draw-toolbar-single a.leaflet-draw-edit-remove {
    z-index: 9999 !important;
  }
  
  /* Ensure control pane is always on top */
  .leaflet-control-container {
    z-index: 10000 !important;
    position: relative !important;
  }
`;

// Global flag to track if styles have been injected
let stylesInjected = false;

// Function to inject styles
const injectStyles = () => {
  if (stylesInjected || typeof document === 'undefined') return;
  
  // Remove existing style if it exists
  const existingStyle = document.getElementById('leaflet-draw-fix');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'leaflet-draw-fix';
  styleElement.textContent = drawStyles;
  document.head.appendChild(styleElement);
  
  stylesInjected = true;
};

export function useMapWithDraw(
  enableDrawing: boolean,
  onAreaCreated?: (area: Area) => void,
  onAreaEdited?: (area: Area, index: number) => void,
  onAreaDeleted?: (index: number) => void
) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (!enableDrawing || initialized.current) return;

    console.log('=== DRAW TOOLS INITIALIZATION START ===');
    console.log('Map available:', !!map);
    console.log('Drawing enabled:', enableDrawing);

    // Inject styles when drawing is enabled
    injectStyles();

    initialized.current = true;
    console.log('=== DRAW TOOLS INITIALIZATION COMPLETE ===');
  }, [map, enableDrawing]);

  return map;
}

// Draw control component
export function DrawControl({
  enableDrawing,
  onAreaCreated,
  onAreaEdited,
  onAreaDeleted,
}: {
  enableDrawing: boolean;
  onAreaCreated?: (area: Area) => void;
  onAreaEdited?: (area: Area, index: number) => void;
  onAreaDeleted?: (index: number) => void;
}) {
  const featureGroupRef = useRef<any>(null);

  // Inject styles when component mounts (as backup)
  useEffect(() => {
    injectStyles();
  }, []);

  if (!enableDrawing) return null;

  const handleCreated = (e: any) => {
    const layer = e.layer;
    const coordinates = layer.toGeoJSON().geometry.coordinates;
    
    const newArea: Area = {
      id: undefined, // Will be set by backend
      name: `Custom Area ${Date.now()}`,
      description: 'Custom drawn area',
      is_custom: true,
      contact_name: '',
      contact_emails: [],
      coordinates: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coordinates
        },
        properties: {
          name: `Custom Area ${Date.now()}`,
          description: 'Custom drawn area',
          color: '#ae11c6',
          fillColor: '#ae11c6',
          fillOpacity: 0.3,
          weight: 3
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onAreaCreated?.(newArea);
  };

  const handleEdited = (e: any) => {
    console.log('Polygon edited:', e);
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const coordinates = layer.toGeoJSON().geometry.coordinates;
      const editedArea: Area = {
        id: undefined, // Will be set by backend
        name: `Edited Custom Area`,
        description: 'Custom drawn area',
        is_custom: true,
        contact_name: '',
        contact_emails: [],
        coordinates: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: coordinates
          },
          properties: {
            name: `Edited Custom Area`,
            description: 'Custom drawn area',
            color: '#ae11c6',
            fillColor: '#ae11c6',
            fillOpacity: 0.3,
            weight: 3
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      onAreaEdited?.(editedArea, 0);
    });
  };

  const handleDeleted = (e: any) => {
    console.log('Polygon deleted:', e);
    onAreaDeleted?.(0);
  };

  return React.createElement(FeatureGroup, {
    ref: featureGroupRef
  }, 
    React.createElement(EditControl, {
      position: "topright",
      onCreated: handleCreated,
      onEdited: handleEdited,
      onDeleted: handleDeleted,
      draw: {
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
            color: '#ae11c6',
            fillColor: '#ae11c6',
            fillOpacity: 0.5,
            weight: 3
          }
        }
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true,
        edit: {
          selectedPathOptions: {
            maintainColor: true,
            dashArray: '10, 10'
          }
        }
      }
    })
  );
} 