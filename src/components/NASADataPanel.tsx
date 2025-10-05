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
  mlPrediction?: Record<string, unknown>;
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
    weekCount,
    cometCount,
    hazardousCometCount,
    getMLRecommendedAsteroid,
    isMLAvailable,
    mlHighRiskCount,
  } = useNASAData();

  const {
    getMLRecommendations,
    totalPredictions,
    averageConfidence,
    modelAccuracy,
  } = useMLPredictions();

  const [selectedAsteroid, setSelectedAsteroid] =
    useState<ExtendedNASAAsteroidData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "today"
    | "week"
    | "hazardous"
    | "comets"
    | "search"
    | "stats"
    | "ml-insights"
  >("today");

  const handleSelectAsteroid = (asteroid: ExtendedNASAAsteroidData) => {
    const enhanced = enhanceAsteroidData(asteroid);
    setSelectedAsteroid(enhanced as unknown as ExtendedNASAAsteroidData);
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
      <div className="w-80 bg-black/95 p-6 rounded-lg border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 bg-black/95 p-6 rounded-lg border border-red-700">
        <h3 className="text-red-400 font-bold mb-2">Data Error</h3>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (!isDataAvailable) {
    return (
      <div className="w-80 bg-black/95 p-6 rounded-lg border border-gray-700">
        <p className="text-gray-400">No NASA data available</p>
      </div>
    );
  }

  const searchResults = searchQuery ? searchAsteroids(searchQuery) : [];

  return (
    <div className="w-80 bg-black/95 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#0066cc] font-bold text-xl">NASA Data</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-800/50 rounded">
            <div className="text-[#0066cc] font-bold text-base">
              {asteroidCount.toLocaleString()}
            </div>
            <div className="text-gray-400 text-xs">Total Asteroids</div>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded">
            <div className="text-purple-400 font-bold text-base">
              {cometCount.toLocaleString()}
            </div>
            <div className="text-gray-400 text-xs">Comets (Orbital)</div>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded">
            <div className="text-red-400 font-bold text-base">
              {(hazardousCount + hazardousCometCount).toLocaleString()}
            </div>
            <div className="text-gray-400 text-xs">Hazardous</div>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded">
            <div className="text-blue-400 font-bold text-base">
              {todayCount}
            </div>
            <div className="text-gray-400 text-xs">Today (Oct 4)</div>
          </div>
        </div>

        {/* Real-time Activity */}
        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700 rounded">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-300">Weekly</span>
            </div>
            <span className="text-blue-200 font-semibold">
              {weekCount} approaches
            </span>
          </div>
          <div className="text-blue-300/70 text-xs mt-1">
            Next 7 days (Oct 4-11, 2025)
          </div>
        </div>

        {isMLAvailable && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
            <div className="flex items-center gap-2">
              <span className="text-green-400">AI</span>
              <span className="text-green-300 text-sm">
                Active ({totalPredictions.toLocaleString()} objects)
              </span>
            </div>
            {mlHighRiskCount > 0 && (
              <div className="text-red-300 text-xs mt-1">
                {mlHighRiskCount} high-risk detected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-3 gap-2">
          {(["today", "week", "hazardous"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center ${
                activeTab === tab
                  ? "bg-[#0066cc] text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {tab === "today"
                ? "Today"
                : tab === "week"
                ? "Weekly"
                : "Hazardous"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {(["comets", "search", "stats", "ml-insights"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center ${
                  activeTab === tab
                    ? "bg-[#0066cc] text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                } ${
                  tab === "ml-insights" && !isMLAvailable
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={tab === "ml-insights" && !isMLAvailable}
              >
                {tab === "comets"
                  ? "Comets"
                  : tab === "search"
                  ? "Search"
                  : tab === "stats"
                  ? "Stats"
                  : "AI"}
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === "today" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => handleRandomAsteroid("today")}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
              >
                Random Today
              </button>
              {isMLAvailable && (
                <button
                  onClick={() => handleRandomAsteroid("ml-recommended")}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-500"
                >
                  AI Pick
                </button>
              )}
            </div>

            <div className="space-y-2">
              {simulationData?.today
                .filter((asteroid) => asteroid.approach_date === "2025-10-04")
                .slice(0, 6)
                .map((asteroid) => (
                  <div
                    key={asteroid.id}
                    onClick={() => handleSelectAsteroid(asteroid)}
                    className="p-3 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-700/50 border border-gray-700/50"
                  >
                    <div className="font-semibold text-blue-400 text-sm">
                      {asteroid.name}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {asteroid.diameter}m • {asteroid.velocity.toFixed(1)} km/s
                      • {(asteroid.distance / 1000).toFixed(0)}k km
                    </div>
                    <div className="text-blue-300/70 text-xs mt-1">
                      Approaching today
                    </div>
                  </div>
                ))}
              {todayCount === 0 && (
                <div className="text-center text-gray-400 text-sm py-4">
                  No asteroids approaching Earth today
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "week" && (
          <div className="space-y-3">
            <div className="text-center p-2 bg-blue-900/20 rounded">
              <div className="text-blue-300 font-semibold text-sm">
                {weekCount} approaches this week
              </div>
              <div className="text-blue-300/70 text-xs">October 4-11, 2025</div>
            </div>

            <div className="space-y-2">
              {simulationData?.today
                .filter((asteroid) => {
                  if (!asteroid.approach_date) return false;
                  const approachDate = new Date(asteroid.approach_date);
                  const today = new Date("2025-10-04");
                  const weekFromNow = new Date(today);
                  weekFromNow.setDate(today.getDate() + 7);
                  return approachDate >= today && approachDate <= weekFromNow;
                })
                .slice(0, 8)
                .map((asteroid) => (
                  <div
                    key={asteroid.id}
                    onClick={() => handleSelectAsteroid(asteroid)}
                    className="p-3 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-700/50 border border-gray-700/50"
                  >
                    <div className="font-semibold text-blue-400 text-sm">
                      {asteroid.name}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {asteroid.diameter}m • {asteroid.velocity.toFixed(1)} km/s
                      • {(asteroid.distance / 1000).toFixed(0)}k km
                    </div>
                    <div className="text-blue-300/70 text-xs mt-1">
                      {asteroid.approach_date
                        ? new Date(asteroid.approach_date).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : "Unknown date"}
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
              className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-500"
            >
              Random Hazardous
            </button>

            <div className="space-y-2">
              {simulationData?.hazardous.slice(0, 6).map((asteroid) => (
                <div
                  key={asteroid.id}
                  onClick={() => handleSelectAsteroid(asteroid)}
                  className="p-3 bg-red-900/20 rounded cursor-pointer hover:bg-red-900/30 border border-red-800/50"
                >
                  <div className="font-semibold text-red-400 text-sm">
                    {asteroid.name}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    {asteroid.diameter}m • {asteroid.velocity.toFixed(1)} km/s
                  </div>
                  {asteroid.is_sentry_object && (
                    <div className="text-yellow-400 text-xs mt-1">
                      Sentry Object
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search asteroids..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
            />

            <div className="space-y-2">
              {searchResults.slice(0, 6).map((asteroid) => (
                <div
                  key={asteroid.id}
                  onClick={() => handleSelectAsteroid(asteroid)}
                  className="p-3 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-700/50 border border-gray-700/50"
                >
                  <div className="font-semibold text-yellow-400 text-sm">
                    {asteroid.name}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    ID: {asteroid.id} • {asteroid.diameter}m • Mag:{" "}
                    {asteroid.magnitude.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "comets" && (
          <div className="space-y-3">
            <div className="text-center p-2 bg-purple-900/20 rounded">
              <div className="text-purple-300 font-semibold text-sm">
                Orbital Comet Database
              </div>
              <div className="text-purple-300/70 text-xs">
                Historical orbital elements (not real-time approaches)
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const comet = getRandomComet("all");
                  if (comet) handleSelectAsteroid(comet);
                }}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-500"
              >
                Random Comet
              </button>
              <button
                onClick={() => {
                  const comet = getRandomComet("hazardous");
                  if (comet) handleSelectAsteroid(comet);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-500"
              >
                Hazardous
              </button>
            </div>

            <div className="space-y-2">
              {getFamousComets()
                .slice(0, 7)
                .map((comet) => (
                  <div
                    key={comet.id}
                    onClick={() => handleSelectAsteroid(comet)}
                    className="p-3 bg-purple-900/20 rounded cursor-pointer hover:bg-purple-900/30 border border-purple-800/50"
                  >
                    <div className="font-semibold text-purple-400 text-sm">
                      {comet.name}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {comet.diameter}m • {comet.velocity.toFixed(1)} km/s •{" "}
                      {comet.period_years.toFixed(1)}y
                    </div>
                    {comet.is_hazardous && (
                      <div className="text-red-400 text-xs mt-1">
                        Potentially Hazardous
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "stats" && summary && (
          <div className="space-y-4">
            <div>
              <div className="text-[#0066cc] font-semibold text-sm mb-2">
                Largest Asteroid
              </div>
              <div className="text-gray-300 text-sm">
                {summary.largest_asteroid.name}
              </div>
              <div className="text-gray-400 text-xs">
                {Math.round(summary.largest_asteroid.diameter)}m diameter
              </div>
            </div>

            <div>
              <div className="text-[#0066cc] font-semibold text-sm mb-2">
                Closest Approach
              </div>
              <div className="text-gray-300 text-sm">
                {summary.closest_approach.name}
              </div>
              <div className="text-gray-400 text-xs">
                {(summary.closest_approach.distance / 1000).toFixed(0)}k km away
              </div>
            </div>

            <div>
              <div className="text-[#0066cc] font-semibold text-sm mb-2">
                Data Source
              </div>
              <div className="text-gray-400 text-xs">NASA NEO API</div>
              <div className="text-gray-500 text-xs">
                Updated: {new Date(summary.last_updated).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ml-insights" && (
          <div className="space-y-4">
            {isMLAvailable ? (
              <>
                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-green-400 font-semibold text-sm mb-2">
                    AI Model Performance
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accuracy:</span>
                      <span className="text-white">
                        {(modelAccuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence:</span>
                      <span className="text-white">
                        {(averageConfidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Objects:</span>
                      <span className="text-white">
                        {totalPredictions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-800 rounded">
                  <div className="text-red-400 font-semibold text-sm mb-2">
                    High-Risk Predictions
                  </div>
                  <div className="space-y-2">
                    {getMLRecommendations(3).map(({ id, prediction }) => {
                      const asteroid = simulationData?.all.find(
                        (a) => a.id === id
                      );
                      if (!asteroid) return null;

                      return (
                        <div
                          key={id}
                          onClick={() => handleSelectAsteroid(asteroid)}
                          className="p-2 bg-red-900/20 rounded cursor-pointer hover:bg-red-900/30 border border-red-800"
                        >
                          <div className="font-semibold text-red-400 text-xs">
                            {asteroid.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Risk: {prediction.risk_score}% | Confidence:{" "}
                            {(prediction.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded">
                <div className="text-yellow-400 font-semibold text-sm">
                  AI System Status
                </div>
                <div className="text-gray-300 text-xs mt-1">
                  ML predictions not yet available
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Asteroid */}
      {selectedAsteroid && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <h4 className="text-[#0066cc] font-bold text-sm mb-3">
            Selected: {selectedAsteroid.name}
          </h4>

          <div className="space-y-2 text-xs mb-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Diameter:</span>
              <span className="text-white">{selectedAsteroid.diameter}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Velocity:</span>
              <span className="text-white">
                {selectedAsteroid.velocity.toFixed(1)} km/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Distance:</span>
              <span className="text-white">
                {(selectedAsteroid.distance / 1000).toFixed(0)}k km
              </span>
            </div>
            {selectedAsteroid.energy && (
              <div className="flex justify-between">
                <span className="text-gray-400">Energy:</span>
                <span className="text-[#0066cc] font-bold">
                  {selectedAsteroid.energy.toFixed(2)} MT
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (onSelectAsteroid && selectedAsteroid) {
                  onSelectAsteroid(selectedAsteroid);
                }
              }}
              className="flex-1 px-4 py-2 bg-[#0066cc] text-white rounded text-sm font-medium hover:bg-[#004499] transition-colors"
            >
              Load in Simulation
            </button>

            {selectedAsteroid.nasa_url && (
              <a
                href={selectedAsteroid.nasa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors flex items-center"
                title="View in NASA JPL Database"
              >
                Link
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
