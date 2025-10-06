/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import mapboxgl from "mapbox-gl";
import type { EnhancedPrediction } from "@/hooks/useEnhancedPredictions";
import ImpactRadiusOverlay from "./ImpactRadiusOverlay";

// Types
interface ImpactLocation {
  longitude: number;
  latitude: number;
  city: string;
  country: string;
}

interface AsteroidParams {
  diameter: number;
  velocity: number;
  angle?: number;
  distance?: number;
}

interface ImpactSimulation {
  impactEnergy: number;
  craterDiameter: number;
  damageRadius: number;
  casualties: number;
  location: ImpactLocation;
}

interface DamageZone {
  type: string;
  radius: number;
  color: string;
}

interface MapboxMapProps {
  className?: string;
  asteroidParams: AsteroidParams;
  isSimulating: boolean;
  impactLocation?: ImpactLocation;
  onImpact?: () => void;
  onDistanceUpdate?: (distance: number) => void;
  onLocationClick?: (location: ImpactLocation) => void;
  onStatusChange?: (status: string) => void;
  onSimulationUpdate?: (simulation: ImpactSimulation | null) => void;
  show3DBuildings?: boolean;
  streetViewMode?: boolean;
  enhancedBuildings?: boolean;
  shouldRunAnimation?: boolean;
  enhancedPrediction?: EnhancedPrediction | null;
  visibleRadii?: {
    crater: boolean;
    fireball: boolean;
    windBlast: boolean;
    earthquake: boolean;
    tsunami: boolean;
    shockwave: boolean;
  };
}

export interface MapboxMapRef {
  runImpactAnimation: () => void;
  resetSimulation: () => void;
  toggleStreetView: () => void;
  toggle3DBuildings: () => void;
  toggleEnhancedBuildings: () => void;
  flyToLocation: (location: ImpactLocation) => void;
}

// Simulation functions (simplified from comet-simulation)
const simulateImpact = (
  asteroidParams: AsteroidParams,
  location: ImpactLocation
): ImpactSimulation => {
  const { diameter, velocity } = asteroidParams;

  // Calculate impact physics
  const volume = (4 / 3) * Math.PI * Math.pow(diameter / 2, 3);
  const mass = volume * 3000; // kg (assuming density of 3000 kg/m³)
  const velocityMs = velocity * 1000; // Convert km/s to m/s
  const energy = 0.5 * mass * Math.pow(velocityMs, 2); // Joules
  const energyMt = energy / 4.184e15; // Convert to megatons

  // Calculate crater size (simplified scaling law)
  const craterDiameter = Math.pow(energyMt, 0.3) * 1000; // meters

  // Calculate damage radius
  const damageRadius = (craterDiameter / 1000) * 10; // km

  // Estimate casualties based on location (simplified)
  const casualties = Math.floor(Math.random() * 100000); // Placeholder

  return {
    impactEnergy: energyMt,
    craterDiameter,
    damageRadius,
    casualties,
    location,
  };
};

const getDamageZones = (simulation: ImpactSimulation): DamageZone[] => {
  const zones: DamageZone[] = [];

  // Define damage zones based on crater size
  const craterRadiusKm = simulation.craterDiameter / 2000;

  zones.push({
    type: "Vaporization",
    radius: craterRadiusKm * 0.3,
    color: "#ff0000",
  });

  zones.push({
    type: "Total Destruction",
    radius: craterRadiusKm,
    color: "#ff6600",
  });

  zones.push({
    type: "Heavy Damage",
    radius: craterRadiusKm * 2,
    color: "#ffaa00",
  });

  zones.push({
    type: "Moderate Damage",
    radius: simulation.damageRadius,
    color: "#ffff00",
  });

  return zones;
};

