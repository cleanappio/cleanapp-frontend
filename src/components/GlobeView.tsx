"use client";

import React, { useEffect, useState, useRef } from "react";
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });
import areaLabels from "../constants/area-labels.json";
import dynamic from "next/dynamic";

interface AreaLabel {
  name: string;
  lat: number;
  lng: number;
  type: "country" | "city";
}

const GlobeView: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cameraDistance, setCameraDistance] = useState(300);
  const globeRef = useRef<any>(null);
  const controlsCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsClient(true);
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsCleanup.current) controlsCleanup.current();
    };
  }, []);

  const handleGlobeReady = () => {
    if (globeRef.current && typeof globeRef.current.controls === "function") {
      const controls = globeRef.current.controls();
      if (controls && typeof controls.addEventListener === "function") {
        const handleChange = () => {
          setCameraDistance(globeRef.current.camera().position.length());
        };
        controls.addEventListener("change", handleChange);
        setCameraDistance(globeRef.current.camera().position.length());
        controlsCleanup.current = () =>
          controls.removeEventListener("change", handleChange);
      }
    }
  };

  if (!isClient) return null;

  // Filter labels based on camera distance
  let filteredLabels;
  if (cameraDistance > 200) {
    filteredLabels = (areaLabels as AreaLabel[]).filter(
      (l) => l.type === "country"
    );
  } else {
    filteredLabels = areaLabels as AreaLabel[];
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a23" }}>
      <Globe
        ref={globeRef}
        onGlobeReady={handleGlobeReady}
        globeImageUrl="/earth-blue-marble.png"
        width={dimensions.width}
        height={dimensions.height}
        labelsData={filteredLabels}
        labelLat={(d) => (d as AreaLabel).lat}
        labelLng={(d) => (d as AreaLabel).lng}
        labelText={(d) => (d as AreaLabel).name}
        labelSize={(d) => ((d as AreaLabel).type === "country" ? 1.2 : 0.7)}
        labelColor={(d) =>
          (d as AreaLabel).type === "country"
            ? "rgba(255,255,255,0.9)"
            : "rgba(255,255,200,0.8)"
        }
        labelDotRadius={(d) =>
          (d as AreaLabel).type === "country" ? 0.5 : 0.2
        }
      />
    </div>
  );
};

export default GlobeView;
