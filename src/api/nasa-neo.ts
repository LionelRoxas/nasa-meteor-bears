/**
 * NASA NEO (Near-Earth Object) API Integration
 * 
 * Provides functions to fetch real asteroid data from NASA's API
 */

import { fetchWithFallback } from '@/api';
import { logger } from '@/logger';

interface NeoApiResponse {
  links: {
    next: string;
    previous: string;
    self: string;
  };
  element_count: number;
  near_earth_objects: {
    [date: string]: NearEarthObject[];
  };
}

interface NearEarthObject {
  id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: CloseApproachData[];
  orbital_data: OrbitalData;
}

interface CloseApproachData {
  close_approach_date: string;
  relative_velocity: {
    kilometers_per_second: string;
    kilometers_per_hour: string;
  };
  miss_distance: {
    astronomical: string;
    lunar: string;
    kilometers: string;
  };
  orbiting_body: string;
}

interface OrbitalData {
  orbit_determination_date: string;
  orbit_uncertainty: string;
  minimum_orbit_intersection: string;
  eccentricity: string;
  semi_major_axis: string;
  inclination: string;
  ascending_node_longitude: string;
  orbital_period: string;
  perihelion_distance: string;
  aphelion_distance: string;
}

export interface AsteroidData {
  id: string;
  name: string;
  size: number; // average diameter in meters
  velocity: number; // km/s
  distance: number; // miss distance in Earth radii (1 ER = 6371 km)
  isHazardous: boolean;
  closeApproachDate: string;
  orbitData: {
    eccentricity: number;
    semiMajorAxis: number;
    inclination: number;
  };
}

/**
 * Fetch Near-Earth Objects from NASA API
 * Note: NASA API key is optional for development (rate limited to 30 requests per hour)
 * For production, get a free API key at https://api.nasa.gov
 */
export async function fetchNearEarthObjects(
  startDate?: string,
  endDate?: string
): Promise<AsteroidData[]> {
  // Use demo API key for development (rate limited)
  // Replace with your own API key for production
  const API_KEY = 'DEMO_KEY';
  
  // Default to today if no dates provided
  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;
  
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${API_KEY}`;
  
  logger.info('Fetching NEO data from NASA API', { startDate: start, endDate: end });
  
  const response = await fetchWithFallback<NeoApiResponse>(url);
  
  if (response.error) {
    logger.error('Failed to fetch NEO data', { error: response.error });
    return getFallbackAsteroidData();
  }
  
  const asteroids: AsteroidData[] = [];
  
  // Extract NEO data from all dates
  Object.values(response.data?.near_earth_objects || {}).forEach(neoArray => {
    neoArray.forEach(neo => {
      if (neo.close_approach_data.length > 0) {
        const approach = neo.close_approach_data[0];
        const avgDiameter = (
          neo.estimated_diameter.meters.estimated_diameter_min +
          neo.estimated_diameter.meters.estimated_diameter_max
        ) / 2;
        
        // Convert miss distance from km to Earth radii (1 ER = 6371 km)
        const distanceKm = parseFloat(approach.miss_distance.kilometers);
        const distanceEarthRadii = distanceKm / 6371;
        
        asteroids.push({
          id: neo.id,
          name: neo.name,
          size: avgDiameter,
          velocity: parseFloat(approach.relative_velocity.kilometers_per_second),
          distance: distanceEarthRadii,
          isHazardous: neo.is_potentially_hazardous_asteroid,
          closeApproachDate: approach.close_approach_date,
          orbitData: {
            eccentricity: parseFloat(neo.orbital_data.eccentricity || '0'),
            semiMajorAxis: parseFloat(neo.orbital_data.semi_major_axis || '0'),
            inclination: parseFloat(neo.orbital_data.inclination || '0'),
          },
        });
      }
    });
  });
  
  logger.info('NEO data fetched successfully', { count: asteroids.length });
  
  return asteroids.length > 0 ? asteroids : getFallbackAsteroidData();
}

/**
 * Fallback asteroid data for when API is unavailable
 */
function getFallbackAsteroidData(): AsteroidData[] {
  return [
    {
      id: 'impactor-2025',
      name: 'Impactor-2025 (Simulated)',
      size: 100,
      velocity: 20,
      distance: 10,
      isHazardous: true,
      closeApproachDate: new Date().toISOString().split('T')[0],
      orbitData: {
        eccentricity: 0.2,
        semiMajorAxis: 1.5,
        inclination: 15,
      },
    },
  ];
}

/**
 * Calculate impact energy in megatons of TNT
 */
export function calculateImpactEnergy(
  diameterMeters: number,
  velocityKmPerSec: number
): number {
  // Assume asteroid density of 3000 kg/m³ (typical for rocky asteroids)
  const radius = diameterMeters / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
  const mass = volume * 3000; // kg
  
  // Kinetic energy: E = 0.5 * m * v²
  const velocityMps = velocityKmPerSec * 1000; // convert to m/s
  const energyJoules = 0.5 * mass * Math.pow(velocityMps, 2);
  
  // Convert to megatons of TNT (1 megaton = 4.184 × 10^15 joules)
  const energyMegatons = energyJoules / 4.184e15;
  
  return energyMegatons;
}

/**
 * Estimate crater diameter using scaling laws
 * Based on simplified impact cratering equations
 */
export function estimateCraterDiameter(
  impactEnergyMegatons: number
): number {
  // Simplified scaling: D ∝ E^0.25 (where D is diameter and E is energy)
  // Constants calibrated to known impacts
  const craterDiameter = 100 * Math.pow(impactEnergyMegatons, 0.25);
  
  return craterDiameter; // meters
}
