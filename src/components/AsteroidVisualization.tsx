'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { fetchNearEarthObjects, calculateImpactEnergy, estimateCraterDiameter, type AsteroidData } from '@/api/nasa-neo';

interface AsteroidParams {
  size: number; // diameter in meters
  velocity: number; // km/s
  distance: number; // distance from Earth in Earth radii
  angle: number; // orbital angle in degrees
}

export default function AsteroidVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [asteroidParams, setAsteroidParams] = useState<AsteroidParams>({
    size: 100,
    velocity: 20,
    distance: 10,
    angle: 0
  });
  const [realAsteroids, setRealAsteroids] = useState<AsteroidData[]>([]);
  const [selectedAsteroid, setSelectedAsteroid] = useState<AsteroidData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real asteroid data on mount
  useEffect(() => {
    const loadAsteroidData = async () => {
      setLoading(true);
      const asteroids = await fetchNearEarthObjects();
      setRealAsteroids(asteroids);
      setLoading(false);
    };
    
    loadAsteroidData();
  }, []);

  // Apply selected asteroid data to parameters
  const applyAsteroidData = (asteroid: AsteroidData) => {
    setSelectedAsteroid(asteroid);
    setAsteroidParams({
      size: asteroid.size,
      velocity: asteroid.velocity,
      distance: asteroid.distance,
      angle: asteroidParams.angle, // Keep current angle
    });
  };

  // Calculate impact metrics
  const impactEnergy = calculateImpactEnergy(asteroidParams.size, asteroidParams.velocity);
  const craterDiameter = estimateCraterDiameter(impactEnergy);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Add stars background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    
    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    // Create Earth
    const earthGeometry = new THREE.SphereGeometry(5, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2233ff,
      emissive: 0x112244,
      shininess: 5
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    
    // Add Earth atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(5.2, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
    
    // Create asteroid
    const asteroidGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const asteroidMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b7355,
      emissive: 0x332211
    });
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    
    // Calculate asteroid position based on params
    const updateAsteroidPosition = () => {
      const distance = asteroidParams.distance;
      const angleRad = (asteroidParams.angle * Math.PI) / 180;
      asteroid.position.x = Math.cos(angleRad) * distance;
      asteroid.position.z = Math.sin(angleRad) * distance;
      asteroid.position.y = 0;
    };
    
    updateAsteroidPosition();
    scene.add(asteroid);
    
    // Add orbital path
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitPoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const x = Math.cos(angle) * asteroidParams.distance;
      const z = Math.sin(angle) * asteroidParams.distance;
      orbitPoints.push(x, 0, z);
    }
    orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xff9900, opacity: 0.5, transparent: true });
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbit);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(50, 50, 50);
    scene.add(sunLight);
    
    // Camera position
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);
    
    // Animation
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Rotate Earth slowly
      earth.rotation.y += 0.001;
      atmosphere.rotation.y += 0.001;
      
      // Update asteroid position if angle changes
      const angleRad = (asteroidParams.angle * Math.PI) / 180;
      asteroid.position.x = Math.cos(angleRad) * asteroidParams.distance;
      asteroid.position.z = Math.sin(angleRad) * asteroidParams.distance;
      
      // Update asteroid size
      const scale = asteroidParams.size / 100;
      asteroid.scale.set(scale, scale, scale);
      
      // Update orbit path
      const newOrbitPoints = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const x = Math.cos(angle) * asteroidParams.distance;
        const z = Math.sin(angle) * asteroidParams.distance;
        newOrbitPoints.push(x, 0, z);
      }
      orbit.geometry.setAttribute('position', new THREE.Float32BufferAttribute(newOrbitPoints, 3));
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
    };
  }, [asteroidParams]);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-6 rounded-lg backdrop-blur-sm max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Asteroid Parameters</h2>
        
        {/* NASA Asteroid Selector */}
        {realAsteroids.length > 0 && (
          <div className="mb-6 p-4 bg-purple-900/50 rounded">
            <h3 className="font-bold mb-2">🛰️ Real NASA Data</h3>
            <select
              className="w-full p-2 bg-black/50 rounded border border-purple-500 text-sm"
              onChange={(e) => {
                const asteroid = realAsteroids[parseInt(e.target.value)];
                if (asteroid) applyAsteroidData(asteroid);
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Select a real asteroid...
              </option>
              {realAsteroids.map((asteroid, index) => (
                <option key={asteroid.id} value={index}>
                  {asteroid.name} {asteroid.isHazardous ? '⚠️' : ''}
                </option>
              ))}
            </select>
            {selectedAsteroid && (
              <p className="text-xs text-gray-400 mt-2">
                Selected: {selectedAsteroid.name}
                <br />
                Close approach: {selectedAsteroid.closeApproachDate}
              </p>
            )}
          </div>
        )}
        
        {loading && (
          <div className="mb-4 p-3 bg-blue-900/50 rounded text-sm">
            Loading real asteroid data from NASA...
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              Size: {asteroidParams.size.toFixed(0)}m diameter
              <span className="text-xs text-gray-400 ml-2">
                (Energy: {impactEnergy.toFixed(2)} MT TNT)
              </span>
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              value={asteroidParams.size}
              onChange={(e) => setAsteroidParams({ ...asteroidParams, size: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block mb-2">
              Velocity: {asteroidParams.velocity} km/s
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={asteroidParams.velocity}
              onChange={(e) => setAsteroidParams({ ...asteroidParams, velocity: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block mb-2">
              Distance from Earth: {asteroidParams.distance.toFixed(1)} Earth radii
              <span className="text-xs text-gray-400 ml-2">
                ({(asteroidParams.distance * 6371).toFixed(0)} km)
              </span>
            </label>
            <input
              type="range"
              min="6"
              max="50"
              step="0.5"
              value={asteroidParams.distance}
              onChange={(e) => setAsteroidParams({ ...asteroidParams, distance: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block mb-2">
              Orbital Position: {asteroidParams.angle}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={asteroidParams.angle}
              onChange={(e) => setAsteroidParams({ ...asteroidParams, angle: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/50 rounded">
          <h3 className="font-bold mb-2">ℹ️ About this visualization</h3>
          <p className="text-sm text-gray-300">
            This 3D simulation shows near-Earth asteroids approaching our planet. 
            Use real NASA data or adjust parameters manually to explore different impact scenarios.
          </p>
        </div>
      </div>
      
      {/* Impact Metrics Panel */}
      <div className="absolute top-4 right-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm max-w-xs">
        <h3 className="font-bold mb-3">📊 Impact Analysis</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Impact Energy:</span>
            <span className="font-mono">{impactEnergy.toFixed(2)} MT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Crater Diameter:</span>
            <span className="font-mono">{craterDiameter.toFixed(0)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Miss Distance:</span>
            <span className="font-mono">{(asteroidParams.distance * 6371).toFixed(0)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Relative Velocity:</span>
            <span className="font-mono">{asteroidParams.velocity} km/s</span>
          </div>
          {selectedAsteroid && (
            <>
              <hr className="border-gray-600 my-2" />
              <div className="flex justify-between">
                <span className="text-gray-400">Hazard Level:</span>
                <span className={selectedAsteroid.isHazardous ? 'text-red-400' : 'text-green-400'}>
                  {selectedAsteroid.isHazardous ? '⚠️ HIGH' : '✓ LOW'}
                </span>
              </div>
            </>
          )}
        </div>
        
        {impactEnergy > 1000 && (
          <div className="mt-3 p-2 bg-red-900/50 rounded text-xs">
            ⚠️ Extinction-level event if impact occurs
          </div>
        )}
        {impactEnergy > 100 && impactEnergy <= 1000 && (
          <div className="mt-3 p-2 bg-orange-900/50 rounded text-xs">
            ⚠️ Regional devastation possible
          </div>
        )}
        {impactEnergy <= 100 && (
          <div className="mt-3 p-2 bg-green-900/50 rounded text-xs">
            ✓ Localized impact zone
          </div>
        )}
      </div>
      
      {/* Info Panel */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm max-w-xs">
        <h3 className="font-bold mb-2">🌍 Visualization Guide</h3>
        <p className="text-sm text-gray-300">
          🔵 Blue sphere: Earth<br />
          🟤 Brown sphere: Asteroid<br />
          🟠 Orange line: Orbital path<br />
          ⚪ White dots: Stars
        </p>
      </div>
    </div>
  );
}
