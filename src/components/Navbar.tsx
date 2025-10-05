/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/Navbar.tsx
"use client";

import React from "react";
import Link from "next/link";

interface NavbarProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  showNASAPanel: boolean;
  toggleNASAPanel: () => void;
  selectedNASAAsteroid: any | null;
  isSimulating: boolean;
  countdown: number | null;
  currentDistance?: number;
  hasImpacted?: boolean; // Add this prop to track impact state
}

export default function Navbar({
  isSidebarCollapsed,
  toggleSidebar,
  showNASAPanel,
  toggleNASAPanel,
  selectedNASAAsteroid,
  isSimulating,
  countdown,
  currentDistance,
  hasImpacted,
}: NavbarProps) {
  // Format distance for display
  const formatDistance = (distance: number) => {
    // Treat 0 or very small numbers as impact
    if (distance <= 0 || distance < 1) return "0 km";

    // If distance is very large, show in thousands of km
    if (distance >= 10000) {
      return `${(distance / 1000).toFixed(0)}k km`;
    }
    // If distance is moderate, show with one decimal
    else if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)}k km`;
    }
    // If getting close, show exact km
    else if (distance >= 100) {
      return `${distance.toFixed(0)} km`;
    }
    // Very close - show with decimal
    else {
      return `${distance.toFixed(1)} km`;
    }
  };

  // Determine what distance to show
  const getDistanceDisplay = () => {
    // If impacted, always show 0 km
    if (hasImpacted) {
      return "Distance: 0 km";
    }

    // If we have a current distance from the simulation, use it
    if (currentDistance !== undefined) {
      // If impact is imminent (distance < 10000), show 0 km
      if (currentDistance < 10000) {
        return "Distance: 0 km";
      }
      return `Distance: ${formatDistance(currentDistance)}`;
    }

    // Otherwise, if we have a selected asteroid, show its initial distance
    if (selectedNASAAsteroid?.approachDistance) {
      return `Distance: ${formatDistance(
        selectedNASAAsteroid.approachDistance
      )}`;
    }

    return "INITIALIZING...";
  };

  // Determine status indicators
  const getStatusIndicators = () => {
    // If impacted, show impact status
    if (hasImpacted) {
      return (
        <span className="text-red-500 text-xs font-bold animate-pulse">
          • IMPACT OCCURRED
        </span>
      );
    }

    // Otherwise show approach warnings based on distance
    if (currentDistance !== undefined && !hasImpacted) {
      if (currentDistance < 10000) {
        return (
          <span className="text-red-500 text-xs font-bold animate-pulse">
            • IMPACT IMMINENT
          </span>
        );
      } else if (currentDistance < 50000) {
        return (
          <span className="text-orange-400 text-xs">• APPROACHING FAST</span>
        );
      }
    }

    return null;
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20">
      <nav className="bg-black/40 backdrop-blur-md">
        <div className="px-6 h-14 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-5 h-5 text-white/80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarCollapsed ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                )}
              </svg>
            </button>

            {/* Title */}
            <div className="flex items-center gap-2">
              <h1 className="text-white font-light tracking-wide text-sm">
                NASA IMPACT SIMULATOR
              </h1>
              {(isSimulating || hasImpacted) && (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasImpacted ? "bg-red-500" : "bg-orange-500 animate-pulse"
                    }`}
                  />
                  <span
                    className={`text-xs font-light ${
                      hasImpacted ? "text-red-500" : "text-orange-500"
                    }`}
                  >
                    {getDistanceDisplay()}
                  </span>
                  {getStatusIndicators()}
                </div>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Asteroid Info */}
            {selectedNASAAsteroid && (
              <div className="hidden md:flex items-center gap-2 px-3 h-8 bg-white/5 rounded">
                <span className="text-white/50 text-xs">LOADED:</span>
                <span className="text-white/90 text-xs font-light">
                  {selectedNASAAsteroid.name}
                </span>
              </div>
            )}

            {/* Game Link */}
            <Link
              href="/game"
              className="flex items-center gap-1.5 px-4 h-8 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-light transition-all"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="uppercase tracking-wider">Play Game</span>
            </Link>

            {/* NASA Data Toggle */}
            <button
              onClick={toggleNASAPanel}
              className={`px-4 h-8 rounded text-xs font-light transition-all ${
                showNASAPanel
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              NASA DATA
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
