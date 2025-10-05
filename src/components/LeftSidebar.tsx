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
  threatLevel: string;
}

interface LeftSidebarProps {
  isCollapsed: boolean;
  asteroidParams: AsteroidParams;
  setAsteroidParams: React.Dispatch<React.SetStateAction<AsteroidParams>>;
  impactData: ImpactData;
  selectedNASAAsteroid: any | null;
  isSimulating: boolean;
  onStartImpact: () => void;
  onReset: () => void;
}

export default function LeftSidebar({
  isCollapsed,
  asteroidParams,
  setAsteroidParams,
  impactData,
  selectedNASAAsteroid,
  isSimulating,
  onStartImpact,
  onReset,
}: LeftSidebarProps) {
  const formatNumber = (num: number, decimals = 2) => {
    if (!num || isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`;
    return num.toFixed(decimals);
  };

  if (isCollapsed) return null;

  return (
    <div className="absolute top-4 left-4 z-10 w-[380px] h-[520px] bg-black/70 backdrop-blur-lg rounded-lg border border-white/10 overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-light text-white/90 uppercase tracking-wider">
              Simulation Parameters
            </h3>
            {selectedNASAAsteroid && (
              <div className="px-2 py-0.5 bg-white/10 backdrop-blur rounded-sm">
                <span className="text-[10px] font-light text-white/80 uppercase tracking-wider">
                  NASA Data
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Parameters */}
        <div className="space-y-4 mb-6">
          {/* Asteroid Diameter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                Diameter
              </label>
              <span className="text-white/90 font-light text-xs">
                {formatNumber(asteroidParams.diameter, 0)}m
              </span>
            </div>
            <input
              type="range"
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
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
              <span className="text-[9px] text-white/30">50m</span>
              <span className="text-[9px] text-white/30">1km</span>
            </div>
          </div>

          {/* Velocity */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                Velocity
              </label>
              <span className="text-white/90 font-light text-xs">
                {asteroidParams.velocity} km/s
              </span>
            </div>
            <input
              type="range"
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
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
              <span className="text-[9px] text-white/30">5 km/s</span>
              <span className="text-[9px] text-white/30">50 km/s</span>
            </div>
          </div>

          {/* Entry Angle */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                Entry Angle
              </label>
              <span className="text-white/90 font-light text-xs">
                {asteroidParams.angle}°
              </span>
            </div>
            <input
              type="range"
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
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
              <span className="text-[9px] text-white/30">15°</span>
              <span className="text-[9px] text-white/30">90°</span>
            </div>
          </div>

          {/* Distance */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-light text-white/60 uppercase tracking-wider">
                Initial Distance
              </label>
              <span className="text-white/90 font-light text-xs">
                {formatNumber(asteroidParams.distance, 0)} km
              </span>
            </div>
            <input
              type="range"
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
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
              <span className="text-[9px] text-white/30">10k km</span>
              <span className="text-[9px] text-white/30">500k km</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <button
            onClick={onStartImpact}
            className={`w-full px-4 py-2.5 rounded text-xs font-light transition-all uppercase tracking-wider ${
              isSimulating
                ? "bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            {isSimulating ? "Pause Simulation" : "Start Simulation"}
          </button>

          <button
            onClick={onReset}
            className="w-full px-4 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white/80 border border-white/20 rounded text-xs font-light transition-all uppercase tracking-wider"
          >
            Reset
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 10px;
          height: 10px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          opacity: 0.8;
        }

        .slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          opacity: 0.8;
        }

        .slider:hover::-webkit-slider-thumb {
          opacity: 1;
        }

        .slider:hover::-moz-range-thumb {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
