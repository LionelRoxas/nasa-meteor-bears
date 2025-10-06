import { NextResponse } from "next/server";
import {
  ImpactPhysicsCalculator,
  type ImpactParameters,
} from "@/services/impactPhysicsCalculator";

const GEONAMES_API = "http://api.geonames.org/findNearbyPlaceNameJSON";
const GEONAMES_USERNAME = process.env.GEONAMES_USERNAME || "demo"; // Replace with your username

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      latitude,
      longitude,
      diameter,
      velocity,
      angle = 45,
      asteroidDensity,
    } = body;

    console.log("Comprehensive Impact API called:", {
      latitude,
      longitude,
      diameter,
      velocity,
    });

    // Get population density data
    const populationData = await getPopulationData(latitude, longitude);

    // Create impact parameters
    const impactParams: ImpactParameters = {
      diameter,
      velocity,
      angle,
      latitude,
      longitude,
      asteroidDensity,
    };

    // Calculate comprehensive impact
    const results = ImpactPhysicsCalculator.calculateImpact(
      impactParams,
      populationData
    );

    // Get USGS assessment for earthquake and tsunami validation
    let usgsData = null;
    try {
      const usgsResponse = await fetch(
        `${request.url.split("/comprehensive-impact")[0]}/usgs-assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            impactEnergy: results.energy * 4.184e24, // Convert gigatons to joules
            craterDiameter: results.crater.diameter / 0.621371, // Convert miles to km
          }),
        }
      );

      if (usgsResponse.ok) {
        usgsData = await usgsResponse.json();
        console.log("USGS validation data received:", {
          seismicZone: usgsData.seismicZone?.zone,
          tsunamiRisk: usgsData.tsunamiRisk?.riskLevel,
        });
      }
    } catch (error) {
      console.warn("Could not fetch USGS validation data:", error);
    }

    console.log("Impact calculation completed:", {
      energy: results.energy,
      craterDiameter: results.crater.diameter,
      totalDeaths: results.totalCasualties.deaths,
      isOcean: results.crater.isOcean,
    });

    // Return simplified, user-friendly format
    return NextResponse.json({
      success: true,

      // Simplified display results (matching user's example)
      displayResults: results.displayResults,

      // Detailed technical data (for advanced users)
      technicalDetails: {
        energy: results.energy,
        impactSpeed: results.impactSpeed,
        crater: results.crater,
        fireball: results.fireball,
        shockWave: results.shockWave,
        windBlast: results.windBlast,
        earthquake: results.earthquake,
        tsunami: results.tsunami,
        frequency: results.frequency,
        totalCasualties: results.totalCasualties,
      },

      // Location and validation
      location: {
        latitude,
        longitude,
        isOcean: results.crater.isOcean,
        populationDensity: populationData?.density || 0,
        nearestCity: populationData?.nearestCity,
      },

      // USGS validation data
      usgsValidation: usgsData,
    });
  } catch (error) {
    console.error("Comprehensive Impact API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate impact",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get population density for the impact location
 * Uses a combination of APIs and estimates
 */
async function getPopulationData(
  latitude: number,
  longitude: number
): Promise<
  | {
      density: number;
      nearestCity?: { name: string; population: number; distance: number };
    }
  | undefined
> {
  try {
    // Get nearest populated place
    const geonamesUrl = `${GEONAMES_API}?lat=${latitude}&lng=${longitude}&username=${GEONAMES_USERNAME}&radius=500&maxRows=1`;

    const response = await fetch(geonamesUrl);
    const data = await response.json();

    if (data.geonames && data.geonames.length > 0) {
      const nearestPlace = data.geonames[0];

      // Estimate population density based on nearest city
      // This is a simplified model - real implementation would use raster data
      const population = parseInt(nearestPlace.population) || 0;
      const distance = parseFloat(nearestPlace.distance) || 100; // km

      // Population density estimation (people per km²)
      // Based on realistic urban/suburban/rural densities
      let density = 0;

      if (distance < 5) {
        // Urban core - very high density (like NYC, Tokyo)
        density = Math.max(population / 10, 5000); // Major cities: 5000-20000 people/km²
      } else if (distance < 20) {
        // Suburban - high density
        density = Math.max(population / 50, 1500); // Suburban: 1500-5000 people/km²
      } else if (distance < 50) {
        // Suburban/Rural transition
        density = Math.max(population / 200, 500); // 500-1500 people/km²
      } else if (distance < 100) {
        // Rural area near city
        density = Math.max(population / 1000, 100); // 100-500 people/km²
      } else if (distance < 200) {
        // Far from city
        density = Math.max(population / 5000, 20); // 20-100 people/km²
      } else {
        // Very remote or ocean
        density = 5; // Baseline for remote areas
      }

      return {
        density: Math.round(density),
        nearestCity: {
          name: nearestPlace.name,
          population,
          distance: Math.round(distance),
        },
      };
    }

    // Default for ocean or very remote areas
    return {
      density: 0,
    };
  } catch (error) {
    console.error("Error fetching population data:", error);

    // Fallback: estimate based on general location
    // Ocean regions have 0 density, land has at least some population
    return {
      density: estimateDensityFromCoordinates(latitude, longitude),
    };
  }
}

/**
 * Fallback population density estimation based on coordinates
 */
function estimateDensityFromCoordinates(lat: number, lng: number): number {
  // Major urban areas (rough estimates)
  const urbanCenters = [
    { name: "Tokyo", lat: 35.6762, lng: 139.6503, density: 6000 },
    { name: "Delhi", lat: 28.7041, lng: 77.1025, density: 11000 },
    { name: "Shanghai", lat: 31.2304, lng: 121.4737, density: 3800 },
    { name: "São Paulo", lat: -23.5505, lng: -46.6333, density: 7400 },
    { name: "Mumbai", lat: 19.076, lng: 72.8777, density: 20000 },
    { name: "Cairo", lat: 30.0444, lng: 31.2357, density: 19000 },
    { name: "Beijing", lat: 39.9042, lng: 116.4074, density: 1300 },
    { name: "New York", lat: 40.7128, lng: -74.006, density: 10700 },
    { name: "Los Angeles", lat: 34.0522, lng: -118.2437, density: 3200 },
    { name: "London", lat: 51.5074, lng: -0.1278, density: 5700 },
    { name: "Paris", lat: 48.8566, lng: 2.3522, density: 21000 },
  ];

  // Find nearest urban center
  let minDistance = Infinity;
  let nearestDensity = 50; // Default moderate density

  for (const center of urbanCenters) {
    const distance = haversineDistance(lat, lng, center.lat, center.lng);

    if (distance < minDistance) {
      minDistance = distance;

      // Density decreases with distance
      if (distance < 50) {
        nearestDensity = center.density;
      } else if (distance < 200) {
        nearestDensity = center.density / 2;
      } else if (distance < 500) {
        nearestDensity = center.density / 5;
      } else {
        nearestDensity = 50;
      }
    }
  }

  // Check if ocean
  if (isOceanLocation(lat, lng)) {
    return 0;
  }

  // Regional density modifiers
  if (Math.abs(lat) > 70) {
    // Polar regions
    return 1;
  } else if (lat > 20 && lat < 50 && lng > -130 && lng < -60) {
    // North America - moderate
    return Math.max(nearestDensity, 35);
  } else if (lat > 35 && lat < 70 && lng > -10 && lng < 40) {
    // Europe - high
    return Math.max(nearestDensity, 100);
  } else if (lat > 0 && lat < 40 && lng > 60 && lng < 150) {
    // Asia - very high
    return Math.max(nearestDensity, 150);
  } else if (lat > -35 && lat < 40 && lng > -20 && lng < 55) {
    // Africa - moderate
    return Math.max(nearestDensity, 40);
  } else if (lat > -55 && lat < -10 && lng > -80 && lng < -30) {
    // South America - moderate
    return Math.max(nearestDensity, 30);
  } else if (lat > -45 && lat < -10 && lng > 110 && lng < 180) {
    // Australia - low
    return Math.max(nearestDensity, 10);
  }

  return Math.max(nearestDensity, 20);
}

/**
 * Check if location is ocean
 */
function isOceanLocation(lat: number, lng: number): boolean {
  // Pacific Ocean
  if ((lng > 120 && lng < 180) || (lng > -180 && lng < -100)) {
    // But exclude major land masses
    if (lng > 100 && lng < 180 && lat > -10 && lat < 60) {
      // Could be Asia/Pacific islands
      return false;
    }
    return true;
  }

  // Atlantic Ocean
  if (lng > -70 && lng < -10 && lat > -60 && lat < 70) {
    // Exclude Americas and Europe/Africa coasts
    if (lng > -60 || lng < -20) {
      return false;
    }
    return true;
  }

  // Indian Ocean
  if (lng > 40 && lng < 120 && lat > -60 && lat < 30) {
    // Exclude Africa, India, Australia coasts
    if (
      (lng < 60 && lat > -35) || // Africa
      (lng > 65 && lng < 95 && lat > 5) || // India
      (lng > 110 && lat > -45 && lat < -10) // Australia
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Calculate Haversine distance between two points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
