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
      <div className="bg-white border border-gray-300 rounded-lg p-6 text-gray-600 text-sm">
        <p>
          USGS data not yet loaded. Click &quot;Get Enhanced Prediction&quot; to
          fetch real seismic data.
        </p>
      </div>
    );
  }

  const { usgsData } = prediction;

  // Clean risk level formatting
  const formatRiskLevel = (riskLevel: string) => {
    return riskLevel.replace("_", " ").toLowerCase();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black mb-1">
          USGS Environmental Assessment
        </h3>
        <p className="text-sm text-gray-500">
          Real-time geological data analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seismic Zone Card */}
        <div className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-black">Seismic Zone</h4>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {formatRiskLevel(usgsData.seismicZone.riskLevel)}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Region</span>
              <span className="font-medium text-black">
                {usgsData.seismicZone.zone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Annual Events</span>
              <span className="text-black">
                {usgsData.seismicZone.averageAnnualEvents} earthquakes/year
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Max Historic</span>
              <span className="text-black">
                M{usgsData.seismicZone.maxHistoricalMagnitude.toFixed(1)}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-gray-600 text-xs leading-relaxed">
                {usgsData.seismicZone.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tsunami Risk Card */}
        <div className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-black">Tsunami Risk</h4>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {formatRiskLevel(usgsData.tsunamiRisk.riskLevel)}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="text-black">
                {usgsData.tsunamiRisk.isCoastal ? "Coastal Zone" : "Inland"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Elevation</span>
              <span className="text-black">
                {usgsData.tsunamiRisk.elevationAboveSeaLevel.toFixed(0)}m above
                sea level
              </span>
            </div>
            {usgsData.tsunamiRisk.isCoastal && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coast Distance</span>
                  <span className="text-black">
                    {usgsData.tsunamiRisk.nearestCoastDistance.toFixed(1)}km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Historic Tsunamis</span>
                  <span className="text-black">
                    {usgsData.tsunamiRisk.tsunamiHistory} events
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Impact Predictions Card */}
        <div className="border border-gray-200 rounded-lg p-5">
          <h4 className="font-medium text-black mb-4">
            Expected Impact Effects
          </h4>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Earthquake</span>
              <span className="font-medium text-black">
                Magnitude {usgsData.expectedEarthquakeMagnitude.toFixed(1)}
              </span>
            </div>
            {usgsData.expectedTsunamiHeight > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tsunami Height</span>
                <span className="font-medium text-black">
                  {usgsData.expectedTsunamiHeight.toFixed(1)}m waves
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-gray-500 text-xs">
                Based on USGS historical data and impact energy calculations
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Hazards Card */}
        <div className="border border-gray-200 rounded-lg p-5">
          <h4 className="font-medium text-black mb-4">Secondary Hazards</h4>

          {usgsData.secondaryHazards.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {usgsData.secondaryHazards.map((hazard, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span className="text-gray-700">{hazard}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No major secondary hazards identified
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
          <div>
            <p className="font-medium text-black text-sm mb-1">Data Sources</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              Seismic data from USGS Earthquake Hazards Program. Analysis based
              on 10 years of historical earthquake records within 500km radius.
              Tsunami risk assessment uses USGS coastal elevation data and
              historical tsunami-generating earthquakes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
