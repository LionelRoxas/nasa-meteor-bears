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
  useMemo,
} from "react";
import mapboxgl from "mapbox-gl";
import * as THREE from 'three';
import { createAsteroidMesh } from '@/lib/asteroid-utils';
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
  // Pin placement props
  isPlacingPin?: boolean;
  onPinPlaced?: (pin: ImpactLocation) => void;
  usePredictedLocation?: boolean;
  impactPinLocation?: ImpactLocation | null;
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
      // Pin placement props
      isPlacingPin = false,
      onPinPlaced,
      usePredictedLocation = true,
      impactPinLocation: impactPinProp = null,
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

    // Three.js refs for asteroid animation
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const asteroidMeshRef = useRef<THREE.Mesh | null>(null);

    // Use refs to track prop values for event handlers
    const isPlacingPinRef = useRef(isPlacingPin);
    const currentSimulationRef = useRef<ImpactSimulation | null>(null);

    // Default predicted location (New York)
    const predictedLocation = useMemo<ImpactLocation>(
      () => ({
        longitude: -74.5,
        latitude: 40.7,
        city: "New York",
        country: "USA",
      }),
      []
    );

    // Update refs when props change
    useEffect(() => {
      isPlacingPinRef.current = isPlacingPin;
    }, [isPlacingPin]);

    useEffect(() => {
      currentSimulationRef.current = currentSimulation;
    }, [currentSimulation]);

    // Update map cursor when pin placement state changes
    useEffect(() => {
      if (!map) return;
      
      if (isPlacingPin) {
        // Set a red crosshair cursor using CSS
        map.getCanvas().style.cursor = 'url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'%3E%3Cline x1=\'10\' y1=\'0\' x2=\'10\' y2=\'20\' stroke=\'%23ff0000\' stroke-width=\'2\'/%3E%3Cline x1=\'0\' y1=\'10\' x2=\'20\' y2=\'10\' stroke=\'%23ff0000\' stroke-width=\'2\'/%3E%3C/svg%3E") 10 10, crosshair';
      } else {
        map.getCanvas().style.cursor = '';
      }
    }, [map, isPlacingPin]);

    // Get the effective impact location (either pin or predicted)
    const effectiveImpactLocation = useMemo<ImpactLocation>(
      () => {
        if (usePredictedLocation || !impactPinProp) {
          return predictedLocation;
        }
        return impactPinProp;
      },
      [usePredictedLocation, impactPinProp, predictedLocation]
    );

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
            center: [effectiveImpactLocation.longitude, effectiveImpactLocation.latitude],
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
            console.log('Map clicked - isPlacingPin:', isPlacingPinRef.current, 'currentSimulation:', currentSimulationRef.current);
            console.log('usePredictedLocation:', usePredictedLocation, 'impactPinProp:', impactPinProp);
            if (isPlacingPinRef.current && !currentSimulationRef.current) {
              const { lng, lat } = e.lngLat;
              console.log('Placing pin at:', lng, lat);
              const newPin = {
                longitude: lng,
                latitude: lat,
                city: 'Selected Location',
                country: 'Unknown'
              };
              onStatusChange?.('Pin placed! Ready to simulate impact');
              setHasUserSetLocation(true);
              onPinPlaced?.(newPin); // Call the callback to notify parent components
            } else {
              console.log('Click ignored - not in placing pin mode or simulation exists');
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

    // Initialize Three.js scene for asteroid visualization
    useEffect(() => {
      if (!map || !mapLoaded) return;

      // Create Three.js scene with AsteroidPreview setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true 
      });
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0); // Transparent background
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.pointerEvents = 'none';
      renderer.domElement.style.zIndex = '5';
      
      console.log('Three.js renderer created and configured');
      
      // Add renderer to map container
      if (mapContainer.current) {
        mapContainer.current.appendChild(renderer.domElement);
        console.log('Three.js renderer added to map container');
      }

      // Use the exact lighting setup from AsteroidPreview
      const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
      sunLight.position.set(8, 5, 3);
      sunLight.castShadow = true;
      scene.add(sunLight);

      const fillLight = new THREE.DirectionalLight(0xaabbff, 0.6);
      fillLight.position.set(-5, -2, -5);
      scene.add(fillLight);

      const ambientLight = new THREE.AmbientLight(0x606060, 0.7);
      scene.add(ambientLight);

      // Store references
      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;

      // Set initial camera position for better 3D view
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -30);

      // Start render loop
      const animate = () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        requestAnimationFrame(animate);
      };
      animate();
      console.log('Three.js animation loop started');

      return () => {
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    }, [map, mapLoaded]);

    // Add damage zones and crater visualization when simulation is set
    useEffect(() => {
      if (!map || !mapLoaded || !currentSimulation) return;

      console.log('Adding damage zones for simulation:', currentSimulation);
      const currentMap = map; // Store reference to avoid null checks

      // Clean up existing layers before adding new ones
      cleanupMapLayers(currentMap);

      // Add impact point
      currentMap.addSource('impact-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [currentSimulation.location.longitude, currentSimulation.location.latitude]
          },
          properties: {}
        }
      });

      currentMap.addLayer({
        id: 'impact-point',
        type: 'circle',
        source: 'impact-point',
        paint: {
          'circle-radius': 15,
          'circle-color': '#ff0000',
          'circle-stroke-width': 4,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Add damage zones
      const damageZones = getDamageZones(currentSimulation);
      console.log('Damage zones to add:', damageZones);
      
      damageZones.forEach((zone, index) => {
        const sourceId = `damage-zone-${index}`;
        const layerId = `damage-zone-layer-${index}`;
        
        console.log(`Adding damage zone ${index}: ${zone.type} with radius ${zone.radius}km`);
        
        try {
          // Create circle for damage zone
          const coordinates = [];
          const radius = zone.radius * 1000; // Convert km to meters
          const center = [currentSimulation.location.longitude, currentSimulation.location.latitude];
          
          for (let i = 0; i <= 64; i++) {
            const angle = (i * 360) / 64;
            const radians = (angle * Math.PI) / 180;
            
            // Fixed coordinate calculation for proper centering
            const deltaLat = (radius * Math.cos(radians)) / 111320;
            const deltaLng = (radius * Math.sin(radians)) / (111320 * Math.cos(center[1] * Math.PI / 180));
            
            coordinates.push([center[0] + deltaLng, center[1] + deltaLat]);
          }
          coordinates.push(coordinates[0]); // Close the polygon

          currentMap.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
              },
              properties: {}
            }
          });

          currentMap.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': zone.color,
              'fill-opacity': 0.3
            }
          });

          // Add outline
          currentMap.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': zone.color,
              'line-width': 2,
              'line-opacity': 0.8
            }
          });
        } catch (e) {
          console.error('Error adding damage zone:', e);
        }
      });

      // Add crater visualization
      try {
        // Clean up existing crater layers first
        if (currentMap.getLayer('crater-visualization')) {
          currentMap.removeLayer('crater-visualization');
        }
        if (currentMap.getLayer('crater-outline')) {
          currentMap.removeLayer('crater-outline');
        }
        if (currentMap.getSource('crater-visualization')) {
          currentMap.removeSource('crater-visualization');
        }

        // Simple crater visualization without complex cleanup
        const craterRadius = currentSimulation.craterDiameter / 2;
        const center = [currentSimulation.location.longitude, currentSimulation.location.latitude];
        
        // Create crater visualization
        const coordinates = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i * 360) / 64;
          const radians = (angle * Math.PI) / 180;
          const deltaLat = (craterRadius * Math.cos(radians)) / 111320;
          const deltaLng = (craterRadius * Math.sin(radians)) / (111320 * Math.cos(center[1] * Math.PI / 180));
          coordinates.push([center[0] + deltaLng, center[1] + deltaLat]);
        }
        coordinates.push(coordinates[0]); // Close the polygon

        // Add crater source and layer
        if (!currentMap.getSource('crater-visualization')) {
          currentMap.addSource('crater-visualization', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
              },
              properties: {}
            }
          });

          currentMap.addLayer({
            id: 'crater-visualization',
            type: 'fill',
            source: 'crater-visualization',
            paint: {
              'fill-color': '#8B4513',
              'fill-opacity': 0.6
            }
          });

          currentMap.addLayer({
            id: 'crater-outline',
            type: 'line',
            source: 'crater-visualization',
            paint: {
              'line-color': '#654321',
              'line-width': 3,
              'line-opacity': 0.9
            }
          });
        }
      } catch (error) {
        console.error('Error adding crater visualization:', error);
      }

    }, [map, mapLoaded, currentSimulation]);

    // Update map cursor when pin placement state changes
    useEffect(() => {
      if (!map) return;
      
      if (isPlacingPin) {
        // Set a red crosshair cursor using CSS
        map.getCanvas().style.cursor = 'url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'%3E%3Cline x1=\'10\' y1=\'0\' x2=\'10\' y2=\'20\' stroke=\'%23ff0000\' stroke-width=\'2\'/%3E%3Cline x1=\'0\' y1=\'10\' x2=\'20\' y2=\'10\' stroke=\'%23ff0000\' stroke-width=\'2\'/%3E%3C/svg%3E") 10 10, crosshair';
      } else {
        map.getCanvas().style.cursor = '';
      }
    }, [map, isPlacingPin]);

    // Add pin visualization when impact pin is placed
    useEffect(() => {
      if (!map || !mapLoaded) return;

      const currentMap = map;

      // Clean up existing pin
      try {
        if (currentMap.getLayer('impact-pin')) {
          currentMap.removeLayer('impact-pin');
        }
        if (currentMap.getSource('impact-pin')) {
          currentMap.removeSource('impact-pin');
        }
      } catch {
        // Pin might not exist, continue
      }

      // If no impact pin or using predicted location, we're done
      if (!impactPinProp || usePredictedLocation) return;

      // Add red pin marker
      currentMap.addSource('impact-pin', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [impactPinProp.longitude, impactPinProp.latitude]
          },
          properties: {}
        }
      });

      currentMap.addLayer({
        id: 'impact-pin',
        type: 'circle',
        source: 'impact-pin',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ff0000',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      });

      // Fly to pin location
      currentMap.flyTo({
        center: [impactPinProp.longitude, impactPinProp.latitude],
        zoom: 10, // Moderate zoom to see the area without being too close
        duration: 2000
      });
    }, [map, mapLoaded, impactPinProp, usePredictedLocation]);

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

    // Add pin visualization when impact pin is placed
    useEffect(() => {
      if (!map || !mapLoaded) return;

      const currentMap = map;

      // Clean up existing pin
      try {
        if (currentMap.getLayer('impact-pin')) {
          currentMap.removeLayer('impact-pin');
        }
        if (currentMap.getSource('impact-pin')) {
          currentMap.removeSource('impact-pin');
        }
      } catch {
        // Pin might not exist, continue
      }

      // If no impact pin, we're done (pin has been removed)
      if (!impactPinProp) return;

      // Add red pin marker
      currentMap.addSource('impact-pin', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [impactPinProp.longitude, impactPinProp.latitude]
          },
          properties: {}
        }
      });

      currentMap.addLayer({
        id: 'impact-pin',
        type: 'circle',
        source: 'impact-pin',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ff0000',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      });

      // Fly to pin location
      currentMap.flyTo({
        center: [impactPinProp.longitude, impactPinProp.latitude],
        zoom: 10, // Moderate zoom to see the area without being too close
        duration: 2000
      });
    }, [map, mapLoaded, impactPinProp, usePredictedLocation]);

    // Calculate simulation when asteroid params change - REMOVED automatic simulation
    // Only calculate simulation when explicitly requested via runImpactAnimation
    // useEffect(() => {
    //   const simulation = simulateImpact(asteroidParams, effectiveImpactLocation);
    //   setCurrentSimulation(simulation);
    //   // Send simulation data back to parent
    //   onSimulationUpdate?.(simulation);
    // }, [asteroidParams, effectiveImpactLocation, onSimulationUpdate]);

    // Helper functions
    const cleanupMapLayers = useCallback((mapInstance: mapboxgl.Map) => {
      if (!mapInstance) return;

      const layersToRemove = [
        "damage-zones",
        "impact-point",
        "impact-pin", // Add pin cleanup
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
      if (!map || !effectiveImpactLocation || isAnimating || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;
      
      setIsAnimating(true);
      onStatusChange?.('Simulating impact...');
      
      try {
        // Create simulation from effective impact location
        const simulation = simulateImpact(asteroidParams, effectiveImpactLocation);
        
        // Declare these variables so they can be accessed during cleanup
        let trail: THREE.Mesh;
        let aura: THREE.Mesh;
        
        // Start from space view to show asteroid approach
        await new Promise<void>((resolve) => {
          map.flyTo({
            center: [effectiveImpactLocation.longitude, effectiveImpactLocation.latitude],
            zoom: 2, // Space view to see Earth
            duration: 1500
          });
          setTimeout(resolve, 1500);
        });
        
        // Create Three.js asteroid using exact AsteroidPreview setup
        console.log('Creating realistic asteroid using AsteroidPreview method...');
        
        // Create the asteroid using asteroid utils - same as AsteroidPreview
        const asteroidDiameter = Math.max(asteroidParams.diameter / 10, 100);
        const asteroidMesh = createAsteroidMesh(THREE, { diameter: asteroidDiameter });
        console.log('Created asteroid using asteroid-utils with diameter:', asteroidDiameter);

        
        // Use bigger scaling for more dramatic effect
        const minDiameter = 50;
        const maxDiameter = 1000;
        const minScale = 3.0;
        const maxScale = 6.0;
        const normalizedDiameter = (asteroidDiameter - minDiameter) / (maxDiameter - minDiameter);
        const scaleFactor = minScale + normalizedDiameter * (maxScale - minScale);
        asteroidMesh.scale.multiplyScalar(scaleFactor);
        
        // Create fiery trail/aura effect
        const trailGeometry = new THREE.SphereGeometry(scaleFactor * 1.5, 16, 16);
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: 0xff6600, // Orange
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending
        });
        trail = new THREE.Mesh(trailGeometry, trailMaterial);
        
        // Create inner aura
        const auraGeometry = new THREE.SphereGeometry(scaleFactor * 1.2, 16, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
          color: 0xffaa00, // Yellow-orange
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending
        });
        aura = new THREE.Mesh(auraGeometry, auraMaterial);
        
        // Screen-space path: start off to the right, impact at exact screen center
        const startPosition = new THREE.Vector3(40, 10, -35);
        const endPosition = new THREE.Vector3(0, 0, -35);
        
        asteroidMesh.position.copy(startPosition);
        trail.position.copy(startPosition);
        aura.position.copy(startPosition);
        
        sceneRef.current.add(asteroidMesh);
        sceneRef.current.add(trail);
        sceneRef.current.add(aura);
        asteroidMeshRef.current = asteroidMesh;
        console.log('Asteroid with fiery trail added to scene');
        
        // Position camera for clear side view
        cameraRef.current.position.set(0, 0, 0);
        cameraRef.current.lookAt(0, 0, -35);
        
        // Animate asteroid movement
        const steps = 60;
        const centerLockFrame = 15;
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;

          // Position interpolation
          asteroidMesh.position.lerpVectors(startPosition, endPosition, progress);
          trail.position.copy(asteroidMesh.position);
          aura.position.copy(asteroidMesh.position);

          // Subtle tumble
          asteroidMesh.rotation.x += 0.025;
          asteroidMesh.rotation.y += 0.018;
          asteroidMesh.rotation.z += 0.012;

          // Aura intensifies
          (trail.material as THREE.MeshBasicMaterial).opacity = 0.25 + progress * 0.55;
          (aura.material as THREE.MeshBasicMaterial).opacity = 0.4 + progress * 0.4;

          // Camera/map behavior
          if (i <= centerLockFrame) {
            const t = i / centerLockFrame;
            const lngOffset = 6 * (1 - t);
            const latOffset = 4 * (1 - t);
            map.setCenter([effectiveImpactLocation.longitude + lngOffset, effectiveImpactLocation.latitude + latOffset]);
            map.setZoom(2.5 + t * 1.5);
          } else {
            map.setCenter([effectiveImpactLocation.longitude, effectiveImpactLocation.latitude]);
            if (progress > 0.6) {
              const zoomT = (progress - 0.6) / 0.4;
              map.setZoom(4 + zoomT * 8);
            }
          }

          onStatusChange?.(`Asteroid incoming... ${Math.round(progress * 100)}%`);
          await new Promise(r => setTimeout(r, 50));
        }

        console.log('Asteroid reached center (impact). Creating impact effects...');

        // IMMEDIATE impact effects - remove asteroid and show crater
        if (asteroidMeshRef.current && sceneRef.current) {
          // Remove asteroid and trail immediately on impact
          sceneRef.current.remove(asteroidMeshRef.current);
          sceneRef.current.remove(trail);
          sceneRef.current.remove(aura);
          
          // Dispose of the geometries and materials to free memory
          asteroidMeshRef.current.geometry.dispose();
          if (asteroidMeshRef.current.material) {
            if (Array.isArray(asteroidMeshRef.current.material)) {
              asteroidMeshRef.current.material.forEach(material => material.dispose());
            } else {
              asteroidMeshRef.current.material.dispose();
            }
          }
          trail.geometry.dispose();
          (trail.material as THREE.MeshBasicMaterial).dispose();
          aura.geometry.dispose();
          (aura.material as THREE.MeshBasicMaterial).dispose();
          
          asteroidMeshRef.current = null;
          console.log('Asteroid and trail removed from scene and disposed (impact moment)');

          // Set simulation immediately to trigger crater visualization
          setCurrentSimulation(simulation);
          onStatusChange?.('Impact! Crater and damage zones appearing...');
        }

        // Post-impact zoom
        await new Promise<void>(resolve => {
          map.flyTo({
            center: [effectiveImpactLocation.longitude, effectiveImpactLocation.latitude],
            zoom: 12,
            duration: 900,
            pitch: 35
          });
          setTimeout(resolve, 900);
        });
        
        // Create impact explosion after asteroid is already gone
        if (sceneRef.current) {
          const explosionGeometry = new THREE.SphereGeometry(2, 16, 16);
          const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4500, 
            transparent: true, 
            opacity: 0.8 
          });
          const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
          explosion.position.copy(endPosition);
          sceneRef.current.add(explosion);
          console.log('Explosion created at impact location:', endPosition);

          // Explosion animation
          for (let i = 0; i < 16; i++) {
            explosion.scale.multiplyScalar(1.22);
            explosionMaterial.opacity *= 0.88;
            await new Promise(resolve => setTimeout(resolve, 70));
          }
          sceneRef.current.remove(explosion);
          console.log('Explosion animation complete');
        }
        
        // Final zoom to impact site
        await new Promise<void>((resolve) => {
          map.flyTo({
            center: [effectiveImpactLocation.longitude, effectiveImpactLocation.latitude],
            zoom: 12,
            pitch: 35,
            duration: 2000
          });
          setTimeout(resolve, 2000);
        });
        
        onStatusChange?.('Impact simulation complete! Crater and damage zones visible.');
        
      } catch (error) {
        console.error('Animation error:', error);
        onStatusChange?.('Animation error occurred');
      }
      
      setIsAnimating(false);
    }, [
      map,
      effectiveImpactLocation,
      isAnimating,
      onStatusChange,
      asteroidParams,
      setCurrentSimulation,
    ]);

    const resetSimulation = useCallback(() => {
      if (!map) return;

      animationRequestRef.current = false;
      cleanupMapLayers(map);
      
      // Clean up pin
      try {
        if (map.getLayer('impact-pin')) {
          map.removeLayer('impact-pin');
        }
        if (map.getSource('impact-pin')) {
          map.removeSource('impact-pin');
        }
      } catch {
        // Pin might not exist, continue
      }
      
      setCurrentSimulation(null);
      setIsAnimating(false);
      onStatusChange?.("Ready to simulate impact");
      onSimulationUpdate?.(null); // Clear simulation in parent

      map.flyTo({
        center: [predictedLocation.longitude, predictedLocation.latitude],
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
      predictedLocation,
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
            Target: {effectiveImpactLocation.latitude.toFixed(3)}°,{" "}
            {effectiveImpactLocation.longitude.toFixed(3)}°
          </div>
        )}
      </div>
    );
  }
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
