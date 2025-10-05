/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

interface EnhancedPrediction {
  impact_physics: any;
  hazard_probability: number;
  risk_score: number;
  confidence: number;
  recommendation: string;
  threat_category: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  model_version: string;
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

interface ConsequenceAnalysisProps {
  enhancedPrediction: EnhancedPrediction;
  asteroidData: {
    diameter_meters: number;
    kinetic_energy_mt: number;
    is_hazardous: boolean;
  };
  impactLocation?: {
    lat: number;
    lng: number;
  };
}

export default function ConsequenceAnalysis({
  enhancedPrediction,
  asteroidData,
  impactLocation,
}: ConsequenceAnalysisProps) {
  const getThreatLevel = (category: string) => {
    return category.toLowerCase();
  };

  const getPopulationRisk = () => {
    const energy = asteroidData.kinetic_energy_mt;
    if (energy > 100) return "Millions+";
    if (energy > 10) return "Hundreds of thousands";
    if (energy > 1) return "Tens of thousands";
    return "Thousands";
  };

  const getEconomicDamage = () => {
    const energy = asteroidData.kinetic_energy_mt;
    if (energy > 100) return "$1T+";
    if (energy > 10) return "$100B+";
    if (energy > 1) return "$10B+";
    return "$1B+";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-black">
          Impact Consequences
        </h3>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
          {getThreatLevel(enhancedPrediction.threat_category)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-black mb-1">
            {enhancedPrediction.risk_score}%
          </div>
          <div className="text-xs text-gray-500">Risk Score</div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-black mb-1">
            {getPopulationRisk()}
          </div>
          <div className="text-xs text-gray-500">At Risk</div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-black mb-1">
            {getEconomicDamage()}
          </div>
          <div className="text-xs text-gray-500">Damage Est.</div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-black mb-1">
            {Math.round(enhancedPrediction.confidence * 100)}%
          </div>
          <div className="text-xs text-gray-500">AI Confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-5">
          <h4 className="text-sm font-medium text-black mb-4">
            Technical Details
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Energy</span>
              <span className="font-medium text-black">
                {enhancedPrediction.impact_physics?.megatonsEquivalent?.toFixed(
                  1
                ) || asteroidData.kinetic_energy_mt.toFixed(1)}{" "}
                MT TNT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Crater</span>
              <span className="font-medium text-black">
                {enhancedPrediction.impact_physics?.craterDiameter?.toFixed(
                  2
                ) || "Calculating..."}{" "}
                km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Damage Radius</span>
              <span className="font-medium text-black">
                {enhancedPrediction.impact_physics?.affectedRadius?.toFixed(
                  1
                ) || "Calculating..."}{" "}
                km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Correlations</span>
              <span className="font-medium text-black">
                {enhancedPrediction.correlation_context.top_similar_earthquakes}{" "}
                events
              </span>
            </div>
            {impactLocation && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-black text-xs">
                  {impactLocation.lat.toFixed(2)}°,{" "}
                  {impactLocation.lng.toFixed(2)}°
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-5">
          <h4 className="text-sm font-medium text-black mb-4">AI Assessment</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {enhancedPrediction.llm_analysis.impact_assessment.slice(0, 200)}...
          </p>
        </div>
      </div>
    </div>
  );
}
