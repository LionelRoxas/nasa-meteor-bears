/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// components/LeftSidebar.tsx
"use client";

import React, { useState } from "react";
import AsteroidPreview from "./AsteroidPreview";
import ImpactSimulatorControls from "./ImpactSimulatorControls";

interface AsteroidParams {
  diameter: number;
  velocity: number;
  angle: number;
  distance: number;
  mass: number;
  energy: number;
  craterSize: number;
  affectedRadius: number;
}

interface ImpactData {
  energy: number;
  crater: number;
  radius: number;
  threatLevel: string;
}

interface LeftSidebarProps {
  isCollapsed: boolean;
  asteroidParams: AsteroidParams;
  setAsteroidParams: React.Dispatch<React.SetStateAction<AsteroidParams>>;
  impactData: ImpactData;
  selectedNASAAsteroid: any | null;
  isSimulating: boolean;
  onStartImpact: () => void;
  onReset: () => void;
  // Add new props for MapboxMap control
  onMapControlsChange?: (controls: {
    show3DBuildings: boolean;
    streetViewMode: boolean;
    enhancedBuildings: boolean;
  }) => void;
  onRunSimulation?: () => void;
  onLocationChange?: (location: any) => void;
  simulationStatus?: string;
  currentSimulation?: any;
  impactLocation?: any;
  usePredictedLocation: boolean;
  impactPin: any | null;
  isPlacingPin: boolean;
  // Pin placement communication with parent
  onStartPinPlacement?: () => void;
  onRemovePin?: () => void;
  onToggleLocationMode?: () => void;
}

