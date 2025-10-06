/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Asteroid-Earthquake Energy Correlation API
 *
 * SCIENTIFIC BASIS: This API correlates asteroid impact energies with historical
 * earthquake seismic energies using EXACT physics formulas from PHYSICS_FORMULAS.md
 *
 * FORMULAS USED:
 * 1. Asteroid Kinetic Energy: KE = 0.5 × m × v² where m = ρ × (4/3)πr³, ρ = 3000 kg/m³
 * 2. Earthquake Energy: E = 10^(1.5M + 4.8) Joules (Gutenberg-Richter relation)
 * 3. Correlation Score: Based on logarithmic energy similarity (orders of magnitude)
 *
 * WHY ENERGY-ONLY CORRELATION?
 * - Asteroid brightness (absolute magnitude H) vs earthquake magnitude (M) = NO physical relationship
 * - Orbital parameters vs earthquake depth = NO physical relationship
 * - Energy release is the ONLY scientifically valid comparison metric
 *
 * CORRELATION ALGORITHM:
 * - Primary (90%): log₁₀(energy) similarity - accounts for wide energy range (10^12 to 10^24 J)
 * - Secondary (10%): Geographic context (ocean vs land impacts)
 *
 * Returns top 10 earthquakes with energy closest to asteroid impact energy.
 */
// app/api/correlate-asteroid-earthquakes/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Type definitions for NASA API response
interface NASAAsteroidResponse {
  success: boolean;
  asteroid?: {
    id: string;
    name: string;
    designation: string;
    nasa_url: string;
    absolute_magnitude: number;
    diameter: {
      meters: number;
      kilometers: number;
      miles: number;
      estimated_range: {
        kilometers: {
          estimated_diameter_min: number;
          estimated_diameter_max: number;
        };
        meters: {
          estimated_diameter_min: number;
          estimated_diameter_max: number;
        };
      };
    };
    is_hazardous: boolean;
    is_sentry_object: boolean;
    kinetic_energy_mt: number;
    threat_level: string;
    orbital_data: {
      orbit_class: string;
      orbit_description: string;
      eccentricity: number;
      inclination: number;
      orbital_period_days: number;
      perihelion_distance_au: number;
      aphelion_distance_au: number;
      semi_major_axis_au: number;
      minimum_orbit_intersection_au: number;
      orbit_uncertainty: string;
      observations_used: number;
      first_observation: string;
      last_observation: string;
    };
    next_approach: {
      date: string;
      date_full: string;
      velocity_km_s: number;
      miss_distance_km: number;
      miss_distance_lunar: number;
      orbiting_body: string;
    } | null;
    closest_approach_ever: {
      date: string;
      miss_distance_km: number;
      miss_distance_lunar: number;
    } | null;
    total_approaches: number;
    raw_data: any;
  };
  error?: string;
  message?: string;
}

interface Earthquake {
  id: string;
  magnitude: number;
  location: string;
  time: string;
  latitude: number;
  longitude: number;
  depth_km: number;
  tsunami_warning: boolean;
  felt_reports: number;
  damage_alert: string;
  significance: number;
  magnitude_type: string;
  energy_joules?: number;
  energy_mt?: number;
  url: string;
}

interface AsteroidFeatures {
  absoluteMagnitude: number;
  diameterKmMin: number;
  diameterKmMax: number;
  isPotentiallyHazardous: number;
  orbitEccentricity: number;
  orbitInclination: number;
  semiMajorAxis: number;
  orbitalPeriod: number;
  perihelionDistance: number;
  aphelionDistance: number;
  minApproachDistance: number;
  maxApproachVelocity: number;
  avgApproachVelocity: number;
  approachCount: number;
  kineticEnergyMt: number;
}

interface CorrelationDetails {
  energyComparison: {
    asteroidEnergyEstimate: string;
    earthquakeEnergy: string;
    ratio: string;
  };
  magnitudeComparison: {
    asteroidMagnitude: string;
    earthquakeMagnitude: string | number;
  };
  hazardAssessment: {
    asteroidHazardous: string;
    asteroidThreatLevel: string;
    earthquakeSignificance: string | number;
    tsunamiWarning: string;
  };
  orbitalCharacteristics: {
    orbitClass: string;
    eccentricity: string;
    inclination: string;
  };
}

interface CorrelationResult {
  earthquake: Earthquake;
  correlationScore: number;
  correlationDetails: CorrelationDetails;
}

interface RequestBody {
  asteroidId: string;
}

interface EarthquakesData {
  earthquakes: Earthquake[];
  metadata?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { asteroidId } = body;

