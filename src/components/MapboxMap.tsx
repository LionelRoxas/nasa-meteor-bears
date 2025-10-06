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
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedComet, setSelectedComet] = useState<CometData>(TEST_COMETS[0]);
  const [impactLocation, setImpactLocation] = useState<ImpactLocation>({
    longitude: -74.5,
    latitude: 40.7,
    city: 'New York',
    country: 'USA'
  });
  const [currentSimulation, setCurrentSimulation] = useState<ImpactSimulation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [show3DBuildings, setShow3DBuildings] = useState(true);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [enhancedBuildings, setEnhancedBuildings] = useState(true);

  // Initialize map
  useEffect(() => {
    let mapInstance: mapboxgl.Map | null = null;

    const initializeMap = async () => {
      try {
        setStatus('Loading Mapbox...');
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
        
        if (!mapContainer.current) return;
        
        setStatus('Creating 3D globe...');
        mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [impactLocation.longitude, impactLocation.latitude],
          zoom: 3,
          projection: { name: 'globe' }
        });

        mapInstance.on('load', () => {
          setStatus('Globe loaded successfully!');
          setMapLoaded(true);
          setMap(mapInstance);

          // Add 3D terrain and atmosphere
          mapInstance!.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
          mapInstance!.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
          
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
                  'case',
                  ['boolean', ['feature-state', 'destroyed'], false],
                  '#ff0000', // Destroyed buildings - red
                  ['boolean', ['feature-state', 'severely-damaged'], false],
                  '#ff6600', // Severely damaged - orange
                  ['boolean', ['feature-state', 'moderately-damaged'], false],
                  '#ffaa00', // Moderately damaged - yellow-orange
                  ['boolean', ['feature-state', 'lightly-damaged'], false],
                  '#ffff00', // Lightly damaged - yellow
                  [
                    'interpolate',
                    ['linear'],
                    ['get', 'height'],
                    0, '#7f8fa6',     // Low buildings - gray
                    50, '#718093',    // Medium buildings - darker gray
                    100, '#57606f',   // Tall buildings - dark gray
                    200, '#2f3542'    // Skyscrapers - very dark gray
                  ]
                ],
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13, 0,
                  13.5, [
                    'case',
                    ['boolean', ['feature-state', 'destroyed'], false],
                    ['*', ['get', 'height'], 0.1], // Destroyed buildings are collapsed
                    ['boolean', ['feature-state', 'severely-damaged'], false],
                    ['*', ['get', 'height'], 0.4], // Severely damaged are partially collapsed
                    ['boolean', ['feature-state', 'moderately-damaged'], false],
                    ['*', ['get', 'height'], 0.7], // Moderately damaged lose some height
                    ['get', 'height'] // Normal height for undamaged buildings
                  ]
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
            color: '#003ef6ff',
            'high-color': '#3849e1ff',
            'horizon-blend': 0.02,
            'space-color': '#000000',
            'star-intensity': 0.8
          });
        });

        // Handle clicks to set impact location
        mapInstance.on('click', (e: mapboxgl.MapMouseEvent) => {
          const { lng, lat } = e.lngLat;
          setImpactLocation({
            longitude: lng,
            latitude: lat,
            city: 'Selected Location',
            country: 'Unknown'
          });
        });

        mapInstance.on('error', (e: { error: Error }) => {
          console.error('Map error:', e.error);
          setStatus('Map error occurred');
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setStatus('Failed to initialize map');
      }
    };

    initializeMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [impactLocation.longitude, impactLocation.latitude]);

  // Update map center when impact location changes
  useEffect(() => {
    if (map && mapLoaded) {
      map.flyTo({
        center: [impactLocation.longitude, impactLocation.latitude],
        zoom: 6,
        duration: 2000
      });
      
      // Reset building colors when location changes
      if (map.getLayer('building-3d')) {
        const features = map.queryRenderedFeatures({ layers: ['building-3d'] });
        features.forEach((feature) => {
          if (feature.id) {
            map.setFeatureState(
              { source: 'composite', sourceLayer: 'building', id: feature.id },
              { 
                destroyed: false,
                'severely-damaged': false,
                'moderately-damaged': false,
                'lightly-damaged': false
              }
            );
          }
        });
      }
    }
  }, [map, mapLoaded, impactLocation]);

  // Run simulation when comet or location changes
  useEffect(() => {
    if (selectedComet && impactLocation) {
      const simulation = simulateImpact(selectedComet, impactLocation);
      setCurrentSimulation(simulation);
    }
  }, [selectedComet, impactLocation]);

  // Function to color buildings based on damage zones with enhanced damage levels
  const colorBuildingsInDamageZones = useCallback((mapInstance: mapboxgl.Map, simulation: ImpactSimulation) => {
    if (!mapInstance.getLayer('building-3d')) return;

    // Query all building features in the viewport
    const features = mapInstance.queryRenderedFeatures({ layers: ['building-3d'] });

    features.forEach((feature) => {
      if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0]) {
        // Calculate building center (simple approximation)
        const coords = feature.geometry.coordinates[0] as number[][];
        let totalLng = 0, totalLat = 0;
        coords.forEach((coord: number[]) => {
          const [lng, lat] = coord;
          totalLng += lng;
          totalLat += lat;
        });
        const buildingLng = totalLng / coords.length;
        const buildingLat = totalLat / coords.length;

        // Calculate distance from impact point to building
        const distance = calculateDistance(
          simulation.location.latitude,
          simulation.location.longitude,
          buildingLat,
          buildingLng
        );

        // Reset all damage states first
        if (feature.id) {
          mapInstance.setFeatureState(
            { source: 'composite', sourceLayer: 'building', id: feature.id },
            { 
              destroyed: false,
              'severely-damaged': false,
              'moderately-damaged': false,
              'lightly-damaged': false
            }
          );
        }

        // Determine damage level based on distance from impact
        const craterRadius = simulation.craterDiameter / 2000; // Convert to km
        
        if (distance <= craterRadius) {
          // Complete destruction zone
          if (feature.id) {
            mapInstance.setFeatureState(
              { source: 'composite', sourceLayer: 'building', id: feature.id },
              { destroyed: true }
            );
          }
        } else if (distance <= craterRadius * 2) {
          // Severe damage zone
          if (feature.id) {
            mapInstance.setFeatureState(
              { source: 'composite', sourceLayer: 'building', id: feature.id },
              { 'severely-damaged': true }
            );
          }
        } else if (distance <= craterRadius * 4) {
          // Moderate damage zone
          if (feature.id) {
            mapInstance.setFeatureState(
              { source: 'composite', sourceLayer: 'building', id: feature.id },
              { 'moderately-damaged': true }
            );
          }
        } else if (distance <= simulation.damageRadius) {
          // Light damage zone
          if (feature.id) {
            mapInstance.setFeatureState(
              { source: 'composite', sourceLayer: 'building', id: feature.id },
              { 'lightly-damaged': true }
            );
          }
        }
      }
    });
  }, []);

  // Helper function to calculate distance between two points in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Add damage zones to map
  useEffect(() => {
    if (!map || !mapLoaded || !currentSimulation) return;

    // Remove existing layers
    const layerIds = ['damage-zones', 'impact-point'];
    layerIds.forEach(id => {
      try {
        if (map.getLayer(id)) {
          map.removeLayer(id);
        }
        if (map.getSource(id)) {
          map.removeSource(id);
        }
      } catch {
        // Layer might not exist, continue
      }
    });

    // Add impact point
    map.addSource('impact-point', {
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

    map.addLayer({
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
    
    damageZones.forEach((zone, index) => {
      const sourceId = `damage-zone-${index}`;
      const layerId = `damage-zone-layer-${index}`;
      
      try {
        // Create circle for damage zone
        const coordinates = [];
        const radius = zone.radius * 1000; // Convert km to meters
        const center = [currentSimulation.location.longitude, currentSimulation.location.latitude];
        
        for (let i = 0; i <= 64; i++) {
          const angle = (i * 360) / 64;
          const radians = (angle * Math.PI) / 180;
          
          // Simple approximation for small circles
          const deltaLat = (radius * Math.cos(radians)) / 111320;
          const deltaLng = (radius * Math.sin(radians)) / (111320 * Math.cos(center[1] * Math.PI / 180));
          
          coordinates.push([center[0] + deltaLng, center[1] + deltaLat]);
        }
        coordinates.push(coordinates[0]); // Close the polygon

        map.addSource(sourceId, {
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

        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': zone.color,
            'fill-opacity': 0.3
          }
        });

        // Add outline
        map.addLayer({
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

    // Color buildings based on damage zones
    colorBuildingsInDamageZones(map, currentSimulation);

  }, [map, mapLoaded, currentSimulation, colorBuildingsInDamageZones]);

  // Function to toggle street view mode
  const toggleStreetView = useCallback(() => {
    if (!map || !mapLoaded) return;

    const newStreetViewMode = !streetViewMode;
    setStreetViewMode(newStreetViewMode);

    if (newStreetViewMode) {
      // Street view mode - close zoom, angled view, ground level perspective
      map.flyTo({
        center: [impactLocation.longitude, impactLocation.latitude],
        zoom: 18, // Very close zoom for street level
        pitch: 70, // High pitch for ground-level perspective
        bearing: 45, // Angled view
        duration: 2000
      });
    } else {
      // Aerial view mode - moderate zoom, top-down view
      map.flyTo({
        center: [impactLocation.longitude, impactLocation.latitude],
        zoom: 15,
        pitch: 45, // Moderate pitch for 3D effect
        bearing: 0, // North-facing
        duration: 2000
      });
    }
  }, [map, mapLoaded, streetViewMode, impactLocation]);

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
    if (!map || !currentSimulation || isAnimating) return;
    
    setIsAnimating(true);
    setStatus('Simulating impact...');
    
    try {
      // Zoom out to show trajectory
      await new Promise<void>((resolve) => {
        map.flyTo({
          center: [currentSimulation.location.longitude, currentSimulation.location.latitude],
          zoom: 2,
          duration: 1500
        });
        setTimeout(resolve, 1500);
      });
      
      // Show asteroid approaching
      const startLng = currentSimulation.location.longitude + 15;
      const startLat = currentSimulation.location.latitude + 10;
      
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
      
      // Animate asteroid movement
      const steps = 60;
      const lngStep = (currentSimulation.location.longitude - startLng) / steps;
      const latStep = (currentSimulation.location.latitude - startLat) / steps;
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentLng = startLng + (lngStep * i);
        const currentLat = startLat + (latStep * i);
        
        const source = map.getSource('asteroid') as mapboxgl.GeoJSONSource;
        source?.setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [currentLng, currentLat]
          },
          properties: {}
        });
        
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
      
      // Zoom to impact site - closer to see buildings
      await new Promise<void>((resolve) => {
        map.flyTo({
          center: [currentSimulation.location.longitude, currentSimulation.location.latitude],
          zoom: 16, // Much closer zoom to see 3D buildings
          pitch: 45, // Angled view for better 3D building visibility
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
    <div className={`relative w-full h-full ${className}`}>
      {/* Map Container - Full Screen */}
      <div 
        ref={mapContainer} 
        className="w-full h-full bg-black"
      />
      
      {/* Loading Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <div>Loading 3D Globe...</div>
          </div>
        </div>
      )}

      {/* Control Panel - Left Side */}
      <div className="absolute top-6 left-6 w-80 bg-black/90 backdrop-blur-md text-white rounded-lg shadow-2xl overflow-hidden z-10">
        {/* Header with Navigation */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">🌍 Impact Simulator</span>
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
          
          {/* Impact Location */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Impact Location:
            </label>
            <div className="p-3 bg-gray-800/50 rounded-md text-sm">
              <div className="text-blue-300 font-medium">{impactLocation.city}</div>
              <div className="text-gray-400 text-xs">
                {impactLocation.latitude.toFixed(4)}°, {impactLocation.longitude.toFixed(4)}°
              </div>
            </div>
          </div>
          
          {/* Status */}
          <div className="p-3 bg-gray-800/50 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Status:</div>
            <div className="text-sm text-blue-300">{status}</div>
          </div>

          {/* 3D Buildings Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md">
            <div>
              <div className="text-sm text-gray-200">3D Buildings</div>
              <div className="text-xs text-gray-400">Show building damage</div>
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
          
          {/* Building Damage Legend */}
          {show3DBuildings && (
            <div className="p-3 bg-gray-800/50 rounded-md">
              <h4 className="text-sm font-medium text-gray-200 mb-3">🏢 Building Damage Levels</h4>
              <div className="space-y-2">
                <div className="flex items-center text-xs">
                  <div className="w-4 h-4 rounded-sm mr-2 border border-gray-500" style={{ backgroundColor: '#ff0000' }}></div>
                  <div className="flex-1">
                    <span className="text-gray-200">Destroyed</span>
                    <span className="text-gray-500 ml-1">(0-0.5km)</span>
                  </div>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-4 h-4 rounded-sm mr-2 border border-gray-500" style={{ backgroundColor: '#ff6600' }}></div>
                  <div className="flex-1">
                    <span className="text-gray-200">Severe Damage</span>
                    <span className="text-gray-500 ml-1">(0.5-1km)</span>
                  </div>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-4 h-4 rounded-sm mr-2 border border-gray-500" style={{ backgroundColor: '#ffaa00' }}></div>
                  <div className="flex-1">
                    <span className="text-gray-200">Moderate Damage</span>
                    <span className="text-gray-500 ml-1">(1-2km)</span>
                  </div>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-4 h-4 rounded-sm mr-2 border border-gray-500" style={{ backgroundColor: '#ffff00' }}></div>
                  <div className="flex-1">
                    <span className="text-gray-200">Light Damage</span>
                    <span className="text-gray-500 ml-1">(2km+)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Simulate Button */}
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

          {/* Instructions */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Click anywhere on Earth to set target</p>
            <p>• Choose asteroid size and simulate</p>
            <p>• Toggle 3D buildings for damage view</p>
            <p>• Use Street View for ground perspective</p>
            <p>• Enhanced rendering for better visuals</p>
            <p>• View real-time damage analysis</p>
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
              
              {/* Damage Zones Legend */}
              <div className="mt-3">
                <h4 className="text-xs font-medium text-gray-300 mb-2">Damage Zones:</h4>
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
      {mapLoaded && (
        <div className="absolute bottom-6 right-6 bg-black/80 text-white px-3 py-2 rounded-lg text-xs">
          Target: {impactLocation.latitude.toFixed(3)}°, {impactLocation.longitude.toFixed(3)}°
        </div>
      )}
    </div>
  );
}
