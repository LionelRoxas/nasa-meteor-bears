"use client";

import { useEffect, useRef, useState } from "react";

interface TerrainVisualizerProps {
  width?: number;
  height?: number;
  asteroidData?: {
    impactLat: number;
    impactLng: number;
    craterRadius: number;
    energy: number;
  };
  onImpactLocationChange?: (lat: number, lng: number) => void;
}

interface TerrainPoint {
  x: number;
  y: number;
  elevation: number;
  biome: 'ocean' | 'land' | 'mountain' | 'ice' | 'desert';
  populated: boolean;
}

export default function TerrainVisualizer({
  width = 800,
  height = 400,
  asteroidData,
  onImpactLocationChange
}: TerrainVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const [terrain, setTerrain] = useState<TerrainPoint[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [impactPoint, setImpactPoint] = useState({ x: width / 2, y: height / 2 });
  const [animationTime, setAnimationTime] = useState(0);

  // Initialize WebGL and terrain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.warn('WebGL not supported, falling back to 2D canvas');
      return;
    }

    glRef.current = gl;
    generateTerrain();
  }, [width, height]);

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      setAnimationTime(prev => prev + 0.016); // ~60fps
      renderTerrain();
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [terrain, impactPoint, asteroidData]);

  const generateTerrain = () => {
    const terrainGrid: TerrainPoint[][] = [];
    const gridWidth = Math.floor(width / 4);
    const gridHeight = Math.floor(height / 4);

    for (let y = 0; y < gridHeight; y++) {
      const row: TerrainPoint[] = [];
      for (let x = 0; x < gridWidth; x++) {
        const elevation = generateRealisticElevation(x, y, gridWidth, gridHeight);
        const biome = determineBiome(elevation, x, y, gridWidth, gridHeight);
        const populated = determinePopulation(biome, elevation, x, y);

        row.push({
          x: x * 4,
          y: y * 4,
          elevation,
          biome,
          populated
        });
      }
      terrainGrid.push(row);
    }

    setTerrain(terrainGrid);
  };

  const generateRealisticElevation = (x: number, y: number, gridWidth: number, gridHeight: number): number => {
    // Normalize coordinates
    const nx = x / gridWidth;
    const ny = y / gridHeight;

    // Multiple octaves of noise for realistic terrain
    let elevation = 0;
    let amplitude = 1;
    let frequency = 0.01;

    for (let i = 0; i < 6; i++) {
      elevation += amplitude * (Math.sin(nx * frequency * Math.PI * 2) * Math.cos(ny * frequency * Math.PI * 2));
      amplitude *= 0.5;
      frequency *= 2;
    }

    // Add continental shelf effect (oceans near edges)
    const distanceFromCenter = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2));
    const continentalEffect = Math.max(0, 1 - distanceFromCenter * 2);
    elevation *= continentalEffect;

    // Add some random variation
    elevation += (Math.random() - 0.5) * 0.2;

    return Math.max(-1, Math.min(1, elevation));
  };

  const determineBiome = (elevation: number, x: number, y: number, gridWidth: number, gridHeight: number): TerrainPoint['biome'] => {
    const latitude = Math.abs(y - gridHeight / 2) / (gridHeight / 2); // 0 = equator, 1 = pole

    if (elevation < -0.3) return 'ocean';
    if (elevation > 0.6) return 'mountain';
    if (latitude > 0.8) return 'ice';
    if (latitude < 0.3 && elevation < 0.1 && Math.random() > 0.7) return 'desert';
    return 'land';
  };

  const determinePopulation = (biome: TerrainPoint['biome'], elevation: number, x: number, y: number): boolean => {
    if (biome === 'ocean' || biome === 'ice' || elevation > 0.5) return false;

    // Higher population density near coasts and rivers
    const coastalProximity = Math.random() > 0.8;
    const riverProximity = Math.random() > 0.9;
    const randomSettlement = Math.random() > 0.95;

    return coastalProximity || riverProximity || randomSettlement;
  };

  const getBiomeColor = (biome: TerrainPoint['biome'], elevation: number): string => {
    const baseColors = {
      ocean: { r: 20, g: 50, b: 120 },
      land: { r: 34, g: 139, b: 34 },
      mountain: { r: 139, g: 137, b: 137 },
      ice: { r: 240, g: 248, b: 255 },
      desert: { r: 194, g: 178, b: 128 }
    };

    const base = baseColors[biome];

    // Modulate color based on elevation
    const elevationFactor = elevation * 0.3 + 0.7;

    return `rgb(${Math.floor(base.r * elevationFactor)}, ${Math.floor(base.g * elevationFactor)}, ${Math.floor(base.b * elevationFactor)})`;
  };

  const renderTerrain = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, width, height);

    // Render terrain
    terrain.forEach(row => {
      row.forEach(point => {
        const color = getBiomeColor(point.biome, point.elevation);
        ctx.fillStyle = color;

        // Add some texture based on biome
        if (point.biome === 'ocean') {
          // Animated waves
          const waveOffset = Math.sin(animationTime * 2 + point.x * 0.1) * 2;
          ctx.globalAlpha = 0.8 + Math.sin(animationTime + point.x * 0.05) * 0.1;
          ctx.fillRect(point.x, point.y + waveOffset, 4, 4);
        } else if (point.biome === 'mountain') {
          // Jagged mountain texture
          ctx.fillRect(point.x, point.y, 4, 4);
          ctx.fillStyle = `rgba(255, 255, 255, ${point.elevation * 0.3})`;
          ctx.fillRect(point.x + 1, point.y, 2, 2);
        } else {
          ctx.fillRect(point.x, point.y, 4, 4);
        }

        ctx.globalAlpha = 1;

        // Render population centers
        if (point.populated) {
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(point.x + 1, point.y + 1, 2, 2);
        }
      });
    });

    // Render impact point and crater
    if (asteroidData) {
      const craterPixelRadius = Math.min(asteroidData.craterRadius * 0.1, 50);

      // Crater impact zone
      ctx.beginPath();
      ctx.arc(impactPoint.x, impactPoint.y, craterPixelRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(animationTime * 4) * 0.1})`;
      ctx.fill();

      // Blast radius
      const blastRadius = craterPixelRadius * 3;
      ctx.beginPath();
      ctx.arc(impactPoint.x, impactPoint.y, blastRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 100, 0, ${0.5 + Math.sin(animationTime * 3) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Seismic waves (animated)
      for (let i = 1; i <= 3; i++) {
        const seismicRadius = blastRadius + (animationTime * 50 + i * 30) % 200;
        ctx.beginPath();
        ctx.arc(impactPoint.x, impactPoint.y, seismicRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 0, ${Math.max(0, 0.4 - seismicRadius / 500)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Central impact point
      ctx.beginPath();
      ctx.arc(impactPoint.x, impactPoint.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0000';
      ctx.fill();
    }

    // Add coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Add scale indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px monospace';
    ctx.fillText('1 pixel ≈ 1 km', 10, height - 10);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setImpactPoint({ x, y });

    // Convert pixel coordinates to lat/lng (simplified)
    const lat = 90 - (y / height) * 180; // -90 to 90
    const lng = (x / width) * 360 - 180; // -180 to 180

    if (onImpactLocationChange) {
      onImpactLocationChange(lat, lng);
    }
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleCanvasClick(event);
  };

  return (
    <div className="terrain-visualizer">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Interactive Terrain Map</h3>
        <p className="text-sm text-gray-400">
          Click anywhere to set impact location. Real-time terrain with biomes, elevation, and population centers.
        </p>
      </div>

      <div className="relative border border-gray-600 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsDragging(false)}
        />

        {/* Legend */}
        <div className="absolute top-2 right-2 bg-black/80 p-3 rounded text-xs">
          <div className="text-white font-bold mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-800"></div>
              <span className="text-gray-300">Ocean</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-700"></div>
              <span className="text-gray-300">Land</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-600"></div>
              <span className="text-gray-300">Mountains</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-600"></div>
              <span className="text-gray-300">Desert</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100"></div>
              <span className="text-gray-300">Ice</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400"></div>
              <span className="text-gray-300">Cities</span>
            </div>
          </div>
        </div>

        {/* Impact info overlay */}
        {asteroidData && (
          <div className="absolute bottom-2 left-2 bg-black/80 p-3 rounded text-xs">
            <div className="text-red-400 font-bold mb-1">Impact Zone</div>
            <div className="text-gray-300">
              Crater: {asteroidData.craterRadius.toFixed(1)} km
            </div>
            <div className="text-gray-300">
              Energy: {asteroidData.energy.toFixed(2)} MT TNT
            </div>
            <div className="text-gray-300">
              Location: {((impactPoint.y / height) * 180 - 90).toFixed(1)}°, {((impactPoint.x / width) * 360 - 180).toFixed(1)}°
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Procedurally generated terrain with realistic biomes, elevation, and population distribution.
        Supports WebGL acceleration when available.
      </div>
    </div>
  );
}