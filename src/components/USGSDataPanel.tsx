"use client";

import { EnhancedPrediction } from "@/hooks/useEnhancedPredictions";

interface USGSDataPanelProps {
  prediction: EnhancedPrediction | null;
}

export default function USGSDataPanel({ prediction }: USGSDataPanelProps) {
  console.log("USGSDataPanel received prediction:", prediction);
  console.log("USGS data available:", prediction?.usgsData);

  if (!prediction?.usgsData) {
    console.log("No USGS data - panel not rendering");
    return (
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-200 text-sm">
        <p>⚠️ USGS data not yet loaded. Click "Get Enhanced Prediction" to fetch real seismic data.</p>
      </div>
    );
  }

  const { usgsData } = prediction;

  // Determine overall risk color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "VERY_HIGH":
      case "EXTREME":
      case "CRITICAL":
        return "border-red-600 bg-red-900/20";
      case "HIGH":
        return "border-orange-600 bg-orange-900/20";
      case "MODERATE":
        return "border-yellow-600 bg-yellow-900/20";
      case "LOW":
        return "border-green-600 bg-green-900/20";
      default:
        return "border-gray-600 bg-gray-900/20";
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "VERY_HIGH":
      case "EXTREME":
        return "bg-red-600 text-white";
      case "HIGH":
        return "bg-orange-600 text-white";
      case "MODERATE":
        return "bg-yellow-600 text-black";
      case "LOW":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <div className="usgs-data-panel bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold text-white">USGS Environmental Assessment</h3>
        <span className="text-xs text-gray-400">Real-time geological data</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seismic Zone Card */}
        <div className={`border-l-4 ${getRiskColor(usgsData.seismicZone.riskLevel)} p-4 rounded`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">🌏</span>
              Seismic Zone
            </h4>
            <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskBadgeColor(usgsData.seismicZone.riskLevel)}`}>
              {usgsData.seismicZone.riskLevel.replace("_", " ")}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Region:</span>
              <span className="text-white ml-2 font-semibold">{usgsData.seismicZone.zone}</span>
            </div>
            <div>
              <span className="text-gray-400">Annual Events:</span>
              <span className="text-white ml-2">{usgsData.seismicZone.averageAnnualEvents} earthquakes/year</span>
            </div>
            <div>
              <span className="text-gray-400">Max Historic:</span>
              <span className="text-white ml-2">M{usgsData.seismicZone.maxHistoricalMagnitude.toFixed(1)}</span>
            </div>
            <p className="text-gray-300 text-xs mt-2 italic">
              {usgsData.seismicZone.description}
            </p>
          </div>
        </div>

        {/* Tsunami Risk Card */}
        <div className={`border-l-4 ${getRiskColor(usgsData.tsunamiRisk.riskLevel)} p-4 rounded`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">🌊</span>
              Tsunami Risk
            </h4>
            <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskBadgeColor(usgsData.tsunamiRisk.riskLevel)}`}>
              {usgsData.tsunamiRisk.riskLevel}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Location:</span>
              <span className="text-white ml-2">{usgsData.tsunamiRisk.isCoastal ? "Coastal Zone" : "Inland"}</span>
            </div>
            <div>
              <span className="text-gray-400">Elevation:</span>
              <span className="text-white ml-2">{usgsData.tsunamiRisk.elevationAboveSeaLevel.toFixed(0)}m above sea level</span>
            </div>
            {usgsData.tsunamiRisk.isCoastal && (
              <>
                <div>
                  <span className="text-gray-400">Coast Distance:</span>
                  <span className="text-white ml-2">{usgsData.tsunamiRisk.nearestCoastDistance.toFixed(1)}km</span>
                </div>
                <div>
                  <span className="text-gray-400">Historic Tsunamis:</span>
                  <span className="text-white ml-2">{usgsData.tsunamiRisk.tsunamiHistory} events</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Impact Predictions Card */}
        <div className="border-l-4 border-purple-600 bg-purple-900/20 p-4 rounded">
          <div className="mb-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">📊</span>
              Expected Impact Effects
            </h4>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Earthquake:</span>
              <span className="text-white ml-2 font-semibold">
                Magnitude {usgsData.expectedEarthquakeMagnitude.toFixed(1)}
              </span>
            </div>
            {usgsData.expectedTsunamiHeight > 0 && (
              <div>
                <span className="text-gray-400">Tsunami Height:</span>
                <span className="text-cyan-400 ml-2 font-semibold">
                  {usgsData.expectedTsunamiHeight.toFixed(1)}m waves
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-700">
              <span className="text-gray-400 text-xs">Based on USGS historical data and impact energy calculations</span>
            </div>
          </div>
        </div>

        {/* Secondary Hazards Card */}
        <div className="border-l-4 border-red-600 bg-red-900/20 p-4 rounded">
          <div className="mb-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Secondary Hazards
            </h4>
          </div>

          {usgsData.secondaryHazards.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {usgsData.secondaryHazards.map((hazard, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span className="text-gray-300">{hazard}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No major secondary hazards identified</p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded text-xs text-blue-200">
        <div className="flex items-start gap-2">
          <span className="text-blue-400">ℹ️</span>
          <div>
            <p className="font-semibold mb-1">Data Sources</p>
            <p>
              Seismic data from USGS Earthquake Hazards Program. Analysis based on 10 years of historical
              earthquake records within 500km radius. Tsunami risk assessment uses USGS coastal elevation
              data and historical tsunami-generating earthquakes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
