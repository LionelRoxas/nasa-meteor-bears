// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import NASADataPanel from "@/components/NASADataPanel";
import LeftSidebar from "@/components/LeftSidebar";
import Navbar from "@/components/Navbar";
import ImpactSimulator from "@/components/ImpactSimulator";
import {
  useEnhancedPredictions,
  type EnhancedPrediction,
} from "@/hooks/useEnhancedPredictions";
import TerrainVisualizer from "@/components/TerrainVisualizer";
import ConsequenceAnalysis from "@/components/ConsequenceAnalysis";
import USGSDataPanel from "@/components/USGSDataPanel";

// Simulation phase type for 3D→2D transition
type SimulationPhase =
  | "idle"
  | "countdown"
  | "fetching-prediction"
  | "3d-simulation"
  | "transition"
  | "2d-impact"
  | "2d-aftermath";

// Define the NASA asteroid data type locally if not exported from hook
interface NASAAsteroidData {
  id: string;
  name: string;
  diameter: number;
  velocity: number;
  distance: number;
  is_hazardous: boolean;
  is_sentry_object?: boolean;
  approach_date?: string;
  approach_date_full?: string;
  magnitude: number;
  nasa_url?: string;
  miss_distance_lunar?: number;
  orbiting_body?: string;
  orbit_class?: string;
  raw_data?: any;
}

