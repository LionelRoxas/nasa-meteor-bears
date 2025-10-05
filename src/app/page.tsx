"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import NASADataPanel from "@/components/NASADataPanel";
import LeftSidebar from "@/components/LeftSidebar";
import { useNASAData, type NASAAsteroidData } from "@/hooks/useNASAData";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthRef = useRef<THREE.Group | null>(null);
  const asteroidRef = useRef<THREE.Mesh | null>(null);
  const moonRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const asteroidTrailRef = useRef<THREE.Mesh[]>([]);
  const impactParticlesRef = useRef<THREE.Mesh[]>([]);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [deflectionApplied, setDeflectionApplied] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [asteroidParams, setAsteroidParams] = useState({
    diameter: 200,
    velocity: 20,
    angle: 45,
    distance: 100000,
    mass: 0,
    energy: 0,
    craterSize: 0,
    affectedRadius: 0,
  });
  const [impactData, setImpactData] = useState({
    energy: 0,
    crater: 0,
    radius: 0,
    timeToImpact: "--",
    threatLevel: "MINIMAL",
  });

  // NASA data integration
  const {} = useNASAData();
  const [selectedNASAAsteroid, setSelectedNASAAsteroid] =
    useState<NASAAsteroidData | null>(null);
  const [showNASAPanel, setShowNASAPanel] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000000
    );
    camera.position.set(0, 0, 50000);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create Earth with more realistic appearance
    const earthGroup = new THREE.Group();
    const earthGeometry = new THREE.SphereGeometry(6371, 128, 128);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a90e2,
      shininess: 100,
      specular: 0x222222,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    earthGroup.add(earth);

    // Add enhanced atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(6471, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    // Add cloud layer
    const cloudGeometry = new THREE.SphereGeometry(6375, 64, 64);
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    clouds.name = "clouds"; // Add name for reference
    earthGroup.add(clouds);

    // Add more realistic continents with varied colors and shapes
    const continentColors = [0x2d5016, 0x1e3a0f, 0x3d6b1a, 0x4a7c1f, 0x5a8c2a];
    for (let i = 0; i < 15; i++) {
      const continentGeometry = new THREE.SphereGeometry(6372, 32, 32);
      const continentMaterial = new THREE.MeshPhongMaterial({
        color: continentColors[i % continentColors.length],
        transparent: true,
        opacity: 0.6,
        shininess: 20,
      });
      const continent = new THREE.Mesh(continentGeometry, continentMaterial);
      continent.scale.set(
        0.2 + Math.random() * 0.3,
        0.1 + Math.random() * 0.2,
        0.2 + Math.random() * 0.3
      );
      continent.position.set(
        Math.random() * 6000 - 3000,
        Math.random() * 6000 - 3000,
        Math.random() * 6000 - 3000
      );
      continent.lookAt(0, 0, 0);
      earthGroup.add(continent);
    }
    scene.add(earthGroup);
    earthRef.current = earthGroup;

    // Create Moon
    const moonGeometry = new THREE.SphereGeometry(1737, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      shininess: 10,
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(38440, 0, 0);
    moon.castShadow = true;
    scene.add(moon);
    moonRef.current = moon;

    // Create initial asteroid (will be updated by separate useEffect)
    const createAsteroid = (diameter: number, distance: number) => {
      const asteroidGeometry = new THREE.IcosahedronGeometry(diameter / 2, 1);
      const asteroidMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513,
        shininess: 5,
      });

      // Make it irregular
      const vertices = asteroidGeometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < vertices.length; i += 3) {
        vertices[i] *= 0.8 + Math.random() * 0.4;
        vertices[i + 1] *= 0.8 + Math.random() * 0.4;
        vertices[i + 2] *= 0.8 + Math.random() * 0.4;
      }
      asteroidGeometry.attributes.position.needsUpdate = true;
      asteroidGeometry.computeVertexNormals();

      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
      const angle = Math.random() * Math.PI * 2;
      asteroid.position.set(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance * 0.5,
        Math.sin(angle) * distance
      );
      asteroid.lookAt(0, 0, 0);
      return asteroid;
    };

    const asteroid = createAsteroid(200, 100000); // Use initial values
    scene.add(asteroid);
    asteroidRef.current = asteroid;

    // Create Stars
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 10000; i++) {
      starPositions.push(
        (Math.random() - 0.5) * 2000000,
        (Math.random() - 0.5) * 2000000,
        (Math.random() - 0.5) * 2000000
      );
    }
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3)
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 100,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Setup Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(100000, 50000, 50000);
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 1000;
    sunLight.shadow.camera.far = 200000;
    sunLight.shadow.camera.left = -50000;
    sunLight.shadow.camera.right = 50000;
    sunLight.shadow.camera.top = 50000;
    sunLight.shadow.camera.bottom = -50000;
    scene.add(sunLight);

    // Mouse controls
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      mouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseUp = () => {
      mouseDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDown || !camera) return;

      const deltaX = e.clientX - mouseX;
      const deltaY = e.clientY - mouseY;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);

      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!camera) return;
      const distance = camera.position.length();
      const newDistance = distance + e.deltaY * distance * 0.0005;
      camera.position
        .normalize()
        .multiplyScalar(Math.max(8000, Math.min(200000, newDistance)));
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("wheel", handleWheel);

    // Window resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop will be set up in a separate useEffect

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Only run once on mount

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate Earth (slow and realistic)
      if (earthRef.current) {
        const earthRotationSpeed = 0.00000001; // Base rotation speed
        earthRef.current.rotation.y += earthRotationSpeed;

        // Rotate clouds slightly faster for atmospheric effect (synchronized)
        const clouds = earthRef.current.getObjectByName("clouds");
        if (clouds) {
          clouds.rotation.y += earthRotationSpeed * 1.1; // 10% faster than Earth
        }
      }

      // Rotate Moon (synchronized with consistent timing)
      if (moonRef.current) {
        const moonOrbitSpeed = 0.0001;
        const time = Date.now() * moonOrbitSpeed;
        moonRef.current.position.x = Math.cos(time) * 38440;
        moonRef.current.position.z = Math.sin(time) * 38440;
      }

      // Update simulation
      if (isSimulating && asteroidRef.current) {
        const direction = new THREE.Vector3(0, 0, 0)
          .sub(asteroidRef.current.position)
          .normalize();
        // Make speed difference more dramatic and noticeable
        const baseSpeed = asteroidParams.velocity * 15;
        const speed = baseSpeed * simulationSpeed * simulationSpeed; // Square the speed for more dramatic effect
        asteroidRef.current.position.add(direction.multiplyScalar(speed));

        // Create trail
        if (asteroidTrailRef.current.length > 50) {
          const oldTrail = asteroidTrailRef.current.shift();
          if (oldTrail) scene.remove(oldTrail);
        }

        const trailGeometry = new THREE.SphereGeometry(
          asteroidParams.diameter / 4,
          8,
          8
        );
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: 0xff4500,
          transparent: true,
          opacity: 0.6,
        });
        const trailPoint = new THREE.Mesh(trailGeometry, trailMaterial);
        trailPoint.position.copy(asteroidRef.current.position);
        scene.add(trailPoint);
        asteroidTrailRef.current.push(trailPoint);

        // Check for impact
        const distanceToEarth = asteroidRef.current.position.length();
        if (distanceToEarth < 6500) {
          setIsSimulating(false);
        }

        // Update time to impact
        const timeToImpact =
          (distanceToEarth - 6371) / (asteroidParams.velocity * 3.6);
        setImpactData((prev) => ({
          ...prev,
          timeToImpact:
            timeToImpact > 0 ? `${timeToImpact.toFixed(1)} hours` : "IMPACT!",
        }));
      }

      // Animate particles
      impactParticlesRef.current.forEach((particle, index) => {
        const velocity = (particle.userData as { velocity: THREE.Vector3 })
          .velocity;
        particle.position.add(velocity);
        velocity.multiplyScalar(0.98);
        (particle.material as THREE.MeshBasicMaterial).opacity -= 0.01;

        if ((particle.material as THREE.MeshBasicMaterial).opacity <= 0) {
          scene.remove(particle);
          impactParticlesRef.current.splice(index, 1);
        }
      });

      // Fade trail
      asteroidTrailRef.current.forEach((trail, index) => {
        (trail.material as THREE.MeshBasicMaterial).opacity -= 0.02;
        if ((trail.material as THREE.MeshBasicMaterial).opacity <= 0) {
          scene.remove(trail);
          asteroidTrailRef.current.splice(index, 1);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [
    isSimulating,
    simulationSpeed,
    asteroidParams.velocity,
    asteroidParams.diameter,
  ]);

  // Calculate impact data whenever params change
  useEffect(() => {
    const volume = (4 / 3) * Math.PI * Math.pow(asteroidParams.diameter / 2, 3);
    const mass = volume * 3000;
    const velocityMs = asteroidParams.velocity * 1000;
    const energy = 0.5 * mass * velocityMs * velocityMs;
    const energyMt = energy / 4.184e15;
    const craterSize = (1.8 * Math.pow(energy / (2700 * 9.81), 0.25)) / 1000;
    const affectedRadius = craterSize * 10;

    let threatLevel = "MINIMAL";
    if (energyMt > 100) threatLevel = "GLOBAL";
    else if (energyMt > 10) threatLevel = "REGIONAL";
    else if (energyMt > 1) threatLevel = "LOCAL";

    setImpactData((prev) => ({
      ...prev,
      energy: energyMt,
      crater: craterSize,
      radius: affectedRadius,
      threatLevel,
    }));

    setAsteroidParams((prev) => ({
      ...prev,
      mass,
      energy: energyMt,
      craterSize,
      affectedRadius,
    }));
  }, [asteroidParams.diameter, asteroidParams.velocity]);

  // Update asteroid when diameter or distance changes
  useEffect(() => {
    if (!asteroidRef.current || !sceneRef.current) return;

    const createAsteroid = (diameter: number, distance: number) => {
      const asteroidGeometry = new THREE.IcosahedronGeometry(diameter / 2, 1);
      const asteroidMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513,
        shininess: 5,
      });

      const vertices = asteroidGeometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < vertices.length; i += 3) {
        vertices[i] *= 0.8 + Math.random() * 0.4;
        vertices[i + 1] *= 0.8 + Math.random() * 0.4;
        vertices[i + 2] *= 0.8 + Math.random() * 0.4;
      }
      asteroidGeometry.attributes.position.needsUpdate = true;
      asteroidGeometry.computeVertexNormals();

      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
      const angle = Math.random() * Math.PI * 2;
      asteroid.position.set(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance * 0.5,
        Math.sin(angle) * distance
      );
      asteroid.lookAt(0, 0, 0);
      return asteroid;
    };

    sceneRef.current.remove(asteroidRef.current);
    const asteroid = createAsteroid(
      asteroidParams.diameter,
      asteroidParams.distance
    );
    sceneRef.current.add(asteroid);
    asteroidRef.current = asteroid;
  }, [asteroidParams.diameter, asteroidParams.distance]);

  const handleStartImpact = () => {
    setIsSimulating(!isSimulating);
    setDeflectionApplied(false);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setDeflectionApplied(false);

    // Clear trail
    if (sceneRef.current) {
      asteroidTrailRef.current.forEach((trail) =>
        sceneRef.current!.remove(trail)
      );
      asteroidTrailRef.current = [];
      impactParticlesRef.current.forEach((particle) =>
        sceneRef.current!.remove(particle)
      );
      impactParticlesRef.current = [];
    }

    // Reset asteroid position
    if (asteroidRef.current) {
      const angle = Math.random() * Math.PI * 2;
      asteroidRef.current.position.set(
        Math.cos(angle) * asteroidParams.distance,
        Math.sin(angle) * asteroidParams.distance * 0.5,
        Math.sin(angle) * asteroidParams.distance
      );
      asteroidRef.current.lookAt(0, 0, 0);
    }

    setImpactData((prev) => ({ ...prev, timeToImpact: "--" }));
  };

  const handleDeflect = () => {
    if (!deflectionApplied && asteroidRef.current && sceneRef.current) {
      setDeflectionApplied(true);

      // Visual effect
      const deflectionGeometry = new THREE.SphereGeometry(500, 16, 16);
      const deflectionMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
      });
      const deflectionEffect = new THREE.Mesh(
        deflectionGeometry,
        deflectionMaterial
      );
      deflectionEffect.position.copy(asteroidRef.current.position);
      sceneRef.current.add(deflectionEffect);

      // Animate and remove effect
      let scale = 1;
      const animateDeflection = () => {
        scale += 0.1;
        deflectionEffect.scale.setScalar(scale);
        deflectionMaterial.opacity -= 0.02;

        if (deflectionMaterial.opacity <= 0) {
          sceneRef.current!.remove(deflectionEffect);
        } else {
          requestAnimationFrame(animateDeflection);
        }
      };
      animateDeflection();

      // Change trajectory
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000
      );
      asteroidRef.current.position.add(offset);
    }
  };

  const setView = (view: string) => {
    if (!cameraRef.current) return;

    switch (view) {
      case "orbital":
        cameraRef.current.position.set(0, 0, 50000);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case "surface":
        cameraRef.current.position.set(8000, 2000, 8000);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case "impact":
        if (asteroidRef.current) {
          cameraRef.current.position.copy(asteroidRef.current.position);
          cameraRef.current.position.add(new THREE.Vector3(1000, 1000, 1000));
          cameraRef.current.lookAt(0, 0, 0);
        }
        break;
    }
  };

  // Load NASA asteroid into simulation
  const loadNASAAsteroid = (asteroid: NASAAsteroidData) => {
    // Reset simulation first
    setIsSimulating(false);
    setDeflectionApplied(false);

    // Clear existing trail and particles
    if (sceneRef.current) {
      asteroidTrailRef.current.forEach((trail) =>
        sceneRef.current!.remove(trail)
      );
      asteroidTrailRef.current = [];
      impactParticlesRef.current.forEach((particle) =>
        sceneRef.current!.remove(particle)
      );
      impactParticlesRef.current = [];
    }

    // Update asteroid parameters with NASA data
    setAsteroidParams((prev) => ({
      ...prev,
      diameter: Number(asteroid.diameter) || prev.diameter,
      velocity: Number(asteroid.velocity) || prev.velocity,
      distance: Number(asteroid.distance) || prev.distance,
      angle: 45, // Keep current angle
      mass: 0, // Will be calculated
      energy: 0, // Will be calculated
      craterSize: 0, // Will be calculated
      affectedRadius: 0, // Will be calculated
    }));

    // Store the selected NASA asteroid
    setSelectedNASAAsteroid(asteroid as NASAAsteroidData);

    // Reset impact data
    setImpactData((prev) => ({ ...prev, timeToImpact: "--" }));

    console.log("Loaded NASA asteroid:", asteroid.name, asteroid);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 3D Scene */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
              {isSidebarCollapsed ? (
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
                    d="M9 5l7 7-7 7"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              )}
            </button>
            <h1 className="text-2xl font-bold text-white">
              <span className="text-[#0066cc]">NASA</span> Impact Simulator
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setView("orbital")}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Orbital
              </button>
              <button
                onClick={() => setView("surface")}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Surface
              </button>
              <button
                onClick={() => setView("impact")}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Impact
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNASAPanel(!showNASAPanel)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showNASAPanel
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              {showNASAPanel ? "Hide NASA Data" : "Show NASA Data"}
            </button>
            {selectedNASAAsteroid && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/50 border border-blue-800 rounded-md">
                <span className="text-blue-400 text-sm font-medium">
                  NASA Data Loaded
                </span>
                <span className="text-white text-sm">
                  {selectedNASAAsteroid.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="absolute top-16 left-0 right-0 bottom-0 flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <LeftSidebar
          isCollapsed={isSidebarCollapsed}
          asteroidParams={asteroidParams}
          setAsteroidParams={setAsteroidParams}
          isSimulating={isSimulating}
          simulationSpeed={simulationSpeed}
          setSimulationSpeed={setSimulationSpeed}
          deflectionApplied={deflectionApplied}
          impactData={impactData}
          selectedNASAAsteroid={selectedNASAAsteroid}
          onStartImpact={handleStartImpact}
          onReset={handleReset}
          onDeflect={handleDeflect}
        />

        {/* Main 3D View */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* NASA Data Panel Overlay */}
          {showNASAPanel && (
            <div className="absolute top-4 right-4 bottom-4 z-10 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <NASADataPanel onSelectAsteroid={loadNASAAsteroid} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
