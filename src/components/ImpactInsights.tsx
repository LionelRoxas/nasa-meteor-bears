"use client";

import { useMemo } from "react";

interface ImpactInsightsProps {
  consequenceData?: {
    impact_physics?: {
      energy: number;
      craterDiameter: number;
      earthquakeMagnitude: number;
      affectedRadius: number;
      tsunamiHeight?: number;
      megatonsEquivalent: number;
    };
    impactPhysics?: {
      energy: number;
      craterDiameter: number;
      earthquakeMagnitude: number;
      affectedRadius: number;
      tsunamiHeight?: number;
      megatonsEquivalent: number;
    };
    populationAtRisk?: number;
    economicDamage?: number;
    threatLevel?: "LOW" | "MODERATE" | "HIGH" | "CATASTROPHIC";
    threat_category?: string;
    trajectory?: {
      impact_location: {
        geographic_type: string;
        nearest_city: string;
      };
    };
    impact_location?: {
      type: string;
    };
    quickAnalysis?: string;
  };
  realTerrainData?: {
    isWater: boolean;
    isOcean: boolean;
    nearestCity?: {
      name: string;
      distance: number;
    };
    countryName?: string;
  };
}

export default function ImpactInsights({
  consequenceData,
  realTerrainData,
}: ImpactInsightsProps) {
  // Generate key insights based on the data
  const insights = useMemo(() => {
    if (!consequenceData) {
      console.log("ImpactInsights: No consequence data provided");
      return [];
    }

    console.log("ImpactInsights: Received data:", consequenceData);
    console.log(
      "ImpactInsights: Available keys:",
      Object.keys(consequenceData)
    );

    // Handle both naming conventions (snake_case from API, camelCase from props)
    const impactPhysics =
      consequenceData.impact_physics || consequenceData.impactPhysics;
    const trajectory = consequenceData.trajectory;
    const populationAtRisk = consequenceData.populationAtRisk;
    const threatLevel = (consequenceData.threatLevel ||
      consequenceData.threat_category) as string;

    console.log(
      "ImpactInsights: impact_physics =",
      consequenceData.impact_physics
    );
    console.log(
      "ImpactInsights: impactPhysics =",
      consequenceData.impactPhysics
    );
    console.log("ImpactInsights: Final impactPhysics =", impactPhysics);

    if (!impactPhysics) {
      console.log(
        "ImpactInsights: No impactPhysics data found - returning empty"
      );
      console.log(
        "ImpactInsights: Full data structure:",
        JSON.stringify(consequenceData, null, 2)
      );
      return [];
    }

    console.log("ImpactInsights: Using physics data:", impactPhysics);

    const isWaterImpact =
      realTerrainData?.isWater ||
      trajectory?.impact_location?.geographic_type === "ocean" ||
      consequenceData.impact_location?.type === "ocean";

    const insightsList: Array<{
      icon: string;
      title: string;
      value: string;
      description: string;
      severity: "info" | "warning" | "danger" | "critical";
    }> = [];

    // 1. Seismic Impact (always show)
    const magnitudeComparison = getMagnitudeComparison(
      impactPhysics.earthquakeMagnitude
    );
    insightsList.push({
      icon: "📊",
      title: "Seismic Impact",
      value: `Magnitude ${impactPhysics.earthquakeMagnitude.toFixed(1)}`,
      description: `Equivalent to ${magnitudeComparison.event}. ${magnitudeComparison.damage}`,
      severity:
        impactPhysics.earthquakeMagnitude > 7
          ? "critical"
          : impactPhysics.earthquakeMagnitude > 5
          ? "danger"
          : "warning",
    });

    // 2. Tsunami Risk (only for water impacts)
    if (isWaterImpact && impactPhysics.tsunamiHeight) {
      const tsunamiRisk = getTsunamiRisk(impactPhysics.tsunamiHeight);
      insightsList.push({
        icon: "🌊",
        title: "Tsunami Warning",
        value: `${impactPhysics.tsunamiHeight.toFixed(0)}m waves`,
        description: tsunamiRisk.description,
        severity: "critical",
      });
    } else if (isWaterImpact) {
      insightsList.push({
        icon: "🌊",
        title: "Ocean Impact",
        value: "Tsunami possible",
        description:
          "Water impact may generate tsunamis affecting coastal regions",
        severity: "danger",
      });
    }

    // 3. Blast Radius / Affected Area
    const blastComparison = getBlastComparison(
      impactPhysics.megatonsEquivalent
    );
    insightsList.push({
      icon: "💥",
      title: "Blast Power",
      value: `${impactPhysics.megatonsEquivalent.toFixed(1)} MT`,
      description: `${blastComparison}. Affects ${impactPhysics.affectedRadius.toFixed(
        0
      )}km radius`,
      severity:
        impactPhysics.megatonsEquivalent > 100
          ? "critical"
          : impactPhysics.megatonsEquivalent > 10
          ? "danger"
          : "warning",
    });

    // 4. Population Risk (if significant)
    if (populationAtRisk && populationAtRisk > 0) {
      const popRisk = getPopulationRisk(
        populationAtRisk,
        realTerrainData?.nearestCity?.name
      );
      insightsList.push({
        icon: "👥",
        title: "Population at Risk",
        value: formatNumber(populationAtRisk),
        description: popRisk,
        severity:
          populationAtRisk > 1000000
            ? "critical"
            : populationAtRisk > 100000
            ? "danger"
            : "warning",
      });
    }

    // 5. Crater Size (visual impact reference)
    const craterComparison = getCraterComparison(impactPhysics.craterDiameter);
    insightsList.push({
      icon: "🕳️",
      title: "Impact Crater",
      value: `${impactPhysics.craterDiameter.toFixed(1)}km`,
      description: craterComparison,
      severity: impactPhysics.craterDiameter > 10 ? "danger" : "warning",
    });

    // Limit to top 4-5 most relevant insights
    return insightsList.slice(0, 5);
  }, [consequenceData, realTerrainData]);

  if (!consequenceData) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <div className="impact-insights bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg mb-2">⚠️ No impact data available</p>
          <p className="text-sm">
            Click &quot;Get Enhanced Prediction&quot; to analyze impact consequences
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-black">Impact Analysis</h3>
        <ThreatBadge
          level={
            consequenceData.threatLevel ||
            consequenceData.threat_category ||
            "MODERATE"
          }
        />
      </div>

      {/* Quick summary */}
      {consequenceData.quickAnalysis && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          {consequenceData.quickAnalysis}
        </div>
      )}

      {/* Key insights grid */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <InsightCard key={index} {...insight} />
        ))}
      </div>
    </div>
  );
}

