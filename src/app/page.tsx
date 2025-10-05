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
  raw_data?: Record<string, unknown>;
}

export default function Home() {
  // Simulation phase state for 3D→2D transition
  const [simulationPhase, setSimulationPhase] =
    useState<SimulationPhase>("idle");

  const [isSimulating, setIsSimulating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasImpacted, setHasImpacted] = useState(false);
  const [wasNASAPanelOpen, setWasNASAPanelOpen] = useState(false);
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
  const { getEnhancedPrediction } = useEnhancedPredictions();
  const [enhancedPrediction, setEnhancedPrediction] =
    useState<EnhancedPrediction | null>(null);
  const [impactLocation, setImpactLocation] = useState({ lat: 0, lng: 0 });
  const [asteroidClicked, setAsteroidClicked] = useState(false);
  const [callout, setCallout] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const [showBoxes, setShowBoxes] = useState<{
    asteroid: boolean;
    consequence: boolean;
    usgs: boolean;
  }>({ asteroid: true, consequence: false, usgs: false });

  // Handle countdown and automatic start
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // DON'T start simulation immediately - wait for prediction if fetching
      if (simulationPhase === "fetching-prediction") {
        console.log(
          "⏳ Waiting for prediction to complete before starting simulation..."
        );
        // Keep countdown at 0, will be triggered when prediction completes
      } else {
        setIsSimulating(true);
        setCountdown(null);
        setSimulationPhase("3d-simulation");
      }
    }
  }, [countdown, simulationPhase]);

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
              const lat = prediction.impact_location.latitude ?? 0;
              const lng = prediction.impact_location.longitude ?? 0;
              setImpactLocation({ lat, lng });
              console.log(
                "📍 Impact location set to:",
                `${lat.toFixed(2)}°, ${lng.toFixed(2)}° (${prediction.impact_location.type || "unknown"})`
              );
            } else {
              console.warn("⚠️ No impact_location in prediction, using default (0, 0)");
            }
          }
        } catch (error) {
          console.error("❌ Failed to fetch enhanced prediction:", error);
        }

        // Set back to countdown - the effect above will start simulation if countdown is 0
        setSimulationPhase("countdown");
      }
    };

    fetchPrediction();
  }, [countdown, selectedNASAAsteroid, getEnhancedPrediction]);

  // Start simulation when prediction completes and countdown is at 0
  useEffect(() => {
    if (countdown === 0 && simulationPhase === "countdown" && !isSimulating) {
      console.log("🎬 Starting simulation now that prediction is ready!");
      setIsSimulating(true);
      setCountdown(null);
      setSimulationPhase("3d-simulation");
    }
  }, [countdown, simulationPhase, isSimulating]);

  useEffect(() => {
    if (!isSimulating) {
      setCurrentDistance(undefined);
    }
  }, [isSimulating]);

  // Calculate impact data whenever params change
  useEffect(() => {
    const volume = (4 / 3) * Math.PI * Math.pow(asteroidParams.diameter / 2, 3);
    const mass = volume * 3000;
    const velocityMs = asteroidParams.velocity * 1000;
    const energy = 0.5 * mass * velocityMs * velocityMs;
    const energyMt = energy / 4.184e15;
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
      setCountdown(10);
      setHasImpacted(false);
      setAsteroidClicked(false);
      setSimulationPhase("countdown");
      setWasNASAPanelOpen(showNASAPanel);
      setIsSidebarCollapsed(true);
      setShowNASAPanel(false);
    } else {
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
    setAsteroidClicked(false);
    setSimulationPhase("idle");
    setEnhancedPrediction(null);
    setIsSidebarCollapsed(false);
    setShowNASAPanel(wasNASAPanelOpen);
  };

  const handleImpact = () => {
    console.log("💥 Impact detected! Starting 3D→2D transition...");
    setHasImpacted(true);
    setSimulationPhase("transition");
    console.log("🔥 Transition phase active - flash should show!");

    setTimeout(() => {
      console.log("🎯 Transitioning to 2D impact visualization...");
      setIsSimulating(false);
      setSimulationPhase("2d-impact");
    }, 400);

    setTimeout(() => {
      console.log("📊 Moving to aftermath analysis...");
      setSimulationPhase("2d-aftermath");
      setIsSidebarCollapsed(false);
      setShowNASAPanel(false);
    }, 3400);
  };

  const loadNASAAsteroid = (asteroid: NASAAsteroidData) => {
    console.log("Loading NASA asteroid data:", asteroid);

    let calculatedDiameter = asteroid.diameter;
    const raw = asteroid.raw_data as Record<string, unknown> | undefined;
    const est = raw?.estimated_diameter as
      | {
          meters?: {
            estimated_diameter_min?: number;
            estimated_diameter_max?: number;
          };
        }
      | undefined;
    if (est?.meters) {
      const minDiameter = est.meters.estimated_diameter_min;
      const maxDiameter = est.meters.estimated_diameter_max;
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
      {/* OPTIMIZED: Conditional rendering - only mount active layer */}
      {simulationPhase === "2d-impact" ||
      simulationPhase === "2d-aftermath" ||
      simulationPhase === "transition" ? (
        /* 2D Layer - Only mounted during 2D phases AND transition */
        <div
          className="absolute inset-0 animate-in fade-in duration-700"
          style={{ zIndex: 0 }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6">
            <div className="w-full max-w-6xl relative">
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
                onAsteroidClick={(x, y) => {
                  if (asteroidClicked && callout.visible) {
                    setAsteroidClicked(false);
                    setCallout((c) => ({ ...c, visible: false }));
                    setShowBoxes({
                      asteroid: false,
                      consequence: false,
                      usgs: false,
                    });
                    return;
                  }
                  setAsteroidClicked(true);
                  setCallout({ x, y, visible: true });
                  setShowBoxes({
                    asteroid: true,
                    consequence: false,
                    usgs: true,
                  });
                }}
              />

              {enhancedPrediction && asteroidClicked && callout.visible && (
                <div
                  className="absolute z-50"
                  style={{
                    left: callout.x + 24,
                    top: callout.y + 24,
                  }}
                >
                  {/* Skinny connector line */}
                  <div className="absolute -left-20 top-8 w-20 h-px bg-white/30"></div>

                  {/* Tooltip box styled like sidebar/NASA overlays */}
                  <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl min-w-[260px] max-w-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white/90">
                        {selectedNASAAsteroid?.name || "Asteroid"}
                      </h4>
                      <button
                        className="text-white/60 hover:text-white"
                        onClick={() => {
                          setAsteroidClicked(false);
                          setCallout((c) => ({ ...c, visible: false }));
                        }}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>

                    <div className="text-xs text-white/70 space-y-1">
                      <div className="flex justify-between">
                        <span>Diameter</span>
                        <span className="text-white font-medium">
                          {asteroidParams.diameter.toFixed(0)} m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Energy</span>
                        <span className="text-white font-medium">
                          {asteroidParams.energy.toFixed(1)} MT
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Threat</span>
                        <span className="text-white font-medium">
                          {impactData.threatLevel}
                        </span>
                      </div>
                    </div>

                    {enhancedPrediction?.impact_physics && (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/70 space-y-1">
                        <div className="flex justify-between">
                          <span>Crater Diameter</span>
                          <span className="text-white font-medium">
                            {enhancedPrediction.impact_physics.craterDiameter?.toFixed(
                              2
                            ) ?? "—"}{" "}
                            km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Damage Radius</span>
                          <span className="text-white font-medium">
                            {enhancedPrediction.impact_physics.affectedRadius?.toFixed(
                              1
                            ) ?? "—"}{" "}
                            km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location</span>
                          <span className="text-white font-medium">
                            {impactLocation.lat.toFixed(2)}°,{" "}
                            {impactLocation.lng.toFixed(2)}°
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>EQ Magnitude</span>
                          <span className="text-white font-medium">
                            {enhancedPrediction.impact_physics.earthquakeMagnitude?.toFixed?.(
                              1
                            ) ?? "—"}
                          </span>
                        </div>
                        {enhancedPrediction?.usgsData &&
                          enhancedPrediction.usgsData.expectedTsunamiHeight >
                            0 && (
                            <div className="flex justify-between">
                              <span>Tsunami</span>
                              <span className="text-white font-medium">
                                {enhancedPrediction.usgsData?.expectedTsunamiHeight.toFixed(
                                  1
                                )}{" "}
                                m
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Impact consequences tooltip removed; data merged into info tooltip */}

              {/* USGS tooltip (top-left, opposite of info box) */}
              {enhancedPrediction &&
                asteroidClicked &&
                callout.visible &&
                showBoxes.usgs && (
                  <div
                    className="absolute z-50"
                    style={{
                      left: callout.x - 24 - 360,
                      top: callout.y - 24 - 220,
                    }}
                  >
                    <div className="absolute -right-32 top-8 w-32 h-px bg-white/30"></div>
                    <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl min-w-[300px] max-w-md">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white/90">
                          USGS Assessment
                        </h4>
                        <button
                          className="text-white/60 hover:text-white"
                          onClick={() =>
                            setShowBoxes((s) => ({ ...s, usgs: false }))
                          }
                          aria-label="Close"
                        >
                          ×
                        </button>
                      </div>
                      <USGSDataPanel
                        prediction={enhancedPrediction}
                        variant="inline"
                      />
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      ) : (
        /* 3D Layer - Only mounted during non-2D phases */
        <div
          className="absolute inset-0"
          style={{ zIndex: 0, isolation: "isolate" }}
        >
          <ImpactSimulator
            asteroidParams={asteroidParams}
            isSimulating={isSimulating}
            hasImpacted={hasImpacted}
            onImpact={handleImpact}
            onDistanceUpdate={setCurrentDistance}
          />
        </div>
      )}

      {/* UI Layer Container - Higher z-index */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          isolation: "isolate", // Create new stacking context
        }}
      >
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 30 }}
          >
            <div className="text-8xl font-bold text-white animate-pulse drop-shadow-2xl">
              {countdown}
            </div>
          </div>
        )}

        {/* Impact Flash Effect */}
        {hasImpacted && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ zIndex: 25 }}
          >
            <div className="w-full h-full bg-gradient-radial from-yellow-500/50 via-orange-500/30 to-transparent"></div>
          </div>
        )}

        {/* Transition Flash Effect - Full screen orange flash during 3D→2D transition */}
        {simulationPhase === "transition" && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <div className="w-full h-full bg-orange-500 animate-[flash_0.4s_ease-out]"></div>
          </div>
        )}

        {/* Navbar - Enable pointer events */}
        <div className="pointer-events-auto" style={{ zIndex: 50 }}>
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
        </div>

        {/* Main Content Area */}
        <div
          className="absolute top-16 left-0 right-0 bottom-0 flex h-[calc(100vh-4rem)]"
          style={{ zIndex: 40 }}
        >
          {/* Left Sidebar - Enable pointer events */}
          <div className="pointer-events-auto">
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
          </div>

          {/* Main 3D View Area */}
          <div className="flex-1 relative">
            {/* NASA Data Panel Overlay */}
            {showNASAPanel && (
              <div
                className="absolute top-4 right-4 bottom-4 flex flex-col pointer-events-auto"
                style={{ zIndex: 45 }}
              >
                <div className="flex-1 overflow-y-auto">
                  <NASADataPanel onSelectAsteroid={loadNASAAsteroid} />
                </div>
              </div>
            )}

            {/* Impact Info Overlay */}
            {hasImpacted && (
              <div
                className="absolute bottom-0 left-0 flex items-end h-auto pointer-events-auto"
                style={{ zIndex: 45 }}
              >
                <div className="bg-black/80 backdrop-blur-lg rounded-xl px-6 py-4 border border-white/20 mb-8 ml-8 shadow-2xl">
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
    </div>
  );
}
