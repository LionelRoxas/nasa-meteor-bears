/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// USGS Data Integration Service
// Provides direct access to USGS topography, seismic zones, and tsunami modeling data

export interface USGSEarthquakeData {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number;
  gap: number | null;
  magType: string;
  type: string;
  title: string;
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
  properties: {
    mag: number;
    place: string;
    time: number;
    tsunami: number;
    alert: string | null;
    sig: number;
  };
}

export interface USGSSeismicZone {
  zone: string;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  description: string;
  averageAnnualEvents: number;
  maxHistoricalMagnitude: number;
}

export interface USGSTsunamiZone {
  isCoastal: boolean;
  riskLevel: "NONE" | "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  nearestCoastDistance: number; // km
  elevationAboveSeaLevel: number; // meters
  tsunamiHistory: number; // Number of historical tsunamis
}

export interface USGSTopographyData {
  elevation: number; // meters
  slope: number; // degrees
  terrainRuggedness: number; // 0-1 scale
  landCoverType: string;
  drainageClass: string;
}

export class USGSDataService {
  private readonly EARTHQUAKE_API = "https://earthquake.usgs.gov/fdsnws/event/1/query";
  private readonly ELEVATION_API = "https://api.open-elevation.com/api/v1/lookup";

  private cache: Map<string, any> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  /**
   * Fetch recent earthquakes from USGS API
   * @param params Search parameters
   */
  async getEarthquakes(params: {
    starttime?: string;
    endtime?: string;
    minmagnitude?: number;
    maxmagnitude?: number;
    latitude?: number;
    longitude?: number;
    maxradiuskm?: number;
    limit?: number;
  }): Promise<USGSEarthquakeData[]> {
    const cacheKey = `earthquakes_${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        format: "geojson",
        orderby: "time",
        ...Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>),
      });

      const url = `${this.EARTHQUAKE_API}?${queryParams}`;
      console.log("🌍 Fetching USGS earthquake data:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status}`);
      }

      const data = await response.json();
      const earthquakes: USGSEarthquakeData[] = data.features.map((feature: any) => ({
        id: feature.id,
        magnitude: feature.properties.mag,
        place: feature.properties.place,
        time: feature.properties.time,
        updated: feature.properties.updated,
        tz: feature.properties.tz,
        url: feature.properties.url,
        detail: feature.properties.detail,
        felt: feature.properties.felt,
        cdi: feature.properties.cdi,
        mmi: feature.properties.mmi,
        alert: feature.properties.alert,
        status: feature.properties.status,
        tsunami: feature.properties.tsunami,
        sig: feature.properties.sig,
        net: feature.properties.net,
        code: feature.properties.code,
        ids: feature.properties.ids,
        sources: feature.properties.sources,
        types: feature.properties.types,
        nst: feature.properties.nst,
        dmin: feature.properties.dmin,
        rms: feature.properties.rms,
        gap: feature.properties.gap,
        magType: feature.properties.magType,
        type: feature.properties.type,
        title: feature.properties.title,
        geometry: feature.geometry,
        properties: feature.properties,
      }));

      this.cache.set(cacheKey, { data: earthquakes, timestamp: Date.now() });
      console.log(`✅ Fetched ${earthquakes.length} earthquakes from USGS`);

      return earthquakes;
    } catch (error) {
      console.error("Failed to fetch USGS earthquake data:", error);
      return [];
    }
  }

  /**
   * Get seismic zone information for a location
   * Based on historical earthquake data and known seismic zones
   */
  async getSeismicZone(lat: number, lng: number): Promise<USGSSeismicZone> {
    try {
      // Fetch earthquakes within 500km in the last 10 years
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      const earthquakes = await this.getEarthquakes({
        latitude: lat,
        longitude: lng,
        maxradiuskm: 500,
        starttime: tenYearsAgo.toISOString().split("T")[0],
        minmagnitude: 3.0,
        limit: 1000,
      });

      // Analyze seismic activity
      const avgEventsPerYear = earthquakes.length / 10;
      const maxMagnitude = Math.max(...earthquakes.map((eq) => eq.magnitude), 0);

      // Determine risk level based on activity
      let riskLevel: USGSSeismicZone["riskLevel"];
      let description: string;

      if (avgEventsPerYear > 50 || maxMagnitude > 7.5) {
        riskLevel = "VERY_HIGH";
        description = "Very high seismic activity zone. Major earthquakes common.";
      } else if (avgEventsPerYear > 20 || maxMagnitude > 6.5) {
        riskLevel = "HIGH";
        description = "High seismic activity zone. Significant earthquakes expected.";
      } else if (avgEventsPerYear > 5 || maxMagnitude > 5.5) {
        riskLevel = "MODERATE";
        description = "Moderate seismic activity. Occasional strong earthquakes.";
      } else {
        riskLevel = "LOW";
        description = "Low seismic activity. Infrequent earthquakes.";
      }

      // Determine zone name based on known seismic regions
      const zone = this.identifySeismicZone(lat, lng);

      return {
        zone,
        riskLevel,
        description,
        averageAnnualEvents: Math.round(avgEventsPerYear),
        maxHistoricalMagnitude: maxMagnitude,
      };
    } catch (error) {
      console.error("Failed to get seismic zone data:", error);
      return {
        zone: "Unknown",
        riskLevel: "LOW",
        description: "No seismic data available",
        averageAnnualEvents: 0,
        maxHistoricalMagnitude: 0,
      };
    }
  }

  /**
   * Identify major seismic zones
   */
  private identifySeismicZone(lat: number, lng: number): string {
    // Pacific Ring of Fire
    if (
      (lat > -60 && lat < 70 && lng > 120 && lng < 180) || // Western Pacific
      (lat > -60 && lat < 70 && lng > -180 && lng < -100) || // Eastern Pacific
      (lat > 30 && lat < 60 && lng > -130 && lng < -110) // Western North America
    ) {
      return "Pacific Ring of Fire";
    }

    // Alpide Belt
    if (lat > 25 && lat < 45 && lng > -10 && lng < 100) {
      return "Alpide Belt (Mediterranean-Himalayan)";
    }

    // Mid-Atlantic Ridge
    if (lng > -45 && lng < -10 && Math.abs(lat) < 60) {
      return "Mid-Atlantic Ridge";
    }

    // East African Rift
    if (lat > -35 && lat < 20 && lng > 20 && lng < 50) {
      return "East African Rift";
    }

    return "Low Activity Zone";
  }

  /**
   * Get tsunami risk for a coastal location
   */
  async getTsunamiRisk(lat: number, lng: number, elevation: number): Promise<USGSTsunamiZone> {
    try {
      // Check if location is coastal (within 100km of ocean)
      const isCoastal = this.isCoastalLocation(lat, lng);

      if (!isCoastal) {
        return {
          isCoastal: false,
          riskLevel: "NONE",
          nearestCoastDistance: 1000,
          elevationAboveSeaLevel: elevation,
          tsunamiHistory: 0,
        };
      }

      // Get historical tsunami-generating earthquakes
      const tsunamiEarthquakes = await this.getEarthquakes({
        latitude: lat,
        longitude: lng,
        maxradiuskm: 1000,
        minmagnitude: 6.0,
        limit: 100,
      });

      const tsunamiEvents = tsunamiEarthquakes.filter((eq) => eq.tsunami === 1);

      // Determine risk based on elevation and history
      let riskLevel: USGSTsunamiZone["riskLevel"];

      if (elevation < 5 && tsunamiEvents.length > 5) {
        riskLevel = "EXTREME";
      } else if (elevation < 10 && tsunamiEvents.length > 2) {
        riskLevel = "HIGH";
      } else if (elevation < 20 && tsunamiEvents.length > 0) {
        riskLevel = "MODERATE";
      } else if (elevation < 50) {
        riskLevel = "LOW";
      } else {
        riskLevel = "NONE";
      }

      return {
        isCoastal: true,
        riskLevel,
        nearestCoastDistance: this.estimateCoastDistance(lat, lng),
        elevationAboveSeaLevel: elevation,
        tsunamiHistory: tsunamiEvents.length,
      };
    } catch (error) {
      console.error("Failed to get tsunami risk data:", error);
      return {
        isCoastal: false,
        riskLevel: "NONE",
        nearestCoastDistance: 1000,
        elevationAboveSeaLevel: elevation,
        tsunamiHistory: 0,
      };
    }
  }

  /**
   * Check if location is coastal
   */
  private isCoastalLocation(lat: number, lng: number): boolean {
    // Simplified coastal detection - in production, use detailed coastline data
    // This is a rough approximation of major coastal areas

    // Pacific coasts
    if (
      (lng > -130 && lng < -100 && lat > -60 && lat < 60) || // Americas West Coast
      (lng > 100 && lng < 180 && lat > -50 && lat < 70) // Asia-Pacific
    ) {
      return true;
    }

    // Atlantic coasts
    if (
      (lng > -100 && lng < -60 && lat > -60 && lat < 70) || // Americas East Coast
      (lng > -30 && lng < 20 && lat > -40 && lat < 70) // Europe-Africa
    ) {
      return true;
    }

    // Indian Ocean coasts
    if (lng > 20 && lng < 100 && lat > -50 && lat < 30) {
      return true;
    }

    return false;
  }

  /**
   * Estimate distance to nearest coast (simplified)
   */
  private estimateCoastDistance(lat: number, lng: number): number {
    // This is a very rough estimate
    // In production, use actual coastline geometry
    if (this.isCoastalLocation(lat, lng)) {
      return Math.random() * 50; // 0-50 km for coastal areas
    }
    return 500; // Default for inland
  }

  /**
   * Get comprehensive impact assessment using USGS data
   */
  async getImpactAssessment(
    lat: number,
    lng: number,
    impactEnergy: number, // Joules
    craterDiameter: number // km
  ): Promise<{
    seismicZone: USGSSeismicZone;
    tsunamiRisk: USGSTsunamiZone;
    expectedEarthquakeMagnitude: number;
    expectedTsunamiHeight: number;
    secondaryHazards: string[];
  }> {
    try {
      // Get elevation for tsunami assessment
      const elevationData = await fetch(
        `${this.ELEVATION_API}?locations=${lat},${lng}`
      );
      const elevationJson = await elevationData.json();
      const elevation = elevationJson.results?.[0]?.elevation || 0;

      // Get seismic zone and tsunami risk in parallel
      const [seismicZone, tsunamiRisk] = await Promise.all([
        this.getSeismicZone(lat, lng),
        this.getTsunamiRisk(lat, lng, elevation),
      ]);

      // Calculate expected earthquake magnitude from impact energy
      // Using empirical relationship: M = (2/3) * log10(E) - 2.9
      // Where E is in Joules
      const expectedEarthquakeMagnitude = (2 / 3) * Math.log10(impactEnergy) - 2.9;

      // Calculate expected tsunami height for water impacts
      const expectedTsunamiHeight = tsunamiRisk.isCoastal
        ? this.calculateTsunamiHeight(craterDiameter, elevation)
        : 0;

      // Identify secondary hazards
      const secondaryHazards: string[] = [];
      if (expectedEarthquakeMagnitude > 5.0) {
        secondaryHazards.push("Major seismic shaking");
      }
      if (tsunamiRisk.riskLevel === "HIGH" || tsunamiRisk.riskLevel === "EXTREME") {
        secondaryHazards.push("Tsunami waves");
      }
      if (seismicZone.riskLevel === "HIGH" || seismicZone.riskLevel === "VERY_HIGH") {
        secondaryHazards.push("Potential fault activation");
      }
      if (craterDiameter > 1) {
        secondaryHazards.push("Ejecta blanket");
      }
      if (impactEnergy > 1e18) {
        secondaryHazards.push("Atmospheric disturbance");
      }

      return {
        seismicZone,
        tsunamiRisk,
        expectedEarthquakeMagnitude: Math.max(expectedEarthquakeMagnitude, 0),
        expectedTsunamiHeight,
        secondaryHazards,
      };
    } catch (error) {
      console.error("Failed to get USGS impact assessment:", error);
      throw error;
    }
  }

  /**
   * Calculate tsunami height from crater size and coastal proximity
   */
  private calculateTsunamiHeight(craterDiameter: number, elevation: number): number {
    if (elevation > 0) return 0; // Not underwater impact

    // Simplified tsunami height calculation
    // Based on crater diameter (proxy for energy)
    // Height (m) ≈ 10 * sqrt(crater_diameter_km)
    return Math.min(10 * Math.sqrt(craterDiameter), 100); // Cap at 100m
  }
}

// Singleton instance
export const usgsDataService = new USGSDataService();
