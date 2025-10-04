"use client";

import { useState } from "react";
import {
  useNASAData,
  type NASAAsteroidData as BaseNASAAsteroidData,
} from "@/hooks/useNASAData";
import { useMLPredictions } from "@/hooks/useMLPredictions";

interface ExtendedNASAAsteroidData extends BaseNASAAsteroidData {
  energy?: number;
  threatLevel?: string;
  mlPrediction?: any;
  mlRiskScore?: number;
  mlConfidence?: number;
  mlThreatCategory?: string;
  mlRecommendation?: string;
  isHighMLRisk?: boolean;
}

interface Props {
  onSelectAsteroid?: (asteroid: ExtendedNASAAsteroidData) => void;
}

export default function NASADataPanel({ onSelectAsteroid }: Props) {
  const {
    simulationData,
    summary,
    loading,
    error,
    getRandomAsteroid,
    enhanceAsteroidData,
    searchAsteroids,
    getRandomComet,
    getFamousComets,
    isDataAvailable,
    asteroidCount,
    hazardousCount,
    todayCount,
    cometCount,
    hazardousCometCount,
    // ML functions
    getMLRecommendedAsteroid,
    isMLAvailable,
    mlHighRiskCount,
  } = useNASAData();

  // ML predictions hook
  const {
    getMLRecommendations,
    getThreatDistribution,
    mlResults,
    totalPredictions,
    averageConfidence,
    modelAccuracy,
  } = useMLPredictions();

  const [selectedAsteroid, setSelectedAsteroid] =
    useState<ExtendedNASAAsteroidData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "today" | "hazardous" | "comets" | "search" | "stats" | "ml-insights"
  >("today");

  const handleSelectAsteroid = (asteroid: ExtendedNASAAsteroidData) => {
    const enhanced = enhanceAsteroidData(asteroid);
    setSelectedAsteroid(enhanced);
  };

  const handleRandomAsteroid = (
    category: "all" | "hazardous" | "today" | "ml-recommended" = "all"
  ) => {
    let asteroid;

    if (category === "ml-recommended" && isMLAvailable) {
      asteroid = getMLRecommendedAsteroid();
    } else {
      asteroid = getRandomAsteroid(
        category === "ml-recommended" ? "all" : category
      );
    }

    if (asteroid) {
      handleSelectAsteroid(asteroid);
    }
  };

  if (loading) {
    return (
      <div className="bg-black/80 p-4 rounded-lg text-white border border-gray-800">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
        <p className="text-center text-gray-400 mt-4">Loading NASA data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/80 p-4 rounded-lg text-white border border-red-800">
        <h3 className="text-red-400 font-bold mb-2">⚠️ Data Error</h3>
        <p className="text-sm text-red-300">{error}</p>
        <p className="text-xs text-gray-400 mt-2">
          Using fallback simulation data. Real NASA data unavailable.
        </p>
      </div>
    );
  }

  if (!isDataAvailable) {
    return (
      <div className="bg-black/80 p-4 rounded-lg text-white border border-gray-800">
        <p className="text-gray-400">No NASA data available</p>
      </div>
    );
  }

  const searchResults = searchQuery ? searchAsteroids(searchQuery) : [];

  return (
    <div className="bg-black/95 backdrop-blur-sm p-4 rounded-lg text-white border border-gray-700 max-w-sm shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#ff6b35] font-bold text-lg">🛰️ NASA Data</h3>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-800/50 p-3 rounded-lg text-center">
          <div className="text-[#ff6b35] font-bold text-lg">
            {asteroidCount.toLocaleString()}
          </div>
          <div className="text-gray-400 text-xs">Asteroids</div>
        </div>
        <div className="bg-purple-900/30 p-3 rounded-lg text-center">
          <div className="text-purple-400 font-bold text-lg">
            {cometCount.toLocaleString()}
          </div>
          <div className="text-gray-400 text-xs">Comets</div>
        </div>
        <div className="bg-red-900/30 p-3 rounded-lg text-center">
          <div className="text-red-400 font-bold text-lg">
            {hazardousCount + hazardousCometCount}
          </div>
          <div className="text-gray-400 text-xs">Hazardous</div>
        </div>
        <div className="bg-blue-900/30 p-3 rounded-lg text-center">
          <div className="text-blue-400 font-bold text-lg">{todayCount}</div>
          <div className="text-gray-400 text-xs">Today</div>
        </div>
      </div>

      {/* ML Status Banner */}
      {isMLAvailable && (
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700 p-3 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400 text-lg">🤖</span>
            <span className="text-green-300 font-medium text-sm">
              AI Active
            </span>
            <span className="text-gray-400 text-xs">
              ({totalPredictions.toLocaleString()})
            </span>
          </div>
          {mlHighRiskCount > 0 && (
            <div className="text-red-300 text-xs font-medium">
              ⚠️ {mlHighRiskCount} high-risk objects
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(
          [
            "today",
            "hazardous",
            "comets",
            "search",
            "stats",
            "ml-insights",
          ] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-[#ff6b35] text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            } ${
              tab === "ml-insights" && !isMLAvailable
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={tab === "ml-insights" && !isMLAvailable}
          >
            {tab === "comets" ? "☄️" : tab === "ml-insights" ? "🤖" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "today" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleRandomAsteroid("today")}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 text-xs font-medium transition-colors"
            >
              Random Today
            </button>
            <button
              onClick={() => handleRandomAsteroid("all")}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-500 text-xs font-medium transition-colors"
            >
              Random Any
            </button>
            {isMLAvailable && (
              <button
                onClick={() => handleRandomAsteroid("ml-recommended")}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-500 text-xs font-medium transition-colors"
              >
                🤖 AI Pick
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {simulationData?.today.slice(0, 8).map((asteroid) => (
              <div
                key={asteroid.id}
                onClick={() => handleSelectAsteroid(asteroid)}
                className="p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors border border-gray-700/50"
              >
                <div className="font-semibold text-blue-400 text-sm">
                  {asteroid.name}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  ⌀{asteroid.diameter}m • {asteroid.velocity.toFixed(1)} km/s
                </div>
                <div className="text-gray-500 text-xs">
                  📏 {(asteroid.distance / 1000).toFixed(0)}k km
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "hazardous" && (
        <div className="space-y-3">
          <button
            onClick={() => handleRandomAsteroid("hazardous")}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-500 text-xs font-medium transition-colors"
          >
            Random Hazardous
          </button>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {simulationData?.hazardous.slice(0, 8).map((asteroid) => (
              <div
                key={asteroid.id}
                onClick={() => handleSelectAsteroid(asteroid)}
                className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg cursor-pointer hover:bg-red-900/30 transition-colors"
              >
                <div className="font-semibold text-red-400 text-sm">
                  {asteroid.name}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  ⌀{asteroid.diameter}m • {asteroid.velocity.toFixed(1)} km/s
                </div>
                {asteroid.is_sentry_object && (
                  <div className="text-yellow-400 text-xs mt-1">
                    ⚠️ Sentry Object
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "comets" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                const comet = getRandomComet("all");
                if (comet) handleSelectAsteroid(comet);
              }}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-500 text-xs font-medium transition-colors"
            >
              Random Comet
            </button>
            <button
              onClick={() => {
                const comet = getRandomComet("hazardous");
                if (comet) handleSelectAsteroid(comet);
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-500 text-xs font-medium transition-colors"
            >
              Hazardous
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {getFamousComets()
              .slice(0, 8)
              .map((comet) => (
                <div
                  key={comet.id}
                  onClick={() => handleSelectAsteroid(comet)}
                  className="p-3 bg-purple-900/20 border border-purple-800/50 rounded-lg cursor-pointer hover:bg-purple-900/30 transition-colors"
                >
                  <div className="font-semibold text-purple-400 text-sm">
                    ☄️ {comet.name}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    ⌀{comet.diameter}m • {comet.velocity.toFixed(1)} km/s
                  </div>
                  <div className="text-gray-500 text-xs">
                    Period: {comet.period_years.toFixed(1)} years
                  </div>
                  {comet.is_hazardous && (
                    <div className="text-red-400 text-xs mt-1">
                      ⚠️ Potentially Hazardous
                    </div>
                  )}
                </div>
              ))}
          </div>

          {simulationData?.comets && simulationData.comets.length === 0 && (
            <p className="text-gray-400 text-xs text-center py-4">
              No comet data available
            </p>
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search asteroids..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
          />

          <div className="max-h-48 overflow-y-auto space-y-2">
            {searchResults.slice(0, 8).map((asteroid) => (
              <div
                key={asteroid.id}
                onClick={() => handleSelectAsteroid(asteroid)}
                className="p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors border border-gray-700/50"
              >
                <div className="font-semibold text-yellow-400 text-sm">
                  {asteroid.name}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  ID: {asteroid.id}
                </div>
                <div className="text-gray-500 text-xs">
                  ⌀{asteroid.diameter}m • Magnitude:{" "}
                  {asteroid.magnitude.toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          {searchQuery && searchResults.length === 0 && (
            <p className="text-gray-400 text-xs text-center py-4">
              No asteroids found matching &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {activeTab === "stats" && summary && (
        <div className="space-y-2 text-xs">
          <div>
            <div className="text-[#ff6b35] font-semibold">
              Largest Asteroid:
            </div>
            <div className="text-gray-300">{summary.largest_asteroid.name}</div>
            <div className="text-gray-400">
              ⌀{Math.round(summary.largest_asteroid.diameter)}m
            </div>
          </div>

          <div>
            <div className="text-[#ff6b35] font-semibold">
              Closest Approach:
            </div>
            <div className="text-gray-300">{summary.closest_approach.name}</div>
            <div className="text-gray-400">
              {(summary.closest_approach.distance / 1000).toFixed(0)}k km
            </div>
          </div>

          <div>
            <div className="text-[#ff6b35] font-semibold">Data Source:</div>
            <div className="text-gray-400">NASA NEO API</div>
            <div className="text-gray-500">
              Updated: {new Date(summary.last_updated).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* ML Insights Tab */}
      {activeTab === "ml-insights" && (
        <div className="space-y-3 text-xs">
          {isMLAvailable ? (
            <>
              {/* Model Stats */}
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-green-400 font-semibold mb-2">
                  🤖 AI Model Performance
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Accuracy:</span>
                    <span className="text-white">
                      {(modelAccuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Confidence:</span>
                    <span className="text-white">
                      {(averageConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Objects Analyzed:</span>
                    <span className="text-white">{totalPredictions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model Type:</span>
                    <span className="text-white">
                      {mlResults?.model_stats?.model_type || "Random Forest"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Threat Distribution */}
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-yellow-400 font-semibold mb-2">
                  ⚠️ Threat Distribution
                </div>
                {(() => {
                  const distribution = getThreatDistribution();
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-green-400">Low Risk:</span>
                        <span className="text-white">{distribution.LOW}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-400">Medium Risk:</span>
                        <span className="text-white">
                          {distribution.MEDIUM}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-400">High Risk:</span>
                        <span className="text-white">{distribution.HIGH}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400">Critical Risk:</span>
                        <span className="text-white">
                          {distribution.CRITICAL}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Top ML Recommendations */}
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-red-400 font-semibold mb-2">
                  🎯 AI High-Risk Predictions
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {getMLRecommendations(5).map(({ id, prediction }) => {
                    const asteroid = simulationData?.all.find(
                      (a) => a.id === id
                    );
                    if (!asteroid) return null;

                    return (
                      <div
                        key={id}
                        onClick={() => handleSelectAsteroid(asteroid)}
                        className="p-2 bg-red-900/20 border border-red-800 rounded cursor-pointer hover:bg-red-900/30"
                      >
                        <div className="font-semibold text-red-400">
                          {asteroid.name}
                        </div>
                        <div className="text-gray-400">
                          Risk: {prediction.risk_score}% | Confidence:{" "}
                          {(prediction.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-red-300 text-xs">
                          {prediction.recommendation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feature Importance */}
              {mlResults?.model_stats?.feature_importance && (
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-blue-400 font-semibold mb-2">
                    📊 Key Risk Factors
                  </div>
                  <div className="space-y-1">
                    {mlResults.model_stats.feature_importance
                      .slice(0, 4)
                      .map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-400 capitalize">
                            {item.feature.replace(/_/g, " ")}:
                          </span>
                          <span className="text-white">
                            {(item.importance * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-800 p-3 rounded">
              <div className="text-yellow-400 font-semibold">
                🤖 AI System Status
              </div>
              <div className="text-gray-300 mt-2">
                ML predictions are not yet available. Waiting for trained model
                data...
              </div>
              <div className="text-gray-400 mt-1 text-xs">
                Expected file: <code>/data/ml_results.json</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Asteroid Details */}
      {selectedAsteroid && (
        <div className="mt-4 p-4 bg-gray-900/50 border border-[#ff6b35]/50 rounded-lg">
          <h4 className="text-[#ff6b35] font-bold text-sm mb-3">
            Selected: {selectedAsteroid.name}
          </h4>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400">Diameter:</span>{" "}
                <span className="text-white font-medium">
                  {selectedAsteroid.diameter}m
                </span>
              </div>
              <div>
                <span className="text-gray-400">Velocity:</span>{" "}
                <span className="text-white font-medium">
                  {selectedAsteroid.velocity.toFixed(1)} km/s
                </span>
              </div>
              <div>
                <span className="text-gray-400">Distance:</span>{" "}
                <span className="text-white font-medium">
                  {(selectedAsteroid.distance / 1000).toFixed(0)}k km
                </span>
              </div>
              <div>
                <span className="text-gray-400">Energy:</span>{" "}
                <span className="text-[#ff6b35] font-bold">
                  {selectedAsteroid.energy?.toFixed(2)} MT
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Threat Level:</span>
                <span
                  className={`font-bold text-sm ${
                    selectedAsteroid.threatLevel === "GLOBAL"
                      ? "text-red-500"
                      : selectedAsteroid.threatLevel === "REGIONAL"
                      ? "text-orange-500"
                      : selectedAsteroid.threatLevel === "LOCAL"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {selectedAsteroid.threatLevel}
                </span>
              </div>
              {selectedAsteroid.is_hazardous && (
                <div className="text-red-400 font-semibold text-xs mt-1">
                  ⚠️ Potentially Hazardous
                </div>
              )}
            </div>

            {/* ML Predictions Section */}
            {selectedAsteroid.mlPrediction && (
              <>
                <hr className="border-gray-700 my-2" />
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-green-400 font-semibold text-xs mb-2">
                    🤖 AI Analysis
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ML Risk Score:</span>
                      <span
                        className={`font-bold ${
                          (selectedAsteroid.mlRiskScore ?? 0) >= 80
                            ? "text-red-400"
                            : (selectedAsteroid.mlRiskScore ?? 0) >= 60
                            ? "text-orange-400"
                            : (selectedAsteroid.mlRiskScore ?? 0) >= 40
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        {selectedAsteroid.mlRiskScore ?? 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">AI Confidence:</span>
                      <span className="text-white">
                        {((selectedAsteroid.mlConfidence ?? 0) * 100).toFixed(
                          0
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Threat Category:</span>
                      <span
                        className={`font-bold ${
                          selectedAsteroid.mlThreatCategory === "CRITICAL"
                            ? "text-red-400"
                            : selectedAsteroid.mlThreatCategory === "HIGH"
                            ? "text-orange-400"
                            : selectedAsteroid.mlThreatCategory === "MEDIUM"
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        {selectedAsteroid.mlThreatCategory}
                      </span>
                    </div>
                    <div className="text-cyan-300 text-xs italic mt-2 p-2 bg-gray-700/30 rounded">
                      &quot;{selectedAsteroid.mlRecommendation}&quot;
                    </div>
                    {selectedAsteroid.isHighMLRisk && (
                      <div className="text-red-300 font-semibold text-xs mt-2 text-center">
                        🚨 HIGH ML RISK DETECTION
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              if (onSelectAsteroid && selectedAsteroid) {
                onSelectAsteroid(selectedAsteroid);
              }
            }}
            className="mt-3 px-4 py-2 bg-[#ff6b35] text-white rounded-md hover:bg-[#e55a2b] text-sm font-medium w-full transition-colors"
          >
            Load in Simulation
          </button>
        </div>
      )}
    </div>
  );
}
