/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

interface ImpactResultsPanelProps {
  consequencePrediction: any;
}

export default function ImpactResultsPanel({
  consequencePrediction,
}: ImpactResultsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!consequencePrediction) return null;

  // Use comprehensiveImpact if available, otherwise fall back to legacy data
  const useComprehensive = !!consequencePrediction.comprehensiveImpact;

  const {
    impactPhysics: legacyImpactPhysics,
    thermalEffects: legacyThermalEffects,
    windEffects: legacyWindEffects,
    blastEffects: legacyBlastEffects,
    casualties: legacyCasualties,
    trajectory,
    comprehensiveImpact,
  } = consequencePrediction;

  // Safety check - we MUST have legacy impactPhysics (it's always returned from consequence-predictor)
  if (!legacyImpactPhysics) {
    console.error(
      "No impact physics data available - missing required legacy impactPhysics field"
    );
    console.error("Available keys:", Object.keys(consequencePrediction));
    return null;
  }

  // Always use legacy data structure (comprehensiveImpact is supplementary, not replacement)
  const impactPhysics = legacyImpactPhysics;
  const thermalEffects = legacyThermalEffects;
  const windEffects = legacyWindEffects;
  const blastEffects = legacyBlastEffects;
  const casualties = legacyCasualties;

  const formatNumber = (num: number) => {
    if (!num || isNaN(num)) return "0";
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  const formatDecimal = (num: number, decimals = 2) => {
    if (!num || isNaN(num)) return "0";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const craterDiameterMiles = impactPhysics.craterDiameter * 0.621371;
  const craterDepthMiles = impactPhysics.craterDepth * 0.621371;
  const fireballDiameterMiles = useComprehensive
    ? comprehensiveImpact.fireball?.diameter || 0
    : (thermalEffects?.fireballRadius || 0) * 2 * 0.621371;
  const impactVelocityMph = trajectory?.impact_velocity * 2236.94; // km/s to mph
  const energyMegatons = impactPhysics.megatonsEquivalent || 0; // MT TNT
  const energyGigatons = energyMegatons / 1000; // MT to GT

  const fireballCasualties = useComprehensive
    ? comprehensiveImpact.fireball?.casualties
    : {
        deaths: casualties?.fireballDeaths || 0,
        thirdDegreeBurns: thermalEffects?.severeBurns?.casualties || 0,
        secondDegreeBurns: thermalEffects?.moderateburns?.casualties || 0,
      };

  return (
    <div className="absolute top-20 left-4 z-50 w-[600px] max-h-[calc(100vh-120px)] bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-900/50 to-orange-900/50 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <h2 className="text-lg font-semibold text-white uppercase tracking-wider">
            Impact Results
          </h2>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          {isCollapsed ? (
            <svg
              className="w-5 h-5"
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
          ) : (
            <svg
              className="w-5 h-5"
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
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
          <div className="p-5 space-y-6">
            {/* Crater Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-400"></span>
                Crater Formation
              </h3>
              <div className="space-y-2 pl-3 border-l-2 border-amber-400/30">
                <p className="text-white/90 text-sm">
                  <span className="font-bold text-lg text-amber-300">
                    {formatDecimal(craterDiameterMiles, 2)}
                  </span>{" "}
                  <span className="text-white/60">mile wide crater</span>
                </p>
                <p className="text-white/80 text-xs">
                  The crater is{" "}
                  <span className="font-semibold text-amber-300">
                    {formatDecimal(craterDepthMiles, 2)}
                  </span>{" "}
                  miles deep
                </p>
              </div>
            </section>

            {/* Impact Energy Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-400"></span>
                Impact Energy
              </h3>
              <div className="space-y-2 pl-3 border-l-2 border-orange-400/30">
                <p className="text-white/80 text-xs">
                  Your asteroid impacted the ground at{" "}
                  <span className="font-semibold text-orange-300">
                    {formatNumber(impactVelocityMph)}
                  </span>{" "}
                  mph
                </p>
                <p className="text-white/80 text-xs">
                  The impact is equivalent to{" "}
                  <span className="font-semibold text-orange-300">
                    {formatNumber(energyGigatons)}
                  </span>{" "}
                  Gigatons of TNT
                </p>
                <p className="text-white/70 text-xs italic">
                  {energyMegatons > 100000
                    ? "More energy than all nuclear weapons on Earth combined"
                    : energyMegatons > 10000
                    ? "More energy was released than the last eruption of Yellowstone"
                    : energyMegatons > 1000
                    ? "Energy comparable to a large volcanic eruption"
                    : "Energy comparable to a major earthquake"}
                </p>
              </div>
            </section>

            {/* Fireball Section */}
            {thermalEffects?.fireballRadius && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-400"></span>
                  Fireball
                </h3>
                <div className="space-y-2 pl-3 border-l-2 border-yellow-400/30">
                  <p className="text-white/90 text-sm">
                    <span className="font-bold text-lg text-yellow-300">
                      {formatDecimal(fireballDiameterMiles, 2)}
                    </span>{" "}
                    <span className="text-white/60">mile wide fireball</span>
                  </p>
                  {fireballCasualties?.secondDegreeBurns && (
                    <p className="text-white/80 text-xs">
                      An estimated{" "}
                      <span className="font-semibold text-yellow-400">
                        {formatNumber(fireballCasualties.secondDegreeBurns)}
                      </span>{" "}
                      people would receive 2nd degree burns
                    </p>
                  )}
                  {thermalEffects?.clothesIgniteRadius && (
                    <p className="text-white/80 text-xs">
                      Clothes would catch on fire within{" "}
                      <span className="font-semibold text-yellow-300">
                        {formatNumber(
                          thermalEffects.clothesIgniteRadius * 0.621371
                        )}
                      </span>{" "}
                      miles of the impact
                    </p>
                  )}
                  {thermalEffects?.treesIgniteRadius && (
                    <p className="text-white/80 text-xs">
                      Trees would catch on fire within{" "}
                      <span className="font-semibold text-yellow-300">
                        {formatNumber(
                          thermalEffects.treesIgniteRadius * 0.621371
                        )}
                      </span>{" "}
                      miles of the impact
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Shockwave Section */}
            {blastEffects?.severeBlastRadius && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-400"></span>
                  Shock Wave
                </h3>
                <div className="space-y-2 pl-3 border-l-2 border-blue-400/30">
                  <p className="text-white/90 text-sm">
                    <span className="font-bold text-lg text-blue-300">
                      {formatNumber(
                        (blastEffects?.overpressureAtRim || 0) * 101325
                      )}
                    </span>{" "}
                    <span className="text-white/60">pascals overpressure</span>
                  </p>

                  {blastEffects.lungDamageRadius && (
                    <p className="text-white/80 text-xs">
                      Anyone within{" "}
                      <span className="font-semibold text-blue-300">
                        {formatNumber(blastEffects.lungDamageRadius * 0.621371)}
                      </span>{" "}
                      miles would likely receive lung damage
                    </p>
                  )}
                  {blastEffects.eardrumRuptureRadius && (
                    <p className="text-white/80 text-xs">
                      Anyone within{" "}
                      <span className="font-semibold text-blue-300">
                        {formatNumber(
                          blastEffects.eardrumRuptureRadius * 0.621371
                        )}
                      </span>{" "}
                      miles would likely have ruptured eardrums
                    </p>
                  )}
                  {blastEffects.buildingCollapseRadius && (
                    <p className="text-white/80 text-xs">
                      Buildings within{" "}
                      <span className="font-semibold text-blue-300">
                        {formatNumber(
                          blastEffects.buildingCollapseRadius * 0.621371
                        )}
                      </span>{" "}
                      miles would collapse
                    </p>
                  )}
                  {blastEffects.homesCollapseRadius && (
                    <p className="text-white/80 text-xs">
                      Homes within{" "}
                      <span className="font-semibold text-blue-300">
                        {formatNumber(
                          blastEffects.homesCollapseRadius * 0.621371
                        )}
                      </span>{" "}
                      miles would collapse
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Wind Blast Section */}
            {windEffects?.peakWindSpeed && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-cyan-400"></span>
                  Wind Blast
                </h3>
                <div className="space-y-2 pl-3 border-l-2 border-cyan-400/30">
                  <p className="text-white/90 text-sm">
                    <span className="font-bold text-lg text-cyan-300">
                      {formatNumber(windEffects?.peakWindSpeed || 0)}
                    </span>{" "}
                    <span className="text-white/60">mph peak wind speed</span>
                  </p>

                  {windEffects?.homesLeveledRadius && (
                    <p className="text-white/80 text-xs">
                      Homes within{" "}
                      <span className="font-semibold text-cyan-300">
                        {formatNumber(
                          windEffects.homesLeveledRadius * 0.621371
                        )}
                      </span>{" "}
                      miles would be completely leveled
                    </p>
                  )}
                  {windEffects?.ef5TornadoZoneRadius && (
                    <p className="text-white/80 text-xs">
                      Within{" "}
                      <span className="font-semibold text-cyan-300">
                        {formatNumber(
                          windEffects.ef5TornadoZoneRadius * 0.621371
                        )}
                      </span>{" "}
                      miles it would feel like being inside an EF5 tornado
                    </p>
                  )}
                  {windEffects?.treesKnockedRadius && (
                    <p className="text-white/80 text-xs">
                      Nearly all trees within{" "}
                      <span className="font-semibold text-cyan-300">
                        {formatNumber(
                          windEffects.treesKnockedRadius * 0.621371
                        )}
                      </span>{" "}
                      miles would be knocked down
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Earthquake Section */}
            {impactPhysics.earthquakeMagnitude && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-500"></span>
                  Earthquake
                </h3>
                <div className="space-y-2 pl-3 border-l-2 border-amber-500/30">
                  <p className="text-white/90 text-sm">
                    <span className="font-bold text-lg text-amber-400">
                      {formatDecimal(impactPhysics.earthquakeMagnitude, 1)}
                    </span>{" "}
                    <span className="text-white/60">magnitude earthquake</span>
                  </p>
                  {impactPhysics.earthquakeFeltRadius && (
                    <p className="text-white/80 text-xs">
                      The earthquake would be felt{" "}
                      <span className="font-semibold text-amber-400">
                        {formatNumber(
                          impactPhysics.earthquakeFeltRadius * 0.621371
                        )}
                      </span>{" "}
                      miles away
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Tsunami Section (Ocean impacts only) */}
            {trajectory?.impact_location?.geographic_type === "ocean" &&
              impactPhysics.tsunamiHeight && (
                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500"></span>
                    Tsunami
                  </h3>
                  <div className="space-y-2 pl-3 border-l-2 border-blue-500/30">
                    <p className="text-white/90 text-sm">
                      <span className="font-bold text-lg text-blue-400">
                        {formatNumber(impactPhysics.tsunamiHeight)}
                      </span>{" "}
                      <span className="text-white/60">
                        meter high tsunami waves
                      </span>
                    </p>

                    <p className="text-white/70 text-xs italic">
                      Coastal areas within hundreds of miles would be devastated
                    </p>
                  </div>
                </section>
              )}

            {/* Mitigation Tips */}
            {consequencePrediction.mitigationStrategies &&
              Array.isArray(consequencePrediction.mitigationStrategies) &&
              consequencePrediction.mitigationStrategies.length > 0 && (
                <section className="space-y-3 mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-400"></span>
                    Mitigation Strategies
                  </h3>
                  <div className="space-y-2 pl-3 border-l-2 border-green-400/30">
                    {consequencePrediction.mitigationStrategies.map(
                      (strategy: string, index: number) => (
                        <p
                          key={index}
                          className="text-white/80 text-xs flex items-start gap-2"
                        >
                          <span className="text-green-400 mt-0.5">•</span>
                          <span>{strategy}</span>
                        </p>
                      )
                    )}
                  </div>
                </section>
              )}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
