// components/LeftSidebar.tsx
"use client";

import React from "react";

interface AsteroidParams {
  diameter: number;
  velocity: number;
  angle: number;
  distance: number;
  mass: number;
  energy: number;
  craterSize: number;
  affectedRadius: number;
}

interface ImpactData {
  energy: number;
  crater: number;
  radius: number;
  timeToImpact: string;
  threatLevel: string;
}

interface LeftSidebarProps {
  isCollapsed: boolean;
  asteroidParams: AsteroidParams;
  setAsteroidParams: React.Dispatch<React.SetStateAction<AsteroidParams>>;
  isSimulating: boolean;
  simulationSpeed: number;
  setSimulationSpeed: React.Dispatch<React.SetStateAction<number>>;
  deflectionApplied: boolean;
  impactData: ImpactData;
  selectedNASAAsteroid: any | null;
  onStartImpact: () => void;
  onReset: () => void;
  onDeflect: () => void;
}

export default function LeftSidebar({
  isCollapsed,
  asteroidParams,
  setAsteroidParams,
  isSimulating,
  simulationSpeed,
  setSimulationSpeed,
  deflectionApplied,
  impactData,
  selectedNASAAsteroid,
  onStartImpact,
  onReset,
  onDeflect,
}: LeftSidebarProps) {
  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`;
    return num.toFixed(decimals);
  };

  const getThreatLevelColor = () => {
    switch (impactData.threatLevel) {
      case "GLOBAL":
        return "text-red-400 animate-pulse";
      case "REGIONAL":
        return "text-orange-400 animate-pulse";
      case "LOCAL":
        return "text-amber-400";
      default:
        return "text-emerald-400";
    }
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-0" : "w-[420px]"
      } transition-all duration-300 bg-slate-950 border-r border-slate-800 overflow-hidden flex flex-col h-full shadow-2xl`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Mission Control
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Asteroid Impact Simulation System
              </p>
            </div>
            {selectedNASAAsteroid && (
              <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-sm text-[10px] font-medium uppercase tracking-wider border border-blue-500/30">
                NASA Data
              </div>
            )}
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
        {/* Parameters Section */}
        <section className="mb-6">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
            Simulation Parameters
          </h4>

          <div className="space-y-4 p-4 bg-slate-900/50 rounded border border-slate-800">
            {/* Asteroid Diameter */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Asteroid Diameter
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  {formatNumber(asteroidParams.diameter, 0)}m
                </span>
              </div>
              <input
                type="range"
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                min="50"
                max="1000"
                value={asteroidParams.diameter}
                onChange={(e) =>
                  setAsteroidParams((prev) => ({
                    ...prev,
                    diameter: Number(e.target.value),
                  }))
                }
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">50m</span>
                <span className="text-[10px] text-slate-500">1km</span>
              </div>
            </div>

            {/* Velocity */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Impact Velocity
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  {asteroidParams.velocity} km/s
                </span>
              </div>
              <input
                type="range"
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                min="5"
                max="50"
                value={asteroidParams.velocity}
                onChange={(e) =>
                  setAsteroidParams((prev) => ({
                    ...prev,
                    velocity: Number(e.target.value),
                  }))
                }
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">5 km/s</span>
                <span className="text-[10px] text-slate-500">50 km/s</span>
              </div>
            </div>

            {/* Entry Angle */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Entry Angle
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  {asteroidParams.angle}°
                </span>
              </div>
              <input
                type="range"
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                min="15"
                max="90"
                value={asteroidParams.angle}
                onChange={(e) =>
                  setAsteroidParams((prev) => ({
                    ...prev,
                    angle: Number(e.target.value),
                  }))
                }
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">15°</span>
                <span className="text-[10px] text-slate-500">90°</span>
              </div>
            </div>

            {/* Distance */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Initial Distance
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  {formatNumber(asteroidParams.distance, 0)} km
                </span>
              </div>
              <input
                type="range"
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                min="10000"
                max="500000"
                value={asteroidParams.distance}
                onChange={(e) =>
                  setAsteroidParams((prev) => ({
                    ...prev,
                    distance: Number(e.target.value),
                  }))
                }
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">10k km</span>
                <span className="text-[10px] text-slate-500">500k km</span>
              </div>
            </div>
          </div>
        </section>

        {/* Control Panel */}
        <section className="mb-6">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
            Simulation Control
          </h4>

          <div className="space-y-3">
            {/* Main Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onStartImpact}
                className={`flex-1 px-4 py-2.5 rounded text-sm font-medium transition-all uppercase tracking-wider ${
                  isSimulating
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isSimulating ? "Pause Simulation" : "Start Impact"}
              </button>
              <button
                onClick={onReset}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-medium transition-colors uppercase tracking-wider"
              >
                Reset
              </button>
            </div>

            {/* Deflection Button */}
            <button
              onClick={onDeflect}
              disabled={deflectionApplied}
              className={`w-full px-4 py-2.5 rounded text-sm font-medium transition-all uppercase tracking-wider ${
                deflectionApplied
                  ? "bg-emerald-600/50 text-emerald-400 cursor-not-allowed border border-emerald-500/30"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {deflectionApplied ? "✓ Deflection Applied" : "Deploy Deflection"}
            </button>

            {/* Speed Control */}
            <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
              <div className="text-center mb-3">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Simulation Speed
                </div>
                <div
                  className={`text-lg font-bold mt-1 ${
                    isSimulating ? "text-cyan-400" : "text-slate-300"
                  }`}
                >
                  {simulationSpeed}x
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[0.25, 0.5, 1, 2, 4, 8].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimulationSpeed(speed)}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      simulationSpeed === speed
                        ? "bg-cyan-600 text-white shadow-lg"
                        : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                    } ${
                      isSimulating && simulationSpeed === speed
                        ? "animate-pulse"
                        : ""
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              {isSimulating && (
                <div className="text-[10px] text-center text-emerald-400 mt-2 uppercase tracking-wider">
                  Adjustable During Simulation
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Impact Analysis */}
        <section>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
            Impact Analysis
          </h4>

          <div className="space-y-3">
            {/* Metrics Grid */}
            <div className="p-4 bg-slate-900/50 rounded border border-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Kinetic Energy
                  </div>
                  <div className="text-white font-bold text-sm mt-1">
                    {formatNumber(impactData.energy)} MT
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Crater Size
                  </div>
                  <div className="text-white font-bold text-sm mt-1">
                    {formatNumber(impactData.crater)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Blast Radius
                  </div>
                  <div className="text-white font-bold text-sm mt-1">
                    {formatNumber(impactData.radius, 0)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Time to Impact
                  </div>
                  <div className="text-white font-bold text-sm mt-1">
                    {impactData.timeToImpact}
                  </div>
                </div>
              </div>
            </div>

            {/* Threat Assessment */}
            <div className="p-4 bg-slate-900/50 rounded border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Threat Assessment
                </span>
                <span
                  className={`font-bold text-sm uppercase tracking-wider ${getThreatLevelColor()}`}
                >
                  {impactData.threatLevel}
                </span>
              </div>

              {/* Threat Level Indicator */}
              <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    impactData.threatLevel === "GLOBAL"
                      ? "w-full bg-gradient-to-r from-red-500 to-red-600"
                      : impactData.threatLevel === "REGIONAL"
                      ? "w-3/4 bg-gradient-to-r from-orange-500 to-orange-600"
                      : impactData.threatLevel === "LOCAL"
                      ? "w-1/2 bg-gradient-to-r from-amber-500 to-amber-600"
                      : "w-1/4 bg-gradient-to-r from-emerald-500 to-emerald-600"
                  }`}
                />
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/50 rounded border border-slate-800">
              <div className="text-center">
                <div className="text-lg font-light text-blue-400">
                  {formatNumber(asteroidParams.mass / 1e12, 1)}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  MT Mass
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-light text-amber-400">
                  {asteroidParams.velocity}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  km/s
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-light text-emerald-400">
                  {formatNumber(asteroidParams.diameter, 0)}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  Meters
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Status Bar */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {isSimulating ? "Simulation Active" : "Ready"}
          </span>
          <div className="flex items-center gap-3">
            {isSimulating && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] text-green-400 uppercase tracking-wider">
                  Running
                </span>
              </span>
            )}
            {deflectionApplied && (
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
                Deflected
              </span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #06b6d4;
          cursor: pointer;
          border-radius: 50%;
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #06b6d4;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
}
