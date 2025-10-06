/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// components/LeftSidebar.tsx
"use client";

import React, { useState, useEffect } from "react";
import AsteroidPreview from "./AsteroidPreview";
import ImpactSimulatorControls from "./ImpactSimulatorControls";
import {
  useEnhancedPredictions,
  type EnhancedPrediction,
} from "@/hooks/useEnhancedPredictions";

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
  // Enhanced prediction callback
  onPredictionLoaded?: (prediction: EnhancedPrediction) => void;
  // Pin placement props
  usePredictedLocation?: boolean;
  impactPin?: any | null;
  isPlacingPin?: boolean;
  // Pin placement communication with parent
  onStartPinPlacement?: () => void;
  onRemovePin?: () => void;
  onToggleLocationMode?: () => void;
  hasImpactOccurred?: boolean; // Flag to indicate if impact has finished
  // Panel control
  onClosePanels?: () => void; // New prop to close NASA/Mitigation panels
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
  onPredictionLoaded,
  usePredictedLocation,
  impactPin,
  isPlacingPin,
  onStartPinPlacement: parentOnStartPinPlacement,
  onRemovePin: parentOnRemovePin,
  onToggleLocationMode,
  hasImpactOccurred = false,
  onClosePanels, // New prop
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

  // Enhanced prediction state
  const {
    getEnhancedPrediction,
    loading: predictionLoading,
    error: predictionError,
  } = useEnhancedPredictions();
  const [enhancedPrediction, setEnhancedPrediction] =
    useState<EnhancedPrediction | null>(null);
  const [predictionProgress, setPredictionProgress] = useState<{
    stage: string;
    message: string;
  }>({ stage: "", message: "" });
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);

  // Reset state when NASA asteroid changes
  useEffect(() => {
    if (selectedNASAAsteroid?.id) {
      // NASA asteroid selected - will fetch on button press
      setEnhancedPrediction(null);
      setIsLoadingPrediction(false);
    } else {
      // Custom asteroid - no prediction needed
      setEnhancedPrediction(null);
      setIsLoadingPrediction(false);
    }
  }, [selectedNASAAsteroid?.id]);

  const formatNumber = (num: number, decimals = 2) => {
    if (!num || isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`;
    return num.toFixed(decimals);
  };

  const handleContinueToSimulator = async () => {
    // If NASA asteroid is selected, fetch prediction data first
    if (selectedNASAAsteroid?.id) {
      console.log(
        "🚀 Continue button pressed - fetching enhanced prediction for NASA asteroid..."
      );
      setIsLoadingPrediction(true);

      try {
        // Progress: Calculating trajectory
        setPredictionProgress({
          stage: "trajectory",
          message: "Calculating trajectory...",
        });

        const prediction = await getEnhancedPrediction(selectedNASAAsteroid.id);

        if (prediction) {
          console.log("✅ Enhanced prediction loaded:", prediction);

          // Progress: Generating mitigation strategies
          setPredictionProgress({
            stage: "mitigation",
            message: "Generating mitigation strategies...",
          });

          // Generate mitigation strategies using our new API
          try {
            console.log("🛡️ Generating mitigation strategies for NASA asteroid...");
            
            const mitigationResponse = await fetch('/api/mitigation-strategies', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                threatLevel: prediction.threatLevel || 'MODERATE',
                impactEnergy: prediction.impact_physics?.megatonsEquivalent || asteroidParams.energy,
                craterDiameter: prediction.impact_physics?.craterDiameter || asteroidParams.craterSize,
                earthquakeMagnitude: prediction.impact_physics?.earthquakeMagnitude || 5.0,
                affectedRadius: prediction.impact_physics?.affectedRadius || asteroidParams.affectedRadius,
                populationAtRisk: prediction.populationAtRisk || 50000,
                impactLocation: {
                  type: prediction.impact_location?.type || 'land',
                  latitude: prediction.impact_location?.latitude || impactLocation.latitude,
                  longitude: prediction.impact_location?.longitude || impactLocation.longitude,
                },
                tsunamiHeight: prediction.impact_physics?.tsunamiHeight,
                timeToImpact: prediction.trajectory?.time_to_impact || 86400
              })
            });

            if (mitigationResponse.ok) {
              const mitigationResult = await mitigationResponse.json();
              if (mitigationResult.success && mitigationResult.mitigationStrategies) {
                console.log("✅ Mitigation strategies generated:", mitigationResult.mitigationStrategies.substring(0, 100) + "...");
                
                // Add mitigation strategies to the prediction
                const enhancedPredictionWithStrategies = {
                  ...prediction,
                  mitigationStrategies: mitigationResult.mitigationStrategies
                };
                
                setEnhancedPrediction(enhancedPredictionWithStrategies);
                onPredictionLoaded?.(enhancedPredictionWithStrategies);
              } else {
                console.warn("⚠️ Mitigation strategies API returned invalid response");
                setEnhancedPrediction(prediction);
                onPredictionLoaded?.(prediction);
              }
            } else {
              console.warn("⚠️ Mitigation strategies API failed:", mitigationResponse.status);
              setEnhancedPrediction(prediction);
              onPredictionLoaded?.(prediction);
            }
          } catch (mitigationError) {
            console.error("❌ Error generating mitigation strategies:", mitigationError);
            setEnhancedPrediction(prediction);
            onPredictionLoaded?.(prediction);
          }

          // Progress: Complete
          setPredictionProgress({
            stage: "complete",
            message: "Prediction Complete!",
          });

          // Clear progress message after 1 second and continue
          setTimeout(() => {
            setPredictionProgress({ stage: "", message: "" });

            // Finalize the asteroid configuration
            const finalAsteroid = {
              id: selectedNASAAsteroid.id,
              name: selectedNASAAsteroid.name,
              diameter: asteroidParams.diameter,
              velocity: asteroidParams.velocity,
              angle: asteroidParams.angle,
              distance: asteroidParams.distance,
              ...impactData,
            };

            setFinalizedAsteroid(finalAsteroid);
            setViewMode("simulator");
            setIsLoadingPrediction(false);
          }, 1500); // Slightly longer to show completion
        }
      } catch (error) {
        console.error("❌ Failed to fetch prediction:", error);
        setPredictionProgress({
          stage: "error",
          message: "Failed to load prediction",
        });
        setIsLoadingPrediction(false);
      }
    } else {
      // Custom asteroid - no prediction needed, proceed immediately
      onClosePanels?.(); // Close panels for custom asteroids too
      
      const finalAsteroid = {
        id: "custom",
        name: `Custom Asteroid (${asteroidParams.diameter}m)`,
        diameter: asteroidParams.diameter,
        velocity: asteroidParams.velocity,
        angle: asteroidParams.angle,
        distance: asteroidParams.distance,
        ...impactData,
      };

      setFinalizedAsteroid(finalAsteroid);
      setViewMode("simulator");
    }
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
    <div className="absolute top-4 left-4 z-10 w-[380px] h-[700px] bg-black/70 backdrop-blur-lg rounded-lg border border-white/10 overflow-hidden flex flex-col shadow-2xl">
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
                className="px-2 py-1 bg-red-900/40 hover:bg-red-800/50 backdrop-blur rounded-sm transition-colors"
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center justify-center">
                  Reset
                </span>
              </button>
            )}
            {viewMode === "simulator" && (
              <button
                onClick={handleBackToParameters}
                className="px-2 py-1 bg-red-900/40 hover:bg-red-800/50 backdrop-blur rounded-sm transition-colors"
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center justify-center">
                  Reset
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
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
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
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
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
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
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
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
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
              {/* Error Message - Only show if there's an error */}
              {predictionError && !predictionLoading && (
                <div className="p-2 bg-red-500/20 border border-red-500/30 rounded">
                  <p className="text-[10px] text-red-300">
                    Failed to load prediction data
                  </p>
                </div>
              )}

              {/* Main Button */}
              <button
                onClick={handleContinueToSimulator}
                disabled={isLoadingPrediction || predictionLoading}
                className={`w-full px-4 py-3 rounded text-xs font-light transition-all uppercase tracking-wider ${
                  isLoadingPrediction || predictionLoading
                    ? "bg-blue-500/20 border border-blue-500/30 text-white/90 cursor-not-allowed"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                {isLoadingPrediction || predictionLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>
                      {predictionProgress.message || 
                       (selectedNASAAsteroid?.id 
                         ? "Analyzing NASA asteroid data..." 
                         : "Processing...")}
                    </span>
                  </div>
                ) : predictionError ? (
                  "Retry Analysis →"
                ) : (
                  "Continue to Impact Controls →"
                )}
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
            // Enhanced prediction
            enhancedPrediction={enhancedPrediction}
            hasImpactOccurred={hasImpactOccurred}
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
        .slider {
          background: linear-gradient(to right, #ffffff20, #ffffff20);
          border-radius: 4px;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          opacity: 0.9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          opacity: 0.9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-webkit-slider-track {
          background: linear-gradient(to right, #ffffff40, #ffffff40);
          height: 4px;
          border-radius: 2px;
        }

        .slider::-moz-range-track {
          background: linear-gradient(to right, #ffffff40, #ffffff40);
          height: 4px;
          border-radius: 2px;
        }

        .slider:hover::-webkit-slider-thumb {
          opacity: 1;
          transform: scale(1.1);
        }

        .slider:hover::-moz-range-thumb {
          opacity: 1;
          transform: scale(1.1);
        }

        .slider:hover::-webkit-slider-track {
          background: linear-gradient(to right, #ffffff60, #ffffff60);
        }

        .slider:hover::-moz-range-track {
          background: linear-gradient(to right, #ffffff60, #ffffff60);
        }
      `}</style>
    </div>
  );
}
