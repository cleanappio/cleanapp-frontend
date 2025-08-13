"use client";

import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { FiMenu } from "react-icons/fi";
import { useRouter } from "next/router";
import type { MapRef } from "react-map-gl/mapbox";
import CleanAppProModal from "./CleanAppProModal";
import LatestReports from "./LatestReports";
import {
  getBrandNameDisplay,
  getColorByValue,
  stringToLatLonColor,
} from "@/lib/util";
import {
  useTranslations,
  getCurrentLocale,
  filterAnalysesByLanguage,
} from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import { MAX_REPORTS_LIMIT } from "@/constants/app_constants";

// Type for report data
export interface Report {
  seq: number;
  timestamp: string;
  id: string;
  latitude: number;
  longitude: number;
  image?: number[] | string | null; // Report image as bytes array, URL string, or null
}

// Type for report analysis
export interface ReportAnalysis {
  seq?: number;
  source?: string;
  analysis_text?: string;
  analysis_image?: number[] | string | null; // Can be bytes array, URL string, or null
  title?: string;
  description?: string;
  litter_probability?: number;
  hazard_probability?: number;
  digital_bug_probability?: number;
  severity_level: number;
  summary?: string;
  language?: string;
  brand_name?: string; // Optional brand name
  brand_display_name?: string; // Optional brand display name
  classification: "physical" | "digital";
  created_at?: string;
  updated_at?: string;
}

// Type for report with multiple analyses
export interface ReportWithAnalysis {
  report: Report;
  analysis: ReportAnalysis[];
}

// Responsive hook for mobile detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// Check if embedded mode is enabled
const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

