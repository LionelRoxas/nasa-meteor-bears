'use client';

import { useState } from 'react';
import { logger } from '@/logger';

export interface CorrelatedEarthquake {
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
  correlationScore: string;
  correlationFactors: {
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
  };
}

export interface AsteroidCorrelationData {
  asteroidId: string;
  asteroidName: string;
  asteroidDesignation: string;
  asteroidFeatures: {
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
  };
  nasaData: {
    diameter_meters: number;
    diameter_km: number;
    is_hazardous: boolean;
    is_sentry_object: boolean;
    kinetic_energy_mt: number;
    threat_level: string;
    orbit_class: string;
    next_approach: any;
    closest_approach_ever: any;
    nasa_url: string;
  };
  correlatedEarthquakes: CorrelatedEarthquake[];
  analysisTimestamp: string;
  dataSource: string;
}

export interface EnhancedPrediction {
  hazard_probability: number;
  risk_score: number;
  confidence: number;
  recommendation: string;
  threat_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  model_version: string;
  // Enhanced fields from LLM analysis
  llm_analysis: {
    historical_comparison: string;
    risk_factors: string[];
    confidence_factors: string[];
    similar_events: string;
    impact_assessment: string;
    recommendation_detailed: string;
  };
  correlation_context: {
    top_similar_earthquakes: number;
    average_correlation_score: number;
    energy_comparison_summary: string;
    hazard_pattern_analysis: string;
  };
}

export function useEnhancedPredictions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get 10 best correlated datasets for an asteroid
  const getCorrelationData = async (asteroidId: string): Promise<AsteroidCorrelationData | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/correlate-asteroid-earthquakes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ asteroidId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const correlationData: AsteroidCorrelationData = await response.json();
      logger.info('Correlation data fetched successfully', {
        asteroidId,
        correlatedEarthquakes: correlationData.correlatedEarthquakes.length
      });

      return correlationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch correlation data';
      setError(errorMessage);
      logger.error('Failed to fetch correlation data', { asteroidId, error: err });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate enhanced prediction using LLM with correlation context
  const generateEnhancedPrediction = async (
    asteroidId: string,
    correlationData: AsteroidCorrelationData
  ): Promise<EnhancedPrediction | null> => {
    try {
      setLoading(true);
      setError(null);

      // Prepare context for LLM
      const context = buildLLMContext(correlationData);

      // Call LLM API (you'll need to implement this endpoint)
      const response = await fetch('/api/llm-enhanced-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asteroidId,
          context,
          asteroidData: correlationData.nasaData,
          correlatedEarthquakes: correlationData.correlatedEarthquakes.slice(0, 10) // Top 10
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const enhancedPrediction: EnhancedPrediction = await response.json();
      logger.info('Enhanced prediction generated successfully', {
        asteroidId,
        threatCategory: enhancedPrediction.threat_category,
        confidence: enhancedPrediction.confidence
      });

      return enhancedPrediction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate enhanced prediction';
      setError(errorMessage);
      logger.error('Failed to generate enhanced prediction', { asteroidId, error: err });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Main function to get complete enhanced prediction
  const getEnhancedPrediction = async (asteroidId: string): Promise<EnhancedPrediction | null> => {
    try {
      // Step 1: Get correlation data
      const correlationData = await getCorrelationData(asteroidId);
      if (!correlationData) {
        return null;
      }

      // Step 2: Generate enhanced prediction with LLM
      const enhancedPrediction = await generateEnhancedPrediction(asteroidId, correlationData);
      return enhancedPrediction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get enhanced prediction';
      setError(errorMessage);
      logger.error('Failed to get enhanced prediction', { asteroidId, error: err });
      return null;
    }
  };

  // Build context string for LLM from correlation data
  const buildLLMContext = (correlationData: AsteroidCorrelationData): string => {
    const { asteroidFeatures, nasaData, correlatedEarthquakes } = correlationData;

    const context = `
ASTEROID ANALYSIS CONTEXT:

Asteroid Information:
- Name: ${correlationData.asteroidName}
- ID: ${correlationData.asteroidId}
- Diameter: ${nasaData.diameter_km.toFixed(3)} km (${nasaData.diameter_meters.toFixed(0)} m)
- Kinetic Energy: ${nasaData.kinetic_energy_mt.toFixed(2)} MT TNT equivalent
- Hazardous Classification: ${nasaData.is_hazardous ? 'YES' : 'NO'}
- Sentry Object: ${nasaData.is_sentry_object ? 'YES' : 'NO'}
- Threat Level: ${nasaData.threat_level}
- Orbit Class: ${nasaData.orbit_class}

Orbital Characteristics:
- Semi-major Axis: ${asteroidFeatures.semiMajorAxis.toFixed(3)} AU
- Eccentricity: ${asteroidFeatures.orbitEccentricity.toFixed(4)}
- Inclination: ${asteroidFeatures.orbitInclination.toFixed(2)}°
- Orbital Period: ${(asteroidFeatures.orbitalPeriod / 365.25).toFixed(1)} years
- Minimum Approach Distance: ${asteroidFeatures.minApproachDistance.toFixed(4)} AU
- Approach Velocity: ${asteroidFeatures.avgApproachVelocity.toFixed(1)} km/s

CORRELATED HISTORICAL EARTHQUAKES (Top 10 Most Similar):

${correlatedEarthquakes.map((eq, index) => `
${index + 1}. Earthquake Event:
   - Magnitude: ${eq.magnitude} ${eq.magnitude_type}
   - Location: ${eq.location}
   - Date: ${new Date(eq.time).toLocaleDateString()}
   - Depth: ${eq.depth_km} km
   - Energy: ${eq.energy_joules ? (eq.energy_joules / 4.184e15).toFixed(2) + ' MT TNT equivalent' : 'N/A'}
   - Significance: ${eq.significance}
   - Tsunami Warning: ${eq.tsunami_warning ? 'YES' : 'NO'}
   - Damage Alert: ${eq.damage_alert}
   - Correlation Score: ${eq.correlationScore} (0-1 scale)
   - Energy Comparison Ratio: ${eq.correlationFactors.energyComparison.ratio}
`).join('')}

ANALYSIS REQUIREMENTS:
Please analyze this asteroid's threat potential based on:
1. The historical earthquake patterns that correlate with similar objects
2. Energy comparisons between the asteroid and correlated seismic events
3. Orbital characteristics and their relationship to observed impacts
4. NASA's hazard classification and supporting evidence

Provide a comprehensive risk assessment with specific confidence factors and recommendations.
`;

    return context.trim();
  };

  return {
    // Functions
    getCorrelationData,
    generateEnhancedPrediction,
    getEnhancedPrediction,
    buildLLMContext,

    // State
    loading,
    error
  };
}