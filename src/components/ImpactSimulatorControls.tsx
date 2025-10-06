/* eslint-disable @typescript-eslint/no-unused-vars */
// components/ImpactSimulatorControls.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { EnhancedPrediction } from "@/hooks/useEnhancedPredictions";
import AutoResetButton from "./AutoResetButton";

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
  hasImpactOccurred: boolean; // Flag to indicate if impact has finished
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
  hasImpactOccurred,
  // Pin placement controls
  usePredictedLocation,
  onToggleLocationMode,
  impactPin,
  isPlacingPin,
  onStartPinPlacement,
  onRemovePin,
}: ImpactSimulatorControlsProps) {
  // Cache the enhanced prediction data for post-impact display
  const [cachedPrediction, setCachedPrediction] =
    useState<EnhancedPrediction | null>(null);
  const [predictedLocation, setPredictedLocation] =
    useState<ImpactLocation | null>(null);

  // Update cached prediction and location when enhanced prediction loads
  useEffect(() => {
    if (enhancedPrediction) {
      console.log(
        "📦 Caching enhanced prediction data for post-impact display"
      );
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
      }
    }
  }, [enhancedPrediction]);

  // Auto-start pin placement when component loads and conditions are right
  useEffect(() => {
    // Add a small delay to ensure everything is initialized
    const timer = setTimeout(() => {
      if (
        onStartPinPlacement &&
        !predictedLocation && // No predicted location available
        !impactPin && // No pin already placed
        !isPlacingPin && // Not already placing a pin
        !isAnimating && // Not animating
        !hasImpactOccurred // Impact hasn't occurred yet
      ) {
        console.log("🎯 Auto-starting pin placement");
        onStartPinPlacement();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [
    onStartPinPlacement,
    predictedLocation,
    impactPin,
    isPlacingPin,
    isAnimating,
    hasImpactOccurred,
  ]);
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
            {finalizedAsteroid.angle && (
              <div>
                <span className="text-white/40">Angle:</span>{" "}
                <span className="text-white/70">
                  {finalizedAsteroid.angle}°
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impact Location */}
      <div>
        <label className="block text-[10px] font-light text-white/60 uppercase tracking-wider mb-2">
          Impact Location{" "}
          {predictedLocation && (
            <span className="text-blue-400">(Predicted)</span>
          )}
        </label>

        {/* If we have prediction support AND pin placement support, show mode toggle */}
        {predictedLocation &&
          onToggleLocationMode &&
          usePredictedLocation !== undefined && (
            <div className="mb-3 p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/90 font-light">
                  {usePredictedLocation ? "Predicted Location" : "Custom Pin"}
                </span>
                <button
                  onClick={onToggleLocationMode}
                  disabled={isAnimating || hasImpactOccurred}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    hasImpactOccurred
                      ? "bg-gray-500/20"
                      : usePredictedLocation
                      ? "bg-blue-500/30"
                      : "bg-orange-500/30"
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
                  : "Using custom pin placement"}
              </div>
            </div>
          )}

        {/* Location Display - Only show if there's a location */}
        {((predictedLocation && usePredictedLocation !== false) ||
          impactPin) && (
          <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded mb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white/50 text-[10px]">
                  {/* Show predicted coordinates if available and using predicted mode */}
                  {predictedLocation && usePredictedLocation !== false
                    ? `${predictedLocation.latitude.toFixed(
                        4
                      )}°, ${predictedLocation.longitude.toFixed(4)}°`
                    : /* Show pin coordinates if available */
                    impactPin
                    ? `${impactPin.latitude.toFixed(
                        4
                      )}°, ${impactPin.longitude.toFixed(4)}°`
                    : null}
                </div>
                {predictedLocation && usePredictedLocation !== false && (
                  <div className="text-[9px] text-blue-400/60 mt-2">
                    Location calculated from trajectory analysis
                  </div>
                )}
              </div>

              {/* Remove Pin Button - Show for custom pins only */}
              {impactPin &&
                usePredictedLocation === false &&
                !hasImpactOccurred &&
                onRemovePin && (
                  <button
                    onClick={onRemovePin}
                    disabled={isAnimating}
                    className="ml-3 px-2 py-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded text-[10px] font-light transition-all disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    Remove Pin
                  </button>
                )}
            </div>
          </div>
        )}

        {/* Pin Controls - Show when: no prediction OR in custom pin mode */}
        {(!predictedLocation || usePredictedLocation === false) &&
          !currentSimulation &&
          onStartPinPlacement &&
          !impactPin && (
            <div className="space-y-2">
              <button
                onClick={onStartPinPlacement}
                disabled={isAnimating}
                className={`w-full px-4 py-2 rounded text-xs font-light transition-all disabled:cursor-not-allowed uppercase tracking-wider ${
                  isPlacingPin
                    ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white animate-pulse"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white"
                }`}
              >
                {isPlacingPin
                  ? "Click on Map to Place Pin..."
                  : "Place Pin on Map"}
              </button>
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

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Simulate Impact Button - Only available before simulation */}
        {!currentSimulation &&
          !hasImpactOccurred &&
          (usePredictedLocation || impactPin) && (
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
          )}

        {/* Reset Button - Show after simulation is complete */}
        {hasImpactOccurred && (
          <AutoResetButton onReset={onReset} countdownSeconds={60} />
        )}
      </div>
    </div>
  );
}
