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
}

export default function Navbar({
  isSidebarCollapsed,
  toggleSidebar,
  showNASAPanel,
  toggleNASAPanel,
  selectedNASAAsteroid,
  isSimulating,
  countdown,
}: NavbarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 border-b border-white/10">
      <nav className="bg-black/40 backdrop-blur-md">
        <div className="px-6 h-14 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-6">
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
              {(isSimulating || countdown !== null) && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-orange-500 text-xs font-light">
                    {countdown !== null ? `T-${countdown}` : "ACTIVE"}
                  </span>
                </div>
              )}
            </div>

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
                  d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a4.5 4.5 0 100 7M19 12a7.5 7.5 0 10-15 0 7.5 7.5 0 0015 0z"
                />
              </svg>
              <span className="uppercase tracking-wider">Play Game</span>
            </Link>
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
