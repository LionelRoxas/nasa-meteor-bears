// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import NASADataPanel from "@/components/NASADataPanel";
import LeftSidebar from "@/components/LeftSidebar";
import Navbar from "@/components/Navbar";
import ImpactSimulator from "@/components/ImpactSimulator";

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
    }
  }, [countdown]);

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
      setCountdown(5);
      setHasImpacted(false);
      setWasNASAPanelOpen(showNASAPanel);
      setIsSidebarCollapsed(true);
      setShowNASAPanel(false);
    } else {
      setIsSimulating(false);
      setCountdown(null);
      setIsSidebarCollapsed(false);
      setShowNASAPanel(wasNASAPanelOpen);
    }
  };

  const handleReset = () => {
    setIsSimulating(false);
    setCountdown(null);
    setHasImpacted(false);
    setIsSidebarCollapsed(false);
    setShowNASAPanel(wasNASAPanelOpen);
  };

  const handleImpact = () => {
    setHasImpacted(true);
    setTimeout(() => {
      setIsSimulating(false);
      setTimeout(() => {
        setIsSidebarCollapsed(false);
        setShowNASAPanel(wasNASAPanelOpen);
      }, 1000);
    }, 2000);
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
      {/* 3D Scene Container - Explicit z-index 0 */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 0,
          isolation: "isolate", // Create new stacking context
        }}
      >
        <ImpactSimulator
          asteroidParams={asteroidParams}
          isSimulating={isSimulating}
          hasImpacted={hasImpacted}
          onImpact={handleImpact}
          onDistanceUpdate={setCurrentDistance}
        />
      </div>

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