export default function Home() {
  // Simulation phase state for 3D→2D transition
  const [simulationPhase, setSimulationPhase] =
    useState<SimulationPhase>("idle");

  const [isSimulating, setIsSimulating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasImpacted, setHasImpacted] = useState(false);
  const [wasNASAPanelOpen, setWasNASAPanelOpen] = useState(false); // Track NASA panel state
  const [asteroidParams, setAsteroidParams] = useState({
    diameter: 200,
    velocity: 20,
    angle: 45,
    distance: 10000,
    mass: 0,
    energy: 0,
    craterSize: 0,
    affectedRadius: 0,
  });
  const [impactData, setImpactData] = useState({
    energy: 0,
    crater: 0,
    radius: 0,
    threatLevel: "MINIMAL",
  });

  // NASA data integration
  const [selectedNASAAsteroid, setSelectedNASAAsteroid] =
    useState<NASAAsteroidData | null>(null);
  const [showNASAPanel, setShowNASAPanel] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number | undefined>(
    undefined
  );

  // Enhanced predictions for 2D visualization
  const { getEnhancedPrediction, loading: predictionLoading } =
    useEnhancedPredictions();
  const [enhancedPrediction, setEnhancedPrediction] =
    useState<EnhancedPrediction | null>(null);
  const [impactLocation, setImpactLocation] = useState({ lat: 0, lng: 0 });

  // Handle countdown and automatic start
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsSimulating(true);
      setCountdown(null);
      setSimulationPhase("3d-simulation");
      // Panels are already closed from handleStartImpact, no need to close again
    }
  }, [countdown]);

  // Fetch enhanced prediction during countdown (BEFORE simulation starts)
  useEffect(() => {
    const fetchPrediction = async () => {
      if (countdown === 4 && selectedNASAAsteroid) {
        console.log("🚀 Fetching enhanced prediction during countdown...");
        setSimulationPhase("fetching-prediction");

        try {
          const prediction = await getEnhancedPrediction(
            selectedNASAAsteroid.id
          );

          if (prediction) {
            setEnhancedPrediction(prediction);
            console.log("✅ Enhanced prediction fetched:", prediction);

            // Use real impact location from prediction if available
            if (prediction.impact_location) {
              setImpactLocation({
                lat: prediction.impact_location.latitude,
                lng: prediction.impact_location.longitude,
              });
              console.log(
                "📍 Impact location set:",
                prediction.impact_location
              );
            }
          }
        } catch (error) {
          console.error("❌ Failed to fetch enhanced prediction:", error);
        }

        setSimulationPhase("countdown");
      }
    };

    fetchPrediction();
  }, [countdown, selectedNASAAsteroid, getEnhancedPrediction]);

  useEffect(() => {
    if (!isSimulating) {
      setCurrentDistance(undefined);
    }
  }, [isSimulating]);

  // Calculate impact data whenever params change
  useEffect(() => {
    const volume = (4 / 3) * Math.PI * Math.pow(asteroidParams.diameter / 2, 3);
    const mass = volume * 3000; // density of ~3000 kg/m³
    const velocityMs = asteroidParams.velocity * 1000;
    const energy = 0.5 * mass * velocityMs * velocityMs;
    const energyMt = energy / 4.184e15; // Convert to megatons
    const craterSize = (1.8 * Math.pow(energy / (2700 * 9.81), 0.25)) / 1000;
    const affectedRadius = craterSize * 10;

    let threatLevel = "MINIMAL";
    if (energyMt > 100) threatLevel = "GLOBAL";
    else if (energyMt > 10) threatLevel = "REGIONAL";
    else if (energyMt > 1) threatLevel = "LOCAL";

    setImpactData({
      energy: energyMt,
      crater: craterSize,
      radius: affectedRadius,
      threatLevel,
    });

    setAsteroidParams((prev) => ({
      ...prev,
      mass,
      energy: energyMt,
      craterSize,
      affectedRadius,
    }));
  }, [asteroidParams.diameter, asteroidParams.velocity]);

  const handleStartImpact = () => {
    if (!isSimulating && !countdown) {
      setCountdown(5);
      setHasImpacted(false);
      setSimulationPhase("countdown");
      // Remember NASA panel state and auto-close panels when starting countdown
      setWasNASAPanelOpen(showNASAPanel);
      setIsSidebarCollapsed(true);
      setShowNASAPanel(false);
    } else {
      // Stopping simulation - re-open sidebar and restore NASA panel
      setIsSimulating(false);
      setCountdown(null);
      setSimulationPhase("idle");
      setIsSidebarCollapsed(false);
      setShowNASAPanel(wasNASAPanelOpen);
    }
  };

  const handleReset = () => {
    setIsSimulating(false);
    setCountdown(null);
    setHasImpacted(false);
    setSimulationPhase("idle");
    setEnhancedPrediction(null); // Clear prediction data
    // Re-open sidebar and restore NASA panel after reset
    setIsSidebarCollapsed(false);
    setShowNASAPanel(wasNASAPanelOpen);
  };

  const handleImpact = () => {
    console.log("💥 Impact detected! Starting 3D→2D transition...");
    setHasImpacted(true);

    // Start transition sequence
    setSimulationPhase("transition");

    // Transition timeline:
    // 0.0s: Impact flash in 3D
    // 0.8s: Fade to 2D (opacity transition)
    // 0.8s-3.0s: 2D impact phase (crater formation)
    // 3.0s+: 2D aftermath phase (analysis)

    setTimeout(() => {
      console.log("🎯 Transitioning to 2D impact visualization...");
      setSimulationPhase("2d-impact");
      setIsSimulating(false);
    }, 800);

    setTimeout(() => {
      console.log("📊 Moving to aftermath analysis...");
      setSimulationPhase("2d-aftermath");
      // Re-open sidebar and restore NASA panel for aftermath analysis
      setIsSidebarCollapsed(false);
      setShowNASAPanel(false); // Keep NASA panel closed to show analysis
    }, 3000);
  };

  const loadNASAAsteroid = (asteroid: NASAAsteroidData) => {
    console.log("Loading NASA asteroid data:", asteroid);

    let calculatedDiameter = asteroid.diameter;
    if (asteroid.raw_data?.estimated_diameter?.meters) {
      const minDiameter =
        asteroid.raw_data.estimated_diameter.meters.estimated_diameter_min;
      const maxDiameter =
        asteroid.raw_data.estimated_diameter.meters.estimated_diameter_max;
      if (minDiameter && maxDiameter) {
        calculatedDiameter = (minDiameter + maxDiameter) / 2;
      }
    }

    const newDiameter = Number(calculatedDiameter) || 200;
    const newVelocity = Number(asteroid.velocity) || 20;
    const newDistance = Math.min(Number(asteroid.distance) || 100000, 500000);

    const volume = (4 / 3) * Math.PI * Math.pow(newDiameter / 2, 3);
    const mass = volume * 3000;
    const velocityMs = newVelocity * 1000;
    const energy = 0.5 * mass * velocityMs * velocityMs;
    const energyMt = energy / 4.184e15;
    const craterSize = (1.8 * Math.pow(energy / (2700 * 9.81), 0.25)) / 1000;
    const affectedRadius = craterSize * 10;

    setAsteroidParams((prev) => ({
      ...prev,
      diameter: newDiameter,
      velocity: newVelocity,
      distance: newDistance,
      angle: 45,
      mass: mass,
      energy: energyMt,
      craterSize: craterSize,
      affectedRadius: affectedRadius,
    }));

    setSelectedNASAAsteroid(asteroid);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 3D Layer - Visible during idle, countdown, 3d-simulation, transition phases */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          simulationPhase === "2d-impact" || simulationPhase === "2d-aftermath"
            ? "opacity-0 pointer-events-none"
            : simulationPhase === "transition"
            ? "opacity-50"
            : "opacity-100"
        }`}
      >
        <ImpactSimulator
          asteroidParams={asteroidParams}
          isSimulating={isSimulating}
          hasImpacted={hasImpacted}
          onImpact={handleImpact}
          onDistanceUpdate={setCurrentDistance}
        />
      </div>

      {/* 2D Layer - Visible during transition, 2d-impact and 2d-aftermath phases */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          simulationPhase === "2d-impact" || simulationPhase === "2d-aftermath"
            ? "opacity-100"
            : simulationPhase === "transition"
            ? "opacity-50"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6">
          {/* Terrain Visualizer */}
          <div className="w-full max-w-6xl">
            <TerrainVisualizer
              width={1200}
              height={600}
              asteroidData={{
                impactLat: impactLocation.lat,
                impactLng: impactLocation.lng,
                craterRadius: asteroidParams.craterSize,
                energy: asteroidParams.energy,
              }}
              simulationPhase={
                simulationPhase === "2d-impact" ? "impact" : "aftermath"
              }
              showImpact={true}
              enhancedPrediction={enhancedPrediction || undefined}
            />
          </div>

          {/* Analysis Panels */}
          {enhancedPrediction && (
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConsequenceAnalysis
                enhancedPrediction={enhancedPrediction}
                asteroidData={{
                  diameter_meters: asteroidParams.diameter,
                  kinetic_energy_mt: asteroidParams.energy,
                  is_hazardous: asteroidParams.energy > 10,
                }}
                impactLocation={impactLocation}
              />
              <USGSDataPanel prediction={enhancedPrediction} />
            </div>
          )}
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-8xl font-bold text-white animate-pulse drop-shadow-2xl">
            {countdown}
          </div>
        </div>
      )}

      {/* Impact Flash Effect */}
      {hasImpacted && (
        <div className="absolute inset-0 z-25 pointer-events-none animate-pulse">
          <div className="w-full h-full bg-gradient-radial from-yellow-500/50 via-orange-500/30 to-transparent"></div>
        </div>
      )}

      {/* Transition Flash Effect - White flash during 3D→2D transition */}
      {simulationPhase === "transition" && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <div className="w-full h-full bg-white animate-[flash_0.8s_ease-out]"></div>
        </div>
      )}

      {/* Navbar Component */}
      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        showNASAPanel={showNASAPanel}
        toggleNASAPanel={() => setShowNASAPanel(!showNASAPanel)}
        selectedNASAAsteroid={selectedNASAAsteroid}
        isSimulating={isSimulating}
        countdown={countdown}
        currentDistance={currentDistance}
        hasImpacted={hasImpacted}
      />

      {/* Main Content Area */}
      <div className="absolute top-16 left-0 right-0 bottom-0 flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <LeftSidebar
          isCollapsed={isSidebarCollapsed}
          asteroidParams={asteroidParams}
          setAsteroidParams={setAsteroidParams}
          impactData={impactData}
          selectedNASAAsteroid={selectedNASAAsteroid}
          isSimulating={isSimulating || countdown !== null}
          onStartImpact={handleStartImpact}
          onReset={handleReset}
        />

        {/* Main 3D View */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* NASA Data Panel Overlay */}
          {showNASAPanel && (
            <div className="absolute top-4 right-4 bottom-4 z-10 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <NASADataPanel onSelectAsteroid={loadNASAAsteroid} />
              </div>
            </div>
          )}

          {/* Impact Info Overlay */}
          {hasImpacted && (
            <div className="absolute bottom-0 left-0 z-20 flex items-end h-auto">
              <div className="bg-black/80 backdrop-blur-lg rounded-xl px-6 py-4 border-white/20 mb-8 ml-8 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-2">
                  Impact Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4 text-base">
                  <div>
                    <span className="text-white/60">Energy:</span>
                    <span className="text-white ml-2">
                      {impactData.energy.toFixed(2)} MT
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">Crater:</span>
                    <span className="text-white ml-2">
                      {impactData.crater.toFixed(1)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">Radius:</span>
                    <span className="text-white ml-2">
                      {impactData.radius.toFixed(0)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">Threat:</span>
                    <span
                      className={`ml-2 font-bold ${
                        impactData.threatLevel === "GLOBAL"
                          ? "text-red-500"
                          : impactData.threatLevel === "REGIONAL"
                          ? "text-orange-500"
                          : impactData.threatLevel === "LOCAL"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {impactData.threatLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
