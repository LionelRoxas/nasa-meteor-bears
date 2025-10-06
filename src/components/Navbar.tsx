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
  showMitigationPanel?: boolean;
  toggleMitigationPanel?: () => void;
  hasMitigationStrategies?: boolean; // To know if strategies are available
}

export default function Navbar({
  isSidebarCollapsed,
  toggleSidebar,
  showNASAPanel,
  toggleNASAPanel,
  showMitigationPanel = false,
  toggleMitigationPanel,
  hasMitigationStrategies = false,
}: NavbarProps) {
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
                NEO IMPACT SIMULATOR - NASA SPACE APPS 2025
              </h1>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
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

            {/* Mitigation Strategies Toggle */}
            {hasMitigationStrategies && toggleMitigationPanel && (
              <button
                onClick={toggleMitigationPanel}
                className={`px-4 h-8 rounded text-xs font-light transition-all ${
                  showMitigationPanel
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Mitigation
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
