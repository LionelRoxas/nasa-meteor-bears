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
  // Pin placement controls
  usePredictedLocation: boolean;
  onToggleLocationMode: () => void;
  impactPin: ImpactLocation | null;
  isPlacingPin: boolean;
  onStartPinPlacement: () => void;
  onRemovePin: () => void;
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
  // Pin placement controls
  usePredictedLocation,
  onToggleLocationMode,
  impactPin,
  isPlacingPin,
  onStartPinPlacement,
  onRemovePin,
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

      {/* Impact Location Mode Selection */}
      <div>
        <label className="block text-[10px] font-light text-white/60 uppercase tracking-wider mb-2">
          Impact Location
        </label>
        
        {/* Location Mode Toggle */}
        <div className="mb-3 p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/90 font-light">
              {usePredictedLocation ? "Predicted Location" : "Custom Pin"}
            </span>
            <button
              onClick={onToggleLocationMode}
              disabled={isAnimating}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                usePredictedLocation ? "bg-blue-500/30" : "bg-orange-500/30"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  usePredictedLocation ? "translate-x-1" : "translate-x-6"
                }`}
              />
            </button>
          </div>
          <div className="text-[10px] text-white/50">
            {usePredictedLocation 
              ? "Using predicted impact location (New York)" 
              : "Using custom pin placement"
            }
          </div>
        </div>

        {/* Location Display */}
        <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded mb-3">
          <div className="text-white/90 text-xs font-light">
            {usePredictedLocation 
              ? "New York (Predicted)" 
              : isPlacingPin 
                ? "🎯 Placing Pin..." 
                : impactPin 
                  ? impactPin.city 
                  : "No pin placed"
            }
          </div>
          <div className="text-white/50 text-[10px] mt-1">
            {usePredictedLocation 
              ? "40.7000°, -74.5000°"
              : isPlacingPin
                ? "Click anywhere on the map to place your pin"
                : impactPin 
                  ? `${impactPin.latitude.toFixed(4)}°, ${impactPin.longitude.toFixed(4)}°`
                  : "Place a pin on the map"
            }
          </div>
        </div>

        {/* Pin Controls - Only show when not using predicted location */}
        {!usePredictedLocation && !currentSimulation && (
          <div className="space-y-2">
            {!impactPin ? (
              <button
                onClick={onStartPinPlacement}
                disabled={isAnimating}
                className={`w-full px-4 py-2 rounded text-xs font-light transition-all disabled:cursor-not-allowed uppercase tracking-wider ${
                  isPlacingPin 
                    ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white animate-pulse" 
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white"
                }`}
              >
                {isPlacingPin ? '🎯 Click on Map to Place Pin...' : '📍 Place Pin on Map'}
              </button>
            ) : (
              <button
                onClick={onRemovePin}
                disabled={isAnimating}
                className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded text-xs font-light transition-all disabled:cursor-not-allowed uppercase tracking-wider"
              >
                🗑️ Remove Pin
              </button>
            )}
            
            {/* Pin placement status */}
            {isPlacingPin && (
              <div className="p-2 bg-red-500/20 border border-red-500/30 rounded">
                <div className="text-red-400 text-[10px] font-light text-center">
                  🎯 Pin Placement Mode Active
                </div>
                <div className="text-red-300 text-[9px] text-center mt-1">
                  Click anywhere on the map to place your impact pin
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* Action Buttons - Only show simulate button when location is set */}
      <div className="space-y-2">
        {/* Simulate Button - Show when we have a location (predicted or pin) and no current simulation */}
        {((usePredictedLocation || impactPin) && !currentSimulation) && (
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
              "🚀 Simulate Impact"
            )}
          </button>
        )}

        {/* Reset Button - Show when simulation exists */}
        {currentSimulation && (
          <button
            onClick={onReset}
            disabled={isAnimating}
            className="w-full px-4 py-2.5 rounded text-xs font-light transition-all uppercase tracking-wider bg-gray-600 text-white hover:bg-gray-700 disabled:bg-white/10 disabled:text-white/50 disabled:cursor-not-allowed"
          >
            🔄 Reset Simulation
          </button>
        )}

        {/* Status Display */}
        <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
          <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Status</div>
          <div className="text-xs text-white/90 font-light">{status}</div>
        </div>
      </div>
    </div>
  );
}
