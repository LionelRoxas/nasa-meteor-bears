"use client";

import React from "react";
import Link from "next/link";

export default function GameNavbar() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20">
      <nav className="bg-black/40 backdrop-blur-md">
        <div className="px-6 h-14 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Title */}
            <div className="flex items-center gap-2">
              <h1 className="text-white font-light tracking-wide text-sm">
                Meteor Madness Game
              </h1>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Home Link */}
            <Link
              href="/"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="uppercase tracking-wider">Simulation</span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