    if (!asteroidId) {
      return NextResponse.json(
        { error: "Asteroid ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching asteroid data for ID: ${asteroidId} from NASA API`);

    // Fetch asteroid data from NASA NEO Lookup API
    const baseUrl = request.nextUrl.origin;
    const asteroidResponse = await fetch(
      `${baseUrl}/api/neo-lookup?id=${asteroidId}`
    );

    if (!asteroidResponse.ok) {
      const errorData = await asteroidResponse.json();
      return NextResponse.json(
        {
          error: errorData.error || `Failed to fetch asteroid data`,
          message: errorData.message || `HTTP ${asteroidResponse.status}`,
        },
        { status: asteroidResponse.status }
      );
    }

    const asteroidData: NASAAsteroidResponse = await asteroidResponse.json();

    if (!asteroidData.success || !asteroidData.asteroid) {
      return NextResponse.json(
        {
          error: `Asteroid with ID ${asteroidId} not found`,
          message: asteroidData.message || "Asteroid data not available",
        },
        { status: 404 }
      );
    }

    const asteroid = asteroidData.asteroid;

    // Read earthquake data from local file
    const earthquakesPath = path.join(
      process.cwd(),
      "public",
      "data",
      "all-earthquakes.json"
    );

    const earthquakesRaw = fs.readFileSync(earthquakesPath, "utf8");
    const earthquakesData: EarthquakesData = JSON.parse(earthquakesRaw);

    // Extract features from NASA API response
    const asteroidFeatures = extractAsteroidFeaturesFromAPI(asteroid);

    // Calculate correlations with all earthquakes
    const correlations: CorrelationResult[] = earthquakesData.earthquakes.map(
      (earthquake: Earthquake) => {
        const score = calculateCorrelationScore(asteroidFeatures, earthquake);
        return {
          earthquake,
          correlationScore: score,
          correlationDetails: getCorrelationDetails(
            asteroidFeatures,
            earthquake,
            asteroid
          ),
        };
      }
    );

    // Sort by correlation score and get top 5-10
    correlations.sort((a, b) => b.correlationScore - a.correlationScore);
    const topCorrelations = correlations.slice(
      0,
      Math.min(10, Math.max(5, correlations.length))
    );

    // Create response with NASA data and correlations
    return NextResponse.json({
      asteroidId: asteroid.id,
      asteroidName: asteroid.name,
      asteroidDesignation: asteroid.designation,
      asteroidFeatures,
      nasaData: {
        diameter_meters: asteroid.diameter.meters,
        diameter_km: asteroid.diameter.kilometers,
        is_hazardous: asteroid.is_hazardous,
        is_sentry_object: asteroid.is_sentry_object,
        kinetic_energy_mt: asteroid.kinetic_energy_mt,
        threat_level: asteroid.threat_level,
        orbit_class: asteroid.orbital_data.orbit_class,
        next_approach: asteroid.next_approach,
        closest_approach_ever: asteroid.closest_approach_ever,
        nasa_url: asteroid.nasa_url,
      },
      correlatedEarthquakes: topCorrelations.map((c) => ({
        ...c.earthquake,
        correlationScore: c.correlationScore.toFixed(4),
        correlationFactors: c.correlationDetails,
      })),
      analysisTimestamp: new Date().toISOString(),
      dataSource: "NASA NEO API (Real-time)",
    });
  } catch (error) {
    console.error("Correlation analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to perform correlation analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Extract features from NASA API response
function extractAsteroidFeaturesFromAPI(
  asteroid: NASAAsteroidResponse["asteroid"]
): AsteroidFeatures {
  if (!asteroid) {
    throw new Error("No asteroid data provided");
  }

  // Get velocity from next approach or use default
  let avgVelocity = 20; // Default velocity km/s
  const approachCount = asteroid.total_approaches || 0;
  let minApproachDistance = 0;

  if (asteroid.next_approach) {
    avgVelocity = asteroid.next_approach.velocity_km_s;
    minApproachDistance = asteroid.next_approach.miss_distance_km / 149597870.7; // Convert km to AU
  }

  if (asteroid.closest_approach_ever) {
    const distanceAU =
      asteroid.closest_approach_ever.miss_distance_km / 149597870.7;
    if (minApproachDistance === 0 || distanceAU < minApproachDistance) {
      minApproachDistance = distanceAU;
    }
  }

  return {
    absoluteMagnitude: asteroid.absolute_magnitude || 0,
    diameterKmMin:
      asteroid.diameter.estimated_range.kilometers.estimated_diameter_min || 0,
    diameterKmMax:
      asteroid.diameter.estimated_range.kilometers.estimated_diameter_max || 0,
    isPotentiallyHazardous: asteroid.is_hazardous ? 1 : 0,
    orbitEccentricity: asteroid.orbital_data.eccentricity || 0,
    orbitInclination: asteroid.orbital_data.inclination || 0,
    semiMajorAxis: asteroid.orbital_data.semi_major_axis_au || 0,
    orbitalPeriod: asteroid.orbital_data.orbital_period_days || 0,
    perihelionDistance: asteroid.orbital_data.perihelion_distance_au || 0,
    aphelionDistance: asteroid.orbital_data.aphelion_distance_au || 0,
    minApproachDistance: minApproachDistance,
    maxApproachVelocity: avgVelocity * 1.2, // Estimate max as 20% higher
    avgApproachVelocity: avgVelocity,
    approachCount: approachCount,
    kineticEnergyMt: asteroid.kinetic_energy_mt || 0,
  };
}

// Calculate correlation score between asteroid features and earthquake
// SCIENTIFIC BASIS: Compares impact energy with seismic energy released
// Uses EXACT formulas from PHYSICS_FORMULAS.md:
// - Asteroid: KE = 0.5 × m × v² (kinetic energy in Joules)
// - Earthquake: E = 10^(1.5M + 4.8) (Gutenberg-Richter relation in Joules)
function calculateCorrelationScore(
  asteroidFeatures: AsteroidFeatures,
  earthquake: Earthquake
): number {
  // PRIMARY CORRELATION: Energy-based matching (ONLY scientifically valid metric)
  const asteroidEnergy = asteroidFeatures.kineticEnergyMt * 4.184e15; // Convert MT TNT to Joules
  const earthquakeEnergy = earthquake.energy_joules ||
    Math.pow(10, 1.5 * earthquake.magnitude + 4.8); // Gutenberg-Richter if missing

  if (asteroidEnergy <= 0 || earthquakeEnergy <= 0) {
    return 0; // Invalid data
  }

  // Calculate energy similarity on logarithmic scale (orders of magnitude)
  // Energy in impacts/earthquakes spans many orders of magnitude (10^12 to 10^24 J)
  const logAsteroidEnergy = Math.log10(asteroidEnergy);
  const logEarthquakeEnergy = Math.log10(earthquakeEnergy);

  // Similarity score: 1.0 = same order of magnitude, 0.0 = >10 orders difference
  const logDifference = Math.abs(logAsteroidEnergy - logEarthquakeEnergy);
  const energySimilarity = Math.max(0, 1 - logDifference / 10);

  // SECONDARY FACTOR: Geographic impact type similarity (ocean vs land)
  // Earthquakes near ocean trenches vs continental impacts
  let geographicBonus = 0;
  if (earthquake.tsunami_warning) {
    // Ocean-related earthquake - boost score slightly if asteroid would impact ocean
    // This is a minor factor (10% weight) compared to energy (90% weight)
    geographicBonus = 0.1;
  }

  // Final score: 90% energy similarity + 10% geographic context
  const finalScore = energySimilarity * 0.9 + geographicBonus * 0.1;

  return finalScore;
}

// Get detailed correlation factors
// SCIENTIFIC ANALYSIS: Energy-based correlation with supporting context
function getCorrelationDetails(
  asteroidFeatures: AsteroidFeatures,
  earthquake: Earthquake,
  asteroid: NASAAsteroidResponse["asteroid"]
): CorrelationDetails {
  const asteroidEnergyJoules = asteroidFeatures.kineticEnergyMt * 4.184e15;
  const earthquakeEnergy = earthquake.energy_joules ||
    Math.pow(10, 1.5 * earthquake.magnitude + 4.8); // Gutenberg-Richter

  // Calculate equivalent earthquake magnitude for asteroid impact
  // Using Gutenberg-Richter: M = (log₁₀(E) - 4.8) / 1.5
  const asteroidEquivalentMagnitude = asteroidEnergyJoules > 0
    ? (Math.log10(asteroidEnergyJoules) - 4.8) / 1.5
    : 0;

  // Energy ratio on logarithmic scale
  const logEnergyRatio = asteroidEnergyJoules > 0 && earthquakeEnergy > 0
    ? Math.log10(asteroidEnergyJoules / earthquakeEnergy)
    : 0;

  return {
    energyComparison: {
      asteroidEnergyEstimate: `${asteroidEnergyJoules.toExponential(2)} J (${asteroidFeatures.kineticEnergyMt.toFixed(2)} MT TNT)`,
      earthquakeEnergy: `${earthquakeEnergy.toExponential(2)} J`,
      ratio: logEnergyRatio !== 0
        ? `10^${logEnergyRatio.toFixed(2)} (${logEnergyRatio > 0 ? 'asteroid is stronger' : 'earthquake is stronger'})`
        : "N/A",
    },
    magnitudeComparison: {
      asteroidMagnitude: `M${asteroidEquivalentMagnitude.toFixed(2)} (equivalent seismic magnitude)`,
      earthquakeMagnitude: earthquake.magnitude
        ? `M${earthquake.magnitude.toFixed(2)} ${earthquake.magnitude_type || ''}`
        : "N/A",
    },
    hazardAssessment: {
      asteroidHazardous: asteroidFeatures.isPotentiallyHazardous ? "Yes" : "No",
      asteroidThreatLevel: asteroid?.threat_level || "Unknown",
      earthquakeSignificance: earthquake.significance || "N/A",
      tsunamiWarning: earthquake.tsunami_warning ? "Yes" : "No",
    },
    orbitalCharacteristics: {
      orbitClass: asteroid?.orbital_data.orbit_class || "Unknown",
      eccentricity: asteroidFeatures.orbitEccentricity.toFixed(4),
      inclination: asteroidFeatures.orbitInclination.toFixed(2) + "°",
    },
  };
}
