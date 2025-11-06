import { useEffect, useRef, useState, useCallback } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
// @ts-ignore - mapbox-gl-draw-rectangle-mode doesn't have type definitions
import DrawRectangle from "mapbox-gl-draw-rectangle-mode";
// @ts-ignore - mapbox-gl-draw-freehand-mode doesn't have type definitions
import FreehandMode from "mapbox-gl-draw-freehand-mode";
import type { Map } from "mapbox-gl";
import { Area } from "@/lib/areas-api-client";
import type { Feature, Polygon } from "geojson";

interface UseMapboxDrawProps {
  map: Map | null;
  mapLoaded: boolean;
  mapStyleLoaded: boolean;
  enableDrawing: boolean;
  drawMode?: "rectangle" | "freehand";
  onAreaCreated?: (area: Area) => void;
  onAreaEdited?: (area: Area, index: number) => void;
  onAreaDeleted?: (index: number) => void;
  onDrawingDisabled?: () => void;
}

export function useMapboxDraw({
  map,
  mapLoaded,
  mapStyleLoaded,
  enableDrawing,
  drawMode = "freehand",
  onAreaCreated,
  onAreaEdited,
  onAreaDeleted,
  onDrawingDisabled,
}: UseMapboxDrawProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const initializedRef = useRef(false);
  const processedFeaturesRef = useRef<Set<string>>(new Set());
  const pendingFeatureIdRef = useRef<string | number | null>(null);
  const [pendingFeature, setPendingFeature] = useState<Feature | null>(null);

  // Handle mode switching when enableDrawing or drawMode changes
  useEffect(() => {
    if (!drawRef.current || !map) return;

    if (enableDrawing && initializedRef.current) {
      // Switch to the appropriate drawing mode based on drawMode prop
      const mode = drawMode === "freehand" ? "draw_polygon" : "draw_rectangle";
      drawRef.current.changeMode(mode as any);
    } else if (!enableDrawing && initializedRef.current) {
      // Switch back to simple select mode
      drawRef.current.changeMode("simple_select");
    }
  }, [enableDrawing, drawMode, map]);

  // Control map dragging: only disable for freehand mode
  useEffect(() => {
    if (!map || !mapLoaded || !mapStyleLoaded) return;

    try {
      const dragPan = (map as any).dragPan;
      if (!dragPan) return;

      if (enableDrawing && drawMode === "freehand") {
        // Disable dragging for freehand mode
        if (dragPan.isEnabled()) {
          dragPan.disable();
        }
      } else {
        // Enable dragging for rectangle mode or when drawing is disabled
        if (!dragPan.isEnabled()) {
          dragPan.enable();
        }
      }
    } catch (error) {
      console.warn("Could not control map dragging:", error);
    }
  }, [map, mapLoaded, mapStyleLoaded, enableDrawing, drawMode]);

  useEffect(() => {
    if (!enableDrawing || !map || !mapLoaded || !mapStyleLoaded) {
      // If drawing is disabled, clean up
      if (drawRef.current && initializedRef.current && map) {
        map.removeControl(drawRef.current as any);
        drawRef.current = null;
        initializedRef.current = false;
      }
      return;
    }

    if (initializedRef.current) {
      return;
    }

    // Initialize MapboxDraw
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: {
        ...MapboxDraw.modes,
        draw_rectangle: DrawRectangle,
        draw_polygon: FreehandMode,
      },
      defaultMode: "simple_select",
      styles: [
        // Polygon fill style
        {
          id: "gl-draw-polygon-fill-inactive",
          type: "fill",
          filter: [
            "all",
            ["==", "active", "false"],
            ["==", "$type", "Polygon"],
            ["!=", "mode", "static"],
          ],
          paint: {
            "fill-color": "#ae11c6",
            "fill-opacity": 0.3,
          },
        },
        {
          id: "gl-draw-polygon-fill-active",
          type: "fill",
          filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
          paint: {
            "fill-color": "#ae11c6",
            "fill-opacity": 0.5,
          },
        },
        // Polygon outline style
        {
          id: "gl-draw-polygon-stroke-inactive",
          type: "line",
          filter: [
            "all",
            ["==", "active", "false"],
            ["==", "$type", "Polygon"],
            ["!=", "mode", "static"],
          ],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#ae11c6",
            "line-width": 3,
          },
        },
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#ae11c6",
            "line-width": 3,
          },
        },
        // Vertex points
        {
          id: "gl-draw-polygon-and-line-vertex-active",
          type: "circle",
          filter: [
            "all",
            ["==", "meta", "vertex"],
            ["==", "$type", "Point"],
            ["!=", "mode", "static"],
          ],
          paint: {
            "circle-radius": 5,
            "circle-color": "#ae11c6",
          },
        },
      ],
    });

    map.addControl(draw as any, "top-right");
    drawRef.current = draw;
    initializedRef.current = true;

    // Event handlers
    const handleDrawCreate = (e: { features: Feature[] }) => {
      console.log("draw.create event fired", e);
      const feature = e.features[0];
      console.log("Feature from event:", feature);
      if (feature && feature.geometry.type === "Polygon") {
        console.log("Polygon feature detected, setting pendingFeature");
        // Mark this feature as processed
        const featureId =
          feature.id?.toString() || JSON.stringify(feature.geometry);
        processedFeaturesRef.current.add(featureId);

        // Store the feature ID so we can delete it later if user cancels
        if (feature.id !== undefined) {
          pendingFeatureIdRef.current = feature.id;
        } else {
          // If feature doesn't have an id, try to get it from the draw control
          const allFeatures = draw.getAll();
          const matchingFeature = allFeatures.features.find(
            (f: Feature) =>
              f.geometry.type === "Polygon" &&
              JSON.stringify(f.geometry) === JSON.stringify(feature.geometry)
          );
          if (matchingFeature && matchingFeature.id) {
            pendingFeatureIdRef.current = matchingFeature.id;
          }
        }

        // Store the feature and trigger modal - but DON'T delete it yet
        // Keep it visible until user cancels or submits
        setPendingFeature(feature);
      } else {
        console.log("Feature check failed:", {
          hasFeature: !!feature,
          geometryType: feature?.geometry?.type,
        });
      }
    };

    const handleDrawUpdate = (e: { features: Feature[] }) => {
      e.features.forEach((feature) => {
        if (feature && feature.geometry.type === "Polygon") {
          const area: Area = {
            id: undefined,
            name: `Edited Custom Area ${Date.now()}`,
            description: "", // Use empty string instead of null
            is_custom: true,
            type: "poi",
            contact_name: "",
            contact_emails: [],
            coordinates: feature as Feature<Polygon>,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          onAreaEdited?.(area, 0);
        }
      });
    };

    const handleDrawDelete = () => {
      onAreaDeleted?.(0);
    };

    // Also listen for mode changes to detect when freehand drawing completes
    const handleDrawModeChange = () => {
      // When switching from draw mode, check if there are any features created
      const currentMode = draw.getMode();
      if (currentMode === "simple_select") {
        const allFeatures = draw.getAll();
        const polygons = allFeatures.features.filter(
          (f: Feature) => f.geometry.type === "Polygon"
        );
        // Check if we have a new polygon that hasn't been processed
        for (const polygon of polygons) {
          const featureId =
            polygon.id?.toString() || JSON.stringify(polygon.geometry);
          if (!processedFeaturesRef.current.has(featureId)) {
            // This is a new unprocessed polygon, likely from freehand mode
            if (!polygon.properties?.name) {
              handleDrawCreate({ features: [polygon] });
              break; // Only process the first unprocessed polygon
            }
          }
        }
      }
    };

    map.on("draw.create", handleDrawCreate);
    map.on("draw.update", handleDrawUpdate);
    map.on("draw.delete", handleDrawDelete);
    map.on("draw.modechange", handleDrawModeChange);

    // Switch to the appropriate drawing mode when drawing is enabled
    if (enableDrawing) {
      const mode = drawMode === "freehand" ? "draw_polygon" : "draw_rectangle";
      draw.changeMode(mode as any);
    }

    return () => {
      map.off("draw.create", handleDrawCreate);
      map.off("draw.update", handleDrawUpdate);
      map.off("draw.delete", handleDrawDelete);
      map.off("draw.modechange", handleDrawModeChange);

      if (drawRef.current) {
        map.removeControl(drawRef.current as any);
        drawRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [
    map,
    mapLoaded,
    mapStyleLoaded,
    enableDrawing,
    drawMode,
    onAreaCreated,
    onAreaEdited,
    onAreaDeleted,
  ]);

  const handleModalSubmit = useCallback(
    (area: Area) => {
      // Update the existing polygon with properties instead of deleting and re-adding
      if (
        drawRef.current &&
        pendingFeature &&
        pendingFeatureIdRef.current !== null
      ) {
        try {
          // Update the feature properties
          drawRef.current.setFeatureProperty(
            pendingFeatureIdRef.current as string,
            "name",
            area.name
          );
          drawRef.current.setFeatureProperty(
            pendingFeatureIdRef.current as string,
            "description",
            area.description
          );
        } catch (error) {
          console.warn("Failed to update feature properties:", error);
          // Fallback: delete and re-add if update fails
          if (drawRef.current && pendingFeatureIdRef.current !== null) {
            drawRef.current.delete(pendingFeatureIdRef.current as string);
            const featureWithProperties = {
              ...pendingFeature,
              properties: {
                ...pendingFeature.properties,
                name: area.name,
                description: area.description,
              },
            };
            drawRef.current.add(featureWithProperties);
          }
        }
      }

      onAreaCreated?.(area);
      setPendingFeature(null);
      pendingFeatureIdRef.current = null;

      // Switch back to simple select mode after creation
      if (drawRef.current) {
        drawRef.current.changeMode("simple_select");
      }

      // Disable drawing mode after successful submission
      onDrawingDisabled?.();
    },
    [pendingFeature, onAreaCreated, onDrawingDisabled]
  );

  const handleModalClose = useCallback(() => {
    // Delete the polygon if user cancels
    if (drawRef.current && pendingFeatureIdRef.current !== null) {
      try {
        drawRef.current.delete(pendingFeatureIdRef.current as string);
      } catch (error) {
        console.warn("Failed to delete feature on cancel:", error);
      }
      pendingFeatureIdRef.current = null;
    }

    // Clear pending feature
    setPendingFeature(null);

    // Disable drawing mode
    onDrawingDisabled?.();
  }, [onDrawingDisabled]);

  return {
    pendingFeature,
    handleModalSubmit,
    handleModalClose,
  };
}
