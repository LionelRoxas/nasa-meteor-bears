"use client";

import CraterRadius from "@/components/ImpactRadius/CraterRadius";
import FireballRadius from "@/components/ImpactRadius/FireballRadius";
import ShockwaveRadius from "@/components/ImpactRadius/ShockwaveRadius";
import WindBlastRadius from "@/components/ImpactRadius/WindBlastRadius";
import EarthquakeRadius from "@/components/ImpactRadius/EarthquakeRadius";
import TsunamiRadius from "@/components/ImpactRadius/TsunamiRadius";

export default function TestRadiusPage() {
  // Sample test data for visualizations
  const testData = {
    centerLat: 40.7128,
    centerLng: -74.006,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Impact Radius Visualizations Test
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Crater */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Crater</h2>
          <CraterRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={25}
            depthMiles={0.5}
            isOcean={false}
          />
        </div>

        {/* Crater (Ocean) */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">
            Crater (Ocean)
          </h2>
          <CraterRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={30}
            depthMiles={0.75}
            isOcean={true}
          />
        </div>

        {/* Fireball */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-orange-400">Fireball</h2>
          <FireballRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={45}
            casualties={{
              deaths: 1500000,
              thirdDegreeBurns: 3200000,
              secondDegreeBurns: 4800000,
            }}
          />
        </div>

        {/* Shockwave */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">Shockwave</h2>
          <ShockwaveRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={120}
            decibels={180}
            casualties={{
              deaths: 5000000,
              lungDamage: 2000000,
              eardrumRupture: 8000000,
            }}
            damageZones={{
              buildingsCollapse: 40,
              homesCollapse: 80,
            }}
          />
        </div>

        {/* Wind Blast */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">Wind Blast</h2>
          <WindBlastRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={150}
            peakSpeedMph={800}
            casualties={{
              deaths: 8000000,
            }}
            damageZones={{
              fasterThanJupiterStorms: 20,
              completelyLeveled: 50,
              ef5TornadoEquivalent: 90,
              treesKnockedDown: 140,
            }}
          />
        </div>

        {/* Earthquake */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-amber-400">
            Earthquake
          </h2>
          <EarthquakeRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={200}
            magnitude={8.5}
            casualties={{
              deaths: 450000,
            }}
          />
        </div>

        {/* Tsunami */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-blue-300">Tsunami</h2>
          <TsunamiRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            waveHeightMeters={150}
            waveSpeedKmh={800}
            arrivalTimeMinutes={45}
            affectedCoastlineKm={2500}
          />
        </div>

        {/* Small Impact Example */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-green-400">
            Small Impact (Fireball)
          </h2>
          <FireballRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={5}
            casualties={{
              deaths: 15000,
              thirdDegreeBurns: 32000,
              secondDegreeBurns: 48000,
            }}
          />
        </div>

        {/* Large Impact Example */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-red-400">
            Large Impact (Wind Blast)
          </h2>
          <WindBlastRadius
            centerLat={testData.centerLat}
            centerLng={testData.centerLng}
            radiusMiles={500}
            peakSpeedMph={2000}
            casualties={{
              deaths: 50000000,
            }}
            damageZones={{
              fasterThanJupiterStorms: 100,
              completelyLeveled: 200,
              ef5TornadoEquivalent: 350,
              treesKnockedDown: 480,
            }}
          />
        </div>
      </div>

      <div className="mt-12 max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Test Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>
            All components use canvas animations with requestAnimationFrame for
            dynamic effects
          </li>
          <li>Crater shows different appearance for ocean vs land impacts</li>
          <li>
            Fireball displays white-hot core with pulsing animation and thermal
            radiation
          </li>
          <li>
            Shockwave shows expanding compression waves with damage zone
            gradients
          </li>
          <li>
            Wind Blast features spiraling wind patterns and multiple damage
            zones
          </li>
          <li>
            Earthquake visualizes P-waves, S-waves, and fault lines with MMI
            zones
          </li>
          <li>
            Tsunami displays expanding wave crests, foam, and directional
            propagation
          </li>
          <li>Each component scales appropriately based on input parameters</li>
        </ul>
      </div>
    </div>
  );
}