export default function GlobeView() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const router = useRouter();
  const { t } = useTranslations();

  const isMobile = useIsMobile();

  const [selectedTab, setSelectedTab] = useState<"physical" | "digital">(
    "physical"
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCleanAppProOpen, setIsCleanAppProOpen] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<ReportWithAnalysis | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef | null>(null);

  const [latestReports, setLatestReports] = useState<ReportWithAnalysis[]>([]);
  const [latestReportsWithAnalysis, setLatestReportsWithAnalysis] = useState<
    ReportWithAnalysis[]
  >([]);
  const [reportsWithAnalysisLoading, setReportsWithAnalysisLoading] =
    useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      // Try to get location with different options
      const getLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("Location obtained:", position.coords);
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationLoading(false);
          },
          (error) => {
            console.log("Geolocation error:", error.code, error.message);

            // Try with less restrictive options if first attempt fails
            if (
              error.code === error.POSITION_UNAVAILABLE ||
              error.code === error.TIMEOUT
            ) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log(
                    "Location obtained with fallback options:",
                    position.coords
                  );
                  setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  });
                  setLocationLoading(false);
                },
                (fallbackError) => {
                  console.log(
                    "Fallback geolocation also failed:",
                    fallbackError.message
                  );
                  setLocationLoading(false);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 15000,
                  maximumAge: 600000, // 10 minutes
                }
              );
            } else {
              setLocationLoading(false);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        );
      };

      // Check if geolocation is available and not blocked
      if (navigator.permissions) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((result) => {
            if (result.state === "granted") {
              getLocation();
            } else if (result.state === "prompt") {
              getLocation(); // Will prompt user
            } else {
              console.log("Geolocation permission denied");
              setLocationLoading(false);
            }
          })
          .catch(() => {
            // Fallback if permissions API is not supported
            getLocation();
          });
      } else {
        // Fallback if permissions API is not supported
        getLocation();
      }
    } else {
      console.log("Geolocation not supported");
      setLocationLoading(false);
    }
  }, []);

  // Pan to user location when it becomes available
  useEffect(() => {
    if (userLocation && mapLoaded && mapRef.current) {
      console.log("Flying to user location:", userLocation);

      // Try using the MapRef's flyTo method first
      try {
        mapRef.current.flyTo({
          center: [userLocation.longitude, userLocation.latitude],
          zoom: mapRef.current.getMap()?.getZoom() || 2.5,
          duration: 2000,
        });
      } catch (error) {
        console.log("MapRef flyTo failed, trying map.flyTo:", error);

        // Fallback to using the map instance directly
        const map = mapRef.current.getMap();
        if (map) {
          map.flyTo({
            center: [userLocation.longitude, userLocation.latitude],
            zoom: map.getZoom() || 2.5,
            duration: 2000,
            essential: true,
          });
        }
      }
    }
  }, [userLocation, mapLoaded]);

  // Add report pins to the map when reports are loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && latestReports.length > 0) {
      const map = mapRef.current.getMap();
      if (map) {
        // Create GeoJSON data from reports
        const reportFeatures = latestReports.map((report, index) => {
          const locale = getCurrentLocale();
          const reportAnalysis = report.analysis.find(
            (analysis) => analysis.language === locale
          );

          // Default value to digital lat, lon
          var latitude = 0,
            longitude = 0,
            color = "",
            title = "";

          const isDigital = reportAnalysis?.classification === "digital";

          if (isDigital) {
            const { brandName, brandDisplayName } =
              getBrandNameDisplay(reportAnalysis);
            const {
              lat,
              lon,
              color: brandColor,
            } = stringToLatLonColor(brandName);
            color = brandColor;
            latitude = lat;
            longitude = lon;
            title = `${brandDisplayName} (${report.analysis.length})`;
          }

          if (!isDigital) {
            latitude = report.report.latitude;
            longitude = report.report.longitude;
            title = reportAnalysis?.title ?? "";
          }

          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [longitude, latitude],
            },
            properties: {
              color: isDigital ? color : undefined,
              id: report.report.id,
              seq: report.report.seq,
              title: title,
              index: index,
              severity: reportAnalysis?.severity_level ?? 0.0,
              classification: reportAnalysis?.classification ?? "physical",
            },
          };
        });

        // Filter reports by classification (physical or digital) and add to the map
        const reportGeoJSON = {
          type: "FeatureCollection" as const,
          features: reportFeatures.filter(
            (report) => report.properties.classification === selectedTab
          ),
        };

        // Add source if it doesn't exist
        if (!map.getSource("reports")) {
          map.addSource("reports", {
            type: "geojson",
            data: reportGeoJSON,
          });
        } else {
          // Update existing source
          (map.getSource("reports") as any).setData(reportGeoJSON);
        }

        // Add layer if it doesn't exist
        if (!map.getLayer("report-pins")) {
          map.addLayer({
            id: "report-pins",
            type: "circle",
            source: "reports",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "severity"],
                0.0,
                6.6,
                0.9,
                13.2,
              ],
              "circle-color": [
                "case",
                ["==", ["get", "classification"], "digital"],
                ["get", "color"],
                [
                  "interpolate",
                  ["linear"],
                  ["get", "severity"],
                  0.0,
                  getColorByValue(0.0), // green for low severity
                  0.5,
                  getColorByValue(0.5), // yellow for medium severity
                  0.9,
                  getColorByValue(0.9), // red for high severity
                ],
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
        // Define click handler function
        const handleReportPinClick = (e: any) => {
          if (e.features && e.features[0]) {
            const feature = e.features[0];
            const reportIndex = feature.properties?.index;
            if (reportIndex !== undefined && latestReports[reportIndex]) {
              const analysis = latestReports[reportIndex].analysis;
              if (selectedTab === "digital" && analysis.length > 1) {
                const { brandName } = getBrandNameDisplay(analysis[0]);

                if (brandName === "other") {
                  console.log("ignoring other report");
                  e.preventDefault();
                  return;
                }
              }

              setSelectedReport(latestReports[reportIndex]);
              flyToReport(latestReports[reportIndex]);
              setIsCleanAppProOpen(true);
            }
          }
        };

        // Define hover handler functions
        const handleMouseEnter = () => {
          if (selectedTab === "physical") {
            map.getCanvas().style.cursor = "pointer";
          }
        };

        const handleMouseLeave = () => {
          map.getCanvas().style.cursor = "";
        };

        // Remove existing event listeners first
        map.off("click", "report-pins", handleReportPinClick);
        map.off("mouseenter", "report-pins", handleMouseEnter);
        map.off("mouseleave", "report-pins", handleMouseLeave);

        // Add click handler for report pins
        map.on("click", "report-pins", handleReportPinClick);

        // Add hover effects
        map.on("mouseenter", "report-pins", handleMouseEnter);
        map.on("mouseleave", "report-pins", handleMouseLeave);

        // Cleanup function to remove event listeners
        return () => {
          map.off("click", "report-pins", handleReportPinClick);
          map.off("mouseenter", "report-pins", handleMouseEnter);
          map.off("mouseleave", "report-pins", handleMouseLeave);
        };
      }
    }
  }, [mapLoaded, latestReports, selectedTab]);

  // Handle new report from WebSocket
  const handleNewReport = useCallback(
    (reportWithAnalysis: ReportWithAnalysis) => {
      if (!mapRef.current) {
        console.error("mapRef not found");
        return;
      }

      const map = mapRef.current.getMap();
      if (!map) {
        console.error("map not found");
        return;
      }

      const report = reportWithAnalysis.report;
      const analysis = reportWithAnalysis.analysis;
      const severity_level = analysis[0].severity_level;
      const classification = analysis[0].classification;
      const isPhysical = classification === "physical";
      const locale = getCurrentLocale();
      const reportAnalysis = analysis.find(
        (analysis) => analysis.language === locale
      );
      if (!reportAnalysis) {
        console.error("No report analysis found");
        return;
      }
      const { brandName } = getBrandNameDisplay(reportAnalysis);
      const { lat, lon } = stringToLatLonColor(brandName);
      const latLon: [number, number] = isPhysical
        ? [report.longitude, report.latitude]
        : [lon, lat];

      if (classification !== selectedTab) {
        console.log(
          "Skipping report with classification:",
          classification,
          "selectedTab:",
          selectedTab
        );
        return;
      }
      if (!isEmbeddedMode) {
        map.flyTo({
          center: latLon,
          zoom: map.getZoom() || 2.5,
          duration: 2000,
          essential: true,
        });
      }
      // Create a temporary animated pin for the new report
      const animatedPinId = `animated-pin-${report.seq}`;

      // Add animated pin source
      if (!map.getSource(animatedPinId)) {
        map.addSource(animatedPinId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: latLon,
                },
                properties: {
                  severity: severity_level || 1,
                },
              },
            ],
          },
        });
      }

      // Add animated pin layer
      if (!map.getLayer(animatedPinId)) {
        map.addLayer({
          id: animatedPinId,
          type: "circle",
          source: animatedPinId,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "severity"],
              0.0,
              6.6,
              0.9,
              13.2,
            ],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "severity"],
              0.0,
              getColorByValue(0.0),
              0.5,
              getColorByValue(0.5),
              0.9,
              getColorByValue(0.9),
            ],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.9,
          },
        });
      }

      // Animate the pin for 10 seconds
      let startTime = Date.now();
      const animationDuration = 10000; // 10 seconds

      function animatePin() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Create pulsing effect (expand/shrink)
        const pulseScale = 1 + 0.8 * Math.sin(progress * Math.PI * 10); // 5 complete cycles
        const baseRadius = severity_level && severity_level >= 3 ? 13.2 : 6.6;
        const currentRadius = baseRadius * pulseScale;

        // Update the pin radius
        map.setPaintProperty(animatedPinId, "circle-radius", currentRadius);

        // Continue animation if not finished
        if (progress < 1) {
          requestAnimationFrame(animatePin);
        } else {
          // Remove the animated pin after animation completes
          if (map.getLayer(animatedPinId)) {
            map.removeLayer(animatedPinId);
          }
          if (map.getSource(animatedPinId)) {
            map.removeSource(animatedPinId);
          }

          if (selectedTab === "physical") {
            addReportPinToMap(reportWithAnalysis);
          }
        }
      }

      // Start the animation
      requestAnimationFrame(animatePin);
    },
    [selectedTab]
  );

  // Helper function to add a single report pin to the map
  const addReportPinToMap = (reportWithAnalysis: ReportWithAnalysis) => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const report = reportWithAnalysis.report;
    const analysis = reportWithAnalysis.analysis;
    const locale = getCurrentLocale();
    const reportAnalysis = analysis.find(
      (analysis) => analysis.language === locale
    );
    const severity_level = reportAnalysis?.severity_level;
    const title = reportAnalysis?.title;

    // Get current reports data
    const currentSource = map.getSource("reports") as any;
    if (!currentSource) return;

    const currentData = currentSource._data || {
      type: "FeatureCollection",
      features: [],
    };

    // Create new feature for this report
    const newFeature = {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [report.longitude, report.latitude],
      },
      properties: {
        id: report.id,
        seq: report.seq,
        title: title,
        severity: severity_level || 0,
        index: currentData.features.length, // Add to end of list
      },
    };

    // Add new feature to existing data
    const updatedData = {
      ...currentData,
      features: [...currentData.features, newFeature],
    };

    // Update the source with new data
    currentSource.setData(updatedData);
  };

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

  // Digital layers logic
  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map) return;

    // Helper to convert DIGITAL_PROPERTIES to GeoJSON FeatureCollection
    function getDigitalTerritoriesGeoJSON() {
      const features = [];
      const digitalReports = latestReports.filter(
        (report) => report.analysis[0].classification === "digital"
      );

      // Define interface for company object
      interface CompanyData {
        name: string;
        position: number[];
        color: string;
        size: number;
        subsidiaries: any[];
      }

      // Group reports by brand name
      const reportsByBrand: Record<string, ReportWithAnalysis[]> = {};
      const locale = getCurrentLocale();
      digitalReports.forEach((report) => {
        const reportAnalysis = report.analysis.find(
          (analysis) => analysis.language === locale
        );
        if (!reportAnalysis) {
          console.error("No report analysis found");
          return;
        }
        const { brandName } = getBrandNameDisplay(reportAnalysis);
        if (!reportsByBrand[brandName]) {
          reportsByBrand[brandName] = [];
        }
        reportsByBrand[brandName].push(report);
      });

      // Convert to array with one entry per brand
      const digitalReportsByBrand: CompanyData[] = Object.entries(
        reportsByBrand
      ).map(([brandName, reports]) => {
        const { lat, lon, color } = stringToLatLonColor(brandName);
        const reportAnalysis = reports[0].analysis.find(
          (analysis) => analysis.language === locale
        );

        const { brandDisplayName } = getBrandNameDisplay(
          reportAnalysis || reports[0].analysis[0]
        );
        const reportCount = reports.length;

        // Calculate size based on report count
        let size = 10;
        if (reportCount >= 50) {
          size += 5;
        } else if (reportCount >= 3) {
          size += 3;
        } else if (reportCount >= 2) {
          size += 2;
        }

        return {
          name: `${brandDisplayName} (${reportCount})`,
          position: [lon, lat], // Note: stringToLatLonColor returns {lat, lon} but we need [lon, lat] for GeoJSON
          color: color,
          size: size,
          subsidiaries: [],
        };
      });

      for (const company of digitalReportsByBrand) {
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
  }, [latestReports, selectedTab]);

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

  useEffect(() => {
    // Connect to the WebSocket endpoint
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/listen`
    );

    ws.onopen = function () {
      console.log("=== WebSocket Connected ===");
    };

    ws.onmessage = function (event) {
      const message = JSON.parse(event.data);

      if (message.type === "reports") {
        const batch = message.data;
        const currentLocale = getCurrentLocale();
        const filteredReports = filterAnalysesByLanguage(
          batch.reports || [],
          currentLocale
        );

        // Fly to new report location and animate the pin (if any filtered reports)
        if (
          filteredReports.length > 0 &&
          filteredReports[0].analysis[0] &&
          selectedTab === filteredReports[0].analysis[0].classification
        ) {
          handleNewReport(filteredReports[0]);
        }

        // Add new reports to the top of the list (for displaying on map)
        setLatestReports((prev) => {
          const newReports = filteredReports.map((report) => ({
            report: {
              seq: report.report.seq,
              timestamp: report.report.timestamp,
              id: report.report.id,
              latitude: report.report.latitude,
              longitude: report.report.longitude,
              image: report.report.image,
            },
            analysis: report.analysis,
          }));
          // Remove duplicates by id (keep the newest)
          const seen = new Set();
          const combined = [...newReports, ...prev].filter((item) => {
            const seq = item.report?.seq;
            if (seen.has(seq)) return false;
            seen.add(seq);
            return true;
          });
          return combined;
        });

        // for displaying on Latest Reports modal
        if (
          filteredReports.length > 0 &&
          filteredReports[0].analysis[0] &&
          selectedTab === filteredReports[0].analysis[0].classification
        ) {
          setLatestReportsWithAnalysis((prev) => {
            // const newReports = filteredReports;
            // Remove duplicates by id (keep the newest)

            const newReports = filteredReports.map((report) => ({
              report: {
                seq: report.report.seq,
                timestamp: report.report.timestamp,
                id: report.report.id,
                latitude: report.report.latitude,
                longitude: report.report.longitude,
                image: report.report.image,
              },
              analysis: report.analysis[0],
            }));
            const seen = new Set();
            const combined = [...newReports, ...prev].filter((item) => {
              const seq = item.report?.seq;
              if (seen.has(seq)) return false;
              seen.add(seq);
              return true;
            });
            return combined;
          });
        }
      }
    };

    ws.onclose = function () {
      console.log("Disconnected from report listener");
    };

    ws.onerror = function (error) {
      console.error("WebSocket error:", error);
    };

    // Cleanup on unmount
    return () => {
      console.log("Closing WebSocket connection");
      ws.close();
    };
  }, [handleNewReport, selectedTab]);

  // Fetch last 10 reports on mount
  useEffect(() => {
    async function fetchLastReports() {
      try {
        setReportsWithAnalysisLoading(true);
        const locale = getCurrentLocale();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/last?n=10&lang=${locale}&full_data=true&classification=${selectedTab}`
        );
        if (!res.ok) throw new Error("Failed to fetch last reports");
        const data = await res.json();
        const filteredReports = filterAnalysesByLanguage(
          data.reports || [],
          locale
        );
        setLatestReportsWithAnalysis(filteredReports);
      } catch (err) {
        console.error("Error fetching last reports:", err);
      } finally {
        setReportsWithAnalysisLoading(false);
      }
    }
    fetchLastReports();
  }, [selectedTab]);

  // Fetch lite reports on mount
  useEffect(() => {
    async function fetchLastReports() {
      try {
        const locale = getCurrentLocale();
        const full_data = selectedTab === "digital" ? true : false;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/last?n=${MAX_REPORTS_LIMIT}&lang=${locale}&full_data=${full_data}&classification=${selectedTab}`
        );
        if (!res.ok) throw new Error("Failed to fetch last reports");
        const data = await res.json();
        const filteredReports = filterAnalysesByLanguage(
          data.reports || [],
          locale
        );
        setLatestReports(filteredReports);
        // console.log({ filteredReports });
      } catch (err) {
        console.error("Error fetching last reports:", err);
      } finally {
        setReportsLoading(false);
      }
    }
    fetchLastReports();
  }, [selectedTab]);

  // Add this helper inside GlobeView
  const flyToReport = (reportWithAnalysis: ReportWithAnalysis) => {
    const report = reportWithAnalysis.report;
    const analysis = reportWithAnalysis.analysis;
    const classification = analysis[0].classification;
    const isPhysical = classification === "physical";
    const locale = getCurrentLocale();
    const reportAnalysis = analysis.find(
      (analysis) => analysis.language === locale
    );
    if (!reportAnalysis) {
      console.error("No report analysis found");
      return;
    }
    const { brandName } = getBrandNameDisplay(reportAnalysis);
    const { lat, lon, color } = stringToLatLonColor(brandName);
    const lonLat: [number, number] = isPhysical
      ? [report.longitude, report.latitude]
      : [lon, lat];

    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    map.flyTo({
      center: lonLat,
      zoom: map.getZoom() || 2.5,
      duration: 2000,
      essential: true,
    });
  };

  return (
    <div className="flex flex-col h-screen relative">
      <main className="mainStyle">
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/standard-satellite"
          projection="globe"
          maxZoom={30}
          minZoom={2}
          initialViewState={{
            longitude: 0.0,
            latitude: 0.0,
            zoom: 2.5,
          }}
          onLoad={() => {
            console.log("Map loaded");
            setMapLoaded(true);
          }}
          antialias={true}
          attributionControl={false}
          logoPosition="bottom-right"
        ></Map>
      </main>

      {/* Logo */}
      {!isEmbeddedMode && (
        <div className="absolute top-2 left-4 p-2">
          <Link href="/" className="flex items-center">
            <Image
              src="/cleanapp-sticker-logo.png"
              alt={t("cleanAppLogo")}
              width={200}
              height={60}
              className="h-12 w-auto"
              priority
            />
          </Link>
        </div>
      )}

      {/* Right side menu */}
      {!isEmbeddedMode && (
        <div className="absolute top-4 right-4 flex flex-col items-end">
          <button
            className="p-3 bg-gray-800 rounded-md border border-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <FiMenu className="text-gray-300" size={24} />
          </button>

          <div
            ref={menuRef}
            className={`px-3 py-2 bg-gray-900 rounded-md mt-2 flex flex-col gap-1 transition-all duration-300  border border-gray-700 ${
              isMenuOpen ? "block" : "hidden"
            }`}
          >
            {/* Language Switcher */}
            <div className="px-4 py-2">
              <LanguageSwitcher />
            </div>

            {[
              {
                label: t("installAndroid"),
                link: "https://play.google.com/store/apps/details/CleanApp?id=com.cleanapp&hl=ln",
              },
              {
                label: t("installIOS"),
                link: "https://apps.apple.com/ch/app/cleanapp/id6466403301?l=en-GB",
              },
              { label: t("subscribe"), link: "/pricing" },
              {
                label: t("brandDashboard"),
                link: "/redbull",
              },
              {
                label: t("cleanAppMap"),
                link: "https://cleanappmap.replit.app",
              },
              {
                label: t("cleanAppGPT"),
                link: "https://chatgpt.com/g/g-xXwTp3jI5-cleanapp",
              },
              { label: "STXN", link: "https://www.stxn.io" },
            ].map((item) => {
              return (
                <Link
                  key={item.label}
                  href={item.link}
                  className="text-gray-300 font-medium text-sm cursor-pointer px-4 py-2 hover:bg-gray-800 rounded-md"
                  target="_blank"
                >
                  {item.label.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Center menu */}
      <div className="absolute left-1/2 -translate-x-1/2 p-2 mt-2">
        <div className="flex gap-2 rounded-full bg-black text-gray-400 p-2 border border-gray-500">
          <p
            className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
              selectedTab === "physical"
                ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedTab("physical")}
          >
            {t("physical")}
          </p>
          <p
            className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
              selectedTab === "digital"
                ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedTab("digital")}
          >
            {t("digital")}
          </p>
        </div>
      </div>

      {/* Latest Reports - only show when modal is not open and not on mobile */}
      {!isCleanAppProOpen && !isMobile && (
        <LatestReports
          reports={latestReportsWithAnalysis}
          loading={reportsWithAnalysisLoading}
          onReportClick={(report) => {
            setSelectedReport(report);
            setIsCleanAppProOpen(true);
            flyToReport(report);
          }}
          isModalActive={true}
          selectedReport={null}
        />
      )}

      {/* Bottom center logo */}
      {!isEmbeddedMode && (
        <div
          className={`bg-black/10 p-2 text-center text-white text-sm absolute bottom-0 ${
            isMobile ? "right-0 left-0" : "right-1/3 left-1/3"
          } z-10`}
        >
          <Link href={"https://stxn.io/"} target="_blank">
            <div className="flex items-center justify-center gap-2">
              <span>{t("poweredBy")}</span>
              <span>
                <Image
                  src={"/stxn.svg"}
                  alt={"STXN Logo"}
                  width={"24"}
                  height={"24"}
                  style={{ height: "14px", width: "auto" }}
                />
              </span>
              <span className="underline underline-offset-4">
                {"Smart Transactions"}
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* CleanApp Pro Modal */}
      <CleanAppProModal
        isOpen={isCleanAppProOpen}
        onClose={() => setIsCleanAppProOpen(false)}
        report={selectedReport}
        allReports={latestReportsWithAnalysis}
        onReportChange={(report) => {
          setSelectedReport(report);
          flyToReport(report);
        }}
      />
    </div>
  );
}
