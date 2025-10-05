"use client";

// Real-world terrain data service using free APIs

export interface RealTerrainData {
  latitude: number;
  longitude: number;
  elevation: number; // meters above sea level
  isWater: boolean;
  isOcean: boolean;
  landCoverType:
    | "ocean"
    | "land"
    | "mountain"
    | "ice"
    | "desert"
    | "city"
    | "forest";
  populationDensity: number; // people per km²
  nearestCity?: {
    name: string;
    distance: number; // km
    population: number;
  };
  countryName?: string;
  regionName?: string;
}

export class RealTerrainDataService {
  private cache: Map<string, RealTerrainData> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  // Generate cache key from coordinates
  private getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(2)},${lng.toFixed(2)}`;
  }

  // Main method to get comprehensive terrain data
  async getTerrainData(lat: number, lng: number): Promise<RealTerrainData> {
    const cacheKey = this.getCacheKey(lat, lng);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log("Using cached terrain data for:", lat, lng);
      return cached;
    }

    console.log("Fetching real terrain data for coordinates:", lat, lng);

    // Fetch data from multiple sources in parallel
    const [elevation, waterInfo, locationInfo] = await Promise.all([
      this.getElevation(lat, lng),
      this.checkIfWater(lat, lng),
      this.getLocationInfo(lat, lng),
    ]);

    // Determine land cover type
    const landCoverType = this.determineLandCoverType(
      elevation,
      waterInfo.isWater,
      lat,
      lng,
      locationInfo
    );

    const terrainData: RealTerrainData = {
      latitude: lat,
      longitude: lng,
      elevation,
      isWater: waterInfo.isWater,
      isOcean: waterInfo.isOcean,
      landCoverType,
      populationDensity: locationInfo.populationDensity,
      nearestCity: locationInfo.nearestCity,
      countryName: locationInfo.countryName,
      regionName: locationInfo.regionName,
    };

    // Cache the result
    this.cache.set(cacheKey, terrainData);
    setTimeout(() => this.cache.delete(cacheKey), this.CACHE_DURATION);

    console.log("Real terrain data fetched:", terrainData);
    return terrainData;
  }

  // Get elevation using Open-Elevation API (free, no API key needed)
  private async getElevation(lat: number, lng: number): Promise<number> {
    try {
      const response = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
      );

      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results[0]?.elevation || 0;
    } catch (error) {
      console.warn("Failed to fetch elevation data, using fallback:", error);
      // Fallback: estimate based on known geographic patterns
      return this.estimateElevation(lat, lng);
    }
  }

  // Check if coordinates are in water using reverse geocoding
  private async checkIfWater(
    lat: number,
    lng: number
  ): Promise<{ isWater: boolean; isOcean: boolean }> {
    try {
      // Use Nominatim reverse geocoding (OpenStreetMap - free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            "User-Agent": "NASA-Meteor-Bears-App/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      // Check if the place_type indicates water
      const isWater =
        data.type === "sea" ||
        data.type === "ocean" ||
        data.class === "waterway" ||
        (data.class === "natural" && data.type === "water") ||
        !data.address; // No address usually means water

      const isOcean = data.type === "ocean" || data.type === "sea";

      return { isWater, isOcean };
    } catch (error) {
      console.warn("Failed to check water status, using fallback:", error);
      // Fallback: use simple ocean detection
      return {
        isWater: this.isLikelyOcean(lat, lng),
        isOcean: this.isLikelyOcean(lat, lng),
      };
    }
  }

  // Get location information (city, country, population)
  private async getLocationInfo(
    lat: number,
    lng: number
  ): Promise<{
    countryName?: string;
    regionName?: string;
    populationDensity: number;
    nearestCity?: {
      name: string;
      distance: number;
      population: number;
    };
  }> {
    try {
      // Use Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": "NASA-Meteor-Bears-App/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Location API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        countryName: data.address?.country,
        regionName: data.address?.state || data.address?.region,
        populationDensity: this.estimatePopulationDensity(lat, lng, data),
        nearestCity: this.extractNearestCity(data),
      };
    } catch (error) {
      console.warn("Failed to fetch location info, using fallback:", error);
      return {
        populationDensity: this.estimatePopulationDensity(lat, lng, null),
      };
    }
  }

  // Determine land cover type based on all available data
  private determineLandCoverType(
    elevation: number,
    isWater: boolean,
    lat: number,
    lng: number,
    locationInfo: {
      countryName?: string;
      regionName?: string;
      populationDensity: number;
      nearestCity?: {
        name: string;
        distance: number;
        population: number;
      };
    }
  ): RealTerrainData["landCoverType"] {
    // Water bodies
    if (isWater || elevation < 0) {
      return "ocean";
    }

    // Ice (polar regions or high altitude)
    if (Math.abs(lat) > 66.5 || elevation > 4000) {
      return "ice";
    }

    // Mountains (high elevation)
    if (elevation > 1500) {
      return "mountain";
    }

    // Cities (check if location info indicates urban area)
    if (locationInfo.nearestCity && locationInfo.nearestCity.distance < 5) {
      return "city";
    }

    // Deserts (specific latitude bands and regions)
    if (this.isDesertRegion(lat, lng)) {
      return "desert";
    }

    // Default to land
    return "land";
  }

  // Estimate elevation when API fails
  private estimateElevation(lat: number, lng: number): number {
    // Known mountain ranges
    if (this.isMountainRegion(lat, lng)) return 2000 + Math.random() * 2000;

    // Ocean regions
    if (this.isLikelyOcean(lat, lng)) return -1000 - Math.random() * 3000;

    // Default land elevation
    return Math.random() * 500;
  }

  // Check if coordinates are likely in ocean (simplified)
  private isLikelyOcean(lat: number, lng: number): boolean {
    // Pacific Ocean
    if ((lng > 120 || lng < -80) && Math.abs(lat) < 60) return true;

    // Atlantic Ocean (simplified)
    if (lng > -60 && lng < -10 && (lat > 40 || lat < -40)) return true;

    // Indian Ocean
    if (lng > 40 && lng < 100 && lat < -10 && lat > -50) return true;

    return false;
  }

  // Check if region is mountainous
  private isMountainRegion(lat: number, lng: number): boolean {
    // Himalayas
    if (lat > 25 && lat < 40 && lng > 70 && lng < 105) return true;
    // Rockies
    if (lat > 30 && lat < 60 && lng > -125 && lng < -105) return true;
    // Andes
    if (lat > -55 && lat < 15 && lng > -80 && lng < -65) return true;
    // Alps
    if (lat > 43 && lat < 49 && lng > 5 && lng < 17) return true;

    return false;
  }

  // Check if region is desert
  private isDesertRegion(lat: number, lng: number): boolean {
    // Sahara
    if (lat > 10 && lat < 35 && lng > -20 && lng < 35) return true;
    // Arabian Desert
    if (lat > 15 && lat < 35 && lng > 35 && lng < 60) return true;
    // Gobi
    if (lat > 35 && lat < 50 && lng > 90 && lng < 120) return true;
    // Australian Outback
    if (lat > -35 && lat < -15 && lng > 115 && lng < 155) return true;

    return false;
  }

  // Estimate population density from location data
  private estimatePopulationDensity(
    lat: number,
    lng: number,
    locationData: {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        country?: string;
        state?: string;
        region?: string;
      };
    } | null
  ): number {
    if (!locationData || !locationData.address) {
      // Fallback to geographic estimation
      if (this.isLikelyOcean(lat, lng)) return 0;

      // Major population centers
      if (lat > 20 && lat < 50 && lng > 100 && lng < 145) return 800; // East Asia
      if (lat > 5 && lat < 40 && lng > 65 && lng < 95) return 700; // India
      if (lat > 35 && lat < 70 && lng > -10 && lng < 40) return 600; // Europe

      return 50; // Default low density
    }

    // Check address components for urban indicators
    const address = locationData.address;
    if (address.city || address.town) return 500;
    if (address.village) return 100;
    if (address.hamlet) return 20;

    return 10; // Rural
  }

  // Extract nearest city from location data
  private extractNearestCity(locationData: {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      hamlet?: string;
      country?: string;
      state?: string;
      region?: string;
    };
  }):
    | {
        name: string;
        distance: number;
        population: number;
      }
    | undefined {
    if (!locationData || !locationData.address) return undefined;

    const address = locationData.address;
    const cityName =
      address.city || address.town || address.village || address.hamlet;

    if (!cityName) return undefined;

    return {
      name: cityName,
      distance: 0, // At location
      population: this.estimateCityPopulation(cityName, address),
    };
  }

  // Estimate city population (rough estimates)
  private estimateCityPopulation(
    cityName: string,
    address: {
      city?: string;
      town?: string;
      village?: string;
      hamlet?: string;
    }
  ): number {
    // This is a simplified estimate - in production, you'd use a city database
    if (address.city) return 500000; // Cities typically 100k-1M+
    if (address.town) return 50000; // Towns typically 10k-100k
    if (address.village) return 5000; // Villages typically 1k-10k
    return 500; // Hamlets typically <1k
  }

  // Get terrain data for a grid area (for visualization)
  async getTerrainGrid(
    centerLat: number,
    centerLng: number,
    gridSize: number,
    radiusKm: number
  ): Promise<RealTerrainData[][]> {
    const grid: RealTerrainData[][] = [];
    const latStep = radiusKm / 111 / gridSize; // Rough km to degrees
    const lngStep =
      radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180)) / gridSize;

    // Fetch grid points in parallel (batch by rows to avoid overwhelming APIs)
    for (let i = 0; i < gridSize; i++) {
      const rowPromises: Promise<RealTerrainData>[] = [];

      for (let j = 0; j < gridSize; j++) {
        const lat = centerLat + (i - gridSize / 2) * latStep;
        const lng = centerLng + (j - gridSize / 2) * lngStep;

        rowPromises.push(this.getTerrainData(lat, lng));
      }

      // Wait for entire row to complete
      const rowData = await Promise.all(rowPromises);
      grid.push(rowData);

      // Small delay between rows to be respectful to APIs
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return grid;
  }
}

// Singleton instance
export const realTerrainService = new RealTerrainDataService();
