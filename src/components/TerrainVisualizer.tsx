"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  realTerrainService,
  RealTerrainData,
} from "@/services/realTerrainData";

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
  simulationPhase?: "approach" | "impact" | "aftermath";
  showImpact?: boolean;
  enhancedPrediction?: {
    risk_score?: number;
    threat_category?: string;
    correlation_context?: {
      top_similar_earthquakes?: number;
    };
    llm_analysis?: {
      historical_comparison?: string;
    };
    impact_physics?: {
      craterDiameter?: number;
      affectedRadius?: number;
      energy?: number;
      megatonsEquivalent?: number;
    };
    impact_location?: {
      latitude?: number;
      longitude?: number;
    };
  };
}

interface TerrainPoint {
  x: number;
  y: number;
  elevation: number;
  biome: "ocean" | "land" | "mountain" | "ice" | "desert";
  populated: boolean;
}

export default function TerrainVisualizer({
  width = 800,
  height = 400,
  asteroidData,
  onImpactLocationChange,
  simulationPhase = "approach",
  showImpact = false,
  enhancedPrediction,
}: TerrainVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [terrain, setTerrain] = useState<TerrainPoint[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [impactPoint, setImpactPoint] = useState({
    x: width / 2,
    y: height / 2,
  });
  const [animationTime, setAnimationTime] = useState(0);
  const [currentImpactCoords, setCurrentImpactCoords] = useState({
    lat: 0,
    lng: 0,
  });
  const [realTerrainInfo, setRealTerrainInfo] =
    useState<RealTerrainData | null>(null);

  // Enhanced visualization state
  const [cameraAngle, setCameraAngle] = useState(0); // 0 = 2D top-down, π/2 = 3D side view
  const [impactIntensity, setImpactIntensity] = useState(0); // 0-1 impact animation intensity
  const [shockwaveRadius, setShockwaveRadius] = useState(0);
  const [debrisParticles, setDebrisParticles] = useState<
    Array<{ x: number; y: number; vx: number; vy: number; life: number }>
  >([]);
  const [craterDepth, setCraterDepth] = useState(0);
  const [seismicWaves, setSeismicWaves] = useState<
    Array<{ radius: number; intensity: number; phase: number }>
  >([]);

  // Dynamic impact physics state from real consequence prediction data
  const [realCraterDiameter, setRealCraterDiameter] = useState<number>(0); // km
  const [realAffectedRadius, setRealAffectedRadius] = useState<number>(0); // km
  const [, setRealEnergy] = useState<number>(0); // Joules
  const [realMegatons, setRealMegatons] = useState<number>(0); // MT TNT

  // Track last generated terrain to prevent unnecessary regeneration
  const lastTerrainKeyRef = useRef<string>("");

  // Get realistic characteristics for a geographic region
  const getRegionCharacteristics = useCallback((lat: number, lng: number) => {
    const absLat = Math.abs(lat);

    // Ocean regions
    if (isOceanRegion(lat, lng)) {
      return {
        baseElevation: -0.8,
        terrainType: "ocean",
        roughness: 0.1,
        waterPresence: 1.0,
        populationDensity: 0.0,
        climaticZone: "marine",
      };
    }

    // Major mountain ranges
    if (isMountainRegion(lat, lng)) {
      return {
        baseElevation: 0.6,
        terrainType: "mountain",
        roughness: 0.8,
        waterPresence: 0.2,
        populationDensity: 0.1,
        climaticZone: "alpine",
      };
    }

    // Desert regions
    if (isDesertRegion(lat, lng)) {
      return {
        baseElevation: 0.1,
        terrainType: "desert",
        roughness: 0.3,
        waterPresence: 0.05,
        populationDensity: 0.05,
        climaticZone: "arid",
      };
    }

    // Polar regions
    if (absLat > 65) {
      return {
        baseElevation: 0.0,
        terrainType: "ice",
        roughness: 0.2,
        waterPresence: 0.1,
        populationDensity: 0.01,
        climaticZone: "polar",
      };
    }

    // Temperate plains (default)
    return {
      baseElevation: 0.2,
      terrainType: "land",
      roughness: 0.4,
      waterPresence: 0.3,
      populationDensity: getPopulationDensityForRegion(lat, lng),
      climaticZone: "temperate",
    };
  }, []);

  // Get real-world terrain data for a specific location
  const getRealisticTerrain = useCallback(async (lat: number, lng: number) => {
    try {
      console.log("🌍 Fetching REAL terrain data from APIs for:", lat, lng);
      // Use the real terrain data service to get actual Earth data
      const realData = await realTerrainService.getTerrainData(lat, lng);

      console.log("✅ Real terrain data received:", {
        location: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        type: realData.landCoverType,
        elevation: `${realData.elevation}m`,
        isWater: realData.isWater,
        city: realData.nearestCity?.name,
        country: realData.countryName,
      });

      return {
        baseElevation: realData.elevation / 4000, // Normalize to -1 to 1 range
        terrainType: realData.landCoverType,
        roughness: realData.landCoverType === "mountain" ? 0.8 : 0.3,
        waterPresence: realData.isWater ? 1.0 : 0.2,
        populationDensity: realData.populationDensity / 1000, // Normalize
        climaticZone: realData.landCoverType === "ice" ? "polar" : "temperate",
        realData, // Include the full real data for reference
      };
    } catch (error) {
      console.warn(
        "Failed to get real terrain data, using fallback simulation:",
        error
      );
      return simulateRealisticTerrain(lat, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulate realistic terrain based on known geographic features
  const simulateRealisticTerrain = useCallback(
    async (centerLat: number, centerLng: number) => {
      // Define known geographic regions and their characteristics
      const regionData = getRegionCharacteristics(centerLat, centerLng);

      return {
        baseElevation: regionData.baseElevation,
        terrainType: regionData.terrainType,
        roughness: regionData.roughness,
        waterPresence: regionData.waterPresence,
        populationDensity: regionData.populationDensity,
        climaticZone: regionData.climaticZone,
      };
    },
    [getRegionCharacteristics]
  );

  // Helper functions to identify real geographic regions
  const isOceanRegion = (lat: number, lng: number): boolean => {
    // Major ocean areas (simplified)
    // Pacific Ocean
    if (lng > 120 || lng < -80) return true;
    // Atlantic Ocean
    if (lng > -80 && lng < -10 && (lat > 60 || lat < -60)) return true;
    if (lng > -60 && lng < 20 && lat > 50) return true;
    // Indian Ocean (including Arabian Sea and Bay of Bengal)
    if (lng > 40 && lng < 100 && lat < 30 && lat > -50) return true;
    // Mediterranean Sea
    if (lng > -5 && lng < 37 && lat > 30 && lat < 46) return true;
    // Gulf of Mexico and Caribbean
    if (lng > -100 && lng < -60 && lat > 10 && lat < 32) return true;
    return false;
  };

  const isMountainRegion = (lat: number, lng: number): boolean => {
    // Himalayas
    if (lat > 25 && lat < 40 && lng > 70 && lng < 105) return true;
    // Rocky Mountains
    if (lat > 30 && lat < 60 && lng > -125 && lng < -105) return true;
    // Andes
    if (lat > -55 && lat < 15 && lng > -80 && lng < -65) return true;
    // Alps
    if (lat > 43 && lat < 49 && lng > 5 && lng < 17) return true;
    // Urals
    if (lat > 50 && lat < 70 && lng > 55 && lng < 65) return true;
    return false;
  };

  const isDesertRegion = (lat: number, lng: number): boolean => {
    // Sahara
    if (lat > 10 && lat < 35 && lng > -20 && lng < 35) return true;
    // Arabian Desert
    if (lat > 15 && lat < 35 && lng > 35 && lng < 60) return true;
    // Gobi Desert
    if (lat > 35 && lat < 50 && lng > 90 && lng < 120) return true;
    // Australian Outback
    if (lat > -35 && lat < -15 && lng > 115 && lng < 155) return true;
    // Southwestern US deserts
    if (lat > 25 && lat < 40 && lng > -120 && lng < -105) return true;
    return false;
  };

  const getPopulationDensityForRegion = (lat: number, lng: number): number => {
    // Major population centers
    // East Asia (China, Japan, Korea)
    if (lat > 20 && lat < 50 && lng > 100 && lng < 145) return 0.8;
    // Indian Subcontinent
    if (lat > 5 && lat < 40 && lng > 65 && lng < 95) return 0.7;
    // Europe
    if (lat > 35 && lat < 70 && lng > -10 && lng < 40) return 0.6;
    // Eastern North America
    if (lat > 25 && lat < 50 && lng > -100 && lng < -65) return 0.5;
    // Southeast Asia
    if (lat > -10 && lat < 25 && lng > 95 && lng < 140) return 0.4;

    return 0.1; // Default low density
  };

  const generateRegionSpecificElevation = (
    lat: number,
    lng: number,
    terrainData: {
      baseElevation: number;
      terrainType: string;
      roughness: number;
    }
  ): number => {
    let elevation = terrainData.baseElevation;

    // Add local variations based on terrain type
    const localVariation = (Math.random() - 0.5) * terrainData.roughness;
    elevation += localVariation;

    // Add realistic terrain features
    if (terrainData.terrainType === "mountain") {
      // Mountain peaks and valleys
      const peakNoise = Math.sin(lat * 10) * Math.cos(lng * 8) * 0.3;
      elevation += peakNoise;
    } else if (terrainData.terrainType === "ocean") {
      // Ocean depth variations
      const depthVariation = Math.sin(lat * 5) * Math.cos(lng * 7) * 0.2;
      elevation += depthVariation;
    }

    return Math.max(-1, Math.min(1.5, elevation));
  };

  const determineRealisticBiome = (
    elevation: number,
    lat: number,
    lng: number,
    terrainData: {
      terrainType: string;
    }
  ): TerrainPoint["biome"] => {
    if (terrainData.terrainType === "ocean" || elevation < -0.1) return "ocean";
    if (terrainData.terrainType === "mountain" || elevation > 0.6)
      return "mountain";
    if (terrainData.terrainType === "ice" || Math.abs(lat) > 65) return "ice";
    if (terrainData.terrainType === "desert") return "desert";
    return "land";
  };

  const determineRealisticPopulation = (
    biome: TerrainPoint["biome"],
    elevation: number,
    lat: number,
    lng: number,
    terrainData: {
      populationDensity: number;
    }
  ): boolean => {
    if (biome === "ocean" || biome === "ice" || elevation > 0.6) return false;
    return Math.random() < terrainData.populationDensity;
  };

  const generateTerrain = useCallback(async () => {
    // Prioritize trajectory data from enhanced prediction over asteroidData
    let impactLat: number;
    let impactLng: number;

    if (enhancedPrediction?.impact_location) {
      // Use real trajectory coordinates from consequence prediction
      impactLat = enhancedPrediction.impact_location.latitude ?? 0;
      impactLng = enhancedPrediction.impact_location.longitude ?? 0;
      console.log(
        "Using REAL trajectory coordinates from prediction:",
        impactLat.toFixed(2),
        impactLng.toFixed(2)
      );
    } else if (asteroidData) {
      // Fallback to asteroidData if available
      impactLat = asteroidData.impactLat;
      impactLng = asteroidData.impactLng;
      console.log(
        "Using fallback coordinates from asteroidData:",
        impactLat,
        impactLng
      );
    } else {
      // No data available, cannot generate terrain
      console.warn("No impact location data available for terrain generation");
      return;
    }

    console.log(
      "Generating realistic terrain for impact at:",
      impactLat,
      impactLng
    );

    // Update current impact coordinates state
    setCurrentImpactCoords({ lat: impactLat, lng: impactLng });

    // Center the impact point on the canvas
    setImpactPoint({ x: width / 2, y: height / 2 });

    // Get terrain characteristics for the impact region
    const terrainData = await getRealisticTerrain(impactLat, impactLng);

    // Store the real terrain info for display
    if ("realData" in terrainData && terrainData.realData) {
      setRealTerrainInfo(terrainData.realData);
    }

    const terrainGrid: TerrainPoint[][] = [];
    const gridWidth = Math.floor(width / 3);
    const gridHeight = Math.floor(height / 3);

    // Define the area to show based on REAL crater radius and affected area
    const realCraterKm = realCraterDiameter || asteroidData?.craterRadius || 1;
    const realAffectedKm = realAffectedRadius || realCraterKm * 10;

    // Show area based on real affected radius, with minimum for visibility
    const viewRadius = Math.max(realAffectedKm * 1.5, 30); // Show 1.5x affected radius or minimum 30km
    const terrainSpanLat = viewRadius / 111; // Rough km to degrees conversion
    const terrainSpanLng =
      viewRadius / (111 * Math.cos((impactLat * Math.PI) / 180));

    console.log(
      `Terrain view: ${viewRadius.toFixed(
        1
      )}km radius for ${realCraterKm.toFixed(
        2
      )}km crater (${realMegatons.toFixed(2)} MT)`
    );

    console.log(
      `Showing ${viewRadius}km radius around impact (${terrainSpanLat.toFixed(
        2
      )}° x ${terrainSpanLng.toFixed(2)}°)`
    );

    for (let y = 0; y < gridHeight; y++) {
      const row: TerrainPoint[] = [];
      for (let x = 0; x < gridWidth; x++) {
        const lat =
          impactLat + (y - gridHeight / 2) * (terrainSpanLat / gridHeight);
        const lng =
          impactLng + (x - gridWidth / 2) * (terrainSpanLng / gridWidth);

        const elevation = generateRegionSpecificElevation(
          lat,
          lng,
          terrainData
        );
        const biome = determineRealisticBiome(elevation, lat, lng, terrainData);
        const populated = determineRealisticPopulation(
          biome,
          elevation,
          lat,
          lng,
          terrainData
        );

        row.push({
          x: x * 3,
          y: y * 3,
          elevation,
          biome,
          populated,
        });
      }
      terrainGrid.push(row);
    }

    console.log("Generated realistic terrain grid based on impact location");
    console.log(`Terrain grid size: ${terrainGrid.length} rows x ${terrainGrid[0]?.length || 0} cols`);
    console.log(`Sample terrain points:`, terrainGrid[0]?.slice(0, 3));
    setTerrain(terrainGrid);
  }, [
    width,
    height,
    asteroidData,
    enhancedPrediction,
    realCraterDiameter,
    realAffectedRadius,
    realMegatons,
    getRealisticTerrain,
  ]);

  // Update real impact physics data when enhanced prediction changes
  useEffect(() => {
    if (enhancedPrediction?.impact_physics) {
      console.log(
        "Updating crater with real physics data:",
        enhancedPrediction.impact_physics
      );
      setRealCraterDiameter(
        enhancedPrediction.impact_physics.craterDiameter ?? 0
      );
      setRealAffectedRadius(
        enhancedPrediction.impact_physics.affectedRadius ?? 0
      );
      setRealEnergy(enhancedPrediction.impact_physics.energy ?? 0);
      setRealMegatons(
        enhancedPrediction.impact_physics.megatonsEquivalent ?? 0
      );
    } else {
      // Fallback to asteroid data if available
      if (asteroidData) {
        setRealCraterDiameter(asteroidData.craterRadius || 1);
        setRealAffectedRadius((asteroidData.craterRadius || 1) * 10);
        setRealEnergy(asteroidData.energy * 4.184e15 || 1e15); // Convert MT to Joules roughly
        setRealMegatons(asteroidData.energy || 1);
      }
    }
  }, [enhancedPrediction, asteroidData]);

  // Initialize canvas and terrain
  useEffect(() => {
    // Add a small delay to ensure canvas is fully mounted
    const timeoutId = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("Canvas ref not available");
        return;
      }

      // Create a unique key for current terrain config
      const impactLat = enhancedPrediction?.impact_location?.latitude ?? asteroidData?.impactLat ?? 0;
      const impactLng = enhancedPrediction?.impact_location?.longitude ?? asteroidData?.impactLng ?? 0;
      const terrainKey = `${impactLat.toFixed(2)}_${impactLng.toFixed(2)}_${width}_${height}`;

      // Skip regeneration if terrain hasn't changed
      if (lastTerrainKeyRef.current === terrainKey) {
        console.log("Terrain already generated for this configuration, skipping");
        return;
      }

      console.log("Setting up canvas with dimensions:", width, "x", height);

      // Set canvas size explicitly
      canvas.width = width;
      canvas.height = height;

      // Test 2D context immediately after setup
      const testCtx = canvas.getContext("2d");
      if (testCtx) {
        console.log("2D context successfully created");
        // Clear canvas to ensure it's working
        testCtx.fillStyle = "#001122";
        testCtx.fillRect(0, 0, width, height);
      } else {
        console.error("Failed to get 2D context immediately after setup");
      }

      // Generate terrain (now async)
      await generateTerrain();

      // Mark this terrain as generated
      lastTerrainKeyRef.current = terrainKey;
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [generateTerrain, width, height, enhancedPrediction, asteroidData]);

  // Handle simulation phase changes
  useEffect(() => {
    if (simulationPhase === "approach") {
      // Transition to 3D perspective view
      setCameraAngle(Math.PI / 4); // 45-degree angle
      setImpactIntensity(0);
      setShockwaveRadius(0);
      setCraterDepth(0);
      setDebrisParticles([]);
      setSeismicWaves([]);
    } else if (simulationPhase === "impact") {
      // Intense impact animation
      setImpactIntensity(1);

      // Create more dramatic debris particles
      const particles = [];
      for (let i = 0; i < 100; i++) {
        // Increased from 50 to 100
        particles.push({
          x: impactPoint.x + (Math.random() - 0.5) * 40, // Increased spread
          y: impactPoint.y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 20, // Increased velocity
          vy: (Math.random() - 0.5) * 20,
          life: 1.0,
        });
      }
      setDebrisParticles(particles);

      // Start more dramatic seismic waves
      setSeismicWaves([
        { radius: 0, intensity: 1, phase: 0 },
        { radius: 0, intensity: 0.9, phase: Math.PI / 4 },
        { radius: 0, intensity: 0.8, phase: Math.PI / 3 },
        { radius: 0, intensity: 0.7, phase: Math.PI / 2 },
        { radius: 0, intensity: 0.6, phase: Math.PI / 1.5 },
      ]);

      // Create crater with real diameter
      if (realCraterDiameter > 0) {
        setCraterDepth(realCraterDiameter * 0.5); // Use real crater diameter
      } else if (asteroidData) {
        setCraterDepth(asteroidData.craterRadius * 0.5);
      }
    } else if (simulationPhase === "aftermath") {
      // Transition back to 2D for aftermath analysis
      setCameraAngle(0);
      setImpactIntensity(0.3); // Residual effects
    }
  }, [simulationPhase, impactPoint, asteroidData, realCraterDiameter]);

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      setAnimationTime((prev) => prev + 0.016); // ~60fps

      // Update physics-based animations
      updatePhysics();
      renderTerrain();

      animationId = requestAnimationFrame(animate);
    };

    // Only start animation if terrain is generated
    if (terrain.length > 0) {
      animate();
    }
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrain, impactPoint, asteroidData, simulationPhase]);

  const getBiomeColor = (
    biome: TerrainPoint["biome"],
    elevation: number
  ): string => {
    const baseColors = {
      ocean: {
        deep: { r: 8, g: 24, b: 58 },
        shallow: { r: 25, g: 55, b: 135 },
      },
      land: {
        low: { r: 45, g: 120, b: 35 },
        mid: { r: 85, g: 140, b: 50 },
        high: { r: 140, g: 180, b: 75 },
      },
      mountain: {
        base: { r: 120, g: 110, b: 100 },
        peak: { r: 200, g: 195, b: 190 },
      },
      ice: {
        base: { r: 220, g: 235, b: 255 },
        bright: { r: 245, g: 250, b: 255 },
      },
      desert: {
        sand: { r: 210, g: 180, b: 125 },
        rock: { r: 160, g: 130, b: 90 },
      },
    };

    let r, g, b;

    switch (biome) {
      case "ocean":
        // Deeper water is darker
        const waterDepth = Math.max(0, -elevation);
        const oceanMix = Math.min(1, waterDepth * 2);
        r = Math.floor(
          baseColors.ocean.deep.r * oceanMix +
            baseColors.ocean.shallow.r * (1 - oceanMix)
        );
        g = Math.floor(
          baseColors.ocean.deep.g * oceanMix +
            baseColors.ocean.shallow.g * (1 - oceanMix)
        );
        b = Math.floor(
          baseColors.ocean.deep.b * oceanMix +
            baseColors.ocean.shallow.b * (1 - oceanMix)
        );
        break;

      case "land":
        // Vary land color based on elevation
        if (elevation < 0.2) {
          const mix = elevation / 0.2;
          r = Math.floor(
            baseColors.land.low.r * (1 - mix) + baseColors.land.mid.r * mix
          );
          g = Math.floor(
            baseColors.land.low.g * (1 - mix) + baseColors.land.mid.g * mix
          );
          b = Math.floor(
            baseColors.land.low.b * (1 - mix) + baseColors.land.mid.b * mix
          );
        } else {
          const mix = Math.min(1, (elevation - 0.2) / 0.3);
          r = Math.floor(
            baseColors.land.mid.r * (1 - mix) + baseColors.land.high.r * mix
          );
          g = Math.floor(
            baseColors.land.mid.g * (1 - mix) + baseColors.land.high.g * mix
          );
          b = Math.floor(
            baseColors.land.mid.b * (1 - mix) + baseColors.land.high.b * mix
          );
        }
        break;

      case "mountain":
        // Mountains get lighter with elevation
        const mountainMix = Math.min(1, (elevation - 0.5) / 0.5);
        r = Math.floor(
          baseColors.mountain.base.r * (1 - mountainMix) +
            baseColors.mountain.peak.r * mountainMix
        );
        g = Math.floor(
          baseColors.mountain.base.g * (1 - mountainMix) +
            baseColors.mountain.peak.g * mountainMix
        );
        b = Math.floor(
          baseColors.mountain.base.b * (1 - mountainMix) +
            baseColors.mountain.peak.b * mountainMix
        );
        break;

      case "ice":
        // Ice varies slightly with elevation
        const iceMix = Math.min(1, elevation / 0.8);
        r = Math.floor(
          baseColors.ice.base.r * (1 - iceMix) +
            baseColors.ice.bright.r * iceMix
        );
        g = Math.floor(
          baseColors.ice.base.g * (1 - iceMix) +
            baseColors.ice.bright.g * iceMix
        );
        b = Math.floor(
          baseColors.ice.base.b * (1 - iceMix) +
            baseColors.ice.bright.b * iceMix
        );
        break;

      case "desert":
        // Desert varies between sand and rock
        const desertMix = Math.min(1, elevation / 0.4);
        r = Math.floor(
          baseColors.desert.sand.r * (1 - desertMix) +
            baseColors.desert.rock.r * desertMix
        );
        g = Math.floor(
          baseColors.desert.sand.g * (1 - desertMix) +
            baseColors.desert.rock.g * desertMix
        );
        b = Math.floor(
          baseColors.desert.sand.b * (1 - desertMix) +
            baseColors.desert.rock.b * desertMix
        );
        break;

      default:
        r = g = b = 100;
    }

    // Add subtle noise for texture
    const noise = (Math.random() - 0.5) * 15;
    r = Math.max(0, Math.min(255, r + noise));
    g = Math.max(0, Math.min(255, g + noise));
    b = Math.max(0, Math.min(255, b + noise));

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  };

  // Update physics-based animations
  const updatePhysics = useCallback(() => {
    // Update shockwave
    if (simulationPhase === "impact" && asteroidData) {
      setShockwaveRadius((prev) => Math.min(prev + 5, width));
    }

    // Update debris particles
    setDebrisParticles((prev) =>
      prev
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vx: particle.vx * 0.98, // Air resistance
          vy: particle.vy * 0.98 + 0.1, // Gravity
          life: Math.max(0, particle.life - 0.02),
        }))
        .filter((p) => p.life > 0)
    );

    // Update seismic waves
    setSeismicWaves((prev) =>
      prev
        .map((wave) => ({
          ...wave,
          radius: wave.radius + 3,
          intensity: Math.max(0, wave.intensity - 0.01),
        }))
        .filter((w) => w.intensity > 0 && w.radius < width * 1.5)
    );
  }, [simulationPhase, asteroidData, width]);

  // 3D to 2D projection helper
  const project3DTo2D = useCallback(
    (x: number, y: number, z: number) => {
      const cosAngle = Math.cos(cameraAngle);
      const sinAngle = Math.sin(cameraAngle);

      // Apply perspective transformation
      const projectedX = x;
      const projectedY = y * cosAngle - z * sinAngle;

      return { x: projectedX, y: projectedY };
    },
    [cameraAngle]
  );

  const renderTerrain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("No canvas found in renderTerrain");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("No 2D context found in renderTerrain");
      return;
    }

    console.log("🎨 Draw function called. Terrain state:", {
      terrainLength: terrain.length,
      hasEnhancedPrediction: !!enhancedPrediction,
      hasAsteroidData: !!asteroidData,
      impactLocation: enhancedPrediction?.impact_location || asteroidData
    });

    if (terrain.length === 0) {
      console.warn(
        "⚠️ No terrain data available, terrain array length:",
        terrain.length
      );
      return;
    }

    console.log("✅ Successfully rendering terrain with", terrain.length, "rows");

    // Clear canvas with dynamic background based on simulation phase
    const bgColor =
      simulationPhase === "impact"
        ? `rgba(${Math.floor(20 + impactIntensity * 50)}, ${Math.floor(
            20 + impactIntensity * 30
          )}, ${Math.floor(30 + impactIntensity * 20)}, 1)`
        : "#001122";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Apply 3D transformation matrix
    ctx.save();
    if (cameraAngle > 0) {
      // 3D perspective transformation
      ctx.transform(
        1,
        0,
        0,
        Math.cos(cameraAngle),
        0,
        (height * (1 - Math.cos(cameraAngle))) / 2
      );
    }

    // Render terrain with enhanced effects
    terrain.forEach((row) => {
      row.forEach((point) => {
        const distanceFromImpact = Math.sqrt(
          Math.pow(point.x - impactPoint.x, 2) +
            Math.pow(point.y - impactPoint.y, 2)
        );

        // Base terrain color
        let color = getBiomeColor(point.biome, point.elevation);

        // Apply impact effects using REAL affected radius from physics calculations
        if (showImpact && simulationPhase === "impact") {
          // Use real affected radius from consequence prediction
          const realAffectedKm =
            realAffectedRadius || (asteroidData?.craterRadius || 50) * 8;
          const impactEffectPixels = realAffectedKm * 3; // Convert km to pixels (3 pixels per km)
          const impactEffect = Math.max(
            0,
            1 - distanceFromImpact / impactEffectPixels
          );

          if (impactEffect > 0) {
            // More dramatic color changes
            const red = Math.min(255, 80 + impactEffect * 175);
            const green = Math.min(255, 30 + impactEffect * 80);
            const blue = Math.max(0, 40 - impactEffect * 35);
            color = `rgb(${red}, ${green}, ${blue})`;
          }
        }

        // Apply aftermath effects (scorched earth) using real data
        if (simulationPhase === "aftermath") {
          const realAftermathKm =
            (realAffectedRadius || (asteroidData?.craterRadius || 50) * 6) *
            0.8; // Slightly smaller than impact
          const aftermathPixels = realAftermathKm * 3; // Convert km to pixels
          const aftermathEffect = Math.max(
            0,
            1 - distanceFromImpact / aftermathPixels
          );

          if (aftermathEffect > 0) {
            // Scorched, darkened terrain
            const red = Math.min(255, 60 + aftermathEffect * 100);
            const green = Math.min(255, 40 + aftermathEffect * 60);
            const blue = Math.min(255, 20 + aftermathEffect * 40);
            color = `rgb(${red}, ${green}, ${blue})`;
          }
        }

        ctx.fillStyle = color;

        // Calculate 3D height for perspective
        const terrainHeight = point.elevation * 20 * (1 + craterDepth);
        const projectedPoint = project3DTo2D(point.x, point.y, terrainHeight);

        // Enhanced texture rendering based on biome with realistic effects
        const pixelSize = 4;

        if (point.biome === "ocean") {
          // Dynamic ocean with waves and depth
          const waveOffset =
            Math.sin(animationTime * 1.5 + point.x * 0.08 + point.y * 0.06) *
            1.5;
          const waveIntensity =
            0.85 + Math.sin(animationTime * 0.8 + point.x * 0.04) * 0.15;

          ctx.globalAlpha = waveIntensity;
          ctx.fillRect(
            projectedPoint.x,
            projectedPoint.y + waveOffset,
            pixelSize,
            pixelSize
          );

          // Add foam/whitecaps for shallow areas
          if (point.elevation > -0.4) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.fillRect(projectedPoint.x + 1, projectedPoint.y + 1, 2, 2);
          }
        } else if (point.biome === "mountain") {
          // Mountains with realistic shading and snow caps
          ctx.fillRect(
            projectedPoint.x,
            projectedPoint.y,
            pixelSize,
            pixelSize
          );

          // Add highlights on peaks
          if (point.elevation > 0.8) {
            ctx.fillStyle = `rgba(255, 255, 255, ${
              (point.elevation - 0.8) * 2
            })`;
            ctx.fillRect(projectedPoint.x + 1, projectedPoint.y, 2, 2);
          }

          // Add shadows for depth
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(
            0,
            0.2 - point.elevation * 0.1
          )})`;
          ctx.fillRect(projectedPoint.x, projectedPoint.y + 2, pixelSize, 2);
        } else if (point.biome === "desert") {
          // Desert with dune patterns
          const dunePattern =
            Math.sin(point.x * 0.3) * Math.cos(point.y * 0.2) * 0.1;
          ctx.fillRect(
            projectedPoint.x,
            projectedPoint.y + dunePattern,
            pixelSize,
            pixelSize
          );

          // Add sand texture
          if (Math.random() > 0.7) {
            ctx.fillStyle = `rgba(255, 220, 150, 0.3)`;
            ctx.fillRect(
              projectedPoint.x + Math.random() * 2,
              projectedPoint.y + Math.random() * 2,
              1,
              1
            );
          }
        } else if (point.biome === "ice") {
          // Ice with crystalline effects
          ctx.fillRect(
            projectedPoint.x,
            projectedPoint.y,
            pixelSize,
            pixelSize
          );

          // Add ice sparkles
          if (Math.random() > 0.85) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8})`;
            ctx.fillRect(
              projectedPoint.x + Math.random() * 3,
              projectedPoint.y + Math.random() * 3,
              1,
              1
            );
          }
        } else {
          // Land with varied vegetation
          ctx.fillRect(
            projectedPoint.x,
            projectedPoint.y,
            pixelSize,
            pixelSize
          );

          // Add forest texture for higher elevations
          if (point.elevation > 0.3 && Math.random() > 0.8) {
            ctx.fillStyle = `rgba(20, 80, 20, 0.6)`;
            ctx.fillRect(projectedPoint.x + 1, projectedPoint.y, 2, 3);
          }

          // Add grass texture for lower elevations
          if (point.elevation < 0.2 && Math.random() > 0.9) {
            ctx.fillStyle = `rgba(60, 180, 60, 0.4)`;
            ctx.fillRect(projectedPoint.x, projectedPoint.y, 1, 2);
          }
        }

        ctx.globalAlpha = 1;

        // Enhanced population centers with impact effects
        if (point.populated) {
          if (
            simulationPhase === "impact" &&
            distanceFromImpact < (asteroidData?.craterRadius || 0) * 20
          ) {
            // Destroyed settlements (red/orange)
            ctx.fillStyle = "#ff4444";
          } else if (
            simulationPhase === "aftermath" &&
            distanceFromImpact < (asteroidData?.craterRadius || 0) * 50
          ) {
            // Damaged settlements (yellow)
            ctx.fillStyle = "#ffaa00";
          } else {
            // Normal settlements
            ctx.fillStyle = "#ffff00";
          }
          ctx.fillRect(projectedPoint.x + 1, projectedPoint.y + 1, 2, 2);
        }
      });
    });

    ctx.restore();

    // Render advanced impact effects
    if (asteroidData && showImpact) {
      renderAdvancedImpactEffects(ctx);
    }

    // Render seismic waves from enhanced prediction data
    if (enhancedPrediction && simulationPhase !== "approach") {
      renderSeismicAnalysis(ctx);
    }

    // Render UI overlays
    renderUIOverlays(ctx);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    width,
    height,
    terrain,
    impactPoint,
    asteroidData,
    animationTime,
    simulationPhase,
    cameraAngle,
    impactIntensity,
    craterDepth,
    showImpact,
    enhancedPrediction,
    project3DTo2D,
    realAffectedRadius,
  ]);

  // Render advanced impact effects
  const renderAdvancedImpactEffects = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!asteroidData && realCraterDiameter === 0) return;

      // Use REAL crater diameter from consequence prediction, with proper scaling
      const realCraterKm =
        realCraterDiameter || asteroidData?.craterRadius || 1;

      // Convert km to pixels: 1 pixel ≈ 1 km, but scale up for visibility
      const basePixelRadius = realCraterKm * 3; // 3 pixels per km for good visibility
      const craterPixelRadius = Math.max(basePixelRadius, 20); // Minimum 20 pixels for small asteroids

      console.log(
        `Rendering crater: ${realCraterKm.toFixed(
          2
        )} km = ${craterPixelRadius.toFixed(
          0
        )} pixels (Real: ${realMegatons.toFixed(2)} MT)`
      );

      // Enhanced crater with dramatic depth visualization
      if (showImpact || craterDepth > 0) {
        // Outer crater rim (ejected material)
        ctx.beginPath();
        ctx.arc(
          impactPoint.x,
          impactPoint.y,
          craterPixelRadius * 1.3,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = `rgba(160, 82, 45, 0.6)`;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Main crater rim
        ctx.beginPath();
        ctx.arc(
          impactPoint.x,
          impactPoint.y,
          craterPixelRadius,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = `rgba(139, 69, 19, 1.0)`;
        ctx.lineWidth = 6;
        ctx.stroke();

        // Crater interior with dramatic depth gradient
        for (let r = craterPixelRadius; r > 0; r -= 3) {
          const depth = (craterPixelRadius - r) / craterPixelRadius;
          ctx.beginPath();
          ctx.arc(impactPoint.x, impactPoint.y, r, 0, Math.PI * 2);

          // Much darker crater interior for high contrast
          const darkness = Math.min(depth * 1.5, 1);
          ctx.fillStyle = `rgba(${Math.floor(
            20 * (1 - darkness)
          )}, ${Math.floor(10 * (1 - darkness))}, ${Math.floor(
            5 * (1 - darkness)
          )}, ${0.9 + darkness * 0.1})`;
          ctx.fill();
        }

        // Central crater floor (very dark)
        ctx.beginPath();
        ctx.arc(
          impactPoint.x,
          impactPoint.y,
          craterPixelRadius * 0.3,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(0, 0, 0, 0.95)`;
        ctx.fill();

        // Add crater texture lines for depth
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const startX =
            impactPoint.x + Math.cos(angle) * craterPixelRadius * 0.3;
          const startY =
            impactPoint.y + Math.sin(angle) * craterPixelRadius * 0.3;
          const endX =
            impactPoint.x + Math.cos(angle) * craterPixelRadius * 0.9;
          const endY =
            impactPoint.y + Math.sin(angle) * craterPixelRadius * 0.9;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(40, 20, 10, 0.7)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Dynamic shockwave
      if (shockwaveRadius > 0) {
        ctx.beginPath();
        ctx.arc(impactPoint.x, impactPoint.y, shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 165, 0, ${Math.max(
          0,
          0.6 - shockwaveRadius / width
        )})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Render seismic waves
      seismicWaves.forEach((wave) => {
        ctx.beginPath();
        ctx.arc(impactPoint.x, impactPoint.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 0, ${wave.intensity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Debris particles
      debrisParticles.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 69, 19, ${particle.life})`;
        ctx.fill();
      });

      // Dramatic impact flash
      if (simulationPhase === "impact" && impactIntensity > 0.5) {
        // Multiple flash rings for dramatic effect
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(
            impactPoint.x,
            impactPoint.y,
            craterPixelRadius * i * 2,
            0,
            Math.PI * 2
          );
          const flashIntensity = Math.max(
            0,
            (impactIntensity - 0.5) * (1 / i) * 0.8
          );
          ctx.fillStyle = `rgba(255, 200, 100, ${flashIntensity})`;
          ctx.fill();
        }

        // Central bright flash
        ctx.beginPath();
        ctx.arc(
          impactPoint.x,
          impactPoint.y,
          craterPixelRadius * 0.8,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${impactIntensity * 0.9})`;
        ctx.fill();
      }
    },
    [
      asteroidData,
      impactPoint,
      craterDepth,
      shockwaveRadius,
      seismicWaves,
      debrisParticles,
      simulationPhase,
      impactIntensity,
      width,
      realCraterDiameter,
      realMegatons,
      showImpact,
    ]
  );

  // Render seismic analysis from enhanced predictions
  const renderSeismicAnalysis = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!enhancedPrediction?.correlation_context) return;

      const earthquakeCount =
        enhancedPrediction.correlation_context.top_similar_earthquakes ?? 0;

      // Draw correlation indicators
      for (let i = 0; i < Math.min(earthquakeCount, 8); i++) {
        const angle = (i / earthquakeCount) * Math.PI * 2;
        const distance = 60 + i * 15;
        const x = impactPoint.x + Math.cos(angle) * distance;
        const y = impactPoint.y + Math.sin(angle) * distance;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${
          0.6 + Math.sin(animationTime * 2 + i) * 0.3
        })`;
        ctx.fill();

        // Connection lines to impact point
        ctx.beginPath();
        ctx.moveTo(impactPoint.x, impactPoint.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(100, 200, 255, 0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    [enhancedPrediction, impactPoint, animationTime]
  );

  // Render UI overlays
  const renderUIOverlays = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Coordinate grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
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

      // Enhanced scale indicator
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "12px monospace";
      ctx.fillText("1 pixel ≈ 1 km", 10, height - 40);

      // Simulation phase indicator
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "14px monospace";
      const phaseText = `Phase: ${simulationPhase.toUpperCase()}`;
      ctx.fillText(phaseText, 10, 25);

      // Camera angle indicator
      if (cameraAngle > 0) {
        const angleText = `View: 3D (${Math.round(
          (cameraAngle * 180) / Math.PI
        )}°)`;
        ctx.fillText(angleText, 10, 45);
      } else {
        ctx.fillText("View: 2D (Top-down)", 10, 45);
      }

      // Enhanced prediction info
      if (enhancedPrediction) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(width - 200, 10, 190, 100);

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "12px monospace";
        ctx.fillText("AI Analysis:", width - 190, 30);
        ctx.fillText(
          `Risk: ${enhancedPrediction.risk_score}%`,
          width - 190,
          50
        );
        ctx.fillText(
          `Threat: ${enhancedPrediction.threat_category}`,
          width - 190,
          70
        );
        ctx.fillText(
          `Correlations: ${
            enhancedPrediction.correlation_context?.top_similar_earthquakes ?? 0
          }`,
          width - 190,
          90
        );
      }
    },
    [width, height, simulationPhase, cameraAngle, enhancedPrediction]
  );

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
        <h3 className="text-lg font-bold text-white mb-2">
          Dynamic Impact Zone Terrain
        </h3>
        <p className="text-sm text-gray-400">
          {enhancedPrediction?.impact_location
            ? "Showing realistic terrain at predicted impact coordinates from trajectory calculation."
            : "Click anywhere to set impact location. Real-time terrain with biomes, elevation, and population centers."}
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

        {/* Impact info overlay - Enhanced with real terrain data */}
        {(asteroidData || enhancedPrediction) && (
          <div className="absolute bottom-2 left-2 bg-black/80 p-3 rounded text-xs max-w-xs">
            <div className="text-red-400 font-bold mb-1">Impact Zone</div>
            <div className="text-gray-300">
              Crater:{" "}
              {(realCraterDiameter || asteroidData?.craterRadius || 0).toFixed(
                1
              )}{" "}
              km
            </div>
            <div className="text-gray-300">
              Energy: {(realMegatons || asteroidData?.energy || 0).toFixed(2)}{" "}
              MT TNT
            </div>
            <div className="text-gray-300">
              Location: {currentImpactCoords.lat.toFixed(2)}°,{" "}
              {currentImpactCoords.lng.toFixed(2)}°
            </div>
            {realTerrainInfo && (
              <>
                <div className="text-gray-300">
                  Terrain: {realTerrainInfo.landCoverType}
                </div>
                <div className="text-gray-300">
                  Elevation: {realTerrainInfo.elevation}m
                </div>
                {realTerrainInfo.nearestCity && (
                  <div className="text-gray-300">
                    Near: {realTerrainInfo.nearestCity.name},{" "}
                    {realTerrainInfo.countryName}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