// Insight card component
function InsightCard({
  icon,
  title,
  value,
  description,
  severity,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  severity: "info" | "warning" | "danger" | "critical";
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-black text-sm">{title}</h4>
            <span className="font-semibold text-black text-sm">{value}</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Threat level badge
function ThreatBadge({ level }: { level: string }) {
  return (
    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
      {level.toLowerCase()}
    </span>
  );
}

// Helper functions for comparisons
function getMagnitudeComparison(magnitude: number): {
  event: string;
  damage: string;
} {
  if (magnitude < 4) {
    return {
      event: "a minor earthquake",
      damage: "Minimal damage expected",
    };
  } else if (magnitude < 5) {
    return {
      event: "a moderate earthquake",
      damage: "Local damage to poorly built structures",
    };
  } else if (magnitude < 6) {
    return {
      event: "a strong earthquake (1989 Loma Prieta)",
      damage: "Significant damage to buildings in affected area",
    };
  } else if (magnitude < 7) {
    return {
      event: "a major earthquake (2010 Haiti)",
      damage: "Severe damage, buildings collapse",
    };
  } else if (magnitude < 8) {
    return {
      event: "a great earthquake (1906 San Francisco)",
      damage: "Massive devastation across wide area",
    };
  } else if (magnitude < 9) {
    return {
      event: "a massive earthquake (2008 Sichuan)",
      damage: "Total destruction, landscape permanently altered",
    };
  } else {
    return {
      event: "the strongest earthquakes ever (2011 Tohoku)",
      damage: "Catastrophic global consequences",
    };
  }
}

function getTsunamiRisk(height: number): { description: string } {
  if (height < 5) {
    return {
      description: "Minor coastal flooding. Evacuate beaches immediately",
    };
  } else if (height < 10) {
    return {
      description: "Moderate tsunami. Coastal communities at severe risk",
    };
  } else if (height < 30) {
    return {
      description:
        "Major tsunami. Multiple countries threatened. Similar to 2004 Indian Ocean tsunami",
    };
  } else {
    return {
      description: "Mega-tsunami. Unprecedented global coastal devastation",
    };
  }
}

function getBlastComparison(megatons: number): string {
  if (megatons < 0.001) {
    return "Similar to a small conventional bomb";
  } else if (megatons < 0.015) {
    return "Similar to Hiroshima bomb (15 kilotons)";
  } else if (megatons < 1) {
    return "Multiple times larger than largest WWII bombs";
  } else if (megatons < 10) {
    return "Similar to early nuclear weapons";
  } else if (megatons < 50) {
    return "Similar to largest nuclear weapons ever tested";
  } else if (megatons < 100) {
    return "Far exceeds any human-made weapon";
  } else {
    return "Extinction-level energy release";
  }
}

function getPopulationRisk(population: number, nearestCity?: string): string {
  const cityInfo = nearestCity ? ` near ${nearestCity}` : "";

  if (population < 1000) {
    return `Small community${cityInfo} in danger zone`;
  } else if (population < 10000) {
    return `Town-sized population${cityInfo} at risk`;
  } else if (population < 100000) {
    return `City-sized population${cityInfo} requires immediate evacuation`;
  } else if (population < 1000000) {
    return `Major metropolitan area${cityInfo} threatened`;
  } else {
    return `Millions of people${cityInfo} in impact zone - mass evacuation critical`;
  }
}

function getCraterComparison(diameter: number): string {
  if (diameter < 0.1) {
    return "Size of a small building";
  } else if (diameter < 0.5) {
    return "Size of several city blocks";
  } else if (diameter < 1) {
    return "Similar to Meteor Crater, Arizona (1.2km)";
  } else if (diameter < 5) {
    return "Larger than most cities";
  } else if (diameter < 20) {
    return "Size of a small country";
  } else if (diameter < 100) {
    return "Similar to Chicxulub crater that killed the dinosaurs (150km)";
  } else {
    return "Unprecedented in human history";
  }
}

function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}
