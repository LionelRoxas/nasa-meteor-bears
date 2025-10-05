import { logger } from "@/logger";

// NASA NEO API Types
export interface NearEarthObject {
  id: string;
  neo_reference_id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: CloseApproachData[];
  orbital_data?: OrbitalData;
}

export interface CloseApproachData {
  close_approach_date: string;
  close_approach_date_full: string;
  epoch_date_close_approach: number;
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

export interface OrbitalData {
  orbit_id: string;
  orbit_determination_date: string;
  first_observation_date: string;
  last_observation_date: string;
  orbit_class: {
    orbit_class_type: string;
    orbit_class_description: string;
    orbit_class_range: string;
  };
  minimum_orbit_intersection: string;
  jupiter_tisserand_invariant: string;
  epoch_osculation: string;
  eccentricity: string;
  semi_major_axis: string;
  inclination: string;
  ascending_node_longitude: string;
  orbital_period: string;
  perihelion_distance: string;
  perihelion_argument: string;
  aphelion_distance: string;
  perihelion_time: string;
  mean_anomaly: string;
  mean_motion: string;
}

export interface NEOFeedResponse {
  links: {
    next?: string;
    previous?: string;
    self: string;
  };
  element_count: number;
  near_earth_objects: {
    [date: string]: NearEarthObject[];
  };
}

export interface NEOLookupResponse extends NearEarthObject {
  designation: string;
}

class NASANeoAPI {
  private baseUrl = "https://api.nasa.gov/neo/rest/v1";
  private apiKey: string;
  private cache: Map<
    string,
    { data: Record<string, unknown>; timestamp: number }
  > = new Map();
  private cacheTimeout = 1000 * 60 * 15; // 15 minutes cache

  constructor() {
    this.apiKey =
      process.env.NASA_API_KEY || process.env.NEXT_PUBLIC_NASA_API_KEY || "";
    if (!this.apiKey) {
      logger.warn("NASA API key not found in environment variables");
    }
  }

  /**
   * Get Near Earth Objects for a date range
   */
  async getFeed(
    startDate: string,
    endDate?: string
  ): Promise<NEOFeedResponse | null> {
    try {
      const cacheKey = `feed-${startDate}-${endDate || startDate}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached as unknown as NEOFeedResponse;

      const url = new URL(`${this.baseUrl}/feed`);
      url.searchParams.append("start_date", startDate);
      if (endDate) {
        url.searchParams.append("end_date", endDate);
      }
      url.searchParams.append("api_key", this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        logger.error(
          `NASA API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data as NEOFeedResponse;
    } catch (error) {
      logger.error("Failed to fetch NEO feed", { error });
      return null;
    }
  }

  /**
   * Get specific asteroid by ID
   */
  async getAsteroid(asteroidId: string): Promise<NEOLookupResponse | null> {
    try {
      const cacheKey = `asteroid-${asteroidId}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached as unknown as NEOLookupResponse;

      const url = new URL(`${this.baseUrl}/neo/${asteroidId}`);
      url.searchParams.append("api_key", this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        logger.error(
          `NASA API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data as NEOLookupResponse;
    } catch (error) {
      logger.error("Failed to fetch asteroid data", { error, asteroidId });
      return null;
    }
  }

  /**
   * Get potentially hazardous asteroids approaching Earth
   */
  async getHazardousAsteroids(days: number = 7): Promise<NearEarthObject[]> {
    try {
      const today = new Date();
      const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      const startStr = this.formatDate(today);
      const endStr = this.formatDate(endDate);

      const feedData = await this.getFeed(startStr, endStr);
      if (!feedData) return [];

      const hazardous: NearEarthObject[] = [];
      for (const date in feedData.near_earth_objects) {
        const asteroids = feedData.near_earth_objects[date];
        hazardous.push(
          ...asteroids.filter((a) => a.is_potentially_hazardous_asteroid)
        );
      }

      return hazardous.sort((a, b) => {
        const aDistance = parseFloat(
          a.close_approach_data[0]?.miss_distance.kilometers || "0"
        );
        const bDistance = parseFloat(
          b.close_approach_data[0]?.miss_distance.kilometers || "0"
        );
        return aDistance - bDistance;
      });
    } catch (error) {
      logger.error("Failed to fetch hazardous asteroids", { error });
      return [];
    }
  }

  /**
   * Get today's close approaches
   */
  async getTodayCloseApproaches(): Promise<NearEarthObject[]> {
    try {
      const today = this.formatDate(new Date());
      const feedData = await this.getFeed(today);
      if (!feedData) return [];

      return feedData.near_earth_objects[today] || [];
    } catch (error) {
      logger.error("Failed to fetch today's close approaches", { error });
      return [];
    }
  }

  /**
   * Browse all NEOs with pagination
   */
  async browse(
    page: number = 0,
    size: number = 20
  ): Promise<{ data: NearEarthObject[]; total: number } | null> {
    try {
      const cacheKey = `browse-${page}-${size}`;
      const cached = this.getCached(cacheKey);
      if (cached)
        return cached as unknown as { data: NearEarthObject[]; total: number };

      const url = new URL(`${this.baseUrl}/neo/browse`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("size", size.toString());
      url.searchParams.append("api_key", this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        logger.error(
          `NASA API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();
      const result = {
        data: data.near_earth_objects,
        total: data.page.total_elements,
      };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error("Failed to browse NEOs", { error });
      return null;
    }
  }

  /**
   * Format asteroid data for simulation
   */
  formatForSimulation(neo: NearEarthObject) {
    const approach = neo.close_approach_data[0];
    const diameter =
      (neo.estimated_diameter.meters.estimated_diameter_min +
        neo.estimated_diameter.meters.estimated_diameter_max) /
      2;

    return {
      id: neo.id,
      name: neo.name,
      diameter: Math.round(diameter),
      velocity: parseFloat(
        approach?.relative_velocity.kilometers_per_second || "20"
      ),
      distance: parseFloat(approach?.miss_distance.kilometers || "100000"),
      is_hazardous: neo.is_potentially_hazardous_asteroid,
      approach_date: approach?.close_approach_date,
      magnitude: neo.absolute_magnitude_h,
      nasa_url: neo.nasa_jpl_url,
      orbital_data: neo.orbital_data,
    };
  }

  // Helper methods
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private getCached(key: string): Record<string, unknown> | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: Record<string, unknown>): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const neoAPI = new NASANeoAPI();
