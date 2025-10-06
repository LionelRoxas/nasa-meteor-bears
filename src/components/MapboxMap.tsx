'use client';

import { useRef, useEffect, useState } from 'react';
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
          
          // Add fog/atmosphere
          mapInstance!.setFog({
            color: '#220053',
            'high-color': '#ffc2a8',
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

        mapInstance.on('error', (e: mapboxgl.ErrorEvent) => {
          console.error('Map error:', e);
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
    }
  }, [map, mapLoaded, impactLocation]);

  // Run simulation when comet or location changes
  useEffect(() => {
    if (selectedComet && impactLocation) {
      const simulation = simulateImpact(selectedComet, impactLocation);
      setCurrentSimulation(simulation);
    }
  }, [selectedComet, impactLocation]);

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
      } catch (e) {
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

  }, [map, mapLoaded, currentSimulation]);

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
      
      // Zoom to impact site
      await new Promise<void>((resolve) => {
        map.flyTo({
          center: [currentSimulation.location.longitude, currentSimulation.location.latitude],
          zoom: 8,
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
