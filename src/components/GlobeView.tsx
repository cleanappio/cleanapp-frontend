"use client";

import Map, { Marker, GeolocateControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { FiMenu, FiSearch, FiX } from "react-icons/fi";
import { useRouter } from "next/router";
import type { MapRef } from "react-map-gl/mapbox";
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
import { CollapsibleLatestReports } from "./CollapsibleLatestReports";

// Define interface for company object
import ReportCounter from "./ReportCounter";
import { useReportTabs } from "@/hooks/useReportTabs";
import { useLiteReportsByTab } from "@/hooks/useLiteReports";
import { ReportTabs } from "@/components/ui/ReportTabs";
import {
  UseLiteReportsByTabReturn,
  useLiteReportsByTabV2,
} from "@/hooks/v2/useLiteReports";
import { ReportResponse } from "@/types/reports/api";
import { DigitalReportResponse } from "@/types/reports/api/digital";
import CleanAppProModalV2 from "./CleanAppProModalV2";
import { PhysicalReportResponse } from "@/types/reports/api/physical";

interface CompanyData {
  name: string;
  position: number[];
  color: string;
  size: number;
  subsidiaries: any[];
}

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
export function useIsMobile() {
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCleanAppProOpen, setIsCleanAppProOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportResponse | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const styleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [latestReports, setLatestReports] = useState<ReportResponse[]>([]);
  const [latestReportsWithAnalysis, setLatestReportsWithAnalysis] = useState<
    ReportWithAnalysis[]
  >([]);

  const [digitalReportsByBrand, setDigitalReportsByBrand] = useState<
    GeoJSON.Feature[]
  >([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef<HTMLInputElement>(null); // Reference to your input field

  // Use the refactored report tabs hook with API calls
  const {
    selectedTab,
    setSelectedTab,
    isPhysical,
    isDigital,
    filteredReports: filteredLatestReports,
    physicalReports,
    digitalReports,
    loading: reportTabsLoading,
    errors: reportTabsErrors,
    fetchPhysicalReports,
    fetchDigitalReports,
    fetchCurrentTabReports,
    appendPhysicalFull,
    appendDigitalFull,
  } = useReportTabs();

  const {
    physicalReports: latestPhysicalReportsV2,
    digitalReports: latestDigitalReportsV2,
    loading: liteLoadingByTabV2,
    appendPhysicalLite: appendPhysicalLiteV2,
    appendDigitalLite: appendDigitalLiteV2,
  } = useLiteReportsByTabV2();

  useEffect(() => {
    console.log("Setting useEffect");
    const handleScroll = () => {
      if (document.activeElement === inputRef.current) {
        console.log("Dismissing keyboard");
        inputRef.current?.blur(); // Dismiss the keyboard
      } else {
        console.log("Not dismissing keyboard");
      }
    };

    const currentListRef = listRef.current as HTMLElement | null;
    if (currentListRef) {
      console.log("Adding scroll listener");
      currentListRef?.addEventListener("scroll", handleScroll);
    } else {
      console.log("No list ref");
    }

    return () => {
      if (currentListRef) {
        currentListRef?.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Safe map access utility function
  const getSafeMap = useCallback(() => {
    if (!mapRef.current || !mapLoaded || !mapStyleLoaded) {
      return null;
    }

    try {
      const map = mapRef.current.getMap();
      if (!map || !map.isStyleLoaded()) {
        return null;
      }
      return map;
    } catch (error) {
      console.warn("Map access error:", error);
      return null;
    }
  }, [mapLoaded, mapStyleLoaded]);

  // Retry mechanism for map operations
  const retryMapOperation = useCallback(
    async <T,>(
      operation: () => T,
      maxRetries: number = 3,
      delay: number = 100
    ): Promise<T | null> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const map = getSafeMap();
          if (map) {
            return operation();
          }

          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.warn(`Map operation attempt ${i + 1} failed:`, error);
          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      return null;
    },
    [getSafeMap]
  );

  // Fly to a lon/lat with retries
  const flyToReport = useCallback(
    ({ lon, lat }: { lon?: number; lat?: number }) => {
      if (!lon || !lat) {
        console.log("Lon or lat is not defined");
        return;
      }

      const lonLat: [number, number] = [lon, lat];

      retryMapOperation(
        () => {
          const map = getSafeMap();
          if (map) {
            map.flyTo({
              center: lonLat,
              zoom: map.getZoom() || 2.5,
              duration: 2000,
              essential: true,
            });
            return true;
          }
          return false;
        },
        3,
        200
      );
    },
    [getSafeMap, retryMapOperation]
  );

  // Safe map source and layer management
  const safeAddSource = (id: string, source: any) => {
    return retryMapOperation(() => {
      const map = getSafeMap();
      if (map && !map.getSource(id)) {
        map.addSource(id, source);
        return true;
      }
      return false;
    });
  };

  const safeAddLayer = (layer: any) => {
    return retryMapOperation(() => {
      const map = getSafeMap();
      if (map && !map.getLayer(layer.id)) {
        map.addLayer(layer);
        return true;
      }
      return false;
    });
  };

  const safeRemoveLayer = (id: string) => {
    return retryMapOperation(() => {
      const map = getSafeMap();
      if (map && map.getLayer(id)) {
        map.removeLayer(id);
        return true;
      }
      return false;
    });
  };

  const safeRemoveSource = (id: string) => {
    return retryMapOperation(() => {
      const map = getSafeMap();
      if (map && map.getSource(id)) {
        map.removeSource(id);
        return true;
      }
      return false;
    });
  };

  // Debug logging for map states
  useEffect(() => {
    if (mapLoaded && mapStyleLoaded) {
      console.log("🎉 Map fully loaded and ready!");
    } else if (mapLoaded) {
      console.log("📊 Map loaded, waiting for style...");
    } else {
      console.log("⏳ Map still loading...");
    }
  }, [mapLoaded, mapStyleLoaded]);

  // Fallback mechanism to check style loading status
  useEffect(() => {
    if (mapLoaded && !mapStyleLoaded && mapRef.current) {
      const checkStyleStatus = () => {
        // Don't check if already loaded
        if (mapStyleLoaded) return;

        try {
          const map = mapRef.current?.getMap();
          if (map && map.isStyleLoaded()) {
            console.log("Fallback: Map style is loaded");
            setMapStyleLoaded(true);
          } else if (map) {
            // Try to check if the map is usable even without style fully loaded
            try {
              const zoom = map.getZoom();
              const center = map.getCenter();
              if (zoom !== undefined && center) {
                console.log(
                  "Fallback: Map appears usable (zoom:",
                  zoom,
                  "center:",
                  center,
                  ")"
                );
                setMapStyleLoaded(true);
                return;
              }
            } catch (e) {
              // Map not ready yet
            }

            console.log("Fallback: Style still loading, retrying in 500ms...");
            setTimeout(checkStyleStatus, 500);
          }
        } catch (error) {
          console.log("Fallback: Error checking style status:", error);
        }
      };

      // Start checking after a short delay
      const timer = setTimeout(checkStyleStatus, 1000);

      // Add a timeout to prevent infinite loading (10 seconds max)
      const timeout = setTimeout(() => {
        if (!mapStyleLoaded) {
          console.warn(
            "Style loading timeout reached, forcing map to be ready"
          );
          setMapStyleLoaded(true);
        }
      }, 10000);

      return () => {
        clearTimeout(timer);
        clearTimeout(timeout);
      };
    }
  }, [mapLoaded, mapStyleLoaded]);

  // Periodic check to ensure map becomes usable
  useEffect(() => {
    if (mapLoaded && !mapStyleLoaded) {
      // Clear any existing interval
      if (styleCheckIntervalRef.current) {
        clearInterval(styleCheckIntervalRef.current);
      }

      styleCheckIntervalRef.current = setInterval(() => {
        // Don't check if already loaded
        if (mapStyleLoaded) {
          if (styleCheckIntervalRef.current) {
            clearInterval(styleCheckIntervalRef.current);
            styleCheckIntervalRef.current = null;
          }
          return;
        }

        try {
          if (mapRef.current) {
            const map = mapRef.current.getMap();
            if (map) {
              // Try to access basic map properties
              try {
                const zoom = map.getZoom();
                const center = map.getCenter();
                if (zoom !== undefined && center) {
                  console.log(
                    "Periodic check: Map is usable (zoom:",
                    zoom,
                    "center:",
                    center,
                    ")"
                  );
                  setMapStyleLoaded(true);
                  return;
                }
              } catch (e) {
                // Map not ready yet
              }

              // Check if style is loaded
              if (map.isStyleLoaded()) {
                console.log("Periodic check: Style is loaded");
                setMapStyleLoaded(true);
                return;
              }
            }
          }
        } catch (error) {
          console.log("Periodic check error:", error);
        }
      }, 1000);

      return () => {
        if (styleCheckIntervalRef.current) {
          clearInterval(styleCheckIntervalRef.current);
          styleCheckIntervalRef.current = null;
        }
      };
    }
  }, [mapLoaded, mapStyleLoaded]);

  // Cleanup effect to clear all intervals and timeouts
  useEffect(() => {
    return () => {
      if (styleCheckIntervalRef.current) {
        clearInterval(styleCheckIntervalRef.current);
        styleCheckIntervalRef.current = null;
      }
    };
  }, []);

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

      // Use safe map access with retry mechanism
      retryMapOperation(
        () => {
          try {
            // Try using the MapRef's flyTo method first
            mapRef.current?.flyTo({
              center: [userLocation.longitude, userLocation.latitude],
              zoom: 2.5,
              duration: 2000,
            });
            return true;
          } catch (error) {
            console.log("MapRef flyTo failed, trying map.flyTo:", error);

            // Fallback to using the map instance directly
            const map = getSafeMap();
            if (map) {
              map.flyTo({
                center: [userLocation.longitude, userLocation.latitude],
                zoom: map.getZoom() || 2.5,
                duration: 2000,
                essential: true,
              });
              return true;
            }
            return false;
          }
        },
        3,
        200
      );
    }
  }, [userLocation, mapLoaded, retryMapOperation, getSafeMap]);

  // Add report pins to the map when reports are loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && latestReports.length > 0) {
      const map = mapRef.current.getMap();
      if (map) {
        // console.log("map", map);
        // Create GeoJSON data from reports
        const reportFeatures = latestReports.map((report, index) => {
          // const locale = getCurrentLocale();
          // const reportAnalysis = report.analysis.find(
          //   (analysis) => analysis.language === locale
          // );

          const classification = report.classification;

          // Default value to digital lat, lon
          var latitude = 0,
            longitude = 0,
            color = "",
            title = "",
            size = 10;

          const isDigital = classification === "digital";
          const isPhysical = classification === "physical";

          if (isPhysical) {
            latitude = report.latitude;
            longitude = report.longitude;
            color = getColorByValue(report.severity_level);
          }

          if (isDigital) {
            const brandName = report.brand_name;
            const brandDisplayName = report.brand_display_name;

            // console.log("brandName", brandName);
            // console.log("brandDisplayName", brandDisplayName);
            const {
              lat,
              lon,
              color: brandColor,
            } = stringToLatLonColor(brandName);
            color = brandColor;
            latitude = lat;
            longitude = lon;
            title = `${brandDisplayName} (${report.total})`;

            const total = report.total;
            // Calculate size based on report count (shared helper)
            const baseSize = 10;
            size = baseSize + computeDigitalSizeIncrement(total);
          }

          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [longitude, latitude],
            },
            properties: {
              color: color,
              seq: isPhysical ? report.seq : undefined,
              title: title,
              index: index,
              severity: isPhysical ? report.severity_level : undefined,
              classification: classification,
              size: size,
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
                "case",
                ["==", ["get", "classification"], "digital"],
                ["get", "size"],
                [
                  "interpolate",
                  ["linear"],
                  ["get", "severity"],
                  0.0,
                  6.6,
                  0.9,
                  13.2,
                ],
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
              const report = latestReports[reportIndex];
              console.log("report clicked", report);
              setSelectedReport(report);

              if (report.classification === "physical") {
                flyToReport({ lon: report.longitude, lat: report.latitude });
              } else {
                const { lat, lon } = stringToLatLonColor(report.brand_name);
                flyToReport({ lon: lon, lat: lat });
              }

              setIsCleanAppProOpen(true);
            }
          }
        };

        // Define hover handler functions
        const handleMouseEnter = () => {
          if (isPhysical) {
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
  }, [isPhysical, mapLoaded, latestReports, selectedTab, flyToReport]);

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
      const severity_level =
        analysis.length > 0 ? analysis[0].severity_level : 0;
      const classification =
        analysis.length > 0 ? analysis[0].classification : "physical";
      const isPhysical = classification === "physical";

      if (analysis.length == 0) {
        // console.error("No report analysis found");
        return;
      }

      const locale = getCurrentLocale();
      let reportAnalysis = analysis.find(
        (analysis) => analysis.language === locale
      );
      if (!reportAnalysis) {
        // console.error("No report analysis with current locale found");
        reportAnalysis = analysis[0];
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
      if (!isEmbeddedMode && isPhysical) {
        map.flyTo({
          center: latLon,
          zoom: map.getZoom() || 2.5,
          duration: 2000,
          essential: true,
        });
      }

      // TODO: Update latestReports state to include the new report
      // setLatestReports((prev) => {
      //   const newReports = [reportWithAnalysis, ...prev];
      //   return newReports;
      // });

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

          if (isPhysical) {
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
    if (!currentSource) {
      console.error("❌ Reports source not found when adding new pin");
      return;
    }

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
        index: 0, // New reports are added at index 0
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
    if (isDigital) {
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
  }, [selectedTab, isDigital]);

  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map || !mapLoaded || !mapStyleLoaded) return;

    // Only works for Mapbox Standard or Standard Satellite styles
    if (isDigital) {
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
  }, [isDigital, mapLoaded, mapStyleLoaded]);

  // Digital layers logic
  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map || !mapLoaded || !mapStyleLoaded) return;

    // Helper to convert DIGITAL_PROPERTIES to GeoJSON FeatureCollection
    function getDigitalTerritoriesGeoJSON() {
      const features = [];
      const digitalReports = latestReports.filter(
        (report) => report.classification === "digital"
      );

      for (const report of digitalReports) {
        const brandName = report.brand_name;
        const brandDisplayName = report.brand_display_name;
        const total = report.total;

        // Calculate size based on report count (shared helper)
        let size = 10 + computeDigitalSizeIncrement(total);

        const { lat, lon, color } = stringToLatLonColor(brandName);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: {
            name: `${brandDisplayName} (${total})`,
            color: color,
            size: size,
            isParent: false,
            parentName: brandName,
          },
        });
      }
      setDigitalReportsByBrand(features as GeoJSON.Feature[]);
      return { type: "FeatureCollection", features };
    }

    if (!mapLoaded || !mapStyleLoaded) return;

    // Add digital-territories source if not present
    if (!map.getSource("digital-territories")) {
      map.addSource("digital-territories", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // Update source data based on mode
    if (isDigital) {
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
    const visibility = isDigital ? "visible" : "none";
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
      if (!map || !mapLoaded || !mapStyleLoaded) return;
      if (isDigital && map.getLayer("digital-pulse")) {
        pulseFrame += 0.05;
        const pulseOpacity = 0.1 + (0.3 * (Math.sin(pulseFrame) + 1)) / 2;
        map.setPaintProperty("digital-pulse", "circle-opacity", pulseOpacity);
      }
      pulseAnimId = requestAnimationFrame(animatePulse);
    }
    if (isDigital) animatePulse();
    return () => {
      if (pulseAnimId) cancelAnimationFrame(pulseAnimId);
    };
  }, [isDigital, latestReports, mapLoaded, mapStyleLoaded, selectedTab]);

  useEffect(() => {
    console.log("Sidemenu state changed:", isMenuOpen);
  }, [isMenuOpen]);

  // Digital click/hover handlers
  useEffect(() => {
    const map = mapRef.current && mapRef.current.getMap();
    if (!map || !mapLoaded || !mapStyleLoaded) return;
    function onNodeClick(e: any) {
      if (!map) return;
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];
      const brandName = feature.properties?.parentName;
      if (!brandName) return;

      const report = latestReports.find(
        (r) => r.classification === "digital" && r.brand_name === brandName
      ) as unknown as DigitalReportResponse | undefined;

      if (!report) return;

      setSelectedReport(report as unknown as ReportResponse);
      const { lat, lon } = stringToLatLonColor(
        (report as DigitalReportResponse).brand_name
      );
      flyToReport({ lon: lon, lat: lat });
      setIsCleanAppProOpen(true);
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
    if (map?.getLayer("digital-labels")) {
      map.on("click", "digital-labels", onNodeClick);
      map.on("mouseenter", "digital-labels", setPointer);
      map.on("mouseleave", "digital-labels", unsetPointer);
    }
    if (map?.getLayer("digital-pulse")) {
      map.on("click", "digital-pulse", onNodeClick);
      map.on("mouseenter", "digital-pulse", setPointer);
      map.on("mouseleave", "digital-pulse", unsetPointer);
    }
    return () => {
      if (!map || !mapLoaded || !mapStyleLoaded) return;
      if (map?.getLayer("digital-nodes")) {
        map.off("click", "digital-nodes", onNodeClick);
        map.off("mouseenter", "digital-nodes", setPointer);
        map.off("mouseleave", "digital-nodes", unsetPointer);
      }
      if (map?.getLayer("digital-labels")) {
        map.off("click", "digital-labels", onNodeClick);
        map.off("mouseenter", "digital-labels", setPointer);
        map.off("mouseleave", "digital-labels", unsetPointer);
      }
      if (map?.getLayer("digital-pulse")) {
        map.off("click", "digital-pulse", onNodeClick);
        map.off("mouseenter", "digital-pulse", setPointer);
        map.off("mouseleave", "digital-pulse", unsetPointer);
      }
    };
  }, [mapLoaded, mapStyleLoaded, selectedTab, latestReports, flyToReport]);

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

        // Append into lite arrays used by map (physical/digital) and into full arrays used by list
        const toAppend = filteredReports.map((report) => ({
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

        if (
          toAppend.length > 0 &&
          toAppend[0].analysis &&
          toAppend[0].analysis[0] &&
          toAppend[0].analysis[0].classification
        ) {
          const classification = toAppend[0].analysis[0].classification;
          if (classification === "physical") {
            // Update lite arrays for map
            appendPhysicalLiteV2(toAppend as any);
            // Update full arrays for list
            appendPhysicalFull(toAppend);
          } else {
            appendDigitalLiteV2(toAppend as any);
            appendDigitalFull(toAppend);
          }
        }

        // Update LatestReportsWithAnalysis only when the classification matches current tab
        if (
          filteredReports.length > 0 &&
          filteredReports[0].analysis[0] &&
          selectedTab === filteredReports[0].analysis[0].classification
        ) {
          setLatestReportsWithAnalysis((prev) => {
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
            const seen = new Set<number>();
            const combined = [...newReports, ...prev].filter((item) => {
              const seq = item.report?.seq as number;
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
    // Empty deps: WebSocket should only connect once, refs are used for latest values
  }, []);

  // Fetch reports when tab changes using the hook
  useEffect(() => {
    // Fetch a small number for the list to keep UI responsive
    fetchCurrentTabReports(10);
  }, [selectedTab, fetchCurrentTabReports]);

  // Update list content from hook's filtered reports
  useEffect(() => {
    setLatestReportsWithAnalysis(filteredLatestReports);
  }, [filteredLatestReports]);

  // Update map content from lite reports based on selected tab, immediately available
  useEffect(() => {
    setLatestReports(
      selectedTab === "physical"
        ? latestPhysicalReportsV2
        : latestDigitalReportsV2
    );
  }, [selectedTab, latestPhysicalReportsV2, latestDigitalReportsV2]);

  // Removed inline fetch; using hook-based fetching instead

  // (moved) flyToReport defined above

  // Shared helper for digital size increment based on total count
  const computeDigitalSizeIncrement = (total?: number) => {
    if (!total || total < 2) return 0;
    if (total >= 50) return 5;
    if (total >= 3) return 3;
    return 2;
  };

  return (
    <div className="flex flex-col h-svh relative">
      {/* Map Loading Indicator */}
      {(!mapLoaded || !mapStyleLoaded) && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-medium">
              {!mapLoaded ? "Loading map..." : "Loading map style..."}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              Please wait while we prepare your map
            </p>
          </div>
        </div>
      )}

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

            // Immediately check if style is already loaded
            if (mapRef.current && !mapStyleLoaded) {
              const map = mapRef.current.getMap();
              if (map && map.isStyleLoaded()) {
                console.log("Style already loaded in onLoad");
                setMapStyleLoaded(true);
              } else {
                console.log("Style not loaded yet in onLoad");
              }
            }
          }}
          onStyleData={() => {
            if (mapRef.current && !mapStyleLoaded) {
              const map = mapRef.current.getMap();
              if (map && map.isStyleLoaded()) {
                console.log("Map style fully loaded");
                setMapStyleLoaded(true);
              } else {
                // console.log(
                //   "Style data received but style not fully loaded yet"
                // );
              }
            } else if (mapRef.current) {
              // Style already loaded, just log once
              // console.log("Style data received (already loaded)");
            } else {
              // console.log("map ref not found in onStyleData");
            }
          }}
          onError={(error) => {
            console.error("Map error:", error);
            // Try to recover from map errors
            if (
              error.error &&
              error.error.message === "Style is not done loading"
            ) {
              console.log("Recovering from style loading error...");
              // The style will continue loading, so we just need to wait
            }
          }}
          antialias={true}
          attributionControl={false}
          logoPosition="bottom-right"
        >
          {/* Mapbox Geolocate Control - Only show in physical reports */}
          {selectedTab === "physical" && (
            <GeolocateControl
              position="top-right"
              positionOptions={{
                enableHighAccuracy: true,
              }}
              trackUserLocation={true}
              showUserHeading={true}
              onError={(error) => {
                console.error("Mapbox geolocate error:", error);
                setLocationLoading(false);
              }}
              style={{
                marginTop: "80px",
                marginRight: "25px",
              }}
            />
          )}

          {/* User Location Marker - Only show in physical reports */}
          {selectedTab === "physical" && userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full border border-white shadow-lg"></div>
            </Marker>
          )}
        </Map>
      </main>

      {/* Logo */}
      {!isEmbeddedMode && (
        <div className="absolute top-2 left-0 sm:left-4 p-2">
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

      {!isMobile && isDigital && (
        <div className="absolute top-4 right-20 flex flex-col gap-4 w-48 lg:w-80 xl:w-96  max-w-48 lg:max-w-80 xl:max-w-96">
          <button
            className="p-3 bg-gray-800 rounded-md border border-gray-700 flex items-center gap-2"
            onClick={() => {
              // setIsMenuOpen(!isMenuOpen)
            }}
          >
            <FiSearch className="text-gray-300 w-6" size={24} />
            <input
              type="text"
              placeholder="Search"
              className="bg-gray-800 border-none focus:outline-none focus:border-b-2 text-white flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchQuery && (
              <FiX
                className="text-gray-300 w-6"
                size={24}
                onClick={() => setSearchQuery("")}
              />
            )}
          </button>

          {searchQuery && (
            <div className="flex flex-col items-start bg-gray-800 overflow-y-scroll max-h-80">
              {digitalReportsByBrand
                .filter((company: GeoJSON.Feature) =>
                  company.properties?.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
                )
                .map((company: GeoJSON.Feature) => (
                  <button
                    key={company.properties?.name}
                    className="p-3 bg-gray-800 border border-gray-700 text-left text-gray-200 hover:bg-gray-900 w-full"
                    onClick={() => {
                      setSearchQuery("");

                      const lonLat: [number, number] = [
                        company.geometry.type === "Point"
                          ? company.geometry.coordinates[0]
                          : 0,
                        company.geometry.type === "Point"
                          ? company.geometry.coordinates[1]
                          : 0,
                      ];

                      retryMapOperation(
                        () => {
                          const map = getSafeMap();
                          if (map) {
                            map.flyTo({
                              center: lonLat,
                              zoom: 5.5,
                              duration: 2000,
                              essential: true,
                            });
                            return true;
                          }
                          return false;
                        },
                        3,
                        200
                      );
                    }}
                  >
                    <p className="line-clamp-1">{company.properties?.name}</p>
                  </button>
                ))}
            </div>
          )}

          {searchQuery &&
            digitalReportsByBrand.filter((company: GeoJSON.Feature) =>
              company.properties?.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="bg-gray-800 -mt-4">
                <p className="p-3 text-gray-400">No results found</p>
              </div>
            )}
        </div>
      )}

      {isDigital && isMobileSearchOpen && (
        <div className="absolute top-0 bottom-0 left-0 right-0 flex flex-col items-start gap-4 z-50 bg-gray-800">
          <div className="top-0 right-0 absolute p-2">
            <FiX
              className="text-gray-300 w-6"
              size={24}
              onClick={() => setIsMobileSearchOpen(false)}
            />
          </div>

          <div className="w-full flex mt-12">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search"
              className="bg-gray-800 focus:outline-none focus:border-b-2 text-white w-full border border-gray-400 py-2 px-4 mx-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery && (
            <div
              ref={listRef}
              className="flex flex-col items-start bg-gray-800 overflow-y-scroll max-h-svh w-full"
            >
              {digitalReportsByBrand
                .filter((company: GeoJSON.Feature) =>
                  company.properties?.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
                )
                .map((company: GeoJSON.Feature) => (
                  <button
                    key={company.properties?.name}
                    className="p-3 bg-gray-800 border border-gray-700 text-left text-gray-200 hover:bg-gray-900 w-full"
                    onClick={() => {
                      setSearchQuery("");
                      setIsMobileSearchOpen(false);

                      const lonLat: [number, number] = [
                        company.geometry.type === "Point"
                          ? company.geometry.coordinates[0]
                          : 0,
                        company.geometry.type === "Point"
                          ? company.geometry.coordinates[1]
                          : 0,
                      ];

                      retryMapOperation(
                        () => {
                          const map = getSafeMap();
                          if (map) {
                            map.flyTo({
                              center: lonLat,
                              zoom: 5.5,
                              duration: 2000,
                              essential: true,
                            });
                            return true;
                          }
                          return false;
                        },
                        3,
                        200
                      );
                    }}
                  >
                    <p className="line-clamp-1">{company.properties?.name}</p>
                  </button>
                ))}
            </div>
          )}

          {searchQuery &&
            digitalReportsByBrand.filter((company: GeoJSON.Feature) =>
              company.properties?.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="bg-gray-800 -mt-4">
                <p className="p-3 text-gray-400">No results found</p>
              </div>
            )}
        </div>
      )}

      {selectedTab === "digital" && isMobile && (
        <div className="absolute bottom-12 right-4">
          <button
            className="p-3 bg-gray-800 rounded-md border border-gray-700 flex items-center gap-2"
            onClick={() => {
              setIsMobileSearchOpen((prev) => !prev);
            }}
          >
            <FiSearch className="text-gray-300 w-6" size={24} />
          </button>
        </div>
      )}

      {/* Right side menu */}
      {!isEmbeddedMode && (
        <div className="absolute top-4 right-4 flex flex-col items-end">
          <button
            className="p-3 bg-gray-800 rounded-md border border-gray-700"
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
            }}
          >
            <FiMenu className="text-gray-300" size={24} />
          </button>

          <div
            ref={menuRef}
            className={`px-3 py-2 bg-gray-900 rounded-md mt-4 flex flex-col gap-1 transition-all duration-300  border border-gray-700 ${
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
          <ReportTabs selectedTab={selectedTab} onTabChange={setSelectedTab} />
        </div>
      </div>

      {/* Latest Reports - only show when modal is not open and not on mobile */}
      <CollapsibleLatestReports
        reports={latestReportsWithAnalysis}
        loading={
          reportTabsLoading.current && latestReportsWithAnalysis.length === 0
        }
        onReportClick={(report) => {
          if (isPhysical && report.analysis[0].classification === "physical") {
            const physicalReport = latestReports.find(
              (r) =>
                r.classification === "physical" && r.seq === report.report.seq
            ) as PhysicalReportResponse | null;
            setSelectedReport(physicalReport);
            flyToReport({
              lon: physicalReport?.longitude,
              lat: physicalReport?.latitude,
            });
          } else if (
            isDigital &&
            report.analysis[0].classification === "digital"
          ) {
            const digitalReport = latestReports.find(
              (r) =>
                r.classification === "digital" &&
                r.brand_name === report.analysis[0].brand_name
            ) as ReportResponse | null;
            setSelectedReport(digitalReport);
            const { lat, lon } = stringToLatLonColor(
              (digitalReport as DigitalReportResponse)?.brand_name
            );
            flyToReport({ lon: lon, lat: lat });
          }
          setIsCleanAppProOpen(true);
        }}
        isModalActive={true}
        isMenuOpen={isMenuOpen}
        report={selectedReport as ReportWithAnalysis | null}
      />

      {/* Bottom center logo */}
      {!isEmbeddedMode && (
        <div
          className={`${
            isMobile ? "bg-black" : "bg-black/10"
          } p-2 text-center text-white text-sm absolute bottom-0 ${
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

      <div
        className={`absolute ${
          isMobile
            ? `bottom-12 ${isDigital ? "right-20" : "right-4"}`
            : "bottom-10 right-4"
        }`}
      >
        <ReportCounter selectedTab={selectedTab} />
      </div>

      <CleanAppProModalV2
        isOpen={isCleanAppProOpen}
        onClose={() => setIsCleanAppProOpen(false)}
        report={selectedReport}
        // allReports={latestReportsWithAnalysis}
        // onReportChange={(report) => {
        //   // setSelectedReport(report);
        //   // flyToReport(report);
        // }}
      />
    </div>
  );
}
