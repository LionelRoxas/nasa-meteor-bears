'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { CometData, ImpactLocation, ImpactSimulation } from '@/types/comet';
import { TEST_COMETS, simulateImpact, getDamageZones } from '@/lib/services/comet-simulation';

interface MapboxMapProps {
  className?: string;
}

export default function MapboxMap({ className = '' }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const initialCenterRef = useRef<[number, number]>([-74.5, 40.7]);
  const isPlacingPinRef = useRef(false);
  const currentSimulationRef = useRef<ImpactSimulation | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedComet, setSelectedComet] = useState<CometData>(TEST_COMETS[0]);
  const [impactPin, setImpactPin] = useState<ImpactLocation | null>(null);
  const [currentSimulation, setCurrentSimulation] = useState<ImpactSimulation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [status, setStatus] = useState('Click "Place Pin" then click on map');
  const [show3DBuildings, setShow3DBuildings] = useState(true);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [enhancedBuildings, setEnhancedBuildings] = useState(true);

  // Update refs when state changes
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

  // Initialize map
  useEffect(() => {
    if (map) return;

    let mapInstance: mapboxgl.Map | null = null;

    const initializeMap = async () => {
      try {
        setStatus('Loading Mapbox...');
        const mapboxgl = (await import('mapbox-gl')).default;
        
        // Check if access token is available
        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!accessToken) {
          setStatus('⚠️ Mapbox access token not found. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local');
          console.error('Mapbox access token is missing. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file');
          return;
        }
        
        mapboxgl.accessToken = accessToken;
        
        if (!mapContainer.current) {
          setStatus('Map container not found');
          return;
        }
        
        setStatus('Creating 3D globe...');
        
        // Try different map styles if satellite fails
        const mapStyles = [
          'mapbox://styles/mapbox/satellite-streets-v12',
          'mapbox://styles/mapbox/satellite-v9',
          'mapbox://styles/mapbox/streets-v12',
          'mapbox://styles/mapbox/dark-v11'
        ];
        
        const createMapWithStyle = (styleUrl: string) => {
          console.log('Attempting to load map with style:', styleUrl);
          
          return new mapboxgl.Map({
            container: mapContainer.current!,
            style: styleUrl,
            center: initialCenterRef.current,
            zoom: 3,
            projection: { name: 'globe' },
            attributionControl: false,
            preserveDrawingBuffer: true
          });
        };
        
        mapInstance = createMapWithStyle(mapStyles[0]);
        
        // Add a timeout to detect loading issues
        const loadTimeout = setTimeout(() => {
          if (!mapLoaded) {
            console.warn('Map taking too long to load, this might indicate an issue');
            setStatus('Map is taking longer than expected to load...');
          }
        }, 10000);

        // Add load event listener
        mapInstance.on('load', () => {
          console.log('Map loaded successfully');
          setStatus('Globe loaded successfully!');
          setMapLoaded(true);
          setMap(mapInstance);
          clearTimeout(loadTimeout); // Clear the timeout when map loads

          // Add 3D terrain and atmosphere
          try {
            mapInstance!.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14
            });
            mapInstance!.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
          } catch (terrainError) {
            console.warn('Terrain loading failed:', terrainError);
            // Continue without terrain
          }
          
          // Add enhanced 3D buildings layer
          if (!mapInstance!.getLayer('building-3d')) {
            mapInstance!.addLayer({
              id: 'building-3d',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 13,
              paint: {
                'fill-extrusion-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'height'],
                  0, '#7f8fa6',     // Low buildings - gray
                  50, '#718093',    // Medium buildings - darker gray
                  100, '#57606f',   // Tall buildings - dark gray
                  200, '#2f3542'    // Skyscrapers - very dark gray
                ],
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13, 0,
                  13.5, ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13, 0,
                  13.5, ['get', 'min_height']
                ],
                'fill-extrusion-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13, 0.7,
                  16, 0.82,
                  18, 0.9
                ],
                // Add ambient occlusion effect
                'fill-extrusion-ambient-occlusion-intensity': 0.3,
                'fill-extrusion-ambient-occlusion-radius': 3,
                // Add flood lighting for more dramatic effect
                'fill-extrusion-flood-light-intensity': 0.4,
                'fill-extrusion-flood-light-color': '#ffffff',
                // Add vertical gradient
                'fill-extrusion-vertical-gradient': true
              }
            }, 'waterway-label');
          }
          
          // Add building shadows for more realism
          if (!mapInstance!.getLayer('building-shadows')) {
            mapInstance!.addLayer({
              id: 'building-shadows',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 16,
              paint: {
                'fill-extrusion-color': 'rgba(0,0,0,0.4)',
                'fill-extrusion-height': 1,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  16, 0,
                  17, 0.6
                ],
                'fill-extrusion-translate': [2, 2],
                'fill-extrusion-translate-anchor': 'map'
              }
            }, 'building-3d');
          }
          
          // Add fog/atmosphere earth border color
          mapInstance!.setFog({
            color: '#003ef6',
            'high-color': '#3849e1',
            'horizon-blend': 0.02,
            'space-color': '#000000',
            'star-intensity': 0.8
          });
        });

        // Add style load event listener
        mapInstance.on('styledata', () => {
          console.log('Map style loaded');
        });

        // Add source data event listener
        mapInstance.on('sourcedata', (e) => {
          if (e.isSourceLoaded) {
            console.log('Source data loaded:', e.sourceId);
          }
        });

        // Add idle event listener
        mapInstance.on('idle', () => {
          console.log('Map is idle and ready');
        });

        // Handle clicks to place impact pin
        mapInstance.on('click', (e: mapboxgl.MapMouseEvent) => {
          console.log('Map clicked - isPlacingPin:', isPlacingPinRef.current, 'currentSimulation:', currentSimulationRef.current);
          if (isPlacingPinRef.current && !currentSimulationRef.current) {
            const { lng, lat } = e.lngLat;
            console.log('Placing pin at:', lng, lat);
            setImpactPin({
              longitude: lng,
              latitude: lat,
              city: 'Selected Location',
              country: 'Unknown'
            });
            setIsPlacingPin(false);
            setStatus('Pin placed! Ready to simulate impact');
          }
        });

        mapInstance.on('error', (e: { error: Error }) => {
          console.error('Map error:', e.error);
          setStatus(`Map error: ${e.error.message}`);
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setStatus(`Failed to initialize map: ${errorMessage}`);
      }
    };

    initializeMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps to prevent reinitialization

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
    if (!impactPin) return;

    // Add red pin marker
    currentMap.addSource('impact-pin', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [impactPin.longitude, impactPin.latitude]
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
      center: [impactPin.longitude, impactPin.latitude],
      zoom: 10, // Moderate zoom to see the area without being too close
      duration: 2000
    });
  }, [map, mapLoaded, impactPin]);

  // Function to add crater visualization to the map
  const addCraterVisualization = useCallback((mapInstance: mapboxgl.Map, simulation: ImpactSimulation) => {
    const craterRadius = simulation.craterDiameter / 2; // Radius in meters
    const center = [simulation.location.longitude, simulation.location.latitude];

    // Remove existing crater layers
    ['crater-rim', 'crater-interior', 'vaporization-zone'].forEach(layerId => {
      try {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId);
        }
        if (mapInstance.getSource(layerId)) {
          mapInstance.removeSource(layerId);
        }
      } catch {
        // Layer might not exist
      }
    });

    // Create crater interior (dark depression)
    const craterInteriorCoords = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i * 360) / 64;
      const radians = (angle * Math.PI) / 180;
      const deltaLat = (craterRadius * 0.8 * Math.cos(radians)) / 111320;
      const deltaLng = (craterRadius * 0.8 * Math.sin(radians)) / (111320 * Math.cos(center[1] * Math.PI / 180));
      craterInteriorCoords.push([center[0] + deltaLng, center[1] + deltaLat]);
    }
    craterInteriorCoords.push(craterInteriorCoords[0]);

    mapInstance.addSource('crater-interior', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [craterInteriorCoords]
        },
        properties: {}
      }
    });

    mapInstance.addLayer({
      id: 'crater-interior',
      type: 'fill',
      source: 'crater-interior',
      paint: {
        'fill-color': '#2c1810',
        'fill-opacity': 0.9
      }
    });

    // Create crater rim (raised edge)
    const craterRimCoords = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i * 360) / 64;
      const radians = (angle * Math.PI) / 180;
      const deltaLat = (craterRadius * Math.cos(radians)) / 111320;
      const deltaLng = (craterRadius * Math.sin(radians)) / (111320 * Math.cos(center[1] * Math.PI / 180));
      craterRimCoords.push([center[0] + deltaLng, center[1] + deltaLat]);
    }
    craterRimCoords.push(craterRimCoords[0]);

    mapInstance.addSource('crater-rim', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [craterRimCoords]
        },
        properties: {}
      }
    });

    mapInstance.addLayer({
      id: 'crater-rim',
      type: 'line',
      source: 'crater-rim',
      paint: {
        'line-color': '#8B4513',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Create vaporization zone (innermost circle)
    const vaporizeCoords = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i * 360) / 64;
      const radians = (angle * Math.PI) / 180;
      const deltaLat = (craterRadius * 0.3 * Math.cos(radians)) / 111320;
      const deltaLng = (craterRadius * 0.3 * Math.sin(radians)) / (111320 * Math.cos(center[1] * Math.PI / 180));
      vaporizeCoords.push([center[0] + deltaLng, center[1] + deltaLat]);
    }
    vaporizeCoords.push(vaporizeCoords[0]);

    mapInstance.addSource('vaporization-zone', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [vaporizeCoords]
        },
        properties: {}
      }
    });

    mapInstance.addLayer({
      id: 'vaporization-zone',
      type: 'fill',
      source: 'vaporization-zone',
      paint: {
        'fill-color': '#000000',
        'fill-opacity': 0.95
      }
    });

  }, []);

  // Function to create crater visualization
  const createCraterAndAlterBuildings = useCallback((mapInstance: mapboxgl.Map, simulation: ImpactSimulation) => {
    try {
      // Add crater visualization
      addCraterVisualization(mapInstance, simulation);
    } catch (error) {
      console.error('Error creating crater visualization:', error);
    }
  }, [addCraterVisualization]);

  // Comprehensive cleanup function
  const cleanupMapLayers = useCallback((mapInstance: mapboxgl.Map) => {
    if (!mapInstance) return;

    try {
      // Remove existing impact-related layers and sources
      const layerIds = ['damage-zones', 'impact-point', 'impact-pin'];
      layerIds.forEach(id => {
        try {
          if (mapInstance.getLayer(id)) {
            mapInstance.removeLayer(id);
          }
          if (mapInstance.getSource(id)) {
            mapInstance.removeSource(id);
          }
        } catch {
          // Layer might not exist, continue
        }
      });

      // Remove all dynamically created damage zone layers and sources
      for (let i = 0; i < 10; i++) { // Assuming max 10 damage zones
        const sourceId = `damage-zone-${i}`;
        const layerId = `damage-zone-layer-${i}`;
        const outlineLayerId = `${layerId}-outline`;

        try {
          if (mapInstance.getLayer(outlineLayerId)) {
            mapInstance.removeLayer(outlineLayerId);
          }
          if (mapInstance.getLayer(layerId)) {
            mapInstance.removeLayer(layerId);
          }
          if (mapInstance.getSource(sourceId)) {
            mapInstance.removeSource(sourceId);
          }
        } catch {
          // Layer might not exist, continue
        }
      }

      // Remove crater-related layers and sources
      const craterIds = ['crater-interior', 'crater-rim', 'vaporization-zone'];
      craterIds.forEach(id => {
        try {
          if (mapInstance.getLayer(id)) {
            mapInstance.removeLayer(id);
          }
          if (mapInstance.getSource(id)) {
            mapInstance.removeSource(id);
          }
        } catch {
          // Layer might not exist, continue
        }
      });

      // Remove asteroid layer if it exists
      try {
        if (mapInstance.getLayer('asteroid')) {
          mapInstance.removeLayer('asteroid');
        }
        if (mapInstance.getSource('asteroid')) {
          mapInstance.removeSource('asteroid');
        }
      } catch {
        // Layer might not exist, continue
      }
    } catch (error) {
      console.error('Error during map cleanup:', error);
    }
  }, []);

  // Reset simulation function
  const resetSimulation = useCallback(() => {
    if (!map) return;

    // Clear all map layers and sources
    cleanupMapLayers(map);

    // Reset simulation state
    setCurrentSimulation(null);
    setIsAnimating(false);
    setImpactPin(null);
    setIsPlacingPin(false);
    setStatus('Click "Place Pin" then click on map');

    // Reset view to initial position
    map.flyTo({
      center: initialCenterRef.current,
      zoom: 3,
      pitch: 0,
      bearing: 0,
      duration: 1500
    });
  }, [map, cleanupMapLayers]);

  // Add damage zones to map (only after impact simulation)
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

    // Create crater and alter buildings based on damage zones
    createCraterAndAlterBuildings(currentMap, currentSimulation);

  }, [map, mapLoaded, currentSimulation, createCraterAndAlterBuildings, cleanupMapLayers]);

  // Function to toggle street view mode
  const toggleStreetView = useCallback(() => {
    if (!map || !mapLoaded || !impactPin) return;

    const newStreetViewMode = !streetViewMode;
    setStreetViewMode(newStreetViewMode);

    if (newStreetViewMode) {
      // Street view mode - close zoom, angled view, ground level perspective
      map.flyTo({
        center: [impactPin.longitude, impactPin.latitude],
        zoom: 18, // Very close zoom for street level
        pitch: 70, // High pitch for ground-level perspective
        bearing: 45, // Angled view
        duration: 2000
      });
    } else {
      // Aerial view mode - moderate zoom, top-down view
      map.flyTo({
        center: [impactPin.longitude, impactPin.latitude],
        zoom: 15,
        pitch: 45, // Moderate pitch for 3D effect
        bearing: 0, // North-facing
        duration: 2000
      });
    }
  }, [map, mapLoaded, streetViewMode, impactPin]);

  // Toggle enhanced buildings with better materials and lighting
  const toggleEnhancedBuildings = useCallback(() => {
    if (!map || !map.getLayer('building-3d')) return;

    const newEnhanced = !enhancedBuildings;
    setEnhancedBuildings(newEnhanced);

    if (newEnhanced) {
      // Enhanced mode - more realistic colors and lighting
      map.setPaintProperty('building-3d', 'fill-extrusion-ambient-occlusion-intensity', 0.5);
      map.setPaintProperty('building-3d', 'fill-extrusion-flood-light-intensity', 0.6);
      map.setPaintProperty('building-3d', 'fill-extrusion-vertical-gradient', true);
    } else {
      // Simple mode - basic rendering
      map.setPaintProperty('building-3d', 'fill-extrusion-ambient-occlusion-intensity', 0.1);
      map.setPaintProperty('building-3d', 'fill-extrusion-flood-light-intensity', 0.2);
      map.setPaintProperty('building-3d', 'fill-extrusion-vertical-gradient', false);
    }
  }, [map, enhancedBuildings]);
  const toggle3DBuildings = () => {
    if (!map) return;
    
    const newVisibility = !show3DBuildings;
    setShow3DBuildings(newVisibility);
    
    // Toggle both building layers
    if (map.getLayer('building-3d')) {
      map.setLayoutProperty('building-3d', 'visibility', newVisibility ? 'visible' : 'none');
    }
    if (map.getLayer('building-shadows')) {
      map.setLayoutProperty('building-shadows', 'visibility', newVisibility ? 'visible' : 'none');
    }
  };

  const runImpactAnimation = async () => {
    if (!map || !impactPin || isAnimating) return;
    
    setIsAnimating(true);
    setStatus('Simulating impact...');
    
    try {
      // Create simulation from pin location
      const simulation = simulateImpact(selectedComet, impactPin);
      
      // Zoom out to show trajectory from space
      await new Promise<void>((resolve) => {
        map.flyTo({
          center: [impactPin.longitude, impactPin.latitude],
          zoom: 2, // Space view to see Earth
          duration: 1500
        });
        setTimeout(resolve, 1500);
      });
      
      // Show asteroid approaching
      const startLng = impactPin.longitude + 15;
      const startLat = impactPin.latitude + 10;
      
      // Add asteroid marker
      map.addSource('asteroid', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [startLng, startLat]
          },
          properties: {}
        }
      });

      map.addLayer({
        id: 'asteroid',
        type: 'circle',
        source: 'asteroid',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ff8800',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });
      
      // Animate asteroid movement with gradual zoom
      const steps = 60;
      const lngStep = (impactPin.longitude - startLng) / steps;
      const latStep = (impactPin.latitude - startLat) / steps;
      const startZoom = 2; // Space view
      const endZoom = 8;   // Regional view when approaching
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentLng = startLng + (lngStep * i);
        const currentLat = startLat + (latStep * i);
        
        // Update asteroid position
        const source = map.getSource('asteroid') as mapboxgl.GeoJSONSource;
        source?.setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [currentLng, currentLat]
          },
          properties: {}
        });
        
        // Gradually zoom in starting from halfway point
        if (progress >= 0.5) {
          const zoomProgress = (progress - 0.5) * 2; // 0 to 1 for second half
          const currentZoom = startZoom + (endZoom - startZoom) * zoomProgress;
          
          map.setCenter([currentLng, currentLat]);
          map.setZoom(currentZoom);
        }
        
        // Update status during animation
        setStatus(`Asteroid approaching... ${Math.round(progress * 100)}%`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Remove asteroid after impact
      if (map.getLayer('asteroid')) {
        map.removeLayer('asteroid');
      }
      if (map.getSource('asteroid')) {
        map.removeSource('asteroid');
      }
      
      // Set simulation to trigger damage zone rendering
      setCurrentSimulation(simulation);
      
      // Zoom to impact site - balanced view to see crater and damage zones
      await new Promise<void>((resolve) => {
        map.flyTo({
          center: [impactPin.longitude, impactPin.latitude],
          zoom: 12, // Balanced zoom to see crater and surrounding damage zones
          pitch: 35, // Moderate angled view for good 3D building visibility
          duration: 2000
        });
        setTimeout(resolve, 2000);
      });
      
      setStatus('Impact simulation complete!');
      
    } catch (error) {
      console.error('Animation error:', error);
      setStatus('Animation error occurred');
    }
    
    setIsAnimating(false);
  };

  return (
    <div className={`relative w-full h-screen bg-gray-900 ${className}`}>
      {/* Map Container - Full Screen */}
      <div 
        ref={mapContainer} 
        className={`absolute inset-0 w-full h-full ${isPlacingPin ? 'cursor-crosshair' : ''}`}
        style={{ 
          minHeight: '100vh',
          backgroundColor: '#1a1a1a' // Fallback background
        }}
      />
      
      {/* Loading/Error Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-white text-center max-w-md p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <div className="mb-2 text-lg">Loading 3D Globe...</div>
            <div className="text-sm text-gray-300">{status}</div>
            {status.includes('access token') && (
              <div className="mt-4 p-4 bg-red-900/50 rounded-lg text-sm">
                <div className="font-bold text-red-300 mb-2">Setup Required:</div>
                <div className="text-left">
                  1. Get a free Mapbox token from{' '}
                  <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                    mapbox.com
                  </a>
                  <br />
                  2. Create <code className="bg-gray-800 px-1 rounded">.env.local</code> in your project root
                  <br />
                  3. Add: <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Panel - Left Side */}
      <div className="absolute top-6 left-6 w-80 max-h-[calc(100vh-3rem)] bg-black/90 backdrop-blur-md text-white rounded-lg shadow-2xl overflow-y-auto overflow-x-hidden z-10">
        {/* Header with Navigation */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Impact Simulator</span>
            <div className="flex items-center">
              {!mapLoaded && <span className="animate-pulse">⏳</span>}
              {mapLoaded && <span className="text-green-400">✅</span>}
            </div>
          </div>
          {/* Navigation Links */}
          <div className="flex gap-2">
            <Link 
              href="/"
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
            >
              🏠 Home
            </Link>
            <Link 
              href="/game"
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
            >
              🎮 Game
            </Link>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Asteroid Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Select Asteroid/Comet:
            </label>
            <select
              value={selectedComet.id}
              onChange={(e) => {
                const comet = TEST_COMETS.find(c => c.id === e.target.value);
                if (comet) setSelectedComet(comet);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TEST_COMETS.map(comet => (
                <option key={comet.id} value={comet.id} className="bg-gray-800">
                  {comet.name} ({comet.diameter}m)
                </option>
              ))}
            </select>
          </div>
          
          {/* Impact Pin Location */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Impact Pin:
            </label>
            <div className="p-3 bg-gray-800/50 rounded-md text-sm">
              {impactPin ? (
                <>
                  <div className="text-blue-300 font-medium">{impactPin.city}</div>
                  <div className="text-gray-400 text-xs">
                    {impactPin.latitude.toFixed(4)}°, {impactPin.longitude.toFixed(4)}°
                  </div>
                </>
              ) : currentSimulation ? (
                <div className="text-gray-400">Reset to place new pin</div>
              ) : (
                <div className="text-gray-400">No pin placed</div>
              )}
            </div>
          </div>

          {/* Pin Controls */}
          {!currentSimulation && (
            <div className="space-y-2">
              {!impactPin ? (
                <button
                  onClick={() => {
                    setIsPlacingPin(true);
                    setStatus('Click anywhere on Earth to place pin');
                  }}
                  disabled={isAnimating}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-md font-medium transition-all disabled:cursor-not-allowed"
                >
                  {isPlacingPin ? '📍 Pinning...' : '📍 Place Pin'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setImpactPin(null);
                    setIsPlacingPin(false);
                    setStatus('Click "Place Pin" then click on map');
                  }}
                  disabled={isAnimating}
                  className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-md font-medium transition-all disabled:cursor-not-allowed"
                >
                  🗑️ Remove Pin
                </button>
              )}
            </div>
          )}
          
          {/* Status */}
          <div className="p-3 bg-gray-800/50 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Status:</div>
            <div className="text-sm text-blue-300">{status}</div>
          </div>

          {/* 3D Buildings Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md">
            <div>
              <div className="text-sm text-gray-200">Toggle Buildings</div>
              <div className="text-xs text-gray-400">Show/hide buildings</div>
            </div>
            <button
              onClick={toggle3DBuildings}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                show3DBuildings ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  show3DBuildings ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Street View Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md">
            <div>
              <div className="text-sm text-gray-200">Street View Mode</div>
              <div className="text-xs text-gray-400">Ground-level perspective</div>
            </div>
            <button
              onClick={toggleStreetView}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                streetViewMode ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  streetViewMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Enhanced Buildings Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md">
            <div>
              <div className="text-sm text-gray-200">Enhanced Rendering</div>
              <div className="text-xs text-gray-400">Better lighting & shadows</div>
            </div>
            <button
              onClick={toggleEnhancedBuildings}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                enhancedBuildings ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enhancedBuildings ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Simulate Button - Only show when pin is placed but no simulation */}
          {impactPin && !currentSimulation && (
            <button
              onClick={runImpactAnimation}
              disabled={isAnimating || !mapLoaded}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-md font-medium transition-all disabled:cursor-not-allowed shadow-lg"
            >
              {isAnimating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Simulating...
                </div>
              ) : (
                '🚀 Simulate Impact'
              )}
            </button>
          )}

          {/* Reset Button - Only show when simulation exists */}
          {currentSimulation && (
            <button
              onClick={resetSimulation}
              disabled={isAnimating}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-md font-medium transition-all disabled:cursor-not-allowed shadow-lg"
            >
              🔄 Reset Simulation
            </button>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Click &quot;Place Pin&quot; then click on Earth</p>
            <p>• Choose asteroid size and simulate impact</p>
            <p>• View crater impact zones after simulation</p>
            <p>• Toggle buildings for 3D view</p>
            <p>• Use Street View for ground perspective</p>
            <p>• Reset to start a new simulation</p>
          </div>
        </div>

        {/* Impact Analysis */}
        {currentSimulation && (
          <div className="border-t border-gray-700">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">📊 Impact Analysis</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-gray-400">Impact Energy</div>
                  <div className="text-red-400 font-bold">
                    {currentSimulation.impactEnergy.toLocaleString()} MT
                  </div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-gray-400">Crater Ø</div>
                  <div className="text-orange-400 font-bold">
                    {(currentSimulation.craterDiameter / 1000).toFixed(1)} km
                  </div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-gray-400">Damage Radius</div>
                  <div className="text-yellow-400 font-bold">
                    {currentSimulation.damageRadius.toFixed(1)} km
                  </div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-gray-400">Casualties</div>
                  <div className="text-red-500 font-bold">
                    {(currentSimulation.casualties / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>
              
              {/* Crater Impact Zones Legend */}
              <div className="mt-3">
                <h4 className="text-xs font-medium text-gray-300 mb-2">🎯 Crater Impact Zones:</h4>
                <div className="space-y-1">
                  {getDamageZones(currentSimulation).map((zone, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <div 
                        className="w-3 h-3 rounded-sm mr-2 border border-gray-500"
                        style={{ backgroundColor: zone.color }}
                      ></div>
                      <div className="flex-1">
                        <span className="text-gray-300">{zone.type.replace('_', ' ')}</span>
                        <span className="text-gray-500 ml-1">({zone.radius.toFixed(1)}km)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Display - Bottom Right */}
      {mapLoaded && impactPin && (
        <div className="absolute bottom-6 right-6 bg-black/80 text-white px-3 py-2 rounded-lg text-xs">
          Target: {impactPin.latitude.toFixed(3)}°, {impactPin.longitude.toFixed(3)}°
        </div>
      )}
    </div>
  );
}
