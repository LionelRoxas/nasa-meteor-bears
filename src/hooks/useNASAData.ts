"use client";

import { useState, useEffect } from "react";
import { logger } from "@/logger";
import { useMLPredictions } from "./useMLPredictions";

export interface NASAAsteroidData {
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
  raw_data?: Record<string, unknown>;
}

export interface CometData {
  id: string;
  name: string;
  type: "comet";
  diameter: number;
  velocity: number;
  distance: number;
  is_hazardous: boolean;
  approach_date: string;
  magnitude: number;
  period_years: number;
  eccentricity: number;
  inclination: number;
  perihelion_au: number;
  aphelion_au: number;
  moid_au: number;
  orbital_elements: Record<string, unknown>;
  raw_data: Record<string, unknown>;
}

export interface SimulationDataset {
  today: NASAAsteroidData[];
  hazardous: NASAAsteroidData[];
  all: NASAAsteroidData[];
  comets?: CometData[];
  hazardous_comets?: CometData[];
  comet_count?: number;
  last_updated: string;
  data_source: string;
  api_endpoint: string;
}

export interface DataSummary {
  last_updated: string;
  total_asteroids_tracked: number;
  hazardous_asteroids: number;
  todays_approaches: number;
  largest_asteroid: {
    name: string;
    diameter: number;
  };
  closest_approach: {
    name: string;
    distance: number;
  };
}