const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(
  (
    {
      className = "",
      asteroidParams,
      isSimulating,
      impactLocation = {
        longitude: -74.5,
        latitude: 40.7,
        city: "New York",
        country: "USA",
      },
      onImpact,
      onDistanceUpdate,
      onLocationClick,
      onStatusChange,
      onSimulationUpdate,
      show3DBuildings = true,
      streetViewMode = false,
      enhancedBuildings = true,
      shouldRunAnimation = false,
      enhancedPrediction,
      visibleRadii = {
        crater: true,
        fireball: false,
        windBlast: false,
        earthquake: false,
        tsunami: false,
        shockwave: false,
      },
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [currentSimulation, setCurrentSimulation] =
      useState<ImpactSimulation | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRequestRef = useRef<boolean>(false);
    const [hasUserSetLocation, setHasUserSetLocation] = useState(false);

    // Initialize map
    useEffect(() => {
      if (map) return;

      let mapInstance: mapboxgl.Map | null = null;

      const initializeMap = async () => {
        try {
          onStatusChange?.("Loading Mapbox...");
          const mapboxgl = (await import("mapbox-gl")).default;

          const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          if (!accessToken) {
            onStatusChange?.("⚠️ Mapbox access token not found");
            console.error("Mapbox access token is missing");
            return;
          }

          mapboxgl.accessToken = accessToken;

          if (!mapContainer.current) {
            onStatusChange?.("Map container not found");
            return;
          }

          onStatusChange?.("Creating 3D globe...");

          mapInstance = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [impactLocation.longitude, impactLocation.latitude],
            zoom: 3,
            projection: { name: "globe" },
            attributionControl: false,
            preserveDrawingBuffer: true,
          });

          mapInstance.on("load", () => {
            onStatusChange?.("Globe loaded successfully!");
            setMapLoaded(true);
            setMap(mapInstance);

            // Add 3D terrain
            try {
              mapInstance!.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
              });
              mapInstance!.setTerrain({
                source: "mapbox-dem",
                exaggeration: 1.5,
              });
            } catch (terrainError) {
              console.warn("Terrain loading failed:", terrainError);
            }

            // Add 3D buildings layer
            if (!mapInstance!.getLayer("building-3d")) {
              mapInstance!.addLayer(
                {
                  id: "building-3d",
                  source: "composite",
                  "source-layer": "building",
                  filter: ["==", "extrude", "true"],
                  type: "fill-extrusion",
                  minzoom: 13,
                  paint: {
                    "fill-extrusion-color": [
                      "case",
                      ["boolean", ["feature-state", "vaporized"], false],
                      "#000000",
                      ["boolean", ["feature-state", "destroyed"], false],
                      "#ff0000",
                      ["boolean", ["feature-state", "severely-damaged"], false],
                      "#ff6600",
                      [
                        "boolean",
                        ["feature-state", "moderately-damaged"],
                        false,
                      ],
                      "#ffaa00",
                      ["boolean", ["feature-state", "lightly-damaged"], false],
                      "#ffff00",
                      [
                        "interpolate",
                        ["linear"],
                        ["get", "height"],
                        0,
                        "#7f8fa6",
                        50,
                        "#718093",
                        100,
                        "#57606f",
                        200,
                        "#2f3542",
                      ],
                    ],
                    "fill-extrusion-height": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      13,
                      0,
                      13.5,
                      [
                        "case",
                        ["boolean", ["feature-state", "vaporized"], false],
                        0,
                        ["boolean", ["feature-state", "destroyed"], false],
                        ["*", ["get", "height"], 0.05],
                        [
                          "boolean",
                          ["feature-state", "severely-damaged"],
                          false,
                        ],
                        ["*", ["get", "height"], 0.3],
                        [
                          "boolean",
                          ["feature-state", "moderately-damaged"],
                          false,
                        ],
                        ["*", ["get", "height"], 0.7],
                        ["get", "height"],
                      ],
                    ],
                    "fill-extrusion-base": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      13,
                      0,
                      13.5,
                      ["get", "min_height"],
                    ],
                    "fill-extrusion-opacity": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      13,
                      0.7,
                      16,
                      0.82,
                      18,
                      0.9,
                    ],
                    "fill-extrusion-ambient-occlusion-intensity":
                      enhancedBuildings ? 0.5 : 0.1,
                    "fill-extrusion-ambient-occlusion-radius": 3,
                    "fill-extrusion-flood-light-intensity": enhancedBuildings
                      ? 0.6
                      : 0.2,
                    "fill-extrusion-flood-light-color": "#ffffff",
                    "fill-extrusion-vertical-gradient": enhancedBuildings,
                  },
                },
                "waterway-label"
              );
            }

            // Set fog
            mapInstance!.setFog({
              color: "#003ef6",
              "high-color": "#3849e1",
              "horizon-blend": 0.02,
              "space-color": "#000000",
              "star-intensity": 0.8,
            });
          });

          // Handle clicks to set impact location
          mapInstance.on("click", (e: mapboxgl.MapMouseEvent) => {
            const { lng, lat } = e.lngLat;
            if (onLocationClick) {
              onLocationClick({
                longitude: lng,
                latitude: lat,
                city: "Selected Location",
                country: "Unknown",
              });
              setHasUserSetLocation(true);
            }
          });

          mapInstance.on("error", (e: { error: Error }) => {
            console.error("Map error:", e.error);
            onStatusChange?.(`Map error: ${e.error.message}`);
          });
        } catch (error) {
          console.error("Failed to initialize map:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          onStatusChange?.(`Failed to initialize map: ${errorMessage}`);
        }
      };

      initializeMap();

      return () => {
        if (mapInstance) {
          mapInstance.remove();
        }
      };
    }, []); // Only initialize once

    // Update map when impact location changes (only when explicitly set by user)
    useEffect(() => {
      if (!map || !mapLoaded || !hasUserSetLocation) return;

      map.flyTo({
        center: [impactLocation.longitude, impactLocation.latitude],
        zoom: 6,
        duration: 2000,
      });

      // Reset building colors
      if (map.isStyleLoaded() && map.getLayer("building-3d")) {
        const features = map.queryRenderedFeatures({ layers: ["building-3d"] });
        features.forEach((feature) => {
          if (!feature.id) return;
          map.setFeatureState(
            { source: "composite", sourceLayer: "building", id: feature.id },
            {
              destroyed: false,
              "severely-damaged": false,
              "moderately-damaged": false,
              "lightly-damaged": false,
              vaporized: false,
              "crater-zone": false,
            }
          );
        });
      }

      setHasUserSetLocation(false);
    }, [map, mapLoaded, impactLocation, hasUserSetLocation]);

    // Update 3D buildings visibility
    useEffect(() => {
      if (!map || !mapLoaded) return;

      if (map.getLayer("building-3d")) {
        map.setLayoutProperty(
          "building-3d",
          "visibility",
          show3DBuildings ? "visible" : "none"
        );
      }
    }, [map, mapLoaded, show3DBuildings]);

    // Update street view mode
    const prevStreetViewRef = useRef(streetViewMode);
    useEffect(() => {
      if (!map || !mapLoaded) return;

      if (prevStreetViewRef.current === streetViewMode) return;
      prevStreetViewRef.current = streetViewMode;

      if (streetViewMode) {
        const currentCenter = map.getCenter();
        map.flyTo({
          center: [currentCenter.lng, currentCenter.lat],
          zoom: 18,
          pitch: 70,
          bearing: 45,
          duration: 2000,
        });
      } else {
        const currentCenter = map.getCenter();
        map.flyTo({
          center: [currentCenter.lng, currentCenter.lat],
          zoom: 15,
          pitch: 45,
          bearing: 0,
          duration: 2000,
        });
      }
    }, [map, mapLoaded, streetViewMode]);

    // Update enhanced buildings
    useEffect(() => {
      if (!map || !mapLoaded || !map.getLayer("building-3d")) return;

      map.setPaintProperty(
        "building-3d",
        "fill-extrusion-ambient-occlusion-intensity",
        enhancedBuildings ? 0.5 : 0.1
      );
      map.setPaintProperty(
        "building-3d",
        "fill-extrusion-flood-light-intensity",
        enhancedBuildings ? 0.6 : 0.2
      );
      map.setPaintProperty(
        "building-3d",
        "fill-extrusion-vertical-gradient",
        enhancedBuildings
      );
    }, [map, mapLoaded, enhancedBuildings]);

    // Show predicted impact location when enhanced prediction loads
    useEffect(() => {
      if (!map || !mapLoaded || !enhancedPrediction?.impact_location) return;

      const { latitude, longitude } = enhancedPrediction.impact_location;

      console.log("📍 Showing predicted impact location on map:", { latitude, longitude });

      // Pan map to predicted location
      map.flyTo({
        center: [longitude, latitude],
        zoom: 10,
        duration: 2000,
        essential: true,
      });

      // Add impact location marker
      try {
        // Remove existing prediction marker if any
        if (map.getLayer("prediction-marker")) {
          map.removeLayer("prediction-marker");
        }
        if (map.getSource("prediction-marker")) {
          map.removeSource("prediction-marker");
        }

        // Add new prediction marker
        map.addSource("prediction-marker", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [longitude, latitude] },
            properties: {},
          },
        });

        map.addLayer({
          id: "prediction-marker",
          type: "circle",
          source: "prediction-marker",
          paint: {
            "circle-radius": 10,
            "circle-color": "#3b82f6", // Blue for predicted location
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.8,
          },
        });

        console.log("✅ Prediction marker added to map");
      } catch (error) {
        console.error("❌ Error adding prediction marker:", error);
      }
    }, [map, mapLoaded, enhancedPrediction]);

    // Calculate simulation when asteroid params change
    useEffect(() => {
      const simulation = simulateImpact(asteroidParams, impactLocation);
      setCurrentSimulation(simulation);
      // Send simulation data back to parent
      onSimulationUpdate?.(simulation);
    }, [asteroidParams, impactLocation, onSimulationUpdate]);

    // Helper functions
    const cleanupMapLayers = useCallback((mapInstance: mapboxgl.Map) => {
      if (!mapInstance) return;

      const layersToRemove = [
        "damage-zones",
        "impact-point",
        "crater-interior",
        "crater-rim",
        "vaporization-zone",
        "asteroid",
      ];

      // Remove damage zone layers
      for (let i = 0; i < 10; i++) {
        layersToRemove.push(
          `damage-zone-${i}`,
          `damage-zone-layer-${i}`,
          `damage-zone-layer-${i}-outline`
        );
      }

      layersToRemove.forEach((id) => {
        try {
          if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
          if (mapInstance.getSource(id)) mapInstance.removeSource(id);
        } catch {
          // Continue if layer doesn't exist
        }
      });
    }, []);

    const addCraterVisualization = useCallback(
      (mapInstance: mapboxgl.Map, simulation: ImpactSimulation) => {
        const craterRadius = simulation.craterDiameter / 2;
        const center = [
          simulation.location.longitude,
          simulation.location.latitude,
        ];

        // Remove existing crater layers
        ["crater-rim", "crater-interior", "vaporization-zone"].forEach(
          (layerId) => {
            try {
              if (mapInstance.getLayer(layerId))
                mapInstance.removeLayer(layerId);
              if (mapInstance.getSource(layerId))
                mapInstance.removeSource(layerId);
            } catch {
              // Layer might not exist
            }
          }
        );

        // Create crater layers
        const createCircleCoords = (radius: number, scale = 1) => {
          const coords = [];
          for (let i = 0; i <= 64; i++) {
            const angle = (i * 360) / 64;
            const radians = (angle * Math.PI) / 180;
            const deltaLat = (radius * scale * Math.cos(radians)) / 111320;
            const deltaLng =
              (radius * scale * Math.sin(radians)) /
              (111320 * Math.cos((center[1] * Math.PI) / 180));
            coords.push([center[0] + deltaLng, center[1] + deltaLat]);
          }
          coords.push(coords[0]);
          return coords;
        };

        // Add crater layers
        const layers = [
          {
            id: "crater-interior",
            coords: createCircleCoords(craterRadius, 0.8),
            color: "#2c1810",
            opacity: 0.9,
          },
          {
            id: "vaporization-zone",
            coords: createCircleCoords(craterRadius, 0.3),
            color: "#000000",
            opacity: 0.95,
          },
        ];

        layers.forEach((layer) => {
          mapInstance.addSource(layer.id, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [layer.coords] },
              properties: {},
            },
          });
          mapInstance.addLayer({
            id: layer.id,
            type: "fill",
            source: layer.id,
            paint: { "fill-color": layer.color, "fill-opacity": layer.opacity },
          });
        });

        // Add crater rim
        mapInstance.addSource("crater-rim", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [createCircleCoords(craterRadius)],
            },
            properties: {},
          },
        });
        mapInstance.addLayer({
          id: "crater-rim",
          type: "line",
          source: "crater-rim",
          paint: {
            "line-color": "#8B4513",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });

        // Add damage zones
        const damageZones = getDamageZones(simulation);
        damageZones.forEach((zone, index) => {
          const sourceId = `damage-zone-${index}`;
          const layerId = `damage-zone-layer-${index}`;

          const zoneCoords = createCircleCoords(zone.radius * 1000);

          mapInstance.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [zoneCoords] },
              properties: {},
            },
          });

          mapInstance.addLayer({
            id: layerId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": zone.color,
              "fill-opacity": 0.2,
            },
          });

          mapInstance.addLayer({
            id: `${layerId}-outline`,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": zone.color,
              "line-width": 2,
              "line-opacity": 0.6,
            },
          });
        });
      },
      []
    );

    const runImpactAnimation = useCallback(async () => {
      if (!map || !currentSimulation || isAnimating) return;

      setIsAnimating(true);
      animationRequestRef.current = true;
      onStatusChange?.("Simulating impact...");

      try {
        // Zoom out to show trajectory
        await new Promise<void>((resolve) => {
          map.flyTo({
            center: [
              currentSimulation.location.longitude,
              currentSimulation.location.latitude,
            ],
            zoom: 2,
            duration: 1500,
          });
          setTimeout(resolve, 1500);
        });

        // Show asteroid approaching
        const startLng = currentSimulation.location.longitude + 15;
        const startLat = currentSimulation.location.latitude + 10;

        // Add asteroid marker
        map.addSource("asteroid", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [startLng, startLat] },
            properties: {},
          },
        });

        map.addLayer({
          id: "asteroid",
          type: "circle",
          source: "asteroid",
          paint: {
            "circle-radius": 12,
            "circle-color": "#ff8800",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.9,
          },
        });

        // Animate asteroid movement
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          if (!animationRequestRef.current) break;

          const progress = i / steps;
          const currentLng =
            startLng +
            (currentSimulation.location.longitude - startLng) * progress;
          const currentLat =
            startLat +
            (currentSimulation.location.latitude - startLat) * progress;

          const source = map.getSource("asteroid") as mapboxgl.GeoJSONSource;
          source?.setData({
            type: "Feature",
            geometry: { type: "Point", coordinates: [currentLng, currentLat] },
            properties: {},
          });

          onStatusChange?.(
            `Asteroid approaching... ${Math.round(progress * 100)}%`
          );
          onDistanceUpdate?.(Math.round((1 - progress) * 100000));

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Remove asteroid after impact
        if (map.getLayer("asteroid")) map.removeLayer("asteroid");
        if (map.getSource("asteroid")) map.removeSource("asteroid");

        // Trigger impact callback
        onImpact?.();

        // Zoom to impact site
        await new Promise<void>((resolve) => {
          map.flyTo({
            center: [
              currentSimulation.location.longitude,
              currentSimulation.location.latitude,
            ],
            zoom: 16,
            pitch: 45,
            duration: 2000,
          });
          setTimeout(resolve, 2000);
        });

        // Add crater and damage zones
        addCraterVisualization(map, currentSimulation);

        onStatusChange?.("Impact simulation complete!");
      } catch (error) {
        console.error("Animation error:", error);
        onStatusChange?.("Animation error occurred");
      }

      setIsAnimating(false);
      animationRequestRef.current = false;
    }, [
      map,
      currentSimulation,
      isAnimating,
      onImpact,
      onStatusChange,
      onDistanceUpdate,
      addCraterVisualization,
    ]);

    const resetSimulation = useCallback(() => {
      if (!map) return;

      animationRequestRef.current = false;
      cleanupMapLayers(map);
      setCurrentSimulation(null);
      setIsAnimating(false);
      onStatusChange?.("Ready to simulate impact");
      onSimulationUpdate?.(null); // Clear simulation in parent

      map.flyTo({
        center: [impactLocation.longitude, impactLocation.latitude],
        zoom: 3,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    }, [
      map,
      cleanupMapLayers,
      onStatusChange,
      onSimulationUpdate,
      impactLocation,
    ]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        runImpactAnimation,
        resetSimulation,
        toggleStreetView: () => {
          if (!map || !mapLoaded) return;
          const currentCenter = map.getCenter();
          const currentMode = map.getPitch() > 60;
          const newMode = !currentMode;

          if (newMode) {
            map.flyTo({
              center: [currentCenter.lng, currentCenter.lat],
              zoom: 18,
              pitch: 70,
              bearing: 45,
              duration: 2000,
            });
          } else {
            map.flyTo({
              center: [currentCenter.lng, currentCenter.lat],
              zoom: 15,
              pitch: 45,
              bearing: 0,
              duration: 2000,
            });
          }
        },
        toggle3DBuildings: () => {
          if (!map || !mapLoaded || !map.getLayer("building-3d")) return;
          const currentVisibility = map.getLayoutProperty(
            "building-3d",
            "visibility"
          );
          const newVisibility =
            currentVisibility === "visible" ? "none" : "visible";
          map.setLayoutProperty("building-3d", "visibility", newVisibility);
        },
        toggleEnhancedBuildings: () => {
          if (!map || !mapLoaded || !map.getLayer("building-3d")) return;
          const current = map.getPaintProperty(
            "building-3d",
            "fill-extrusion-ambient-occlusion-intensity"
          );
          const currentValue = typeof current === 'number' ? current : 0.1;
          const newEnhanced = currentValue < 0.3;
          map.setPaintProperty(
            "building-3d",
            "fill-extrusion-ambient-occlusion-intensity",
            newEnhanced ? 0.5 : 0.1
          );
          map.setPaintProperty(
            "building-3d",
            "fill-extrusion-flood-light-intensity",
            newEnhanced ? 0.6 : 0.2
          );
          map.setPaintProperty(
            "building-3d",
            "fill-extrusion-vertical-gradient",
            newEnhanced
          );
        },
        flyToLocation: (location: ImpactLocation) => {
          if (!map || !mapLoaded) return;
          map.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 10,
            duration: 2000,
          });
        },
      }),
      [map, mapLoaded, runImpactAnimation, resetSimulation]
    );

    // Trigger animation when requested
    useEffect(() => {
      if (shouldRunAnimation && !isAnimating) {
        runImpactAnimation();
      }
    }, [shouldRunAnimation, isAnimating, runImpactAnimation]);

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div
          ref={mapContainer}
          className="absolute inset-0 w-full h-full"
          style={{ backgroundColor: "#1a1a1a" }}
        />

        {/* Loading indicator */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <div className="text-sm">Loading 3D Globe...</div>
            </div>
          </div>
        )}

        {/* Location display */}
        {mapLoaded && (
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded text-[10px] font-light">
            Target: {impactLocation.latitude.toFixed(3)}°,{" "}
            {impactLocation.longitude.toFixed(3)}°
          </div>
        )}

        {/* Impact Radius Overlay - Show after simulation completes */}
        {(() => {
          const shouldShow = mapLoaded && !isAnimating && currentSimulation && enhancedPrediction?.consequencePrediction;
          console.log("🗺️ ImpactRadiusOverlay render check:", {
            mapLoaded,
            isAnimating,
            hasCurrentSimulation: !!currentSimulation,
            hasEnhancedPrediction: !!enhancedPrediction,
            hasConsequencePrediction: !!enhancedPrediction?.consequencePrediction,
            shouldShow,
          });
          return shouldShow ? (
            <ImpactRadiusOverlay
              consequencePrediction={enhancedPrediction.consequencePrediction}
              visibleRadii={visibleRadii}
              map={map}
            />
          ) : null;
        })()}
      </div>
    );
  }
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
