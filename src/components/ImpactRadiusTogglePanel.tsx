/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

interface VisibleRadii {
  crater: boolean;
  fireball: boolean;
  windBlast: boolean;
  earthquake: boolean;
  tsunami: boolean;
  shockwave: boolean;
}

interface ImpactRadiusTogglePanelProps {
  consequencePrediction: any;
  visibleRadii: VisibleRadii;
  onToggleRadius: (radiusType: keyof VisibleRadii) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  // Add actual impact location context
  actualImpactLocation?: {
    longitude: number;
    latitude: number;
    city: string;
    country: string;
  };
  isUsingCustomPin?: boolean;
  realTerrainData?: {
    isWater: boolean;
    isOcean: boolean;
  };
}

export default function ImpactRadiusTogglePanel({
  consequencePrediction,
  visibleRadii,
  onToggleRadius,
  onShowAll,
  onHideAll,
  actualImpactLocation,
  isUsingCustomPin = false,
  realTerrainData,
}: ImpactRadiusTogglePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!consequencePrediction) return null;

  // Determine if it's an ocean impact - prioritize actual location data when available
  const isOceanImpact = isUsingCustomPin
    ? realTerrainData?.isWater || realTerrainData?.isOcean // Use real terrain data for custom pin
    : consequencePrediction?.trajectory?.impact_location?.geographic_type === "ocean"; // Use predicted data for NASA asteroid

  const hasTsunami = consequencePrediction?.impactPhysics?.tsunamiHeight > 0;

  console.log("🌊 ImpactRadiusTogglePanel ocean impact determination:", {
    isUsingCustomPin,
    realTerrainIsWater: realTerrainData?.isWater,
    realTerrainIsOcean: realTerrainData?.isOcean,
    predictedGeographicType: consequencePrediction?.trajectory?.impact_location?.geographic_type,
    finalIsOceanImpact: isOceanImpact,
    hasTsunami,
  });

  return (
    <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl overflow-hidden min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          <h3 className="text-xs font-medium text-white/90 uppercase tracking-wider">
            Impact Zones
          </h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          {isCollapsed ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Show All / Hide All Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onShowAll}
              className="flex-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[10px] font-medium rounded transition-colors uppercase tracking-wider"
            >
              Show All
            </button>
            <button
              onClick={onHideAll}
              className="flex-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 text-white/60 text-[10px] font-medium rounded transition-colors uppercase tracking-wider"
            >
              Hide All
            </button>
          </div>

          {/* Compact Grid Layout for Radius Toggles */}
          <div className="grid grid-cols-2 gap-2">
            {/* Crater */}
            <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-700"></div>
                <span className="text-[10px] text-white/90 font-medium">
                  Crater
                </span>
              </div>
              <button
                onClick={() => onToggleRadius("crater")}
                className={`w-6 h-3 rounded-full transition-colors ${
                  visibleRadii.crater ? "bg-amber-700/80" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${
                    visibleRadii.crater ? "translate-x-3" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Fireball */}
            <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                <span className="text-[10px] text-white/90 font-medium">
                  Fireball
                </span>
              </div>
              <button
                onClick={() => onToggleRadius("fireball")}
                className={`w-6 h-3 rounded-full transition-colors ${
                  visibleRadii.fireball ? "bg-orange-500/80" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${
                    visibleRadii.fireball ? "translate-x-3" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Wind Blast */}
            <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                <span className="text-[10px] text-white/90 font-medium">
                  Wind
                </span>
              </div>
              <button
                onClick={() => onToggleRadius("windBlast")}
                className={`w-6 h-3 rounded-full transition-colors ${
                  visibleRadii.windBlast ? "bg-cyan-400/80" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${
                    visibleRadii.windBlast ? "translate-x-3" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Earthquake */}
            <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-600"></div>
                <span className="text-[10px] text-white/90 font-medium">
                  Quake
                </span>
              </div>
              <button
                onClick={() => onToggleRadius("earthquake")}
                className={`w-6 h-3 rounded-full transition-colors ${
                  visibleRadii.earthquake ? "bg-amber-600/80" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${
                    visibleRadii.earthquake
                      ? "translate-x-3"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Tsunami (only if ocean impact and has tsunami data) */}
            {isOceanImpact && hasTsunami && (
              <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  <span className="text-[10px] text-white/90 font-medium">
                    Tsunami
                  </span>
                </div>
                <button
                  onClick={() => onToggleRadius("tsunami")}
                  className={`w-6 h-3 rounded-full transition-colors ${
                    visibleRadii.tsunami ? "bg-blue-400/80" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${
                      visibleRadii.tsunami ? "translate-x-3" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Shockwave */}
            <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-300"></div>
                <span className="text-[10px] text-white/90 font-medium">
                  Shock
                </span>
              </div>
              <button
                onClick={() => onToggleRadius("shockwave")}
                className={`w-6 h-3 rounded-full transition-colors ${
                  visibleRadii.shockwave ? "bg-blue-300/80" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${
                    visibleRadii.shockwave ? "translate-x-3" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
