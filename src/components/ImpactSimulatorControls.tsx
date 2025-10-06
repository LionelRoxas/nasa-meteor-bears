// components/ImpactSimulatorControls.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { EnhancedPrediction } from "@/hooks/useEnhancedPredictions";

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
  // Enhanced prediction support
  enhancedPrediction?: EnhancedPrediction | null;
  // Pin placement controls
  usePredictedLocation?: boolean;
  onToggleLocationMode?: () => void;
  impactPin?: ImpactLocation | null;
  isPlacingPin?: boolean;
  onStartPinPlacement?: () => void;
  onRemovePin?: () => void;
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
  // Enhanced prediction
  enhancedPrediction,
  // Pin placement controls
  usePredictedLocation,
  onToggleLocationMode,
  impactPin,
  isPlacingPin,
  onStartPinPlacement,
  onRemovePin,
}: ImpactSimulatorControlsProps) {
  // Cache the enhanced prediction data for post-impact display
  const [cachedPrediction, setCachedPrediction] = useState<EnhancedPrediction | null>(null);
  const [predictedLocation, setPredictedLocation] = useState<ImpactLocation | null>(null);

  // Update cached prediction and location when enhanced prediction loads
  useEffect(() => {
    if (enhancedPrediction) {
      console.log("📦 Caching enhanced prediction data for post-impact display");
      setCachedPrediction(enhancedPrediction);

      // Extract predicted impact location
      if (enhancedPrediction.impact_location) {
        const newLocation: ImpactLocation = {
          latitude: enhancedPrediction.impact_location.latitude,
          longitude: enhancedPrediction.impact_location.longitude,
          city: enhancedPrediction.impact_location.type || "Predicted Location",
          country: "",
        };
        setPredictedLocation(newLocation);
        console.log("📍 Predicted impact location:", newLocation);
      }
    }
  }, [enhancedPrediction]);
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
          Impact Location {predictedLocation && <span className="text-blue-400">(Predicted)</span>}
        </label>

        {/* If we have prediction support AND pin placement support, show mode toggle */}
        {predictedLocation && onToggleLocationMode && usePredictedLocation !== undefined && (
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
                ? "Using trajectory-predicted location"
                : "Using custom pin placement"
              }
            </div>
          </div>
        )}

        {/* Location Display */}
        <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded mb-3">
          <div className="text-white/90 text-xs font-light">
            {/* Show predicted location if available and using predicted mode */}
            {predictedLocation && usePredictedLocation !== false
              ? predictedLocation.city
              : /* Show pin placement states for custom mode or no prediction */
                isPlacingPin
                ? "🎯 Placing Pin..."
                : impactPin
                  ? impactPin.city
                  : "No pin placed"
            }
          </div>
          <div className="text-white/50 text-[10px] mt-1">
            {/* Show predicted coordinates if available and using predicted mode */}
            {predictedLocation && usePredictedLocation !== false
              ? `${predictedLocation.latitude.toFixed(4)}°, ${predictedLocation.longitude.toFixed(4)}°`
              : /* Show pin placement states for custom mode or no prediction */
                isPlacingPin
                ? "Click anywhere on the map to place your pin"
                : impactPin
                  ? `${impactPin.latitude.toFixed(4)}°, ${impactPin.longitude.toFixed(4)}°`
                  : "Place a pin on the map"
            }
          </div>
          {predictedLocation && usePredictedLocation !== false && (
            <div className="text-[9px] text-blue-400/60 mt-2">
              Location calculated from trajectory analysis
            </div>
          )}
          {!predictedLocation && (
            <div className="text-[9px] text-white/40 mt-2">
              Place a pin to set custom impact location
            </div>
          )}
        </div>

        {/* Pin Controls - Show when: no prediction OR in custom pin mode */}
        {(!predictedLocation || usePredictedLocation === false) && !currentSimulation && onStartPinPlacement && onRemovePin && (
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

      {/* Enhanced Prediction Impact Analysis */}
      {cachedPrediction?.consequencePrediction && (
        <div>
          <label className="block text-[10px] font-light text-white/60 uppercase tracking-wider mb-2">
            Impact Analysis
          </label>
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded space-y-3">
            {/* Crater */}
            {cachedPrediction.consequencePrediction.crater && (
              <div>
                <div className="text-[10px] font-light text-blue-300 uppercase tracking-wider mb-1">
                  Crater
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-white/40">Diameter:</span>{" "}
                    <span className="text-white/90">
                      {(cachedPrediction.consequencePrediction.crater.diameter / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40">Depth:</span>{" "}
                    <span className="text-white/90">
                      {cachedPrediction.consequencePrediction.crater.depth.toFixed(0)} m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Fireball */}
            {cachedPrediction.consequencePrediction.fireball && (
              <div>
                <div className="text-[10px] font-light text-orange-300 uppercase tracking-wider mb-1">
                  Fireball
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-white/40">Radius:</span>{" "}
                    <span className="text-white/90">
                      {(cachedPrediction.consequencePrediction.fireball.radius / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40">Thermal:</span>{" "}
                    <span className="text-white/90">
                      {cachedPrediction.consequencePrediction.fireball.thermal_radiation.toFixed(0)} kJ/m²
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Shockwave */}
            {cachedPrediction.consequencePrediction.shockwave && (
              <div>
                <div className="text-[10px] font-light text-yellow-300 uppercase tracking-wider mb-1">
                  Shockwave
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-white/40">Overpressure:</span>{" "}
                    <span className="text-white/90">
                      {cachedPrediction.consequencePrediction.shockwave.overpressure.toFixed(1)} kPa
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40">Arrival:</span>{" "}
                    <span className="text-white/90">
                      {cachedPrediction.consequencePrediction.shockwave.arrival_time.toFixed(0)} s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Seismic */}
            {cachedPrediction.consequencePrediction.seismic && (
              <div>
                <div className="text-[10px] font-light text-red-300 uppercase tracking-wider mb-1">
                  Seismic
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-white/40">Magnitude:</span>{" "}
                    <span className="text-white/90">
                      {cachedPrediction.consequencePrediction.seismic.richter_magnitude.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40">Felt:</span>{" "}
                    <span className="text-white/90">
                      {(cachedPrediction.consequencePrediction.seismic.felt_radius / 1000).toFixed(0)} km
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tsunami (if ocean impact) */}
            {cachedPrediction.consequencePrediction.tsunami && (
              <div>
                <div className="text-[10px] font-light text-cyan-300 uppercase tracking-wider mb-1">
                  Tsunami
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-white/40">Wave Height:</span>{" "}
                    <span className="text-white/90">
                      {cachedPrediction.consequencePrediction.tsunami.wave_height.toFixed(1)} m
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40">Radius:</span>{" "}
                    <span className="text-white/90">
                      {(cachedPrediction.consequencePrediction.tsunami.affected_radius / 1000).toFixed(0)} km
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prediction Data Ready Indicator */}
      {cachedPrediction && !cachedPrediction.consequencePrediction && (
        <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-xs">✓</span>
            <span className="text-[10px] text-green-300">
              Impact data preloaded and ready
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Simulate Button - Always show when no current simulation */}
        {!currentSimulation && (
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
