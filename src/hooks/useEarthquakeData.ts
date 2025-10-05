'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/logger';

export interface Earthquake {
  id: string;
  magnitude: number;
  location: string;
  time: string;
  coordinates: {
    longitude: number;
    latitude: number;
    depth: number; // km
  };
  tsunami_warning: boolean;
  felt_reports: number;
  damage_alert: string;
  significance: number;
  magnitude_type: string;
  url: string;
  detail_url: string;
  energy_joules: number;
  energy_mt: number; // Megatons TNT equivalent
}

export interface EarthquakeDataset {
  earthquakes: Earthquake[];
  summary: {
    total: number;
    max_magnitude: number;
    min_magnitude: number;
    avg_magnitude: number;
    depth_range: { min: number; max: number };
    regions_affected: string[];
  };
}

export interface EarthquakeSummary {
  last_updated: string;
  earthquakes_today: number;
  earthquakes_this_week: number;
  significant_events: number;
  largest_this_week: Earthquake | null;
  largest_historical: Earthquake | null;
}

export interface EarthquakeComparison {
  location: string;
  magnitude: number;
  energy_mt: number;
  date: string;
  asteroid_equivalent_diameter: number;
  description: string;
}

export function useEarthquakeData() {
  const [currentData, setCurrentData] = useState<{
    daily_activity: EarthquakeDataset | null;
    weekly_activity: EarthquakeDataset | null;
    significant_recent: EarthquakeDataset | null;
    major_earthquakes: EarthquakeDataset | null;
  }>({
    daily_activity: null,
    weekly_activity: null,
    significant_recent: null,
    major_earthquakes: null
  });

  const [historicalData, setHistoricalData] = useState<EarthquakeDataset | null>(null);
  const [comparisons, setComparisons] = useState<EarthquakeComparison[]>([]);
  const [summary, setSummary] = useState<EarthquakeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load earthquake data from JSON files
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load full earthquake dataset
        const dataResponse = await fetch('/data/earthquake-data.json');
        if (!dataResponse.ok) throw new Error('Failed to load earthquake data');
        const fullData = await dataResponse.json();

        // Set current earthquake data
        setCurrentData({
          daily_activity: fullData.current.daily_activity,
          weekly_activity: fullData.current.weekly_activity,
          significant_recent: fullData.current.significant_recent,
          major_earthquakes: fullData.current.major_earthquakes
        });

        // Set historical data
        setHistoricalData(fullData.historical);

        // Set comparisons
        setComparisons(fullData.comparisons.earthquake_comparisons || []);

        // Load summary
        const summaryResponse = await fetch('/data/earthquake-summary.json');
        if (!summaryResponse.ok) throw new Error('Failed to load earthquake summary');
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);

        logger.info('Earthquake data loaded successfully', {
          todayCount: summaryData.earthquakes_today,
          weekCount: summaryData.earthquakes_this_week,
          significantCount: summaryData.significant_events
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load earthquake data';
        setError(errorMessage);
        logger.error('Failed to load earthquake data', { error: err });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get recent significant earthquakes
  const getSignificantEarthquakes = (limit: number = 10): Earthquake[] => {
    if (!currentData.significant_recent) return [];
    return currentData.significant_recent.earthquakes.slice(0, limit);
  };

  // Get earthquakes by magnitude range
  const getEarthquakesByMagnitude = (minMag: number, maxMag: number = 10): Earthquake[] => {
    if (!currentData.weekly_activity) return [];
    return currentData.weekly_activity.earthquakes.filter(
      eq => eq.magnitude >= minMag && eq.magnitude <= maxMag
    );
  };

  // Get earthquakes by region
  const getEarthquakesByRegion = (region: string): Earthquake[] => {
    if (!currentData.weekly_activity) return [];
    return currentData.weekly_activity.earthquakes.filter(
      eq => eq.location.toLowerCase().includes(region.toLowerCase())
    );
  };

  // Compare earthquake to asteroid impact
  const compareToAsteroidImpact = (earthquake: Earthquake) => {
    // Calculate equivalent asteroid parameters
    const energyJoules = earthquake.energy_joules;

    // Assuming asteroid velocity of 20 km/s and density of 3000 kg/m³
    const velocity = 20000; // m/s
    const density = 3000; // kg/m³

    // KE = 0.5 * m * v² => m = 2 * KE / v²
    const mass = (2 * energyJoules) / (velocity * velocity);

    // Volume = mass / density
    const volume = mass / density;

    // Sphere volume = (4/3) * π * r³ => r = ∛(3V/4π)
    const radius = Math.cbrt((3 * volume) / (4 * Math.PI));
    const diameter = radius * 2;

    return {
      earthquake_magnitude: earthquake.magnitude,
      earthquake_location: earthquake.location,
      energy_mt: earthquake.energy_mt,
      equivalent_asteroid_diameter: diameter,
      equivalent_asteroid_mass: mass,
      impact_comparison: getImpactComparison(earthquake.energy_mt)
    };
  };

  // Get historical impact comparison
  const getImpactComparison = (energyMT: number): string => {
    if (energyMT < 0.001) return 'Small meteorite';
    if (energyMT < 0.01) return 'Fireball event';
    if (energyMT < 0.1) return 'Small airburst';
    if (energyMT < 1) return 'Chelyabinsk-class event';
    if (energyMT < 10) return 'Regional impact';
    if (energyMT < 100) return 'Tunguska-class event';
    if (energyMT < 1000) return 'Major regional devastation';
    if (energyMT < 10000) return 'Continental-scale disaster';
    return 'Global catastrophe';
  };

  // Get earthquakes near a location
  const getEarthquakesNearLocation = (lat: number, lng: number, radiusKm: number): Earthquake[] => {
    if (!currentData.weekly_activity) return [];

    return currentData.weekly_activity.earthquakes.filter(eq => {
      const distance = calculateDistance(
        lat, lng,
        eq.coordinates.latitude,
        eq.coordinates.longitude
      );
      return distance <= radiusKm;
    });
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get earthquake risk level
  const getEarthquakeRiskLevel = (magnitude: number): {
    level: string;
    color: string;
    description: string;
  } => {
    if (magnitude < 3.0) return {
      level: 'MICRO',
      color: '#00ff00',
      description: 'Usually not felt'
    };
    if (magnitude < 4.0) return {
      level: 'MINOR',
      color: '#88ff00',
      description: 'Felt but rarely causes damage'
    };
    if (magnitude < 5.0) return {
      level: 'LIGHT',
      color: '#ffff00',
      description: 'Noticeable shaking, minor damage'
    };
    if (magnitude < 6.0) return {
      level: 'MODERATE',
      color: '#ffaa00',
      description: 'Can cause damage to buildings'
    };
    if (magnitude < 7.0) return {
      level: 'STRONG',
      color: '#ff6600',
      description: 'Serious damage over large areas'
    };
    if (magnitude < 8.0) return {
      level: 'MAJOR',
      color: '#ff3300',
      description: 'Devastating over several hundred miles'
    };
    return {
      level: 'GREAT',
      color: '#ff0000',
      description: 'Catastrophic destruction'
    };
  };

  // Get statistics for visualization
  const getStatistics = () => {
    if (!currentData.weekly_activity) return null;

    const magnitudeBins = {
      'M2.5-3.0': 0,
      'M3.0-4.0': 0,
      'M4.0-5.0': 0,
      'M5.0-6.0': 0,
      'M6.0+': 0
    };

    currentData.weekly_activity.earthquakes.forEach(eq => {
      if (eq.magnitude < 3.0) magnitudeBins['M2.5-3.0']++;
      else if (eq.magnitude < 4.0) magnitudeBins['M3.0-4.0']++;
      else if (eq.magnitude < 5.0) magnitudeBins['M4.0-5.0']++;
      else if (eq.magnitude < 6.0) magnitudeBins['M5.0-6.0']++;
      else magnitudeBins['M6.0+']++;
    });

    return {
      magnitudeBins,
      totalWeekly: currentData.weekly_activity.summary.total,
      averageMagnitude: currentData.weekly_activity.summary.avg_magnitude,
      depthRange: currentData.weekly_activity.summary.depth_range,
      regionsAffected: currentData.weekly_activity.summary.regions_affected
    };
  };

  return {
    // Data
    currentData,
    historicalData,
    comparisons,
    summary,
    loading,
    error,

    // Functions
    getSignificantEarthquakes,
    getEarthquakesByMagnitude,
    getEarthquakesByRegion,
    compareToAsteroidImpact,
    getEarthquakesNearLocation,
    getEarthquakeRiskLevel,
    getStatistics,

    // Quick access
    todayCount: summary?.earthquakes_today || 0,
    weekCount: summary?.earthquakes_this_week || 0,
    significantCount: summary?.significant_events || 0,
    largestThisWeek: summary?.largest_this_week || null,
    largestHistorical: summary?.largest_historical || null,
    isDataAvailable: !!currentData.weekly_activity
  };
}