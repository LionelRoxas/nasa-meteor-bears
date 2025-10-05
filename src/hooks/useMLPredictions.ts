'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/logger';

export interface MLPrediction {
  hazard_probability: number;
  risk_score: number;
  confidence: number;
  recommendation: string;
  threat_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  model_version: string;
}

export interface MLModelStats {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  model_type: string;
  training_date: string;
  feature_importance: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface MLResults {
  predictions: Record<string, MLPrediction>;
  model_stats: MLModelStats;
  metadata: {
    total_objects: number;
    high_risk_objects: number;
    model_confidence_avg: number;
    last_updated: string;
  };
}

export function useMLPredictions() {
  const [mlResults, setMLResults] = useState<MLResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMLResults = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to load ML results
        const response = await fetch('/data/ml_results.json');

        if (!response.ok) {
          // If ML results don't exist yet, create mock structure
          logger.warn('ML results not found, using fallback structure');
          setMLResults(createFallbackMLResults());
          return;
        }

        const data = await response.json();
        setMLResults(data);

        logger.info('ML predictions loaded successfully', {
          totalPredictions: Object.keys(data.predictions || {}).length,
          modelType: data.model_stats?.model_type,
          accuracy: data.model_stats?.accuracy
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load ML predictions';
        setError(errorMessage);
        logger.error('Failed to load ML predictions', { error: err });

        // Use fallback on error
        setMLResults(createFallbackMLResults());
      } finally {
        setLoading(false);
      }
    };

    loadMLResults();
  }, []);

  // Get ML prediction for a specific asteroid
  const getMLPrediction = (asteroidId: string): MLPrediction => {
    if (!mlResults?.predictions[asteroidId]) {
      // Return default prediction if not found
      return {
        hazard_probability: 0.1,
        risk_score: 10,
        confidence: 0.5,
        recommendation: 'Insufficient data for prediction',
        threat_category: 'LOW',
        model_version: 'fallback'
      };
    }

    return mlResults.predictions[asteroidId];
  };

  // Get high-risk asteroids based on ML predictions
  const getHighRiskAsteroids = (threshold: number = 0.7): string[] => {
    if (!mlResults) return [];

    return Object.entries(mlResults.predictions)
      .filter(([_, prediction]) => prediction.hazard_probability >= threshold)
      .sort(([_, a], [__, b]) => b.hazard_probability - a.hazard_probability)
      .map(([id, _]) => id);
  };

  // Get ML recommendations for display
  const getMLRecommendations = (limit: number = 5): Array<{ id: string; prediction: MLPrediction }> => {
    if (!mlResults) return [];

    return Object.entries(mlResults.predictions)
      .sort(([_, a], [__, b]) => b.hazard_probability - a.hazard_probability)
      .slice(0, limit)
      .map(([id, prediction]) => ({ id, prediction }));
  };

  // Get threat distribution for stats
  const getThreatDistribution = () => {
    if (!mlResults) return { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    Object.values(mlResults.predictions).forEach(prediction => {
      distribution[prediction.threat_category]++;
    });

    return distribution;
  };

  // Check if ML predictions are available
  const isMLAvailable = (): boolean => {
    return mlResults !== null && Object.keys(mlResults.predictions).length > 0;
  };

  return {
    // Data
    mlResults,
    loading,
    error,

    // Functions
    getMLPrediction,
    getHighRiskAsteroids,
    getMLRecommendations,
    getThreatDistribution,
    isMLAvailable,

    // Computed values
    totalPredictions: mlResults ? Object.keys(mlResults.predictions).length : 0,
    averageConfidence: mlResults?.metadata?.model_confidence_avg || 0,
    modelAccuracy: mlResults?.model_stats?.accuracy || 0,
    highRiskCount: mlResults?.metadata?.high_risk_objects || 0
  };
}

// Fallback ML results structure for development
function createFallbackMLResults(): MLResults {
  return {
    predictions: {
      // Example predictions - will be replaced when real ML data is available
      '2000433': {
        hazard_probability: 0.85,
        risk_score: 85,
        confidence: 0.92,
        recommendation: 'High-risk object requiring monitoring',
        threat_category: 'HIGH',
        model_version: 'development'
      },
      '2001566': {
        hazard_probability: 0.95,
        risk_score: 95,
        confidence: 0.88,
        recommendation: 'Critical threat - immediate assessment required',
        threat_category: 'CRITICAL',
        model_version: 'development'
      }
    },
    model_stats: {
      accuracy: 0.89,
      precision: 0.87,
      recall: 0.91,
      f1_score: 0.89,
      model_type: 'Random Forest (development)',
      training_date: new Date().toISOString(),
      feature_importance: [
        { feature: 'kinetic_energy_mt', importance: 0.35 },
        { feature: 'diameter_m', importance: 0.28 },
        { feature: 'velocity_km_s', importance: 0.22 },
        { feature: 'distance_km', importance: 0.15 }
      ]
    },
    metadata: {
      total_objects: 2,
      high_risk_objects: 2,
      model_confidence_avg: 0.90,
      last_updated: new Date().toISOString()
    }
  };
}