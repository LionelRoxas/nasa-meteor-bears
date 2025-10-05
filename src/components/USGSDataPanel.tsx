"use client";

import { EnhancedPrediction } from "@/hooks/useEnhancedPredictions";

interface USGSDataPanelProps {
  prediction: EnhancedPrediction | null;
  variant?: "panel" | "inline"; // inline: content-only for tooltips; panel: full card
}

export default function USGSDataPanel({
  prediction,
  variant = "panel",
}: USGSDataPanelProps) {
  console.log("USGSDataPanel received prediction:", prediction);
  console.log("USGS data available:", prediction?.usgsData);

  if (!prediction?.usgsData) {
    console.log("No USGS data - panel not rendering");
    return (
      <div
        className={
          variant === "inline"
            ? "text-white/70 text-xs"
            : "bg-black/80 border border-white/20 rounded-lg p-6 text-white/70 text-sm"
        }
      >
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

  if (variant === "inline") {
    // Compact content-only layout for tooltip usage
    return (
      <div className="text-xs text-white/70 space-y-1">
        <div className="flex justify-between">
          <span>Seismic Zone</span>
          <span className="text-white font-medium">
            {usgsData.seismicZone.zone}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Seismic Risk</span>
          <span className="text-white font-medium">
            {formatRiskLevel(usgsData.seismicZone.riskLevel)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Annual EQ</span>
          <span className="text-white font-medium">
            {usgsData.seismicZone.averageAnnualEvents}/yr
          </span>
        </div>
        <div className="flex justify-between">
          <span>Max Historic</span>
          <span className="text-white font-medium">
            M{usgsData.seismicZone.maxHistoricalMagnitude.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tsunami Risk</span>
          <span className="text-white font-medium">
            {formatRiskLevel(usgsData.tsunamiRisk.riskLevel)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Coast</span>
          <span className="text-white font-medium">
            {usgsData.tsunamiRisk.isCoastal
              ? `${usgsData.tsunamiRisk.nearestCoastDistance.toFixed(1)} km`
              : "Inland"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Elevation</span>
          <span className="text-white font-medium">
            {usgsData.tsunamiRisk.elevationAboveSeaLevel.toFixed(0)} m
          </span>
        </div>
        <div className="flex justify-between">
          <span>Expected EQ</span>
          <span className="text-white font-medium">
            M{usgsData.expectedEarthquakeMagnitude.toFixed(1)}
          </span>
        </div>
        {usgsData.expectedTsunamiHeight > 0 && (
          <div className="flex justify-between">
            <span>Expected Tsunami</span>
            <span className="text-white font-medium">
              {usgsData.expectedTsunamiHeight.toFixed(1)} m
            </span>
          </div>
        )}
        {usgsData.secondaryHazards?.length > 0 && (
          <div className="flex justify-between">
            <span>Hazards</span>
            <span className="text-white font-medium truncate">
              {usgsData.secondaryHazards.join(", ")}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default: full panel for standalone use
  return (
    <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-6">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white mb-1">
          USGS Environmental Assessment
        </h3>
        <p className="text-xs text-white/60">
          Real-time geological data analysis
        </p>
      </div>
      {/* Slimmed layout using the inline lines with slight spacing */}
      <div className="text-sm text-white/70 space-y-2">
        <div className="flex justify-between">
          <span>Seismic Zone</span>
          <span className="text-white font-medium">
            {usgsData.seismicZone.zone}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Seismic Risk</span>
          <span className="text-white font-medium">
            {formatRiskLevel(usgsData.seismicZone.riskLevel)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Annual EQ</span>
          <span className="text-white font-medium">
            {usgsData.seismicZone.averageAnnualEvents}/yr
          </span>
        </div>
        <div className="flex justify-between">
          <span>Max Historic</span>
          <span className="text-white font-medium">
            M{usgsData.seismicZone.maxHistoricalMagnitude.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tsunami Risk</span>
          <span className="text-white font-medium">
            {formatRiskLevel(usgsData.tsunamiRisk.riskLevel)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Location</span>
          <span className="text-white font-medium">
            {usgsData.tsunamiRisk.isCoastal ? "Coastal Zone" : "Inland"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Coast Distance</span>
          <span className="text-white font-medium">
            {usgsData.tsunamiRisk.nearestCoastDistance.toFixed(1)} km
          </span>
        </div>
        <div className="flex justify-between">
          <span>Elevation</span>
          <span className="text-white font-medium">
            {usgsData.tsunamiRisk.elevationAboveSeaLevel.toFixed(0)} m
          </span>
        </div>
        <div className="flex justify-between">
          <span>Expected EQ</span>
          <span className="text-white font-medium">
            M{usgsData.expectedEarthquakeMagnitude.toFixed(1)}
          </span>
        </div>
        {usgsData.expectedTsunamiHeight > 0 && (
          <div className="flex justify-between">
            <span>Expected Tsunami</span>
            <span className="text-white font-medium">
              {usgsData.expectedTsunamiHeight.toFixed(1)} m
            </span>
          </div>
        )}
        {usgsData.secondaryHazards?.length > 0 && (
          <div className="flex justify-between">
            <span>Hazards</span>
            <span className="text-white font-medium">
              {usgsData.secondaryHazards.join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