export function useNASAData() {
  const [simulationData, setSimulationData] =
    useState<SimulationDataset | null>(null);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ML predictions integration
  const { getMLPrediction, isMLAvailable, getHighRiskAsteroids } =
    useMLPredictions();

  // Load data from local JSON files
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load simulation data
        const simResponse = await fetch("/data/simulation-data.json");
        if (!simResponse.ok) throw new Error("Failed to load simulation data");
        const simData = await simResponse.json();
        setSimulationData(simData);

        // Load summary
        const summaryResponse = await fetch("/data/summary.json");
        if (!summaryResponse.ok) throw new Error("Failed to load summary data");
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);

        logger.info("NASA data loaded successfully", {
          totalAsteroids: simData.all.length,
          hazardousCount: simData.hazardous.length,
          todayCount: simData.today.length,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load NASA data";
        setError(errorMessage);
        logger.error("Failed to load NASA data", { error: err });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get a random asteroid for simulation
  const getRandomAsteroid = (
    category: "all" | "hazardous" | "today" = "all"
  ): NASAAsteroidData | null => {
    if (!simulationData) return null;

    const dataset = simulationData[category];
    if (dataset.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * dataset.length);
    return dataset[randomIndex];
  };

  // Get a random comet for simulation
  const getRandomComet = (
    category: "all" | "hazardous" = "all"
  ): CometData | null => {
    if (!simulationData) return null;

    const dataset =
      category === "hazardous"
        ? simulationData.hazardous_comets || []
        : simulationData.comets || [];

    if (dataset.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * dataset.length);
    return dataset[randomIndex];
  };

  // Get asteroids by size category
  const getAsteroidsBySize = (
    category: "small" | "medium" | "large" | "huge"
  ): NASAAsteroidData[] => {
    if (!simulationData) return [];

    const sizeRanges = {
      small: { min: 0, max: 50 },
      medium: { min: 50, max: 200 },
      large: { min: 200, max: 1000 },
      huge: { min: 1000, max: Infinity },
    };

    const range = sizeRanges[category];
    return simulationData.all.filter(
      (asteroid) =>
        asteroid.diameter >= range.min && asteroid.diameter < range.max
    );
  };

  // Get asteroids approaching within a certain distance
  const getCloseApproaches = (
    maxDistance: number = 50000
  ): NASAAsteroidData[] => {
    if (!simulationData) return [];

    return simulationData.today
      .filter((asteroid) => asteroid.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  };

  // Calculate enhanced asteroid data with physics + ML predictions
  const enhanceAsteroidData = (asteroid: NASAAsteroidData) => {
    // Calculate mass (assuming rocky composition, ~3000 kg/m³)
    const volume = (4 / 3) * Math.PI * Math.pow(asteroid.diameter / 2, 3);
    const mass = volume * 3000; // kg

    // Calculate kinetic energy (KE = 0.5 * m * v²)
    const velocityMs = asteroid.velocity * 1000; // convert to m/s
    const energy = 0.5 * mass * velocityMs * velocityMs; // Joules
    const energyMt = energy / 4.184e15; // Convert to Megatons TNT

    // Calculate crater size using scaling laws
    const craterSize = (1.8 * Math.pow(energy / (2700 * 9.81), 0.25)) / 1000; // km

    // Affected radius (rough estimate)
    const affectedRadius = craterSize * 10;

    // Determine threat level
    let threatLevel: "MINIMAL" | "LOCAL" | "REGIONAL" | "GLOBAL" = "MINIMAL";
    if (energyMt > 100) threatLevel = "GLOBAL";
    else if (energyMt > 10) threatLevel = "REGIONAL";
    else if (energyMt > 1) threatLevel = "LOCAL";

    // Get ML predictions if available
    const mlPrediction = getMLPrediction(asteroid.id);

    return {
      ...asteroid,
      mass,
      energy: energyMt,
      craterSize,
      affectedRadius,
      threatLevel,
      // ML predictions
      mlPrediction,
      mlHazardProbability: mlPrediction.hazard_probability,
      mlRiskScore: mlPrediction.risk_score,
      mlConfidence: mlPrediction.confidence,
      mlRecommendation: mlPrediction.recommendation,
      mlThreatCategory: mlPrediction.threat_category,
      // Combined risk assessment
      isHighMLRisk: mlPrediction.hazard_probability > 0.7,
      combinedThreatLevel: getCombinedThreatLevel(
        threatLevel,
        mlPrediction.threat_category
      ),
    };
  };

  // Combine physics-based and ML threat levels
  const getCombinedThreatLevel = (
    physicsThreat: "MINIMAL" | "LOCAL" | "REGIONAL" | "GLOBAL",
    mlThreat: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ): "MINIMAL" | "LOCAL" | "REGIONAL" | "GLOBAL" => {
    // If ML indicates critical threat, upgrade physics assessment
    if (mlThreat === "CRITICAL") return "GLOBAL";
    if (mlThreat === "HIGH" && physicsThreat === "MINIMAL") return "LOCAL";
    if (mlThreat === "HIGH" && physicsThreat === "LOCAL") return "REGIONAL";

    return physicsThreat; // Default to physics-based assessment
  };

  // Search asteroids by name or ID
  const searchAsteroids = (query: string): NASAAsteroidData[] => {
    if (!simulationData || !query.trim()) return [];

    const searchTerm = query.toLowerCase();
    return simulationData.all.filter(
      (asteroid) =>
        asteroid.name.toLowerCase().includes(searchTerm) ||
        asteroid.id.includes(searchTerm)
    );
  };

  // Get comets by period category
  const getCometsByPeriod = (
    category: "short" | "medium" | "long"
  ): CometData[] => {
    if (!simulationData?.comets) return [];

    const ranges = {
      short: { min: 0, max: 20 }, // Short-period comets (< 20 years)
      medium: { min: 20, max: 100 }, // Medium-period comets (20-100 years)
      long: { min: 100, max: Infinity }, // Long-period comets (> 100 years)
    };

    const range = ranges[category];
    return simulationData.comets.filter(
      (comet) =>
        comet.period_years >= range.min && comet.period_years < range.max
    );
  };

  // Get famous comets
  const getFamousComets = (): CometData[] => {
    if (!simulationData?.comets) return [];

    const famousNames = [
      "Halley",
      "Encke",
      "Tuttle",
      "Giacobini",
      "Swift-Tuttle",
      "Tempel-Tuttle",
    ];
    return simulationData.comets.filter((comet) =>
      famousNames.some((name) => comet.name.includes(name))
    );
  };

  // Search comets by name
  const searchComets = (query: string): CometData[] => {
    if (!simulationData?.comets || !query.trim()) return [];

    const searchTerm = query.toLowerCase();
    return simulationData.comets.filter(
      (comet) =>
        comet.name.toLowerCase().includes(searchTerm) ||
        comet.id.includes(searchTerm)
    );
  };

  // Get historical comparison data
  const getHistoricalComparisons = () => {
    return [
      {
        name: "Tunguska Event (1908)",
        diameter: 60,
        energy: 15,
        location: "Siberia, Russia",
        description: "Largest impact event in recorded history",
      },
      {
        name: "Chelyabinsk Meteor (2013)",
        diameter: 20,
        energy: 0.5,
        location: "Chelyabinsk, Russia",
        description: "Airburst that injured over 1,500 people",
      },
      {
        name: "Chicxulub Impact (66 MYA)",
        diameter: 10000,
        energy: 100000000,
        location: "Yucatan Peninsula, Mexico",
        description: "Asteroid that killed the dinosaurs",
      },
    ];
  };

  // Get asteroids with high ML risk scores
  const getMLHighRiskAsteroids = (): NASAAsteroidData[] => {
    if (!simulationData || !isMLAvailable()) return [];

    const highRiskIds = getHighRiskAsteroids(0.7);
    return simulationData.all.filter((asteroid) =>
      highRiskIds.includes(asteroid.id)
    );
  };

  // Get ML-enhanced random asteroid
  const getMLRecommendedAsteroid = (): NASAAsteroidData | null => {
    const highRiskAsteroids = getMLHighRiskAsteroids();
    if (highRiskAsteroids.length > 0) {
      const randomIndex = Math.floor(Math.random() * highRiskAsteroids.length);
      return highRiskAsteroids[randomIndex];
    }
    return getRandomAsteroid(); // Fallback to regular random
  };

  return {
    // Data
    simulationData,
    summary,
    loading,
    error,

    // Asteroid utility functions
    getRandomAsteroid,
    getAsteroidsBySize,
    getCloseApproaches,
    enhanceAsteroidData,
    searchAsteroids,

    // Comet utility functions
    getRandomComet,
    getCometsByPeriod,
    getFamousComets,
    searchComets,

    // ML-enhanced functions
    getMLHighRiskAsteroids,
    getMLRecommendedAsteroid,

    // General functions
    getHistoricalComparisons,

    // Computed values with accurate counts
    isDataAvailable: !!simulationData,
    lastUpdated: simulationData?.last_updated,
    asteroidCount: simulationData?.all.length || 0,
    hazardousCount: simulationData?.hazardous.length || 0,
    // Filter for actual today (2025-10-04) only
    todayCount:
      simulationData?.today.filter(
        (asteroid) => asteroid.approach_date === "2025-10-04"
      ).length || 0,
    // Get this week count (next 7 days)
    weekCount:
      simulationData?.today.filter((asteroid) => {
        if (!asteroid.approach_date) return false;
        const approachDate = new Date(asteroid.approach_date);
        const today = new Date("2025-10-04");
        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7);
        return approachDate >= today && approachDate <= weekFromNow;
      }).length || 0,
    cometCount: simulationData?.comet_count || 0,
    // Count only actually hazardous comets (not the array which has 85)
    hazardousCometCount:
      simulationData?.comets?.filter((comet) => comet.is_hazardous).length || 0,
    // ML status
    isMLAvailable: isMLAvailable(),
    mlHighRiskCount: getMLHighRiskAsteroids().length,
  };
}
