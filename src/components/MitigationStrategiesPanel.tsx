/* eslint-disable @typescript-eslint/no-explicit-any */
// components/MitigationStrategiesPanel.tsx
"use client";

import React from "react";

interface MitigationStrategiesPanelProps {
  mitigationStrategies?: string;
  threatLevel?: "LOW" | "MODERATE" | "HIGH" | "CATASTROPHIC";
  enhancedPrediction?: any; // Include full prediction data for analysis
}

export default function MitigationStrategiesPanel({
  mitigationStrategies,
  threatLevel = "MODERATE",
}: MitigationStrategiesPanelProps) {
  if (!mitigationStrategies) {
    return null;
  }

  // Get threat level styling
  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "CATASTROPHIC":
        return "border-red-500/30 bg-red-900/20";
      case "HIGH":
        return "border-orange-500/30 bg-orange-900/20";
      case "MODERATE":
        return "border-yellow-500/30 bg-yellow-900/20";
      case "LOW":
        return "border-green-500/30 bg-green-900/20";
      default:
        return "border-blue-500/30 bg-blue-900/20";
    }
  };

  return (
    <div className="w-[420px] h-[700px] bg-black/70 backdrop-blur-lg rounded-lg border border-white/10 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              LLM Mitigation Strategies
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Mitigation Strategies */}
          <div
            className={`p-4 rounded-lg border ${getThreatLevelColor(
              threatLevel
            )}`}
          >
            <div className="text-sm text-white/80 leading-relaxed">
              {mitigationStrategies}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
