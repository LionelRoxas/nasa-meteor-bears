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
}

export default function ImpactRadiusTogglePanel({
  consequencePrediction,
  visibleRadii,
  onToggleRadius,
  onShowAll,
  onHideAll,
}: ImpactRadiusTogglePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!consequencePrediction) return null;

  const isOceanImpact =
    consequencePrediction?.trajectory?.impact_location?.geographic_type === "ocean";
  const hasTsunami = consequencePrediction?.impactPhysics?.tsunamiHeight > 0;

  return (
    <div className="absolute top-20 right-4 z-50 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl overflow-hidden">
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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

            {/* Individual Radius Toggles */}
            <div className="space-y-2">
              {/* Crater */}
              <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-700 ring-2 ring-amber-700/30"></div>
                  <span className="text-[11px] text-white/90 font-medium">Crater</span>
                </div>
                <button
                  onClick={() => onToggleRadius("crater")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    visibleRadii.crater ? "bg-amber-700/80" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      visibleRadii.crater ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Fireball */}
              <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-500/30"></div>
                  <span className="text-[11px] text-white/90 font-medium">Fireball</span>
                </div>
                <button
                  onClick={() => onToggleRadius("fireball")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    visibleRadii.fireball ? "bg-orange-500/80" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      visibleRadii.fireball ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Wind Blast */}
              <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30"></div>
                  <span className="text-[11px] text-white/90 font-medium">Wind Blast</span>
                </div>
                <button
                  onClick={() => onToggleRadius("windBlast")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    visibleRadii.windBlast ? "bg-cyan-400/80" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      visibleRadii.windBlast ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Earthquake */}
              <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-600 ring-2 ring-amber-600/30"></div>
                  <span className="text-[11px] text-white/90 font-medium">Earthquake</span>
                </div>
                <button
                  onClick={() => onToggleRadius("earthquake")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    visibleRadii.earthquake ? "bg-amber-600/80" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      visibleRadii.earthquake ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Tsunami (only if ocean impact and has tsunami data) */}
              {isOceanImpact && hasTsunami && (
                <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-400/30"></div>
                    <span className="text-[11px] text-white/90 font-medium">Tsunami</span>
                  </div>
                  <button
                    onClick={() => onToggleRadius("tsunami")}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      visibleRadii.tsunami ? "bg-blue-400/80" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                        visibleRadii.tsunami ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Shockwave */}
              <div className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-300 ring-2 ring-blue-300/30"></div>
                  <span className="text-[11px] text-white/90 font-medium">Shockwave</span>
                </div>
                <button
                  onClick={() => onToggleRadius("shockwave")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    visibleRadii.shockwave ? "bg-blue-300/80" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      visibleRadii.shockwave ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
