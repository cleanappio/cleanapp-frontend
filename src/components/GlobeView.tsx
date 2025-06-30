"use client";

import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { FiMenu } from "react-icons/fi";
import { useRouter } from "next/router";
import type { MapRef } from "react-map-gl/mapbox";

export default function GlobeView() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState<"physical" | "digital">(
    "physical"
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef | null>(null);

  const DIGITAL_PROPERTIES = [
    {
      name: "GOOGLE",
      position: [139.6917, 35.6895], // Tokyo
      color: "#4285f4",
      size: 28,
      subsidiaries: [
        {
          name: "YOUTUBE",
          position: [141.2917, 37.1895],
          color: "#ff0000",
          size: 18,
        },
        {
          name: "GMAIL",
          position: [137.9917, 33.8895],
          color: "#ea4335",
          size: 15,
        },
        {
          name: "WAYMO",
          position: [142.3917, 34.2895],
          color: "#34a853",
          size: 12,
        },
        {
          name: "GOOGLE MAPS",
          position: [136.8917, 37.3895],
          color: "#34a853",
          size: 16,
        },
        {
          name: "GOOGLE MEET",
          position: [142.1917, 38.1895],
          color: "#fbbc04",
          size: 14,
        },
      ],
    },
    {
      name: "META",
      position: [-74.006, 40.7128], // New York
      color: "#1877f2",
      size: 25,
      subsidiaries: [
        {
          name: "FACEBOOK",
          position: [-71.506, 42.3128],
          color: "#1877f2",
          size: 20,
        },
        {
          name: "INSTAGRAM",
          position: [-76.406, 38.1128],
          color: "#e4405f",
          size: 18,
        },
        {
          name: "WHATSAPP",
          position: [-71.206, 43.4128],
          color: "#25d366",
          size: 17,
        },
        {
          name: "THREADS",
          position: [-76.806, 37.0128],
          color: "#000000",
          size: 12,
        },
      ],
    },
    {
      name: "ADOBE",
      position: [2.3522, 48.8566], // Paris
      color: "#ff0000",
      size: 20,
    },
    {
      name: "X",
      position: [-122.4194, 37.7749], // San Francisco
      color: "#000000",
      size: 22,
    },
    {
      name: "MICROSOFT",
      position: [0.1278, 51.5074], // London
      color: "#00bcf2",
      size: 30,
      subsidiaries: [
        {
          name: "TEAMS",
          position: [2.8278, 53.1074],
          color: "#464eb8",
          size: 16,
        },
        {
          name: "XBOX",
          position: [-2.4722, 49.9074],
          color: "#107c10",
          size: 18,
        },
        {
          name: "OFFICE 365",
          position: [3.1278, 54.2074],
          color: "#d83b01",
          size: 20,
        },
        {
          name: "LINKEDIN",
          position: [-2.8278, 48.8074],
          color: "#0077b5",
          size: 17,
        },
      ],
    },
    {
      name: "AMAZON",
      position: [-43.1729, -22.9068], // Rio de Janeiro
      color: "#ff9900",
      size: 32,
      subsidiaries: [
        {
          name: "AWS",
          position: [-40.6729, -20.5068],
          color: "#ff9900",
          size: 22,
        },
        {
          name: "PRIME VIDEO",
          position: [-45.5729, -25.3068],
          color: "#00a8e1",
          size: 18,
        },
        {
          name: "ALEXA",
          position: [-40.8729, -25.6068],
          color: "#37c5f0",
          size: 16,
        },
        {
          name: "KINDLE",
          position: [-45.4729, -20.2068],
          color: "#000000",
          size: 14,
        },
      ],
    },
    {
      name: "NETFLIX",
      position: [151.2093, -33.8688], // Sydney
      color: "#e50914",
      size: 24,
    },
    // 10 Additional Companies
    {
      name: "APPLE",
      position: [103.8198, 1.3521], // Singapore
      color: "#007aff",
      size: 35,
      subsidiaries: [
        {
          name: "IPHONE",
          position: [106.3198, 3.8521],
          color: "#007aff",
          size: 25,
        },
        {
          name: "IMAC",
          position: [101.2198, -1.2479],
          color: "#5ac8fa",
          size: 18,
        },
        {
          name: "APPLE TV+",
          position: [106.5198, -1.4479],
          color: "#000000",
          size: 16,
        },
        {
          name: "APP STORE",
          position: [101.1198, 3.6521],
          color: "#007aff",
          size: 20,
        },
      ],
    },
    {
      name: "SPOTIFY",
      position: [18.0686, 59.3293], // Stockholm
      color: "#1db954",
      size: 26,
    },
    {
      name: "UBER",
      position: [-99.1332, 19.4326], // Mexico City
      color: "#000000",
      size: 24,
    },
    {
      name: "TESLA",
      position: [13.405, 52.52], // Berlin
      color: "#cc0000",
      size: 28,
    },
    {
      name: "DISCORD",
      position: [37.6173, 55.7558], // Moscow
      color: "#5865f2",
      size: 22,
    },
    {
      name: "TIKTOK",
      position: [116.4074, 39.9042], // Beijing
      color: "#fe2c55",
      size: 30,
    },
    {
      name: "SLACK",
      position: [-123.1207, 49.2827], // Vancouver
      color: "#4a154b",
      size: 20,
    },
    {
      name: "ZOOM",
      position: [139.6503, 35.6762], // Tokyo (different area)
      color: "#2d8cff",
      size: 22,
    },
    {
      name: "SHOPIFY",
      position: [-75.6972, 45.4215], // Ottawa
      color: "#95bf47",
      size: 23,
    },
    {
      name: "DROPBOX",
      position: [12.4964, 41.9028], // Rome
      color: "#0061ff",
      size: 18,
    },
    {
      name: "FIVERR",
      position: [34.7818, 32.0853], // Tel Aviv
      color: "#1dbf73",
      size: 20,
    },
  ];

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Gray overlay logic
  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map) return;
    if (selectedTab === "digital") {
      if (!map.getSource("gray-overlay")) {
        map.addSource("gray-overlay", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-180, -85],
                  [180, -85],
                  [180, 85],
                  [-180, 85],
                  [-180, -85],
                ],
              ],
            },
          },
        });
        map.addLayer({
          id: "gray-overlay",
          type: "fill",
          source: "gray-overlay",
          paint: { "fill-color": "#666666", "fill-opacity": 1 },
        });
      } else {
        map.setPaintProperty("gray-overlay", "fill-opacity", 1);
        map.setLayoutProperty("gray-overlay", "visibility", "visible");
      }
    } else {
      if (map.getLayer("gray-overlay")) {
        map.setPaintProperty("gray-overlay", "fill-opacity", 0);
        map.setLayoutProperty("gray-overlay", "visibility", "none");
      }
    }
  }, [selectedTab]);

  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map) return;

    // Only works for Mapbox Standard or Standard Satellite styles
    if (selectedTab === "digital") {
      map.setConfigProperty("basemap", "showPlaceLabels", false);
      map.setConfigProperty("basemap", "showRoadLabels", false);
      map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
      map.setConfigProperty("basemap", "showTransitLabels", false);
    } else {
      map.setConfigProperty("basemap", "showPlaceLabels", true);
      map.setConfigProperty("basemap", "showRoadLabels", true);
      map.setConfigProperty("basemap", "showPointOfInterestLabels", true);
      map.setConfigProperty("basemap", "showTransitLabels", true);
    }
  }, [selectedTab]);

  // Digital layers logic
  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map) return;

    // Helper to convert DIGITAL_PROPERTIES to GeoJSON FeatureCollection
    function getDigitalTerritoriesGeoJSON() {
      const features = [];
      for (const company of DIGITAL_PROPERTIES) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: company.position },
          properties: {
            name: company.name,
            color: company.color,
            size: company.size,
            isParent: !!company.subsidiaries,
            parentName: company.name,
          },
        });
        if (company.subsidiaries) {
          for (const sub of company.subsidiaries) {
            features.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: sub.position },
              properties: {
                name: sub.name,
                color: sub.color,
                size: sub.size,
                isParent: false,
                parentName: company.name,
              },
            });
          }
        }
      }
      return { type: "FeatureCollection", features };
    }

    // Add digital-territories source if not present
    if (!map.getSource("digital-territories")) {
      map.addSource("digital-territories", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // Update source data based on mode
    if (selectedTab === "digital") {
      const geojson = getDigitalTerritoriesGeoJSON();
      (map.getSource("digital-territories") as any).setData(geojson);
    } else {
      (map.getSource("digital-territories") as any).setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    // Add digital-nodes layer
    if (!map.getLayer("digital-nodes")) {
      map.addLayer({
        id: "digital-nodes",
        type: "circle",
        source: "digital-territories",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["get", "size"],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.8,
          "circle-stroke-width": [
            "case",
            [
              "in",
              ["get", "name"],
              ["literal", ["GOOGLE", "META", "MICROSOFT", "AMAZON", "APPLE"]],
            ],
            4,
            2,
          ],
          "circle-stroke-color": [
            "case",
            [
              "in",
              ["get", "name"],
              ["literal", ["GOOGLE", "META", "MICROSOFT", "AMAZON", "APPLE"]],
            ],
            "#ffff00",
            "#ffffff",
          ],
          "circle-stroke-opacity": 0.8,
        },
      });
    }

    // Add digital-pulse layer
    if (!map.getLayer("digital-pulse")) {
      map.addLayer({
        id: "digital-pulse",
        type: "circle",
        source: "digital-territories",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["*", ["get", "size"], 1.8],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.3,
        },
      });
    }

    // Add digital-labels layer
    if (!map.getLayer("digital-labels")) {
      map.addLayer({
        id: "digital-labels",
        type: "symbol",
        source: "digital-territories",
        layout: {
          visibility: "none",
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-offset": [0, 3],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": 1.0,
          "text-halo-color": "#000000",
          "text-halo-width": 2,
          "text-halo-blur": 1,
        },
      });
    }

    // Show/hide digital layers based on selectedTab
    const visibility = selectedTab === "digital" ? "visible" : "none";
    ["digital-nodes", "digital-pulse", "digital-labels"].forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });

    // Pulse animation
    let pulseFrame = 0;
    let pulseAnimId: number;
    function animatePulse() {
      const map = mapRef.current && mapRef.current.getMap();
      if (!map) return;
      if (selectedTab === "digital" && map.getLayer("digital-pulse")) {
        pulseFrame += 0.05;
        const pulseOpacity = 0.1 + (0.3 * (Math.sin(pulseFrame) + 1)) / 2;
        map.setPaintProperty("digital-pulse", "circle-opacity", pulseOpacity);
      }
      pulseAnimId = requestAnimationFrame(animatePulse);
    }
    if (selectedTab === "digital") animatePulse();
    return () => {
      if (pulseAnimId) cancelAnimationFrame(pulseAnimId);
    };
  }, [selectedTab]);

  // Digital click/hover handlers
  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map) return;
    function onNodeClick(e: any) {
      if (!map) return;
      const feature = e.features[0];
      const companyName = feature.properties.parentName;
      const isParent = feature.properties.isParent;
      // Implement your expand/collapse logic here
      // Example: toggle expandedCompanies state
    }
    function setPointer() {
      if (map) map.getCanvas().style.cursor = "pointer";
    }
    function unsetPointer() {
      if (map) map.getCanvas().style.cursor = "";
    }
    if (map?.getLayer("digital-nodes")) {
      map.on("click", "digital-nodes", onNodeClick);
      map.on("mouseenter", "digital-nodes", setPointer);
      map.on("mouseleave", "digital-nodes", unsetPointer);
    }
    if (map?.getLayer("digital-pulse")) {
      map.on("click", "digital-pulse", onNodeClick);
      map.on("mouseenter", "digital-pulse", setPointer);
      map.on("mouseleave", "digital-pulse", unsetPointer);
    }
    return () => {
      if (!map) return;
      if (map?.getLayer("digital-nodes")) {
        map.off("click", "digital-nodes", onNodeClick);
        map.off("mouseenter", "digital-nodes", setPointer);
        map.off("mouseleave", "digital-nodes", unsetPointer);
      }
      if (map?.getLayer("digital-pulse")) {
        map.off("click", "digital-pulse", onNodeClick);
        map.off("mouseenter", "digital-pulse", setPointer);
        map.off("mouseleave", "digital-pulse", unsetPointer);
      }
    };
  }, [selectedTab]);

  return (
    <div className="flex flex-col h-screen relative">
      <main className="mainStyle">
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/standard-satellite"
          projection="globe"
          maxZoom={30}
          minZoom={1}
          antialias={true}
        ></Map>
      </main>

      {/* Logo */}
      <div className="absolute top-2 left-2 p-2">
        <Link href="/" className="flex items-center">
          <Image
            src="/cleanapp-logo.png"
            alt="CleanApp Logo"
            width={200}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Right side menu */}
      <div className="absolute top-4 right-4 flex flex-col items-end">
        <button
          className="p-3 bg-gray-800 rounded-md"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <FiMenu className="text-gray-300" size={24} />
        </button>

        <div
          ref={menuRef}
          className={`px-3 py-2 bg-gray-900 rounded-md mt-2 flex flex-col gap-2 transition-all duration-300 ${
            isMenuOpen ? "block" : "hidden"
          }`}
        >
          {[
            "Install",
            "Subscribe",
            "History",
            "CleanAppMap",
            "CleanAppGPT",
            "STXN",
          ].map((item) => {
            return (
              <p
                key={item}
                className="text-gray-300 cursor-pointer px-4 py-2 hover:bg-gray-800 rounded-md"
              >
                {item.toUpperCase()}
              </p>
            );
          })}
        </div>
      </div>

      {/* Center menu */}
      <div className="absolute left-1/2 -translate-x-1/2 p-2">
        <div className="flex gap-2 rounded-full bg-black text-gray-400 p-1 border border-gray-500">
          <p
            className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
              selectedTab === "physical"
                ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedTab("physical")}
          >
            PHYSICAL
          </p>
          <p
            className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
              selectedTab === "digital"
                ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedTab("digital")}
          >
            DIGITAL
          </p>
        </div>
      </div>

      {/* Latest Reports */}
      <div className="absolute left-4 bottom-20 p-2">
        {/* Create translucent div with a gradient */}
        <div className="w-full h-full bg-gradient-to-b from-[#333333] to-black text-white px-3 py-2 border border-slate-400 rounded-lg text-center">
          <p className="text-slate-300">Latest Reports</p>

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              onClick={() => router.push("/cleanapppro")}
              className="flex flex-col gap-1 text-sm border border-slate-600 p-2 rounded-md mt-2 items-start text-slate-300 cursor-pointer"
            >
              <p>Google Ads Bug, 12 seconds ago</p>
              <p className="text-xs">San Francisco, CA</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
