"use client";

import { useState } from "react";
import TerrainVisualizer from "@/components/TerrainVisualizer";
import {
  useEnhancedPredictions,
  type EnhancedPrediction,
} from "@/hooks/useEnhancedPredictions";
import ConsequenceAnalysis from "@/components/ConsequenceAnalysis";
import ImpactInsights from "@/components/ImpactInsights";
import USGSDataPanel from "@/components/USGSDataPanel";

// Mock asteroid data for testing
const MOCK_ASTEROIDS = [
  {
    id: "2000433",
    name: "433 Eros",
    diameter: 16700, // meters
    velocity: 24.5,
    energy: 125.4,
    craterRadius: 8.2,
  },
  {
    id: "99942",
    name: "99942 Apophis",
    diameter: 370,
    velocity: 30.7,
    energy: 2.1,
    craterRadius: 1.8,
  },
  {
    id: "2001566",
    name: "2001566 Icarus",
    diameter: 1400,
    velocity: 28.3,
    energy: 45.7,
    craterRadius: 4.6,
  },
];

export default function TerrainTestPage() {
  const [selectedAsteroid, setSelectedAsteroid] = useState(MOCK_ASTEROIDS[0]);
  const [impactLocation, setImpactLocation] = useState({
    lat: 40.7128,
    lng: -74.006,
  }); // NYC
  const [isSimulating, setIsSimulating] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [simulationPhase, setSimulationPhase] = useState<
    "approach" | "impact" | "aftermath"
  >("approach");

  const { getEnhancedPrediction, loading: predictionLoading } =
    useEnhancedPredictions();
  const [enhancedData, setEnhancedData] = useState<EnhancedPrediction | null>(
    null
  );
  const [realTerrainData, setRealTerrainData] = useState<any>(null);

  const handleGetEnhancedData = async () => {
    const prediction = await getEnhancedPrediction(selectedAsteroid.id);
    setEnhancedData(prediction);

    // Update impact location to real coordinates if available
    if (prediction?.impact_location) {
      setImpactLocation({
        lat: prediction.impact_location.latitude,
        lng: prediction.impact_location.longitude,
      });
      console.log(
        "Updated to real impact coordinates:",
        prediction.impact_location.latitude,
        prediction.impact_location.longitude
      );
    }
  };

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setSimulationPhase("approach");

    // Simulate phases
    setTimeout(() => {
      setSimulationPhase("impact");
      setShowImpact(true);
    }, 2000);

    setTimeout(() => {
      setSimulationPhase("aftermath");
    }, 4000);

    setTimeout(() => {
      setIsSimulating(false);
    }, 8000);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setShowImpact(false);
    setSimulationPhase("approach");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-blue-400">2D Terrain</span> Impact Simulator
          </h1>
          <p className="text-gray-400">
            Temporary development space for enhanced 2D terrain visualization
            with 3D→2D transition
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
              {/* Asteroid Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">
                  Asteroid Selection
                </h3>
                <div className="space-y-2">
                  {MOCK_ASTEROIDS.map((asteroid) => (
                    <button
                      key={asteroid.id}
                      onClick={() => setSelectedAsteroid(asteroid)}
                      className={`w-full p-3 rounded text-left transition-colors ${
                        selectedAsteroid.id === asteroid.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      <div className="font-medium">{asteroid.name}</div>
                      <div className="text-sm text-gray-300">
                        {asteroid.diameter}m • {asteroid.velocity} km/s
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Prediction Data */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-400">
                  AI Analysis
                </h3>
                <button
                  onClick={handleGetEnhancedData}
                  disabled={predictionLoading}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-white transition-colors"
                >
                  {predictionLoading
                    ? "Analyzing..."
                    : "Get Enhanced Prediction"}
                </button>

                {enhancedData && (
                  <div className="mt-3 p-3 bg-gray-700 rounded">
                    <div className="text-sm space-y-1">
                      <div>
                        Risk Score:{" "}
                        <span className="text-red-400">
                          {enhancedData.risk_score}%
                        </span>
                      </div>
                      <div>
                        Threat:{" "}
                        <span className="text-orange-400">
                          {enhancedData.threat_category}
                        </span>
                      </div>
                      <div>
                        Correlations:{" "}
                        <span className="text-blue-400">
                          {
                            enhancedData.correlation_context
                              .top_similar_earthquakes
                          }
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 mt-2 italic">
                        {enhancedData.llm_analysis.historical_comparison}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-400">
                  Simulation
                </h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div>
                      Phase:{" "}
                      <span className="capitalize text-green-400">
                        {simulationPhase}
                      </span>
                    </div>
                    <div>
                      Location: {impactLocation.lat.toFixed(2)}°,{" "}
                      {impactLocation.lng.toFixed(2)}°
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleStartSimulation}
                      disabled={isSimulating}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white transition-colors"
                    >
                      {isSimulating ? "Simulating..." : "Start Impact"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Phase Indicator */}
                  {isSimulating && (
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-2">
                        Simulation Phase
                      </div>
                      <div className="flex justify-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            simulationPhase === "approach"
                              ? "bg-yellow-400 animate-pulse"
                              : "bg-gray-600"
                          }`}
                        ></div>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            simulationPhase === "impact"
                              ? "bg-red-400 animate-pulse"
                              : "bg-gray-600"
                          }`}
                        ></div>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            simulationPhase === "aftermath"
                              ? "bg-blue-400 animate-pulse"
                              : "bg-gray-600"
                          }`}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Approach → Impact → Aftermath
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Data Display */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">
                  Impact Data
                </h3>
                <div className="bg-gray-700 rounded p-3 space-y-2 text-sm">
                  <div>
                    Energy:{" "}
                    <span className="text-orange-400">
                      {selectedAsteroid.energy} MT TNT
                    </span>
                  </div>
                  <div>
                    Crater:{" "}
                    <span className="text-red-400">
                      {selectedAsteroid.craterRadius} km
                    </span>
                  </div>
                  <div>
                    Diameter:{" "}
                    <span className="text-blue-400">
                      {(selectedAsteroid.diameter / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <div>
                    Velocity:{" "}
                    <span className="text-green-400">
                      {selectedAsteroid.velocity} km/s
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terrain Visualizer and Insights */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <TerrainVisualizer
                width={900}
                height={600}
                asteroidData={{
                  impactLat: impactLocation.lat,
                  impactLng: impactLocation.lng,
                  craterRadius: selectedAsteroid.craterRadius,
                  energy: selectedAsteroid.energy,
                }}
                onImpactLocationChange={(lat, lng) =>
                  setImpactLocation({ lat, lng })
                }
                onTerrainDataChange={setRealTerrainData}
                simulationPhase={simulationPhase}
                showImpact={showImpact}
                enhancedPrediction={enhancedData || undefined}
              />
            </div>

            {/* USGS Data Panel - Shows real seismic and tsunami data */}
            {enhancedData && (
              <USGSDataPanel prediction={enhancedData} />
            )}

            {/* Consequence Analysis */}
            {enhancedData && (
              <ConsequenceAnalysis
                enhancedPrediction={enhancedData}
                asteroidData={{
                  diameter_meters: selectedAsteroid.diameter,
                  kinetic_energy_mt: selectedAsteroid.energy,
                  is_hazardous: selectedAsteroid.energy > 10,
                }}
                impactLocation={impactLocation}
              />
            )}
          </div>
        </div>

        {/* Temporary Notice */}
        <div className="mt-8 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-yellow-400 mt-0.5">⚠️</div>
            <div>
              <div className="text-yellow-400 font-medium">
                Temporary Development Space
              </div>
              <div className="text-yellow-300 text-sm mt-1">
                This is a standalone testing environment for the 2D terrain
                visualizer. Once we&apos;re happy with the implementation,
                we&apos;ll integrate it into the main application. This file can
                be safely deleted later.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
