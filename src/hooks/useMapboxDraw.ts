import { useEffect, useRef, useState, useCallback } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { Map } from "mapbox-gl";
import { Area } from "@/lib/areas-api-client";
import type { Feature, Polygon } from "geojson";

interface UseMapboxDrawProps {
  map: Map | null;
  mapLoaded: boolean;
  mapStyleLoaded: boolean;
  enableDrawing: boolean;
  onAreaCreated?: (area: Area) => void;
  onAreaEdited?: (area: Area, index: number) => void;
  onAreaDeleted?: (index: number) => void;
}

export function useMapboxDraw({
  map,
  mapLoaded,
  mapStyleLoaded,
  enableDrawing,
  onAreaCreated,
  onAreaEdited,
  onAreaDeleted,
}: UseMapboxDrawProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const initializedRef = useRef(false);
  const [pendingFeature, setPendingFeature] = useState<Feature | null>(null);

  // Handle mode switching when enableDrawing changes
  useEffect(() => {
    if (!drawRef.current || !map) return;

    if (enableDrawing && initializedRef.current) {
      // Switch to polygon drawing mode
      drawRef.current.changeMode("draw_polygon");
    } else if (!enableDrawing && initializedRef.current) {
      // Switch back to simple select mode
      drawRef.current.changeMode("simple_select");
    }
  }, [enableDrawing, map]);

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
      controls: {
        polygon: true,
        trash: true,
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
      const feature = e.features[0];
      if (feature && feature.geometry.type === "Polygon") {
        // Store the feature and trigger modal
        setPendingFeature(feature);
        // Remove the feature from draw control temporarily
        draw.delete(feature.id as string);
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

    map.on("draw.create", handleDrawCreate);
    map.on("draw.update", handleDrawUpdate);
    map.on("draw.delete", handleDrawDelete);

    // Switch to polygon drawing mode when drawing is enabled
    if (enableDrawing) {
      draw.changeMode("draw_polygon");
    }

    return () => {
      map.off("draw.create", handleDrawCreate);
      map.off("draw.update", handleDrawUpdate);
      map.off("draw.delete", handleDrawDelete);

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
    onAreaCreated,
    onAreaEdited,
    onAreaDeleted,
  ]);

  const handleModalSubmit = useCallback(
    (area: Area) => {
      // Add the polygon back to the map through the draw control
      if (drawRef.current && pendingFeature) {
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
      onAreaCreated?.(area);
      setPendingFeature(null);

      // Switch back to simple select mode after creation
      if (drawRef.current) {
        drawRef.current.changeMode("simple_select");
      }
    },
    [pendingFeature, onAreaCreated]
  );

  const handleModalClose = useCallback(() => {
    // Don't add the polygon back if user cancels
    setPendingFeature(null);
  }, []);

  return {
    pendingFeature,
    handleModalSubmit,
    handleModalClose,
  };
}
