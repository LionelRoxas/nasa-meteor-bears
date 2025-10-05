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
  let approachCount = asteroid.total_approaches || 0;
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
function calculateCorrelationScore(
  asteroidFeatures: AsteroidFeatures,
  earthquake: Earthquake
): number {
  let score = 0;
  let factors = 0;

  // Energy correlation (using NASA's calculated kinetic energy)
  const asteroidEnergy = asteroidFeatures.kineticEnergyMt * 4.184e15; // Convert MT to Joules
  const earthquakeEnergy = earthquake.energy_joules || 0;
  if (asteroidEnergy > 0 && earthquakeEnergy > 0) {
    const energyRatio =
      Math.min(asteroidEnergy, earthquakeEnergy) /
      Math.max(asteroidEnergy, earthquakeEnergy);
    score += energyRatio * 0.3;
    factors++;
  }

  // Magnitude correlation (asteroid absolute magnitude vs earthquake magnitude)
  if (asteroidFeatures.absoluteMagnitude && earthquake.magnitude) {
    // Normalize both to 0-1 scale
    const normAsteroid = 1 - Math.abs(asteroidFeatures.absoluteMagnitude) / 30;
    const normEarthquake = earthquake.magnitude / 10;
    const magCorrelation = 1 - Math.abs(normAsteroid - normEarthquake);
    score += magCorrelation * 0.2;
    factors++;
  }

  // Significance/hazard correlation
  if (earthquake.significance) {
    const hazardScore =
      asteroidFeatures.isPotentiallyHazardous * 0.5 +
      (asteroidFeatures.minApproachDistance > 0
        ? (1 - Math.min(asteroidFeatures.minApproachDistance, 10) / 10) * 0.5
        : 0);
    const earthquakeSignificance = Math.min(earthquake.significance / 1000, 1);
    const hazardCorrelation =
      1 - Math.abs(hazardScore - earthquakeSignificance);
    score += hazardCorrelation * 0.2;
    factors++;
  }

  // Depth correlation (orbital characteristics vs earthquake depth)
  if (earthquake.depth_km) {
    const orbitalComplexity =
      (asteroidFeatures.orbitEccentricity +
        asteroidFeatures.orbitInclination / 90) /
      2;
    const depthNormalized = Math.min(earthquake.depth_km / 700, 1);
    const depthCorrelation = 1 - Math.abs(orbitalComplexity - depthNormalized);
    score += depthCorrelation * 0.15;
    factors++;
  }

  // Temporal proximity bonus (if dates are close)
  if (earthquake.time && asteroidFeatures.approachCount > 0) {
    const earthquakeDate = new Date(earthquake.time);
    const yearProximity = Math.abs(earthquakeDate.getFullYear() - 2025) / 100;
    score += (1 - yearProximity) * 0.15;
    factors++;
  }

  return factors > 0 ? score / factors : 0;
}

// Get detailed correlation factors
function getCorrelationDetails(
  asteroidFeatures: AsteroidFeatures,
  earthquake: Earthquake,
  asteroid: NASAAsteroidResponse["asteroid"]
): CorrelationDetails {
  const asteroidEnergyJoules = asteroidFeatures.kineticEnergyMt * 4.184e15;

  return {
    energyComparison: {
      asteroidEnergyEstimate: asteroidEnergyJoules.toExponential(2),
      earthquakeEnergy: earthquake.energy_joules
        ? earthquake.energy_joules.toExponential(2)
        : "N/A",
      ratio:
        asteroidEnergyJoules > 0 &&
        earthquake.energy_joules &&
        earthquake.energy_joules > 0
          ? (
              Math.min(asteroidEnergyJoules, earthquake.energy_joules) /
              Math.max(asteroidEnergyJoules, earthquake.energy_joules)
            ).toFixed(4)
          : "N/A",
    },
    magnitudeComparison: {
      asteroidMagnitude: asteroidFeatures.absoluteMagnitude
        ? asteroidFeatures.absoluteMagnitude.toFixed(2)
        : "N/A",
      earthquakeMagnitude: earthquake.magnitude || "N/A",
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
