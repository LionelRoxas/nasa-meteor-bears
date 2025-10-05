"use client";

interface EnhancedPrediction {
  hazard_probability: number;
  risk_score: number;
  confidence: number;
  recommendation: string;
  threat_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
  impactLocation
}: ConsequenceAnalysisProps) {
  const getThreatColor = (category: string) => {
    switch (category) {
      case 'CRITICAL': return 'text-red-400 border-red-500';
      case 'HIGH': return 'text-orange-400 border-orange-500';
      case 'MEDIUM': return 'text-yellow-400 border-yellow-500';
      case 'LOW': return 'text-green-400 border-green-500';
      default: return 'text-gray-400 border-gray-500';
    }
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
    <div className="bg-gray-800 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Impact Consequences</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getThreatColor(enhancedPrediction.threat_category)} border`}>
          {enhancedPrediction.threat_category}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{enhancedPrediction.risk_score}%</div>
          <div className="text-xs text-gray-400">Risk Score</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-orange-400">{getPopulationRisk()}</div>
          <div className="text-xs text-gray-400">At Risk</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-400">{getEconomicDamage()}</div>
          <div className="text-xs text-gray-400">Damage Est.</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-400">{Math.round(enhancedPrediction.confidence * 100)}%</div>
          <div className="text-xs text-gray-400">AI Confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-400 mb-2">Technical Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Energy:</span>
              <span className="text-white">
                {enhancedPrediction.impact_physics?.megatonsEquivalent?.toFixed(1) || asteroidData.kinetic_energy_mt.toFixed(1)} MT TNT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Crater:</span>
              <span className="text-red-400 font-bold">
                {enhancedPrediction.impact_physics?.craterDiameter?.toFixed(2) || 'Calculating...'} km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Damage Radius:</span>
              <span className="text-orange-400">
                {enhancedPrediction.impact_physics?.affectedRadius?.toFixed(1) || 'Calculating...'} km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Correlations:</span>
              <span className="text-blue-400">{enhancedPrediction.correlation_context.top_similar_earthquakes} events</span>
            </div>
            {impactLocation && (
              <div className="flex justify-between">
                <span className="text-gray-400">Location:</span>
                <span className="text-white text-xs">{impactLocation.lat.toFixed(2)}°, {impactLocation.lng.toFixed(2)}°</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-yellow-400 mb-2">AI Assessment</h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            {enhancedPrediction.llm_analysis.impact_assessment.slice(0, 150)}...
          </p>
        </div>
      </div>
    </div>
  );
}