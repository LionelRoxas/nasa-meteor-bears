// components/NASADataPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { useEnhancedPredictions, type EnhancedPrediction } from "@/hooks/useEnhancedPredictions";

interface NASAAsteroidData {
  id: string;
  name: string;
  diameter: number; // meters
  velocity: number; // km/s
  distance: number; // km
  is_hazardous: boolean;
  is_sentry_object?: boolean;
  approach_date?: string;
  approach_date_full?: string;
  magnitude: number;
  nasa_url?: string;
  miss_distance_lunar?: number;
  orbiting_body?: string;
  orbit_class?: string;
  raw_data?: {
    estimated_diameter?: {
      meters?: {
        estimated_diameter_min: number;
        estimated_diameter_max: number;
      };
    };
  };
}

interface Props {
  onSelectAsteroid: (asteroid: NASAAsteroidData) => void;
}

type DataMode = "selection" | "browse" | "feed" | "lookup";

export default function NASADataPanel({ onSelectAsteroid }: Props) {
  const [dataMode, setDataMode] = useState<DataMode>("selection");
  const [asteroids, setAsteroids] = useState<NASAAsteroidData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enhanced predictions
  const { getEnhancedPrediction, loading: predictionLoading } = useEnhancedPredictions();
  const [enhancedPredictions, setEnhancedPredictions] = useState<Record<string, EnhancedPrediction>>({});
  const [showPredictionFor, setShowPredictionFor] = useState<string | null>(null);

  // Feed mode state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Browse mode state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Lookup mode state
  const [asteroidId, setAsteroidId] = useState("");

  // Expanded card state
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Initialize dates to today and 7 days ago
  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(weekAgo.toISOString().split("T")[0]);
  }, []);

  // Get min and max dates for calendar inputs
  const getDateLimits = () => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    const minDate = new Date(today);
    minDate.setFullYear(minDate.getFullYear() - 1);

    return {
      min: minDate.toISOString().split("T")[0],
      max: maxDate.toISOString().split("T")[0],
      today: today.toISOString().split("T")[0],
    };
  };

  const dateLimits = getDateLimits();

  // Fetch Feed Data
  const fetchFeedData = async () => {
    setLoading(true);
    setError(null);

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDifference = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference > 7) {
      setError(
        `Date range is ${daysDifference} days. NASA API only allows maximum 7 days per request.`
      );
      setLoading(false);
      return;
    }

    if (start > end) {
      setError("Start date must be before end date");
      setLoading(false);
      return;
    }

    try {
      const url = `/api/neo-feed?start_date=${startDate}&end_date=${endDate}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setAsteroids(data.data);
      } else {
        setError(data.message || data.error || "Failed to fetch feed data");
      }
    } catch (err) {
      setError("Error loading feed data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Browse Data
  const fetchBrowseData = async (page = 0) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/neo-browse?page=${page}&size=20`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setAsteroids(data.data);
        setCurrentPage(data.pagination.current_page);
        setTotalPages(data.pagination.total_pages);
        setTotalElements(data.pagination.total_elements);
    } else {
        setError(data.error || "Failed to fetch browse data");
      }
    } catch (err) {
      setError("Error loading browse data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Lookup Data
  const fetchLookupData = async () => {
    if (!asteroidId.trim()) {
      setError("Please enter an asteroid ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `/api/neo-lookup?id=${asteroidId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Convert to standard format for display
        const formattedAsteroid: NASAAsteroidData = {
          id: data.asteroid.id,
          name: data.asteroid.name,
          diameter: data.asteroid.diameter.meters,
          velocity: data.asteroid.next_approach?.velocity_km_s || 0,
          distance: data.asteroid.next_approach?.miss_distance_km || 0,
          is_hazardous: data.asteroid.is_hazardous,
          is_sentry_object: data.asteroid.is_sentry_object,
          approach_date: data.asteroid.next_approach?.date,
          magnitude: data.asteroid.absolute_magnitude,
          nasa_url: data.asteroid.nasa_url,
          miss_distance_lunar: data.asteroid.next_approach?.miss_distance_lunar,
          orbiting_body: data.asteroid.next_approach?.orbiting_body,
          orbit_class: data.asteroid.orbital_data.orbit_class,
          raw_data: data.asteroid,
        };
        setAsteroids([formattedAsteroid]);
      } else {
        setError(data.error || "Asteroid not found");
        setAsteroids([]);
      }
    } catch (err) {
      setError("Error loading asteroid data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevelColor = (asteroid: NASAAsteroidData) => {
    if (asteroid.is_sentry_object) return "border-amber-600/50 bg-amber-950/20";
    if (asteroid.is_hazardous) return "border-red-600/50 bg-red-950/20";
    if (asteroid.diameter > 500) return "border-orange-600/50 bg-orange-950/20";
    return "border-slate-600/50 bg-slate-900/50";
  };

  const getThreatBadge = (asteroid: NASAAsteroidData) => {
    const badges = [];
    if (asteroid.is_sentry_object) {
      badges.push(
        <span
          key="sentry"
          className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-sm text-[10px] font-medium uppercase tracking-wider border border-amber-500/30"
        >
          Sentry
        </span>
      );
    }
    if (asteroid.is_hazardous) {
      badges.push(
        <span
          key="hazard"
          className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-sm text-[10px] font-medium uppercase tracking-wider border border-red-500/30"
        >
          Hazardous
        </span>
      );
    }
    if (asteroid.diameter > 1000) {
      badges.push(
        <span
          key="size"
          className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-sm text-[10px] font-medium uppercase tracking-wider border border-violet-500/30"
        >
          Massive
        </span>
      );
    }
    return badges;
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`;
    return num.toFixed(decimals);
  };

  // Generate enhanced prediction for an asteroid
  const generateEnhancedPrediction = async (asteroid: NASAAsteroidData) => {
    try {
      setShowPredictionFor(asteroid.id);
      const prediction = await getEnhancedPrediction(asteroid.id);

      if (prediction) {
        setEnhancedPredictions(prev => ({
          ...prev,
          [asteroid.id]: prediction
        }));
      }
    } catch (err) {
      console.error('Failed to generate enhanced prediction:', err);
    }
  };

  // Get threat color based on enhanced prediction
  const getEnhancedThreatColor = (prediction: EnhancedPrediction) => {
    switch (prediction.threat_category) {
      case 'CRITICAL': return 'border-red-500 bg-red-950/30';
      case 'HIGH': return 'border-orange-500 bg-orange-950/30';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-950/30';
      default: return 'border-green-500 bg-green-950/30';
    }
  };

  // Generate user-friendly 1-sentence analysis
  const generateQuickAnalysis = (asteroid: NASAAsteroidData, prediction: EnhancedPrediction): string => {
    const { threat_category, risk_score, correlation_context } = prediction;
    const { top_similar_earthquakes } = correlation_context;
    const size = asteroid.diameter > 1000 ? 'massive' : asteroid.diameter > 500 ? 'large' : asteroid.diameter > 100 ? 'medium' : 'small';

    if (threat_category === 'CRITICAL') {
      return `This ${size} asteroid poses extreme danger with ${risk_score}% risk based on ${top_similar_earthquakes} similar earthquake patterns - immediate monitoring required.`;
    } else if (threat_category === 'HIGH') {
      return `Analysis of ${top_similar_earthquakes} comparable earthquakes indicates ${risk_score}% risk of significant regional impact from this ${size} asteroid.`;
    } else if (threat_category === 'MEDIUM') {
      return `Based on ${top_similar_earthquakes} earthquake correlations, this ${size} asteroid shows ${risk_score}% risk of localized damage if impact occurs.`;
    } else {
      return `Historical data from ${top_similar_earthquakes} similar events suggests this ${size} asteroid has minimal impact risk (${risk_score}%) with limited consequences.`;
    }
  };

  return (
    <div className="w-[420px] bg-slate-950 rounded-md border border-slate-800 overflow-hidden flex flex-col h-[85vh] shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                NASA NEO Database
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Near-Earth Object Tracking System
              </p>
            </div>
            {dataMode !== "selection" && (
              <button
                onClick={() => {
                  setDataMode("selection");
                  setAsteroids([]);
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-all"
              >
                Back
              </button>
            )}
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"></div>
      </div>

      {/* Mode Selection */}
      {dataMode === "selection" && (
        <div className="flex-1 p-6 space-y-4 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="mb-8">
            <h4 className="text-lg font-light text-white mb-2">
              Data Source Selection
            </h4>
            <p className="text-sm text-slate-400">
              Choose your preferred method to access asteroid data
            </p>
          </div>

          <button
            onClick={() => {
              setDataMode("feed");
              fetchFeedData();
            }}
            className="w-full p-5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 hover:border-blue-600/50 rounded transition-all group"
          >
            <div className="text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center">
                  <span className="text-blue-400 text-sm font-bold">F</span>
                </div>
                <div className="text-white font-medium text-sm uppercase tracking-wide">
                  Date Range Feed
                </div>
              </div>
              <div className="text-slate-400 text-xs leading-relaxed">
                Access asteroids approaching Earth within specified date ranges
              </div>
              <div className="text-slate-500 text-[10px] mt-2 uppercase tracking-wider">
                7-Day Maximum • Real-Time Data
          </div>
        </div>
          </button>

          <button
            onClick={() => {
              setDataMode("browse");
              fetchBrowseData(0);
            }}
            className="w-full p-5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 hover:border-violet-600/50 rounded transition-all group"
          >
            <div className="text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded bg-violet-600/20 flex items-center justify-center">
                  <span className="text-violet-400 text-sm font-bold">B</span>
                </div>
                <div className="text-white font-medium text-sm uppercase tracking-wide">
                  Browse Database
                </div>
              </div>
              <div className="text-slate-400 text-xs leading-relaxed">
                Navigate through the complete NEO catalog with pagination
              </div>
              <div className="text-slate-500 text-[10px] mt-2 uppercase tracking-wider">
                30,000+ Objects • Paginated Access
          </div>
        </div>
            </button>

            <button
            onClick={() => setDataMode("lookup")}
            className="w-full p-5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 hover:border-emerald-600/50 rounded transition-all group"
          >
            <div className="text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded bg-emerald-600/20 flex items-center justify-center">
                  <span className="text-emerald-400 text-sm font-bold">L</span>
                </div>
                <div className="text-white font-medium text-sm uppercase tracking-wide">
                  Direct Lookup
                </div>
              </div>
              <div className="text-slate-400 text-xs leading-relaxed">
                Query specific asteroids by their unique identifier
              </div>
              <div className="text-slate-500 text-[10px] mt-2 uppercase tracking-wider">
                Instant Access • Detailed Data
          </div>
        </div>
          </button>

          <div className="mt-8 p-4 bg-slate-900/50 rounded border border-slate-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-light text-blue-400">30K+</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  Tracked
                </div>
              </div>
              <div>
                <div className="text-2xl font-light text-amber-400">1.9K</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  Hazardous
          </div>
        </div>
          <div>
                <div className="text-2xl font-light text-emerald-400">24/7</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  Monitoring
          </div>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed Mode Controls */}
      {dataMode === "feed" && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="space-y-3">
            <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded">
              <div className="flex items-start gap-2">
                <div className="w-1 h-12 bg-amber-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-amber-400 text-xs font-medium uppercase tracking-wider mb-1">
                    API Constraint
                  </div>
                  <div className="text-amber-200/80 text-xs">
                    Maximum date range limited to 7 days per request
                  </div>
                </div>
              </div>
                      </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={dateLimits.min}
                  max={dateLimits.today}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setStartDate(newStartDate);

                    const start = new Date(newStartDate);
                    const end = new Date(endDate);
                    const daysDiff = Math.ceil(
                      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysDiff > 7 || end < start) {
                      const newEnd = new Date(start);
                      newEnd.setDate(newEnd.getDate() + 6);
                      setEndDate(newEnd.toISOString().split("T")[0]);
                    }
                  }}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={dateLimits.min}
                  max={dateLimits.max}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setEndDate(newEndDate);

                    const end = new Date(newEndDate);
                    const start = new Date(startDate);
                    const daysDiff = Math.ceil(
                      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysDiff > 7 || start > end) {
                      const newStart = new Date(end);
                      newStart.setDate(newStart.getDate() - 6);
                      setStartDate(newStart.toISOString().split("T")[0]);
                    }
                  }}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            {(() => {
              const start = new Date(startDate);
              const end = new Date(endDate);
              const daysDiff = Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                daysDiff > 0 && (
                  <div className="text-center">
                    <span
                      className={`text-xs font-medium ${
                        daysDiff > 7 ? "text-red-400" : "text-slate-500"
                      }`}
                    >
                      Range: {daysDiff} day{daysDiff !== 1 ? "s" : ""}
                      {daysDiff > 7 && " (exceeds limit)"}
                        </span>
                  </div>
                )
              );
            })()}
            <button
              onClick={fetchFeedData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors uppercase tracking-wider"
            >
              {loading ? "Processing..." : "Execute Query"}
            </button>
                  </div>
                </div>
              )}

      {/* Browse Mode Controls */}
      {dataMode === "browse" && !loading && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => fetchBrowseData(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded text-xs font-medium transition-colors"
            >
              Previous
            </button>
            <div className="text-center">
              <div className="text-sm text-white font-medium">
                Page {currentPage + 1} / {totalPages}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                {totalElements.toLocaleString()} Total Objects
              </div>
            </div>
            <button
              onClick={() => fetchBrowseData(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded text-xs font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Lookup Mode Controls */}
      {dataMode === "lookup" && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Asteroid Identifier
              </label>
              <input
                type="text"
                value={asteroidId}
                onChange={(e) => setAsteroidId(e.target.value)}
                placeholder="Enter asteroid ID (e.g., 2000433)"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              onClick={fetchLookupData}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors uppercase tracking-wider"
            >
              {loading ? "Searching..." : "Execute Lookup"}
            </button>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
              <div className="text-center">433 (Eros)</div>
              <div className="text-center">99942 (Apophis)</div>
              <div className="text-center">3122 (Florence)</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500 text-sm">Processing request...</div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        {!loading &&
          !error &&
          asteroids.length === 0 &&
          dataMode !== "selection" && (
            <div className="text-center text-slate-500 py-12 text-sm">
              No data available. Adjust search parameters.
            </div>
          )}

        {/* Asteroid Cards */}
        {!loading && asteroids.length > 0 && (
          <div className="space-y-2">
            {asteroids.map((asteroid) => (
              <div
                key={asteroid.id}
                className={`p-4 rounded border cursor-pointer transition-all hover:shadow-lg ${getThreatLevelColor(
                  asteroid
                )}`}
                onClick={() => onSelectAsteroid(asteroid)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-white font-medium text-sm">
                      {asteroid.name}
                    </div>
                    <div className="text-slate-500 text-[10px] font-mono">
                      ID: {asteroid.id}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCard(
                        expandedCard === asteroid.id ? null : asteroid.id
                      );
                    }}
                    className="text-slate-500 hover:text-white text-xs px-2 py-0.5"
                  >
                    {expandedCard === asteroid.id ? "−" : "+"}
                  </button>
                </div>

                {/* Classification Badges */}
                <div className="flex gap-1.5 mb-3">
                  {getThreatBadge(asteroid)}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Size
                    </div>
                    <div className="text-white font-medium text-xs">
                      {formatNumber(asteroid.diameter, 0)}m
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Speed
                    </div>
                    <div className="text-white font-medium text-xs">
                      {asteroid.velocity.toFixed(1)} km/s
                    </div>
            </div>
            <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Range
                    </div>
                    <div className="text-white font-medium text-xs">
                      {formatNumber(asteroid.distance, 0)} km
                    </div>
            </div>
            <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Mag
                    </div>
                    <div className="text-white font-medium text-xs">
                      {asteroid.magnitude.toFixed(1)} H
                    </div>
                  </div>
                </div>

                {/* Approach Data */}
                {asteroid.approach_date && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Approach:{" "}
                        {new Date(asteroid.approach_date).toLocaleDateString()}
                      </span>
                      {asteroid.miss_distance_lunar && (
                        <span className="text-[10px] text-cyan-400">
                          {asteroid.miss_distance_lunar.toFixed(1)} LD
              </span>
                      )}
                    </div>
            </div>
                )}

                {/* Enhanced AI Analysis Button */}
                <div className="pt-2 border-t border-slate-800 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateEnhancedPrediction(asteroid);
                    }}
                    disabled={predictionLoading && showPredictionFor === asteroid.id}
                    className="w-full px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white rounded text-[10px] font-medium uppercase tracking-wider transition-all"
                  >
                    {predictionLoading && showPredictionFor === asteroid.id
                      ? 'Analyzing...'
                      : enhancedPredictions[asteroid.id]
                        ? 'Update AI Analysis'
                        : 'AI Impact Analysis'
                    }
                  </button>
                </div>

                {/* Enhanced Prediction Display */}
                {enhancedPredictions[asteroid.id] && (
                  <div className={`mt-2 p-2 rounded border ${getEnhancedThreatColor(enhancedPredictions[asteroid.id])}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                        AI Risk Assessment
                      </span>
                      <span className={`text-[10px] font-bold ${
                        enhancedPredictions[asteroid.id].threat_category === 'CRITICAL' ? 'text-red-400' :
                        enhancedPredictions[asteroid.id].threat_category === 'HIGH' ? 'text-orange-400' :
                        enhancedPredictions[asteroid.id].threat_category === 'MEDIUM' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {enhancedPredictions[asteroid.id].threat_category}
                      </span>
                    </div>

                    {/* Quick Analysis Summary */}
                    <div className="mb-2 p-1.5 bg-slate-800/50 rounded">
                      <div className="text-[9px] text-slate-300 italic leading-relaxed">
                        {generateQuickAnalysis(asteroid, enhancedPredictions[asteroid.id])}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase">Risk</div>
                        <div className="text-[10px] font-medium text-white">
                          {enhancedPredictions[asteroid.id].risk_score}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase">Confidence</div>
                        <div className="text-[10px] font-medium text-white">
                          {(enhancedPredictions[asteroid.id].confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">Correlations</div>
                        <div className="text-[10px] font-medium text-white">
                          {enhancedPredictions[asteroid.id].correlation_context.top_similar_earthquakes}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-300 leading-relaxed">
                      {enhancedPredictions[asteroid.id].recommendation}
                    </div>
                  </div>
                )}

                {/* Expanded View */}
                {expandedCard === asteroid.id && asteroid.raw_data && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    {asteroid.raw_data?.estimated_diameter && (
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                          Diameter Range
                        </div>
                        <div className="text-xs text-slate-300">
                          {asteroid.raw_data.estimated_diameter.meters?.estimated_diameter_min.toFixed(
                            0
                          )}
                          -
                          {asteroid.raw_data.estimated_diameter.meters?.estimated_diameter_max.toFixed(
                            0
                          )}
                          m
                        </div>
                      </div>
                    )}

                    {asteroid.nasa_url && (
                      <div className="pt-2">
                        <a
                          href={asteroid.nasa_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-400 hover:text-cyan-300 text-[10px] uppercase tracking-wider"
                        >
                          NASA JPL Database →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
                </div>
        )}
      </div>

      {/* Status Bar */}
      {asteroids.length > 0 && !loading && (
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {asteroids.length} Object{asteroids.length !== 1 ? "s" : ""}{" "}
              Loaded
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-red-400">
                {asteroids.filter((a) => a.is_hazardous).length} HAZ
              </span>
              <span className="text-[10px] text-amber-400">
                {asteroids.filter((a) => a.is_sentry_object).length} SENTRY
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
