import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { FeatureGroup } from "react-leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import { Area } from "@/lib/areas-api-client";
import AreaCreationModal from "./AreaCreationModal";

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
    z-index: 1000 !important;
    position: relative !important;
  }
`;

// Global flag to track if styles have been injected
let stylesInjected = false;

// Function to inject styles
const injectStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;

  // Remove existing style if it exists
  const existingStyle = document.getElementById("leaflet-draw-fix");
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleElement = document.createElement("style");
  styleElement.id = "leaflet-draw-fix";
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

    console.log("=== DRAW TOOLS INITIALIZATION START ===");
    console.log("Map available:", !!map);
    console.log("Drawing enabled:", enableDrawing);

    // Inject styles when drawing is enabled
    injectStyles();

    initialized.current = true;
    console.log("=== DRAW TOOLS INITIALIZATION COMPLETE ===");
  }, [map, enableDrawing]);

  return map;
}

// Draw control component
export function DrawControl({
  enableDrawing,
  onAreaCreated,
  onAreaEdited,
  onAreaDeleted,
  featureGroupRef,
}: {
  enableDrawing: boolean;
  onAreaCreated?: (area: Area) => void;
  onAreaEdited?: (area: Area, index: number) => void;
  onAreaDeleted?: (index: number) => void;
  featureGroupRef: React.RefObject<any>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingArea, setPendingArea] = useState<Area | null>(null);
  const [pendingLayer, setPendingLayer] = useState<any>(null);

  // Inject styles when component mounts (as backup)
  useEffect(() => {
    injectStyles();
  }, []);

  // Set up the edit control with featureGroup after mount
  useEffect(() => {
    if (enableDrawing && featureGroupRef.current) {
      // The edit control will automatically use the FeatureGroup it's rendered inside
      // No need to explicitly set it in the configuration
    }
  }, [enableDrawing, featureGroupRef]);

  if (!enableDrawing) return null;

  const handleCreated = (e: any) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.removeLayer(e.layer);
    }
    const layer = e.layer;
    const coordinates = layer.toGeoJSON().geometry.coordinates;

    const newArea: Area = {
      id: undefined, // Will be set by backend
      name: `Custom Area ${Date.now()}`,
      description: "", // Use empty string instead of null
      is_custom: true,
      type: "poi" as const,
      contact_name: "",
      contact_emails: [],
      coordinates: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: coordinates,
        },
        properties: {
          name: `Custom Area ${Date.now()}`,
          description: "",
          color: "#ae11c6",
          fillColor: "#ae11c6",
          fillOpacity: 0.3,
          weight: 3,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store the area and layer, then open modal
    setPendingArea(newArea);
    setPendingLayer(layer);
    setIsModalOpen(true);
  };

  const handleEdited = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const coordinates = layer.toGeoJSON().geometry.coordinates;
      const editedArea: Area = {
        id: undefined, // Will be set by backend
        name: `Edited Custom Area`,
        description: "", // Use empty string instead of null
        is_custom: true,
        type: "poi" as const,
        contact_name: "",
        contact_emails: [],
        coordinates: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: coordinates,
          },
          properties: {
            name: `Edited Custom Area`,
            description: "",
            color: "#ae11c6",
            fillColor: "#ae11c6",
            fillOpacity: 0.3,
            weight: 3,
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onAreaEdited?.(editedArea, 0);
    });
  };

  const handleDeleted = (e: any) => {
    console.log("Polygon deleted:", e);
    onAreaDeleted?.(0);
  };

  const handleModalSubmit = (area: Area) => {
    onAreaCreated?.(area);
    // Close modal without removing the polygon
    setIsModalOpen(false);
    setPendingArea(null);
    setPendingLayer(null);
  };

  const handleModalClose = () => {
    // Remove the drawn polygon from the map if it exists
    if (pendingLayer && featureGroupRef.current) {
      featureGroupRef.current.removeLayer(pendingLayer);
    }

    setIsModalOpen(false);
    setPendingArea(null);
    setPendingLayer(null);
  };

  return React.createElement(
    React.Fragment,
    null,
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
            color: "#e1e100",
            message: "<strong>Oh snap!<strong> you can't draw that!",
          },
          shapeOptions: {
            color: "#ae11c6",
            fillColor: "#ae11c6",
            fillOpacity: 0.5,
            weight: 3,
          },
        },
      },
      edit: {
        remove: true,
        edit: {
          selectedPathOptions: {
            maintainColor: true,
            dashArray: "10, 10",
          },
        },
      },
    }),
    pendingArea &&
      React.createElement(AreaCreationModal, {
        isOpen: isModalOpen,
        onClose: handleModalClose,
        onSubmit: handleModalSubmit,
        initialArea: pendingArea,
      })
  );
}
