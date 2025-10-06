/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import MapboxMap from "@/components/MapboxMap2";
import NASADataPanel from "@/components/NASADataPanel";
import LeftSidebar from "@/components/LeftSidebar";
import Navbar from "@/components/Navbar";

// Define the NASA asteroid data type
interface NASAAsteroidData {
  id: string;
  name: string;
  diameter: number;
  velocity: number;
  distance: number;
  is_hazardous: boolean;
  is_sentry_object?: boolean;
  approach_date?: string;
  approach_date_full?: string;
  magnitude: number;
  nasa_url?: string;
  miss_distance_lunar?: number;
  orbiting_body?: string;
  orbit_class?: string;
  raw_data?: Record<string, unknown>;
}

const defaultImpactLocation = {
  longitude: -74.5,
  latitude: 40.7,
  city: "New York",
  country: "USA",
};

export default function MapboxSimPage() {
  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasImpacted, setHasImpacted] = useState(false);

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNASAPanel, setShowNASAPanel] = useState(false);
  const [wasNASAPanelOpen, setWasNASAPanelOpen] = useState(false);

  // Map view controls
  const [show3DBuildings, setShow3DBuildings] = useState(true);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [enhancedBuildings, setEnhancedBuildings] = useState(true);

  // Impact location state
  const [impactLocation, setImpactLocation] = useState(defaultImpactLocation);
  const [simulationStatus, setSimulationStatus] = useState("Ready to simulate");
  const [currentSimulation, setCurrentSimulation] = useState<any>(null);

  // Asteroid parameters
  const [asteroidParams, setAsteroidParams] = useState({
    diameter: 400,
    velocity: 20,
    angle: 45,
    distance: 10000,
    mass: 0,
    energy: 0,
    craterSize: 0,
    affectedRadius: 0,
  });

  // Impact data
  const [impactData, setImpactData] = useState({
    energy: 0,
    crater: 0,
    radius: 0,
    threatLevel: "MINIMAL",
  });

  // NASA integration
  const [selectedNASAAsteroid, setSelectedNASAAsteroid] =
    useState<NASAAsteroidData | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | undefined>(
    undefined
  );

  // MapboxMap reference
  const mapboxRef = useRef<any>(null);

  // Pin placement state
  const [usePredictedLocation, setUsePredictedLocation] = useState(true);
  const [impactPin, setImpactPin] = useState<any>(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);

  // Calculate impact data whenever params change
  useEffect(() => {
    const volume = (4 / 3) * Math.PI * Math.pow(asteroidParams.diameter / 2, 3);
    const mass = volume * 3000; // Assuming density of 3000 kg/m³
    const velocityMs = asteroidParams.velocity * 1000;
    const energy = 0.5 * mass * velocityMs * velocityMs;
    const energyMt = energy / 4.184e15; // Convert to megatons
    const craterSize = (1.8 * Math.pow(energy / (2700 * 9.81), 0.25)) / 1000; // km
    const affectedRadius = craterSize * 10;

    let threatLevel = "MINIMAL";
    if (energyMt > 100) threatLevel = "GLOBAL";
    else if (energyMt > 10) threatLevel = "REGIONAL";
    else if (energyMt > 1) threatLevel = "LOCAL";

    setImpactData({
      energy: energyMt,
      crater: craterSize,
      radius: affectedRadius,
      threatLevel,
    });

    setAsteroidParams((prev) => ({
      ...prev,
      mass,
      energy: energyMt,
      craterSize,
      affectedRadius,
    }));
  }, [asteroidParams.diameter, asteroidParams.velocity]);

  // Load NASA asteroid data
  const loadNASAAsteroid = (asteroid: NASAAsteroidData) => {
    console.log("Loading NASA asteroid data:", asteroid);

    let calculatedDiameter = asteroid.diameter;
    const raw = asteroid.raw_data as Record<string, unknown> | undefined;
    const est = raw?.estimated_diameter as
      | {
          meters?: {
            estimated_diameter_min?: number;
            estimated_diameter_max?: number;
          };
        }
      | undefined;
    if (est?.meters) {
      const minDiameter = est.meters.estimated_diameter_min;
      const maxDiameter = est.meters.estimated_diameter_max;
      if (minDiameter && maxDiameter) {
        calculatedDiameter = (minDiameter + maxDiameter) / 2;
      }
    }

    const newDiameter = Number(calculatedDiameter) || 200;
    const newVelocity = Number(asteroid.velocity) || 20;
    const newDistance = Math.min(Number(asteroid.distance) || 100000, 500000);

    setAsteroidParams((prev) => ({
      ...prev,
      diameter: newDiameter,
      velocity: newVelocity,
      distance: newDistance,
      angle: 45,
    }));

    setSelectedNASAAsteroid(asteroid);

    // Update MapboxMap with new asteroid
    if (mapboxRef.current?.updateAsteroidData) {
      mapboxRef.current.updateAsteroidData({
        diameter: newDiameter,
        velocity: newVelocity,
        name: asteroid.name,
      });
    }
  };

  const handleStartImpact = () => {
    if (!isSimulating) {
      setHasImpacted(false);
      setWasNASAPanelOpen(showNASAPanel);
      setIsSidebarCollapsed(true);
      setShowNASAPanel(false);
      setIsSimulating(true);
      // Trigger impact animation immediately
      if (mapboxRef.current?.runImpactAnimation) {
        mapboxRef.current.runImpactAnimation();
      }
    } else {
      // Cancel simulation
      setIsSimulating(false);
      setIsSidebarCollapsed(false);
      setShowNASAPanel(wasNASAPanelOpen);
      if (mapboxRef.current?.resetSimulation) {
        mapboxRef.current.resetSimulation();
      }
    }
  };

  const handleSimulationUpdate = (simulation: any) => {
    setCurrentSimulation(simulation);
  };

  const handleReset = () => {
    console.log("🔄 handleReset called");
    setIsSimulating(false);
    setHasImpacted(false);
    setIsSidebarCollapsed(false);
    setShowNASAPanel(wasNASAPanelOpen);
    setCurrentSimulation(null); // Clear simulation data
    // Reset pin placement state
    setImpactPin(null);
    setIsPlacingPin(false);
    setUsePredictedLocation(true);
    if (mapboxRef.current?.resetSimulation) {
      mapboxRef.current.resetSimulation();
    }
  };

  // Pin placement handlers
  const handleToggleLocationMode = () => {
    setUsePredictedLocation((prev) => {
      const next = !prev;
      if (next) {
        // Switching back to predicted location
        setImpactPin(null);
        setImpactLocation(defaultImpactLocation);
        setIsPlacingPin(false);
      } else {
        // Switching to custom pin mode
        setImpactPin(null);
        setIsPlacingPin(false);
      }
      return next;
    });
  };

  const handleStartPinPlacement = () => {
    setUsePredictedLocation(false);
    setImpactPin(null);
    setIsPlacingPin(true);
    // This will be passed to MapboxMap2 to enable pin placement mode
  };

  const handleRemovePin = () => {
    setImpactPin(null);
    setIsPlacingPin(false);
  };

  const handlePinPlaced = (pin: any) => {
    setImpactPin(pin);
    setIsPlacingPin(false);
    setUsePredictedLocation(false);
    // Update the main impact location
    setImpactLocation(pin);
  };

  const handleMapControlsChange = (controls: {
    show3DBuildings: boolean;
    streetViewMode: boolean;
    enhancedBuildings: boolean;
  }) => {
    setShow3DBuildings(controls.show3DBuildings);
    setStreetViewMode(controls.streetViewMode);
    setEnhancedBuildings(controls.enhancedBuildings);
  };

  const handleRunSimulation = () => {
    // This will be called when the impact simulation is triggered from the sidebar
    if (mapboxRef.current?.runImpactAnimation) {
      mapboxRef.current.runImpactAnimation();
    }
  };

  const handleLocationClick = (location: any) => {
    setImpactLocation(location);
  };

  const handleImpact = () => {
    console.log("💥 Impact detected!");
    setHasImpacted(true);
    setIsSimulating(false);

    // Auto-reset after 30 seconds
    setTimeout(() => {
      handleReset();
    }, 30000);
  };

  // Reset when simulation stops
  useEffect(() => {
    if (!isSimulating) {
      setCurrentDistance(undefined);
    }
  }, [isSimulating]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* MapboxMap Component - Full Screen Background */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <MapboxMap
          ref={mapboxRef}
          className="w-full h-full"
          asteroidParams={asteroidParams}
          isSimulating={isSimulating}
          impactLocation={impactLocation}
          onImpact={handleImpact}
          onDistanceUpdate={setCurrentDistance}
          onLocationClick={handleLocationClick}
          onStatusChange={setSimulationStatus}
          onSimulationUpdate={handleSimulationUpdate}
          show3DBuildings={show3DBuildings}
          streetViewMode={streetViewMode}
          enhancedBuildings={enhancedBuildings}
          // Pin placement props
          isPlacingPin={isPlacingPin}
          onPinPlaced={handlePinPlaced}
          usePredictedLocation={usePredictedLocation}
          impactPinLocation={impactPin}
        />
      </div>

      {/* UI Layer Container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          isolation: "isolate",
        }}
      >
        {/* Impact Flash Effect */}
        {hasImpacted && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ zIndex: 25 }}
          >
            <div className="w-full h-full bg-gradient-radial from-yellow-500/50 via-orange-500/30 to-transparent"></div>
          </div>
        )}

        {/* Navbar */}
        <div className="pointer-events-auto" style={{ zIndex: 50 }}>
          <Navbar
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            showNASAPanel={showNASAPanel}
            toggleNASAPanel={() => setShowNASAPanel(!showNASAPanel)}
            selectedNASAAsteroid={selectedNASAAsteroid}
            isSimulating={isSimulating}
            currentDistance={currentDistance}
            hasImpacted={hasImpacted}
          />
        </div>

        {/* Main Content Area */}
        <div
          className="absolute top-16 left-0 right-0 bottom-0 flex h-[calc(100vh-4rem)]"
          style={{ zIndex: 40 }}
        >
          {/* Left Sidebar */}
          <div className="pointer-events-auto">
            <LeftSidebar
              isCollapsed={isSidebarCollapsed}
              asteroidParams={asteroidParams}
              setAsteroidParams={setAsteroidParams}
              impactData={impactData}
              selectedNASAAsteroid={selectedNASAAsteroid}
              isSimulating={isSimulating}
              onStartImpact={handleStartImpact}
              onReset={handleReset}
              onMapControlsChange={handleMapControlsChange}
              onRunSimulation={handleRunSimulation}
              onLocationChange={handleLocationClick}
              simulationStatus={simulationStatus}
              currentSimulation={currentSimulation}
              impactLocation={impactLocation}
              usePredictedLocation={usePredictedLocation}
              impactPin={impactPin}
              isPlacingPin={isPlacingPin}
              onStartPinPlacement={handleStartPinPlacement}
              onRemovePin={handleRemovePin}
              onToggleLocationMode={handleToggleLocationMode}
            />
          </div>

          {/* Main View Area */}
          <div className="flex-1 relative">
            {/* NASA Data Panel Overlay */}
            {showNASAPanel && (
              <div
                className="absolute top-4 right-4 bottom-4 flex flex-col pointer-events-auto"
                style={{ zIndex: 45 }}
              >
                <div className="flex-1 overflow-y-auto">
                  <NASADataPanel onSelectAsteroid={loadNASAAsteroid} />
                </div>
              </div>
            )}           
          </div>
        </div>
      </div>
    </div>
  );
}
