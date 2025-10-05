/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@/logger';

export interface AsteroidData {
  id: string;
  name: string;
  diameter: number; // meters
  velocity: number; // km/s
  distance: number; // km
  is_hazardous: boolean;
  approach_date?: string;
  magnitude: number;
  nasa_url?: string;
  orbital_data?: any;

  // Calculated fields
  mass?: number;
  energy?: number; // Megatons TNT
  craterSize?: number; // km
  affectedRadius?: number; // km
  threatLevel?: 'MINIMAL' | 'LOCAL' | 'REGIONAL' | 'GLOBAL';
}

export interface HistoricalImpact {
  name: string;
  date: string;
  location: string;
  diameter: number;
  energy: number;
  craterSize?: number;
  description: string;
  type: 'confirmed' | 'theoretical';
}

export interface PredictionData {
  timestamp: string;
  asteroidId: string;
  impactProbability: number;
  deflectionSuccess: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  affectedRegions: string[];
  evacuationZones: string[];
}

class AsteroidDataManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 1000 * 60 * 30; // 30 minutes cache

  /**
   * Enhanced asteroid data with physics calculations
   */
  enhanceAsteroidData(asteroid: AsteroidData): AsteroidData {
    // Calculate mass (assuming rocky composition, ~3000 kg/m³)
    const volume = (4 / 3) * Math.PI * Math.pow(asteroid.diameter / 2, 3);
    const mass = volume * 3000; // kg

    // Calculate kinetic energy (KE = 0.5 * m * v²)
    const velocityMs = asteroid.velocity * 1000; // convert to m/s
    const energy = 0.5 * mass * velocityMs * velocityMs; // Joules
    const energyMt = energy / 4.184e15; // Convert to Megatons TNT

    // Calculate crater size using scaling laws
    // Simplified crater scaling: D = 1.8 * (E/ρg)^0.25
    const craterSize = (1.8 * Math.pow(energy / (2700 * 9.81), 0.25)) / 1000; // km

    // Affected radius (rough estimate)
    const affectedRadius = craterSize * 10;

    // Determine threat level
    let threatLevel: 'MINIMAL' | 'LOCAL' | 'REGIONAL' | 'GLOBAL' = 'MINIMAL';
    if (energyMt > 100) threatLevel = 'GLOBAL';
    else if (energyMt > 10) threatLevel = 'REGIONAL';
    else if (energyMt > 1) threatLevel = 'LOCAL';

    return {
      ...asteroid,
      mass,
      energy: energyMt,
      craterSize,
      affectedRadius,
      threatLevel
    };
  }

  /**
   * Get historical impact events for comparison
   */
  getHistoricalImpacts(): HistoricalImpact[] {
    return [
      {
        name: "Tunguska Event",
        date: "1908-06-30",
        location: "Siberia, Russia",
        diameter: 60,
        energy: 15,
        description: "Largest impact event in recorded history, flattened 2,000 km² of forest",
        type: "confirmed"
      },
      {
        name: "Chelyabinsk Meteor",
        date: "2013-02-15",
        location: "Chelyabinsk, Russia",
        diameter: 20,
        energy: 0.5,
        description: "Airburst that injured over 1,500 people from shockwave",
        type: "confirmed"
      },
      {
        name: "Chicxulub Impact",
        date: "66000000 BCE",
        location: "Yucatan Peninsula, Mexico",
        diameter: 10000,
        energy: 100000000,
        craterSize: 150,
        description: "Asteroid impact that caused the extinction of dinosaurs",
        type: "confirmed"
      },
      {
        name: "Meteor Crater (Barringer)",
        date: "50000 BCE",
        location: "Arizona, USA",
        diameter: 50,
        energy: 10,
        craterSize: 1.2,
        description: "Well-preserved impact crater in the desert",
        type: "confirmed"
      },
      {
        name: "Hypothetical NYC Impact",
        date: "2025-12-31",
        location: "New York City, USA",
        diameter: 200,
        energy: 100,
        description: "Theoretical impact scenario for risk assessment",
        type: "theoretical"
      },
      {
        name: "Hypothetical London Impact",
        date: "2026-06-15",
        location: "London, UK",
        diameter: 500,
        energy: 1000,
        description: "Theoretical impact scenario for evacuation planning",
        type: "theoretical"
      }
    ];
  }

  /**
   * Generate random asteroid for testing
   */
  generateRandomAsteroid(id?: string): AsteroidData {
    const sizes = [
      { min: 10, max: 50, weight: 0.7 },    // Small
      { min: 50, max: 200, weight: 0.2 },   // Medium
      { min: 200, max: 1000, weight: 0.08 }, // Large
      { min: 1000, max: 5000, weight: 0.02 } // Huge
    ];

    const sizeCategory = this.weightedRandom(sizes);
    const diameter = Math.random() * (sizeCategory.max - sizeCategory.min) + sizeCategory.min;

    const velocity = Math.random() * 45 + 5; // 5-50 km/s
    const distance = Math.random() * 490000 + 10000; // 10k-500k km

    const names = [
      "Impactor-2025", "Devastator", "Harbinger", "Nemesis", "Apophis-B",
      "Destroyer", "Cataclysm", "Armageddon", "Doomsday", "Extinction",
      "Asteroid-X", "Death Star", "Planet Killer", "World Ender", "Chaos"
    ];

    const randomAsteroid: AsteroidData = {
      id: id || `random-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: names[Math.floor(Math.random() * names.length)],
      diameter: Math.round(diameter),
      velocity: Math.round(velocity * 10) / 10,
      distance: Math.round(distance),
      is_hazardous: diameter > 100 || distance < 50000,
      magnitude: Math.random() * 10 + 15,
      approach_date: this.getRandomFutureDate()
    };

    return this.enhanceAsteroidData(randomAsteroid);
  }

  /**
   * Predict impact consequences
   */
  predictImpactConsequences(asteroid: AsteroidData, impactLocation?: { lat: number; lon: number }): PredictionData {
    const enhanced = this.enhanceAsteroidData(asteroid);

    let impactProbability = 0.001; // Base probability
    if (enhanced.distance < 50000) impactProbability += 0.1;
    if (enhanced.is_hazardous) impactProbability += 0.05;
    if (enhanced.diameter > 500) impactProbability += 0.02;

    let deflectionSuccess = 0.95; // Base success rate
    if (enhanced.diameter > 1000) deflectionSuccess -= 0.3;
    if (enhanced.velocity > 30) deflectionSuccess -= 0.1;
    if (enhanced.distance < 30000) deflectionSuccess -= 0.2;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';
    if (enhanced.energy! > 1000) riskLevel = 'EXTREME';
    else if (enhanced.energy! > 100) riskLevel = 'HIGH';
    else if (enhanced.energy! > 10) riskLevel = 'MEDIUM';

    const affectedRegions = this.getAffectedRegions(enhanced, impactLocation);
    const evacuationZones = this.getEvacuationZones(enhanced, impactLocation);

    return {
      timestamp: new Date().toISOString(),
      asteroidId: asteroid.id,
      impactProbability: Math.round(impactProbability * 10000) / 10000,
      deflectionSuccess: Math.round(deflectionSuccess * 100) / 100,
      riskLevel,
      affectedRegions,
      evacuationZones
    };
  }

  /**
   * Save asteroid data to local storage (browser)
   */
  saveToLocalStorage(key: string, data: any): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`asteroid-${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      logger.error('Failed to save to localStorage', { error, key });
    }
  }

  /**
   * Load asteroid data from local storage
   */
  loadFromLocalStorage(key: string): any | null {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`asteroid-${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Check if data is not too old (24 hours)
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            return parsed.data;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load from localStorage', { error, key });
    }
    return null;
  }

  /**
   * Export data as JSON for download
   */
  exportAsJSON(data: any, filename: string): void {
    if (typeof window !== 'undefined') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Helper methods
  private weightedRandom(items: { weight: number }[]): any {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  private getRandomFutureDate(): string {
    const now = new Date();
    const future = new Date(now.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000);
    return future.toISOString().split('T')[0];
  }

  private getAffectedRegions(asteroid: AsteroidData, location?: { lat: number; lon: number }): string[] {
    const regions = ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
    const affectedCount = Math.min(Math.ceil(asteroid.affectedRadius! / 1000), regions.length);
    return regions.slice(0, affectedCount);
  }

  private getEvacuationZones(asteroid: AsteroidData, location?: { lat: number; lon: number }): string[] {
    const zones = [];
    const radius = asteroid.affectedRadius!;

    if (radius > 100) zones.push('Immediate impact zone (100km)');
    if (radius > 500) zones.push('Secondary damage zone (500km)');
    if (radius > 1000) zones.push('Fallout zone (1000km)');
    if (radius > 5000) zones.push('Global effects zone');

    return zones;
  }
}

// Export singleton instance
export const asteroidDataManager = new AsteroidDataManager();