export default function LeftSidebar({
  isCollapsed,
  asteroidParams,
  setAsteroidParams,
  impactData,
  selectedNASAAsteroid,
  isSimulating,
  onStartImpact,
  onReset,
  onMapControlsChange,
  onRunSimulation,
  onLocationChange,
  simulationStatus = "Ready to simulate",
  currentSimulation,
  impactLocation = {
    longitude: -74.5,
    latitude: 40.7,
    city: "New York",
    country: "USA",
  },
  usePredictedLocation,
  impactPin,
  isPlacingPin,
  onStartPinPlacement: parentOnStartPinPlacement,
  onRemovePin: parentOnRemovePin,
  onToggleLocationMode,
}: LeftSidebarProps) {
  const [viewMode, setViewMode] = useState<"parameters" | "simulator">(
    "parameters"
  );
  const [finalizedAsteroid, setFinalizedAsteroid] = useState<any>(null);

  // Map view controls
  const [show3DBuildings, setShow3DBuildings] = useState(true);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [enhancedBuildings, setEnhancedBuildings] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const formatNumber = (num: number, decimals = 2) => {
    if (!num || isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`;
    return num.toFixed(decimals);
  };

  const handleContinueToSimulator = () => {
    // Finalize the asteroid configuration before moving to simulator
    const finalAsteroid = {
      id: "custom",
      name: selectedNASAAsteroid
        ? selectedNASAAsteroid.name
        : `Custom Asteroid (${asteroidParams.diameter}m)`,
      diameter: asteroidParams.diameter,
      velocity: asteroidParams.velocity,
      angle: asteroidParams.angle,
      distance: asteroidParams.distance,
      ...impactData,
    };

    setFinalizedAsteroid(finalAsteroid);
    setViewMode("simulator");
    // Don't start impact here - just transition to the simulator controls view
  };

  const handleBackToParameters = () => {
    setViewMode("parameters");
    setIsAnimating(false);
    onReset();
  };

  const handleToggle3DBuildings = () => {
    const newValue = !show3DBuildings;
    setShow3DBuildings(newValue);
    onMapControlsChange?.({
      show3DBuildings: newValue,
      streetViewMode,
      enhancedBuildings,
    });
  };

  const handleToggleStreetView = () => {
    const newValue = !streetViewMode;
    setStreetViewMode(newValue);
    onMapControlsChange?.({
      show3DBuildings,
      streetViewMode: newValue,
      enhancedBuildings,
    });
  };

  const handleToggleEnhanced = () => {
    const newValue = !enhancedBuildings;
    setEnhancedBuildings(newValue);
    onMapControlsChange?.({
      show3DBuildings,
      streetViewMode,
      enhancedBuildings: newValue,
    });
  };

  const handleToggleLocationMode = () => {
    onToggleLocationMode?.();
  };

  const handleStartPinPlacement = () => {
    parentOnStartPinPlacement?.();
  };

  const handleRemovePin = () => {
    // Communicate with parent to remove pin from the map
    parentOnRemovePin?.();
  };

  const handleRunImpact = () => {
    setIsAnimating(true);
    // Now trigger the actual simulation start
    onStartImpact();
    onRunSimulation?.();
    // Animation state will be reset by parent component
    setTimeout(() => setIsAnimating(false), 5000);
  };

  if (isCollapsed) return null;

  return (
    <div className="absolute top-4 left-4 z-10 w-[380px] h-[720px] bg-black/70 backdrop-blur-lg rounded-lg border border-white/10 overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-light text-white/90 uppercase tracking-wider">
              {viewMode === "parameters"
                ? "Simulation Parameters"
                : "Impact Simulator"}
            </h3>
            {viewMode !== "simulator" && (
              <button
                onClick={onReset}
                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-sm transition-colors"
              >
                <span className="text-[10px] font-light text-white/80 uppercase tracking-wider">
                  Reset
                </span>
              </button>
            )}
            {viewMode === "simulator" && (
              <button
                onClick={handleBackToParameters}
                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-sm transition-colors"
              >
                <span className="text-[10px] font-light text-white/80 uppercase tracking-wider">
                  Back
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {viewMode === "parameters" ? (
          <>
            {/* 3D Asteroid Preview */}
            <div className="mb-6">
              <AsteroidPreview diameter={asteroidParams.diameter} />
            </div>

            {/* Parameters */}
            <div className="space-y-4 mb-6">
              {/* Asteroid Diameter */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                    Diameter
                  </label>
                  <span className="text-white/90 font-light text-xs">
                    {formatNumber(asteroidParams.diameter, 0)}m
                  </span>
                </div>
                <input
                  type="range"
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  min="50"
                  max="10000"
                  value={asteroidParams.diameter}
                  onChange={(e) =>
                    setAsteroidParams((prev) => ({
                      ...prev,
                      diameter: Number(e.target.value),
                    }))
                  }
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/30">50m</span>
                  <span className="text-[9px] text-white/30">10km</span>
                </div>
              </div>

              {/* Velocity */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                    Velocity
                  </label>
                  <span className="text-white/90 font-light text-xs">
                    {asteroidParams.velocity} km/s
                  </span>
                </div>
                <input
                  type="range"
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  min="5"
                  max="72"
                  value={asteroidParams.velocity}
                  onChange={(e) =>
                    setAsteroidParams((prev) => ({
                      ...prev,
                      velocity: Number(e.target.value),
                    }))
                  }
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/30">5 km/s</span>
                  <span className="text-[9px] text-white/30">72 km/s</span>
                </div>
              </div>

              {/* Entry Angle */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                    Entry Angle
                  </label>
                  <span className="text-white/90 font-light text-xs">
                    {asteroidParams.angle}°
                  </span>
                </div>
                <input
                  type="range"
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  min="15"
                  max="90"
                  value={asteroidParams.angle}
                  onChange={(e) =>
                    setAsteroidParams((prev) => ({
                      ...prev,
                      angle: Number(e.target.value),
                    }))
                  }
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/30">15°</span>
                  <span className="text-[9px] text-white/30">90°</span>
                </div>
              </div>

              {/* Distance */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                    Initial Distance
                  </label>
                  <span className="text-white/90 font-light text-xs">
                    {formatNumber(asteroidParams.distance, 0)} km
                  </span>
                </div>
                <input
                  type="range"
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  min="10000"
                  max="500000"
                  value={asteroidParams.distance}
                  onChange={(e) =>
                    setAsteroidParams((prev) => ({
                      ...prev,
                      distance: Number(e.target.value),
                    }))
                  }
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/30">10k km</span>
                  <span className="text-[9px] text-white/30">500k km</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
              <button
                onClick={handleContinueToSimulator}
                className="w-full px-4 py-2.5 rounded text-xs font-light transition-all uppercase tracking-wider bg-white text-black hover:bg-white/90"
              >
                Continue to Impact Controls →
              </button>
            </div>
          </>
        ) : (
          /* Impact Simulator Controls View */
          <ImpactSimulatorControls
            finalizedAsteroid={finalizedAsteroid}
            impactLocation={impactLocation}
            onLocationChange={onLocationChange}
            status={simulationStatus}
            show3DBuildings={show3DBuildings}
            onToggle3DBuildings={handleToggle3DBuildings}
            streetViewMode={streetViewMode}
            onToggleStreetView={handleToggleStreetView}
            enhancedBuildings={enhancedBuildings}
            onToggleEnhancedBuildings={handleToggleEnhanced}
            isAnimating={isAnimating}
            onRunImpact={handleRunImpact}
            onReset={onReset}
            currentSimulation={currentSimulation}
            // Pin placement props
            usePredictedLocation={usePredictedLocation}
            onToggleLocationMode={handleToggleLocationMode}
            impactPin={impactPin}
            isPlacingPin={isPlacingPin}
            onStartPinPlacement={handleStartPinPlacement}
            onRemovePin={handleRemovePin}
          />
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 10px;
          height: 10px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          opacity: 0.8;
        }

        .slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          opacity: 0.8;
        }

        .slider:hover::-webkit-slider-thumb {
          opacity: 1;
        }

        .slider:hover::-moz-range-thumb {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
