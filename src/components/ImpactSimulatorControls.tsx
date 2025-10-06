// components/ImpactSimulatorControls.tsx
"use client";

import React from "react";

interface ImpactLocation {
  longitude: number;
  latitude: number;
  city: string;
  country: string;
}

interface FinalizedAsteroid {
  id?: string;
  name: string;
  diameter: number;
  velocity: number;
  angle?: number;
  distance?: number;
  energy?: number;
  crater?: number;
  radius?: number;
  threatLevel?: string;
}

interface ImpactSimulation {
  impactEnergy: number;
  craterDiameter: number;
  damageRadius: number;
  casualties: number;
  location: ImpactLocation;
}

interface ImpactSimulatorControlsProps {
  finalizedAsteroid: FinalizedAsteroid | null;
  impactLocation: ImpactLocation;
  onLocationChange?: (location: ImpactLocation) => void;
  status: string;
  show3DBuildings: boolean;
  onToggle3DBuildings: () => void;
  streetViewMode: boolean;
  onToggleStreetView: () => void;
  enhancedBuildings: boolean;
  onToggleEnhancedBuildings: () => void;
  isAnimating: boolean;
  onRunImpact: () => void;
  onReset: () => void;
  currentSimulation: ImpactSimulation | null;
}

export default function ImpactSimulatorControls({
  finalizedAsteroid,
  impactLocation,
  status,
  show3DBuildings,
  onToggle3DBuildings,
  streetViewMode,
  onToggleStreetView,
  enhancedBuildings,
  onToggleEnhancedBuildings,
  isAnimating,
  onRunImpact,
  onReset,
  currentSimulation,
}: ImpactSimulatorControlsProps) {
  const formatNumber = (num: number, decimals = 2) => {
    if (!num || isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`;
    return num.toFixed(decimals);
  };

  if (!finalizedAsteroid) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-sm">No asteroid selected</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Asteroid Display */}
      <div>
        <label className="block text-[10px] font-light text-white/60 uppercase tracking-wider mb-2">
          Selected Asteroid
        </label>
        <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div className="text-white/90 text-sm font-medium mb-1">
            {finalizedAsteroid.name}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60">
            <div>
              <span className="text-white/40">Diameter:</span>{" "}
              <span className="text-white/70">
                {formatNumber(finalizedAsteroid.diameter, 0)}m
              </span>
            </div>
            <div>
              <span className="text-white/40">Velocity:</span>{" "}
              <span className="text-white/70">
                {finalizedAsteroid.velocity} km/s
              </span>
            </div>
            {finalizedAsteroid.energy && (
              <div>
                <span className="text-white/40">Energy:</span>{" "}
                <span className="text-white/70">
                  {formatNumber(finalizedAsteroid.energy)} MT
                </span>
              </div>
            )}
            {finalizedAsteroid.threatLevel && (
              <div>
                <span className="text-white/40">Threat:</span>{" "}
                <span
                  className={`${
                    finalizedAsteroid.threatLevel === "GLOBAL"
                      ? "text-red-400"
                      : finalizedAsteroid.threatLevel === "REGIONAL"
                      ? "text-orange-400"
                      : finalizedAsteroid.threatLevel === "LOCAL"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {finalizedAsteroid.threatLevel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impact Location */}
      <div>
        <label className="block text-[10px] font-light text-white/60 uppercase tracking-wider mb-2">
          Impact Location
        </label>
        <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div className="text-white/90 text-xs font-light">
            {impactLocation.city}
          </div>
          <div className="text-white/50 text-[10px] mt-1">
            {impactLocation.latitude.toFixed(4)}°,{" "}
            {impactLocation.longitude.toFixed(4)}°
          </div>
          <div className="text-[9px] text-white/40 mt-2">
            Click anywhere on the map to change impact location
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="space-y-3">
        {/* 3D Buildings Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div>
            <div className="text-xs text-white/90 font-light">3D Buildings</div>
            <div className="text-[10px] text-white/50">
              Show building damage
            </div>
          </div>
          <button
            onClick={onToggle3DBuildings}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
              show3DBuildings ? "bg-white/30" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                show3DBuildings ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Street View Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div>
            <div className="text-xs text-white/90 font-light">
              Street View Mode
            </div>
            <div className="text-[10px] text-white/50">
              Ground-level perspective
            </div>
          </div>
          <button
            onClick={onToggleStreetView}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
              streetViewMode ? "bg-white/30" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                streetViewMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Enhanced Rendering Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div>
            <div className="text-xs text-white/90 font-light">
              Enhanced Rendering
            </div>
            <div className="text-[10px] text-white/50">
              Better lighting & shadows
            </div>
          </div>
          <button
            onClick={onToggleEnhancedBuildings}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
              enhancedBuildings ? "bg-white/30" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                enhancedBuildings ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={onRunImpact}
          disabled={isAnimating}
          className={`w-full px-4 py-2.5 rounded text-xs font-light transition-all uppercase tracking-wider ${
            isAnimating
              ? "bg-white/10 text-white/50 cursor-not-allowed"
              : "bg-white text-black backdrop-blur-sm hover:bg-white/90"
          }`}
        >
          {isAnimating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
              Simulating...
            </div>
          ) : (
            "Simulate Impact"
          )}
        </button>
      </div>
    </div>
  );
}
