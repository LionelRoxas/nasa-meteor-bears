'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EnhancedEarth } from '../lib/EnhancedEarth';

interface AsteroidData {
  id: string;
  name: string;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
      miles_per_hour: string;
    };
    miss_distance: {
      kilometers: string;
      miles: string;
    };
    close_approach_date: string;
  }>;
  absolute_magnitude_h: number;
}

interface LaserBeam {
  id: string;
  mesh: THREE.Mesh;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  progress: number;
  targetAsteroid: GameAsteroid;
  createdAt: number;
}

interface GameAsteroid {
  id: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  isHazardous: boolean;
  data: AsteroidData;
  destroyed: boolean;
  warningRing?: THREE.Mesh;
  impacting?: boolean; // Flag to indicate asteroid is in impact phase
  // Boss asteroid properties
  isImpactor2025?: boolean;
  hitCount?: number;
  maxHits?: number;
  splitGeneration?: number; // 0 = main boss, 1 = first split, 2 = second split
  trailSystem?: {
    particles: THREE.Points;
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    velocities: Float32Array;
    ages: Float32Array;
    particleCount: number;
    currentIndex: number;
    trailLine?: THREE.Line;
    trailLinePositions?: Float32Array;
    aura?: THREE.Mesh;
  };
}

interface AsteroidMesh extends THREE.Mesh {
  collisionMesh: THREE.Mesh;
}

interface AsteroidInfoPanelProps {
  asteroid: AsteroidData | null;
  onContinue: () => void;
}

const AsteroidInfoPanel = ({ asteroid, onContinue }: AsteroidInfoPanelProps) => {
  console.log('AsteroidInfoPanel received asteroid:', asteroid);
  
  if (!asteroid) {
    return (
      <div className="w-80 bg-gray-900 text-white p-4 border-l border-gray-700">
        <h2 className="text-xl font-bold mb-4">Asteroid Information</h2>
        <p className="text-gray-400">Click on an asteroid to view its details</p>
        <p className="text-xs text-gray-500 mt-2">Waiting for asteroid selection...</p>
      </div>
    );
  }

  const approach = asteroid.close_approach_data?.[0];
  const diameter = asteroid.estimated_diameter?.kilometers;

  console.log('Approach data:', approach);
  console.log('Diameter data:', diameter);

  if (!approach || !diameter) {
    return (
      <div className="w-80 bg-gray-900 text-white p-4 border-l border-gray-700 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Asteroid Information</h2>
        <p className="text-red-400">⚠️ Incomplete Data</p>
        
        <div className="space-y-3 mt-4">
          <div>
            <h3 className="font-semibold text-blue-400">Name</h3>
            <p className="text-sm">{asteroid.name || 'Unknown'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-400">ID</h3>
            <p className="text-xs text-gray-400">{asteroid.id || 'Unknown'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-400">Hazard Status</h3>
            <p className={`text-sm font-medium ${
              asteroid.is_potentially_hazardous_asteroid 
                ? 'text-red-400' 
                : 'text-green-400'
            }`}>
              {asteroid.is_potentially_hazardous_asteroid ? 'HAZARDOUS' : 'NON-HAZARDOUS'}
            </p>
          </div>
          
          {!approach && (
            <p className="text-xs text-red-300">Missing approach data</p>
          )}
          {!diameter && (
            <p className="text-xs text-red-300">Missing diameter data</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 text-white p-4 border-l border-gray-700 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Asteroid Information</h2>
      
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-blue-400">Name</h3>
          <p className="text-sm">{asteroid.name}</p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Hazard Status</h3>
          <p className={`text-sm font-medium ${
            asteroid.is_potentially_hazardous_asteroid 
              ? 'text-red-400' 
              : 'text-green-400'
          }`}>
            {asteroid.is_potentially_hazardous_asteroid ? 'HAZARDOUS' : 'NON-HAZARDOUS'}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Diameter</h3>
          <p className="text-sm">
            {diameter.estimated_diameter_min.toFixed(3)} - {diameter.estimated_diameter_max.toFixed(3)} km
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Velocity</h3>
          <p className="text-sm">
            {parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(2)} km/s
          </p>
          <p className="text-xs text-gray-400">
            ({parseFloat(approach.relative_velocity.miles_per_hour).toLocaleString()} mph)
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Miss Distance</h3>
          <p className="text-sm">
            {parseFloat(approach.miss_distance.kilometers).toLocaleString()} km
          </p>
          <p className="text-xs text-gray-400">
            ({parseFloat(approach.miss_distance.miles).toLocaleString()} miles)
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Approach Date</h3>
          <p className="text-sm">{approach.close_approach_date}</p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">Magnitude</h3>
          <p className="text-sm">{asteroid.absolute_magnitude_h}</p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">ID</h3>
          <p className="text-xs text-gray-400">{asteroid.id}</p>
        </div>
      </div>
      
      {/* Continue button */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <button
          onClick={onContinue}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded text-lg transition-colors"
        >
          Continue Game
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Game is paused - click to continue
        </p>
      </div>
    </div>
  );
};

export const AsteroidDefenseGame3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const enhancedEarthRef = useRef<EnhancedEarth | null>(null);
  const asteroidsRef = useRef<GameAsteroid[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [selectedAsteroid, setSelectedAsteroid] = useState<AsteroidData | null>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameVictory, setGameVictory] = useState(false);
  const [showBossCutscene, setShowBossCutscene] = useState(false);
  const [bossSpawned, setBossSpawned] = useState(false);
  const [impactorPartsDestroyed, setImpactorPartsDestroyed] = useState(0);
  const [asteroidsDestroyed, setAsteroidsDestroyed] = useState(0);
  const [earthHealth, setEarthHealth] = useState(100);
  const [asteroidData, setAsteroidData] = useState<AsteroidData[]>([]);
  const [gamePaused, setGamePaused] = useState(false);

  // Load asteroid data
  useEffect(() => {
    const loadAsteroidData = async () => {
      try {
        console.log('Loading asteroid data...');
        
        // Try to load from local JSON files first
        const [hazardousResponse, todayResponse] = await Promise.all([
          fetch('/data/hazardous-asteroids.json'),
          fetch('/data/today-asteroids.json')
        ]);

        console.log('Hazardous response status:', hazardousResponse.status);
        console.log('Today response status:', todayResponse.status);

        if (!hazardousResponse.ok || !todayResponse.ok) {
          throw new Error('Failed to fetch local asteroid data');
        }

        const hazardousData = await hazardousResponse.json();
        const todayData = await todayResponse.json();

        console.log('Hazardous asteroids loaded:', hazardousData.length);
        console.log('Today data structure:', Object.keys(todayData));
        console.log('Sample hazardous asteroid:', hazardousData[0]);

        // Combine and process asteroid data
        const allAsteroids: AsteroidData[] = [...hazardousData];
        
        // Add non-hazardous asteroids from today's data
        if (todayData.near_earth_objects) {
          Object.values(todayData.near_earth_objects).forEach((dayAsteroids: unknown) => {
            if (Array.isArray(dayAsteroids)) {
              dayAsteroids.forEach((asteroid: AsteroidData) => {
                if (!asteroid.is_potentially_hazardous_asteroid) {
                  allAsteroids.push(asteroid);
                }
              });
            }
          });
        }

        console.log('Total asteroids processed:', allAsteroids.length);
        console.log('Sample asteroid for game:', allAsteroids[0]);
        
        // Validate asteroid data structure
        const validAsteroids = allAsteroids.filter(asteroid => {
          const isValid = asteroid && 
                         asteroid.id && 
                         asteroid.name && 
                         asteroid.estimated_diameter &&
                         asteroid.close_approach_data &&
                         asteroid.close_approach_data.length > 0;
          if (!isValid) {
            console.warn('Invalid asteroid data:', asteroid);
          }
          return isValid;
        });

        console.log('Valid asteroids:', validAsteroids.length);
        setAsteroidData(validAsteroids.slice(0, 50)); // Limit for performance
        
      } catch (error) {
        console.error('Failed to load asteroid data, using fallback:', error);
        // Enhanced fallback with complete data structure
        const fallbackData: AsteroidData[] = [
          {
            id: 'fallback-hazardous',
            name: 'Fallback Hazardous Asteroid (2025 FB1)',
            estimated_diameter: {
              kilometers: { 
                estimated_diameter_min: 0.134, 
                estimated_diameter_max: 0.299 
              }
            },
            is_potentially_hazardous_asteroid: true,
            close_approach_data: [{
              relative_velocity: { 
                kilometers_per_second: '18.45', 
                kilometers_per_hour: '66420', 
                miles_per_hour: '41277' 
              },
              miss_distance: { 
                kilometers: '1895432', 
                miles: '1177891' 
              },
              close_approach_date: '2025-10-04'
            }],
            absolute_magnitude_h: 21.8
          },
          {
            id: 'fallback-safe',
            name: 'Fallback Safe Asteroid (2025 GC2)',
            estimated_diameter: {
              kilometers: { 
                estimated_diameter_min: 0.089, 
                estimated_diameter_max: 0.198 
              }
            },
            is_potentially_hazardous_asteroid: false,
            close_approach_data: [{
              relative_velocity: { 
                kilometers_per_second: '12.67', 
                kilometers_per_hour: '45612', 
                miles_per_hour: '28345' 
              },
              miss_distance: { 
                kilometers: '4523891', 
                miles: '2810456' 
              },
              close_approach_date: '2025-10-05'
            }],
            absolute_magnitude_h: 23.2
          },
          {
            id: 'fallback-medium',
            name: 'Fallback Medium Asteroid (2025 HC3)',
            estimated_diameter: {
              kilometers: { 
                estimated_diameter_min: 0.256, 
                estimated_diameter_max: 0.573 
              }
            },
            is_potentially_hazardous_asteroid: true,
            close_approach_data: [{
              relative_velocity: { 
                kilometers_per_second: '22.13', 
                kilometers_per_hour: '79668', 
                miles_per_hour: '49503' 
              },
              miss_distance: { 
                kilometers: '3245123', 
                miles: '2016789' 
              },
              close_approach_date: '2025-10-06'
            }],
            absolute_magnitude_h: 19.9
          }
        ];
        
        console.log('Using fallback asteroid data:', fallbackData);
        setAsteroidData(fallbackData);
      }
    };

    loadAsteroidData();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    console.log('Initializing Three.js scene...');
    const currentMount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure black background
    sceneRef.current = scene;

    // Camera setup with better positioning for larger Earth
    const camera = new THREE.PerspectiveCamera(75, (window.innerWidth * 0.75) / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 25); // Moved further back for larger Earth
    camera.lookAt(0, 0, 0); // Look at Earth center
    cameraRef.current = camera;

    // Enhanced renderer setup to match the original Earth model
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.75, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enhanced tone mapping and color space for better visuals
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    rendererRef.current = renderer;

    currentMount.appendChild(renderer.domElement);

    // Setup OrbitControls for camera movement
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // Always look at Earth center
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.enableZoom = true; // Allow zoom with scroll wheel
    controls.minDistance = 8; // Closest zoom (don't go inside larger Earth)
    controls.maxDistance = 80; // Furthest zoom (increased for larger Earth)
    controls.enablePan = false; // Disable panning to keep Earth centered
    controls.enableRotate = true; // Allow rotation around Earth
    controls.autoRotate = false; // Don't auto-rotate
    controls.update();
    controlsRef.current = controls;

    // Enhanced lighting setup to match the original Earth model
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Sun light - positioned to simulate sunlight hitting Earth
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2, 0.5, 1.5);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Create Enhanced Earth with multiple layers
    const enhancedEarth = new EnhancedEarth(scene);
    enhancedEarthRef.current = enhancedEarth;
    
    // Scale the enhanced Earth to match our game scale (radius 6 for better size ratio)
    enhancedEarth.setScale(6);
    
    // Set the main Earth mesh reference for collision detection
    earthRef.current = enhancedEarth.earthMesh;

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    raycasterRef.current = raycaster;
    mouseRef.current = mouse;

    console.log('Raycaster and mouse initialized');

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = (window.innerWidth * 0.75) / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth * 0.75, window.innerHeight);
        
        // Update controls on resize
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const updateAsteroidTrail = useCallback((asteroid: GameAsteroid) => {
    if (!asteroid.isHazardous || !asteroid.trailSystem) return;

    const trail = asteroid.trailSystem;
    const time = Date.now() * 0.001; // Time in seconds

    // Update particle positions and properties
    for (let i = 0; i < trail.particleCount; i++) {
      const idx = i * 3;

      // Only age particles if asteroid is not impacting
      if (!asteroid.impacting) {
        // Age the particle (slower aging for longer trails)
        trail.ages[i] += 0.012; // Reduced from 0.016 for longer lasting particles
      }

      // If particle is too old and asteroid is not impacting, respawn it at asteroid position
      if (trail.ages[i] > 1.5 && !asteroid.impacting) { // Increased max age for longer trails
        trail.positions[idx] = asteroid.mesh.position.x + (Math.random() - 0.5) * 0.8;
        trail.positions[idx + 1] = asteroid.mesh.position.y + (Math.random() - 0.5) * 0.8;
        trail.positions[idx + 2] = asteroid.mesh.position.z + (Math.random() - 0.5) * 0.8;
        
        // Reset age
        trail.ages[i] = 0;

        // Reassign particle type (more fire for brighter effect)
        if (Math.random() < 0.75) {
          // Fire particle (75% chance)
          trail.colors[idx] = 1.0;
          trail.colors[idx + 1] = 0.5 + Math.random() * 0.5; // Brighter orange
          trail.colors[idx + 2] = 0.0;
          trail.sizes[i] = 0.4 + Math.random() * 1.0;
        } else {
          // Smoke particle
          const gray = 0.2 + Math.random() * 0.5; // Brighter smoke
          trail.colors[idx] = gray;
          trail.colors[idx + 1] = gray;
          trail.colors[idx + 2] = gray;
          trail.sizes[i] = 1.0 + Math.random() * 1.5;
        }

        // New random drift velocity
        trail.velocities[idx] = (Math.random() - 0.5) * 0.04;
        trail.velocities[idx + 1] = (Math.random() - 0.5) * 0.04;
        trail.velocities[idx + 2] = (Math.random() - 0.5) * 0.04;
      } else {
        // Update existing particle position
        trail.positions[idx] += trail.velocities[idx];
        trail.positions[idx + 1] += trail.velocities[idx + 1];
        trail.positions[idx + 2] += trail.velocities[idx + 2];

        // Add more dramatic turbulence
        trail.positions[idx] += Math.sin(time * 3 + i * 0.1) * 0.008;
        trail.positions[idx + 1] += Math.cos(time * 2.5 + i * 0.15) * 0.008;

        // Fade particles as they age, but only if not impacting
        if (!asteroid.impacting) {
          const fade = 1.0 - (trail.ages[i] / 1.5);
          if (trail.colors[idx] > 0.5) {
            // Fire particle - keep bright orange longer
            trail.colors[idx + 1] = Math.max(0.2, trail.colors[idx + 1] * fade);
            trail.colors[idx + 2] = 0;
          } else {
            // Smoke particle - fade to transparent
            trail.colors[idx] *= fade;
            trail.colors[idx + 1] *= fade;
            trail.colors[idx + 2] *= fade;
          }

          // Grow smoke particles over time
          if (trail.colors[idx] < 0.5) {
            trail.sizes[i] *= 1.015; // Gradually grow smoke
          }
        }
      }
    }

    // Update solid trail line positions (only if not impacting)
    if (trail.trailLine && trail.trailLinePositions && !asteroid.impacting) {
      // Shift existing positions back
      for (let i = 19; i > 0; i--) {
        trail.trailLinePositions[i * 3] = trail.trailLinePositions[(i - 1) * 3];
        trail.trailLinePositions[i * 3 + 1] = trail.trailLinePositions[(i - 1) * 3 + 1];
        trail.trailLinePositions[i * 3 + 2] = trail.trailLinePositions[(i - 1) * 3 + 2];
      }
      
      // Add current position at front
      trail.trailLinePositions[0] = asteroid.mesh.position.x;
      trail.trailLinePositions[1] = asteroid.mesh.position.y;
      trail.trailLinePositions[2] = asteroid.mesh.position.z;
      
      trail.trailLine.geometry.attributes.position.needsUpdate = true;
    }

    // Update aura glow effect (keep pulsing even during impact)
    if (trail.aura) {
      (trail.aura.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 4) * 0.15; // More visible pulsing
      trail.aura.scale.setScalar(1 + Math.sin(time * 6) * 0.15); // More dramatic breathing effect
    }

    // Update the geometry attributes
    trail.particles.geometry.attributes.position.needsUpdate = true;
    trail.particles.geometry.attributes.color.needsUpdate = true;
    trail.particles.geometry.attributes.size.needsUpdate = true;
  }, []);

  const createAsteroid = useCallback((data: AsteroidData): GameAsteroid | null => {
    if (!sceneRef.current) {
      console.log('❌ No scene available for asteroid creation');
      return null;
    }

    console.log('🚀 Creating asteroid:', data.name, 'Hazardous:', data.is_potentially_hazardous_asteroid);

    // Asteroid geometry and material with larger clickable area
    const diameter = data.estimated_diameter.kilometers.estimated_diameter_max;
    const radius = data.is_potentially_hazardous_asteroid 
      ? Math.max(0.2, Math.min(0.8, diameter * 2.5)) // Smaller hazardous asteroids (comets)
      : Math.max(0.3, Math.min(1.2, diameter * 4)); // Keep non-hazardous same size
    
    console.log('Asteroid radius:', radius);
    
    const geometry = new THREE.IcosahedronGeometry(radius, 1);
    
    // Modify geometry for irregular shape
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      vertex.multiplyScalar(0.8 + Math.random() * 0.4); // Random scaling
      positions[i] = vertex.x;
      positions[i + 1] = vertex.y;
      positions[i + 2] = vertex.z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: data.is_potentially_hazardous_asteroid ? 0xFF4500 : 0xC0C0C0, // Brighter orange-red for hazardous, bright silver for non-hazardous
      shininess: 100, // Increased shininess for better visibility
      emissive: data.is_potentially_hazardous_asteroid ? 0x331100 : 0x222222, // Add slight glow
      emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Add invisible larger collision sphere for easier clicking
    const collisionGeometry = new THREE.SphereGeometry(radius * 1.5, 8, 8);
    const collisionMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false // Completely invisible but still clickable
    });
    const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    mesh.add(collisionMesh);
    
    // Store reference to collision mesh for raycasting
    (mesh as unknown as AsteroidMesh).collisionMesh = collisionMesh;
    
    // Random spawn position - closer for non-hazardous asteroids
    const angle = Math.random() * Math.PI * 2;
    let distance: number;
    
    if (data.is_potentially_hazardous_asteroid) {
      // Hazardous asteroids spawn further out (updated for larger Earth)
      distance = 40 + Math.random() * 15; // Increased spawn distance
    } else {
      // Non-hazardous asteroids spawn much closer to Earth
      distance = 8 + Math.random() * 4; // Much closer: 8-12 units from Earth (was 15-23)
    }
    
    mesh.position.set(
      Math.cos(angle) * distance,
      (Math.random() - 0.5) * 12, // Increased vertical spread for larger scale
      Math.sin(angle) * distance
    );

    console.log('Asteroid spawned at position:', mesh.position.x.toFixed(2), mesh.position.y.toFixed(2), mesh.position.z.toFixed(2));

    // Different velocity based on hazard status
    let velocity: THREE.Vector3;
    
    if (data.is_potentially_hazardous_asteroid) {
      // Hazardous asteroids move toward Earth (threat)
      velocity = new THREE.Vector3(
        -mesh.position.x * 0.0005 + (Math.random() - 0.5) * 0.0002,
        -mesh.position.y * 0.0005 + (Math.random() - 0.5) * 0.0002,
        -mesh.position.z * 0.0005 + (Math.random() - 0.5) * 0.0002
      );
      console.log('🔴 Hazardous asteroid - heading toward Earth');
    } else {
      // Non-hazardous asteroids are completely stationary (no movement)
      velocity = new THREE.Vector3(0, 0, 0);
      console.log('🟢 Non-hazardous asteroid - stationary (no movement)');
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Make sure the mesh is added to the scene
    sceneRef.current.add(mesh);
    console.log('✅ Asteroid mesh added to scene');

    const asteroid: GameAsteroid = {
      id: data.id,
      mesh,
      velocity,
      isHazardous: data.is_potentially_hazardous_asteroid,
      data,
      destroyed: false
    };

    // Add warning ring for hazardous asteroids
    if (data.is_potentially_hazardous_asteroid) {
      const ringGeometry = new THREE.RingGeometry(radius * 1.8, radius * 2.1, 16);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.lookAt(cameraRef.current?.position || new THREE.Vector3(0, 0, 1));
      mesh.add(ring);
      asteroid.warningRing = ring;
      console.log('🔴 Added hazardous warning ring');

      // Create smoking and fiery trail system for hazardous asteroids
      const particleCount = 150; // Increased for denser trail
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const velocities = new Float32Array(particleCount * 3);
      const ages = new Float32Array(particleCount);

      // Initialize particle system
      for (let i = 0; i < particleCount; i++) {
        // Position (start at asteroid position)
        positions[i * 3] = mesh.position.x;
        positions[i * 3 + 1] = mesh.position.y;
        positions[i * 3 + 2] = mesh.position.z;

        // Random colors between fire (red/orange) and smoke (gray)
        if (Math.random() < 0.7) {
          // Fire particles (70% chance - more fire for brighter trail)
          colors[i * 3] = 1.0; // Red
          colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // Brighter orange variation
          colors[i * 3 + 2] = 0.0; // Blue
        } else {
          // Smoke particles (30% chance)
          const gray = 0.3 + Math.random() * 0.4; // Brighter smoke
          colors[i * 3] = gray;
          colors[i * 3 + 1] = gray;
          colors[i * 3 + 2] = gray;
        }

        // Particle sizes - wider range for more variety
        sizes[i] = 0.3 + Math.random() * 2.0;

        // Random velocities for particle drift
        velocities[i * 3] = (Math.random() - 0.5) * 0.025;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.025;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.025;

        // Age for fading effect
        ages[i] = Math.random();
      }

      // Create geometry for particles
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // Create material for particles
      const particleMaterial = new THREE.PointsMaterial({
        size: 1.5, // Increased size for better visibility
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 1.0, // Full opacity for maximum visibility
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true // Enable depth testing to prevent rendering through Earth
      });

      // Create the particle system
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      sceneRef.current.add(particles);

      // Create solid trail line for comet tail effect
      const trailLineGeometry = new THREE.BufferGeometry();
      const trailLinePositions = new Float32Array(60); // 20 points (x,y,z each)
      for (let i = 0; i < 20; i++) {
        trailLinePositions[i * 3] = mesh.position.x;
        trailLinePositions[i * 3 + 1] = mesh.position.y;
        trailLinePositions[i * 3 + 2] = mesh.position.z;
      }
      trailLineGeometry.setAttribute('position', new THREE.BufferAttribute(trailLinePositions, 3));
      
      const trailLineMaterial = new THREE.LineBasicMaterial({
        color: 0xff6600, // Orange color
        transparent: true,
        opacity: 0.9, // Increased opacity
        linewidth: 5, // Thicker line
        depthWrite: false,
        depthTest: true // Enable depth testing to prevent rendering through Earth
      });
      
      const trailLine = new THREE.Line(trailLineGeometry, trailLineMaterial);
      sceneRef.current.add(trailLine);

      // Create orange flame aura around the comet
      const auraGeometry = new THREE.SphereGeometry(radius * 2.5, 16, 16);
      const auraMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600, // Brighter orange
        transparent: true,
        opacity: 0.4, // Increased base opacity
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true // Enable depth testing to prevent rendering through Earth
      });
      const aura = new THREE.Mesh(auraGeometry, auraMaterial);
      aura.position.copy(mesh.position);
      mesh.add(aura); // Attach to asteroid so it moves with it

      // Store trail system data
      asteroid.trailSystem = {
        particles,
        positions,
        colors,
        sizes,
        velocities,
        ages,
        particleCount,
        currentIndex: 0,
        trailLine,
        trailLinePositions,
        aura
      };

      console.log('🔥 Created enhanced smoking and fiery trail system with solid trail and aura for hazardous asteroid');
    } else {
      // Add subtle highlight ring for non-hazardous asteroids
      const ringGeometry = new THREE.RingGeometry(radius * 1.6, radius * 1.8, 16);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.lookAt(cameraRef.current?.position || new THREE.Vector3(0, 0, 1));
      mesh.add(ring);
      asteroid.warningRing = ring;
      console.log('🟢 Added safe asteroid highlight ring');
    }

    return asteroid;
  }, []);

  // Create the impactor-2025 boss asteroid with special properties
  const createImpactor2025 = useCallback((generation: number = 0): GameAsteroid | null => {
    if (!sceneRef.current) return null;

    // Create fake asteroid data for impactor-2025
    const impactorData: AsteroidData = {
      id: `impactor-2025-gen${generation}-${Date.now()}`,
      name: generation === 0 ? 'Impactor-2025' : `Impactor-2025-Fragment-${generation}`,
      estimated_diameter: {
        kilometers: {
          estimated_diameter_min: generation === 0 ? 2.5 : generation === 1 ? 1.25 : 0.625,
          estimated_diameter_max: generation === 0 ? 5.0 : generation === 1 ? 2.5 : 1.25
        }
      },
      is_potentially_hazardous_asteroid: true,
      close_approach_data: [{
        relative_velocity: {
          kilometers_per_second: "15.5",
          kilometers_per_hour: "55800",
          miles_per_hour: "34670"
        },
        miss_distance: {
          kilometers: "7500000",
          miles: "4660000"
        },
        close_approach_date: "2025-12-21"
      }],
      absolute_magnitude_h: 18.5
    };

    // Calculate size based on generation (50% reduction per split) - made main boss bigger
    const baseRadius = generation === 0 ? 3.0 : generation === 1 ? 1.5 : 0.75;
    
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 2);
    
    // More dramatic irregular shape for boss
    const geometryPositions = geometry.attributes.position.array;
    for (let i = 0; i < geometryPositions.length; i += 3) {
      const vertex = new THREE.Vector3(geometryPositions[i], geometryPositions[i + 1], geometryPositions[i + 2]);
      vertex.multiplyScalar(0.7 + Math.random() * 0.6); // More irregular
      geometryPositions[i] = vertex.x;
      geometryPositions[i + 1] = vertex.y;
      geometryPositions[i + 2] = vertex.z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Special dark red material for impactor
    const material = new THREE.MeshPhongMaterial({
      color: generation === 0 ? 0x8B0000 : generation === 1 ? 0xFF4500 : 0xFF6347, // Dark red to orange
      shininess: 100,
      emissive: generation === 0 ? 0x440000 : generation === 1 ? 0x331100 : 0x220800,
      emissiveIntensity: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Larger collision sphere for easier targeting
    const collisionGeometry = new THREE.SphereGeometry(baseRadius * 1.8, 8, 8);
    const collisionMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false
    });
    const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    mesh.add(collisionMesh);
    (mesh as unknown as AsteroidMesh).collisionMesh = collisionMesh;
    
    // Spawn farther out and move slower for boss
    const angle = Math.random() * Math.PI * 2;
    const distance = generation === 0 ? 60 : generation === 1 ? 45 : 35; // Farther for main boss
    
    mesh.position.set(
      Math.cos(angle) * distance,
      (Math.random() - 0.5) * 8,
      Math.sin(angle) * distance
    );

    // Slower movement for boss (especially main boss)
    const speedMultiplier = generation === 0 ? 0.0003 : generation === 1 ? 0.0004 : 0.0005;
    const velocity = new THREE.Vector3(
      -mesh.position.x * speedMultiplier + (Math.random() - 0.5) * 0.0001,
      -mesh.position.y * speedMultiplier + (Math.random() - 0.5) * 0.0001,
      -mesh.position.z * speedMultiplier + (Math.random() - 0.5) * 0.0001
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    sceneRef.current.add(mesh);

    // Determine hit requirements based on generation
    let maxHits: number;
    switch (generation) {
      case 0: maxHits = 3; break;  // Main boss: 3 hits
      case 1: maxHits = 2; break;  // First split: 2 hits each
      case 2: maxHits = 1; break;  // Final split: 1 hit each
      default: maxHits = 1; break;
    }

    const asteroid: GameAsteroid = {
      id: impactorData.id,
      mesh,
      velocity,
      isHazardous: true,
      data: impactorData,
      destroyed: false,
      isImpactor2025: true,
      hitCount: 0,
      maxHits,
      splitGeneration: generation
    };

    // Enhanced trail system for boss
    const particleCount = generation === 0 ? 300 : generation === 1 ? 200 : 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const ages = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = mesh.position.x;
      positions[i * 3 + 1] = mesh.position.y;
      positions[i * 3 + 2] = mesh.position.z;

      // More intense fire colors for boss
      const fireIntensity = Math.random();
      if (fireIntensity < 0.8) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.6;
        colors[i * 3 + 2] = 0.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // White-hot flames
      }

      sizes[i] = 0.5 + Math.random() * 3.0;
      velocities[i * 3] = (Math.random() - 0.5) * 0.03;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
      ages[i] = Math.random();
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    sceneRef.current.add(particles);

    // Enhanced aura for boss
    const auraGeometry = new THREE.SphereGeometry(baseRadius * 3.5, 16, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: generation === 0 ? 0xff0000 : generation === 1 ? 0xff6600 : 0xffaa00,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.position.copy(mesh.position);
    mesh.add(aura);

    asteroid.trailSystem = {
      particles,
      positions,
      colors,
      sizes,
      velocities,
      ages,
      particleCount,
      currentIndex: 0,
      aura
    };

    return asteroid;
  }, []);

  const createImpactExplosion = useCallback((position: THREE.Vector3, isHazardous: boolean = true) => {
    if (!sceneRef.current) return;

    console.log('💥 Creating impact explosion at position:', position.x.toFixed(2), position.y.toFixed(2), position.z.toFixed(2));

    // Create explosion group for all effects
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);
    sceneRef.current.add(explosionGroup);

    // Main explosion flash
    const flashSize = isHazardous ? 1.5 : 1.0;
    const flashGeometry = new THREE.SphereGeometry(flashSize, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: isHazardous ? 0xff4400 : 0xffaa00,
      transparent: true,
      opacity: 0.9
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    explosionGroup.add(flash);

    // Create multiple smoke particles
    const smokeParticles: THREE.Mesh[] = [];
    const smokeCount = isHazardous ? 12 : 8;
    
    for (let i = 0; i < smokeCount; i++) {
      const smokeGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 8, 8);
      const smokeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0, 0, 0.2 + Math.random() * 0.3), // Gray to dark gray
        transparent: true,
        opacity: 0.7
      });
      const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
      
      // Random positions around impact point
      const angle = (i / smokeCount) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.8;
      smoke.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * radius
      );
      
      explosionGroup.add(smoke);
      smokeParticles.push(smoke);
    }

    // Create debris particles
    const debrisParticles: THREE.Mesh[] = [];
    const debrisCount = isHazardous ? 8 : 5;
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const debrisMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B4513, // Brown rock color
        transparent: true,
        opacity: 0.8
      });
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Random positions and velocities
      debris.position.set(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );
      
      explosionGroup.add(debris);
      debrisParticles.push(debris);
    }

    // Animation variables
    let animationTime = 0;
    const totalDuration = 5000; // 5 seconds
    const startTime = Date.now();

    const animateExplosion = () => {
      const currentTime = Date.now();
      animationTime = currentTime - startTime;
      const progress = Math.min(animationTime / totalDuration, 1);

      if (progress >= 1) {
        // Animation complete, remove explosion
        sceneRef.current?.remove(explosionGroup);
        return;
      }

      // Flash animation (quick bright flash then fade)
      if (progress < 0.1) {
        // Quick bright flash in first 10% of animation
        const flashProgress = progress / 0.1;
        flash.scale.setScalar(1 + flashProgress * 2);
        flash.material.opacity = 0.9 * (1 - flashProgress);
      } else {
        // Hide flash after initial burst
        flash.visible = false;
      }

      // Smoke animation (expand and fade)
      smokeParticles.forEach((smoke, index) => {
        // Each particle has slightly different timing
        const particleDelay = (index / smokeParticles.length) * 0.2;
        const particleProgress = Math.max(0, (progress - particleDelay) / (1 - particleDelay));
        
        if (particleProgress > 0) {
          // Expand smoke
          const scale = 1 + particleProgress * 3;
          smoke.scale.setScalar(scale);
          
          // Move smoke upward and outward
          smoke.position.y += particleProgress * 0.02;
          smoke.position.x *= 1 + particleProgress * 0.5;
          smoke.position.z *= 1 + particleProgress * 0.5;
          
          // Fade smoke
          (smoke.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - particleProgress);
        }
      });

      // Debris animation (spread out and fade)
      debrisParticles.forEach((debris, index) => {
        const particleDelay = (index / debrisParticles.length) * 0.15;
        const particleProgress = Math.max(0, (progress - particleDelay) / (1 - particleDelay));
        
        if (particleProgress > 0) {
          // Move debris outward
          debris.position.multiplyScalar(1 + particleProgress * 0.02);
          debris.position.y += particleProgress * 0.01; // Slight upward movement
          
          // Rotate debris
          debris.rotation.x += 0.1;
          debris.rotation.y += 0.1;
          debris.rotation.z += 0.1;
          
          // Fade debris
          (debris.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - particleProgress);
        }
      });

      requestAnimationFrame(animateExplosion);
    };

    animateExplosion();
  }, []);

  // Function to split impactor-2025 asteroids
  const splitImpactor2025 = useCallback((parentAsteroid: GameAsteroid) => {
    if (!parentAsteroid.isImpactor2025 || parentAsteroid.splitGeneration === undefined) return;

    const generation = parentAsteroid.splitGeneration + 1;
    
    // Don't split beyond generation 2
    if (generation > 2) return;

    // Determine number of splits
    const splitCount = generation === 1 ? 2 : 4; // 1 split into 2, then each splits into 4
    
    console.log(`💥 Splitting Impactor-2025 generation ${parentAsteroid.splitGeneration} into ${splitCount} fragments`);

    for (let i = 0; i < splitCount; i++) {
      const fragment = createImpactor2025(generation);
      if (fragment) {
        // Position fragments around the parent's position
        const angle = (i / splitCount) * Math.PI * 2;
        const offset = generation === 1 ? 3 : 1.5; // Larger spread for first split
        
        fragment.mesh.position.copy(parentAsteroid.mesh.position);
        fragment.mesh.position.x += Math.cos(angle) * offset;
        fragment.mesh.position.z += Math.sin(angle) * offset;
        
        // Give fragments slightly different velocities
        const velocityMultiplier = 1.2; // Slightly faster than parent
        fragment.velocity.multiplyScalar(velocityMultiplier);
        fragment.velocity.x += Math.cos(angle) * 0.0002;
        fragment.velocity.z += Math.sin(angle) * 0.0002;
        
        asteroidsRef.current.push(fragment);
        console.log(`✅ Created fragment ${i + 1}/${splitCount} at generation ${generation}`);
      }
    }
  }, [createImpactor2025]);

  const createLaser = useCallback((startPos: THREE.Vector3, targetAsteroid: GameAsteroid) => {
    if (!sceneRef.current) return null;

    // Create laser beam geometry
    const laserGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Bright red laser
      transparent: true,
      opacity: 0.8
    });
    
    const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial);
    
    // Position laser at start position
    laserMesh.position.copy(startPos);
    
    // Create laser beam object
    const laser: LaserBeam = {
      id: `laser-${Date.now()}-${Math.random()}`,
      mesh: laserMesh,
      startPosition: startPos.clone(),
      endPosition: targetAsteroid.mesh.position.clone(),
      progress: 0,
      targetAsteroid,
      createdAt: Date.now()
    };
    
    sceneRef.current.add(laserMesh);
    lasersRef.current.push(laser);
    
    return laser;
  }, []);

  const updateLasers = useCallback(() => {
    if (!sceneRef.current) return;

    lasersRef.current = lasersRef.current.filter(laser => {
      // Update laser progress
      laser.progress += 0.05; // Laser speed
      
      // Update laser position and orientation
      const currentPos = laser.startPosition.clone().lerp(laser.endPosition, laser.progress);
      laser.mesh.position.copy(currentPos);
      
      // Orient laser towards target
      laser.mesh.lookAt(laser.endPosition);
      laser.mesh.rotateX(Math.PI / 2); // Correct orientation for cylinder
      
      // Scale laser length based on distance traveled
      const totalDistance = laser.startPosition.distanceTo(laser.endPosition);
      const currentDistance = laser.progress * totalDistance;
      laser.mesh.scale.set(1, currentDistance, 1);
      
      // Check if laser reached target
      if (laser.progress >= 1.0) {
        // Laser hit the asteroid
        if (!laser.targetAsteroid.destroyed) {
          
          // Special handling for impactor-2025 boss asteroids
          if (laser.targetAsteroid.isImpactor2025) {
            laser.targetAsteroid.hitCount = (laser.targetAsteroid.hitCount || 0) + 1;
            console.log(`🎯 Impactor-2025 hit ${laser.targetAsteroid.hitCount}/${laser.targetAsteroid.maxHits} times`);
            
            // Check if asteroid should be destroyed or split
            if (laser.targetAsteroid.hitCount >= laser.targetAsteroid.maxHits!) {
              // Destroy the asteroid
              laser.targetAsteroid.destroyed = true;
              
              // Clean up impactor trail system immediately
              if (laser.targetAsteroid.trailSystem && sceneRef.current) {
                console.log('🧹 Cleaning up impactor trail system');
                sceneRef.current.remove(laser.targetAsteroid.trailSystem.particles);
                laser.targetAsteroid.trailSystem.particles.geometry.dispose();
                if (laser.targetAsteroid.trailSystem.particles.material instanceof THREE.Material) {
                  laser.targetAsteroid.trailSystem.particles.material.dispose();
                }
                // Clean up trail line
                if (laser.targetAsteroid.trailSystem.trailLine) {
                  sceneRef.current.remove(laser.targetAsteroid.trailSystem.trailLine);
                  laser.targetAsteroid.trailSystem.trailLine.geometry.dispose();
                  if (laser.targetAsteroid.trailSystem.trailLine.material instanceof THREE.Material) {
                    laser.targetAsteroid.trailSystem.trailLine.material.dispose();
                  }
                }
              }
              
              // Increment impactor parts destroyed counter
              setImpactorPartsDestroyed(prev => {
                const newCount = prev + 1;
                console.log(`🔴 Impactor part destroyed! Count: ${newCount}/6`);
                
                // Check for immediate victory if all 6 parts destroyed
                if (newCount >= 6) {
                  console.log('🎉 ALL IMPACTOR PARTS DESTROYED - TRIGGERING VICTORY!');
                  setTimeout(() => setGameVictory(true), 1000); // Delay for explosion effect
                }
                
                return newCount;
              });
              
              // Set impacting flag to freeze trail
              laser.targetAsteroid.impacting = true;
              
              // Update score with boss points
              const bossPoints = laser.targetAsteroid.splitGeneration === 0 ? 1000 : 
                               laser.targetAsteroid.splitGeneration === 1 ? 500 : 250;
              setScore(prev => prev + bossPoints);
              setAsteroidsDestroyed(prev => prev + 1);
              
              // Create enhanced explosion effect
              const explosionSize = laser.targetAsteroid.splitGeneration === 0 ? 1.5 : 
                                   laser.targetAsteroid.splitGeneration === 1 ? 1.0 : 0.5;
              const explosionGeometry = new THREE.SphereGeometry(explosionSize, 16, 16);
              const explosionMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.9
              });
              const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
              explosion.position.copy(laser.targetAsteroid.mesh.position);
              if (sceneRef.current) {
                sceneRef.current.add(explosion);
              }

              // Split the asteroid if not final generation
              if (laser.targetAsteroid.splitGeneration !== undefined && laser.targetAsteroid.splitGeneration < 2) {
                setTimeout(() => {
                  splitImpactor2025(laser.targetAsteroid);
                }, 1000); // Delay splitting for dramatic effect
              }

              // Animate explosion
              let explosionScale = 1;
              const explosionDuration = 2000; // Longer explosion for boss
              const startTime = Date.now();
              
              const animateExplosion = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / explosionDuration;
                
                explosionScale += 0.05;
                explosion.scale.setScalar(explosionScale);
                explosion.material.opacity = Math.max(0, 0.9 * (1 - progress));
                
                if (progress < 1) {
                  requestAnimationFrame(animateExplosion);
                } else {
                  if (sceneRef.current) {
                    sceneRef.current.remove(explosion);
                  }
                }
              };
              animateExplosion();
              
              // Only pause for the main boss (generation 0) and first split (generation 1)
              if (laser.targetAsteroid.splitGeneration !== undefined && laser.targetAsteroid.splitGeneration <= 1) {
                setTimeout(() => {
                  setSelectedAsteroid(laser.targetAsteroid.data);
                  setGamePaused(true);
                }, explosionDuration + 200);
              }
            } else {
              // Hit but not destroyed - create smaller hit effect
              const hitGeometry = new THREE.SphereGeometry(0.2, 8, 8);
              const hitMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
              });
              const hitEffect = new THREE.Mesh(hitGeometry, hitMaterial);
              hitEffect.position.copy(laser.targetAsteroid.mesh.position);
              if (sceneRef.current) {
                sceneRef.current.add(hitEffect);
                
                // Quick hit flash
                setTimeout(() => {
                  if (sceneRef.current) {
                    sceneRef.current.remove(hitEffect);
                  }
                }, 200);
              }
              
              // Small score for hitting boss
              setScore(prev => prev + 50);
            }
          } else {
            // Regular asteroid handling
            laser.targetAsteroid.destroyed = true;
            
            // Set impacting flag for hazardous asteroids to freeze their trail
            if (laser.targetAsteroid.isHazardous) {
              laser.targetAsteroid.impacting = true;
            }
            
            // Update score immediately
            const points = laser.targetAsteroid.isHazardous ? 150 : 75;
            setScore(prev => prev + points);
            setAsteroidsDestroyed(prev => prev + 1);
            
            // Create explosion effect at asteroid position
            const explosionGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const explosionMaterial = new THREE.MeshBasicMaterial({ 
              color: 0xff6600,
              transparent: true,
              opacity: 0.8
            });
            const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
            explosion.position.copy(laser.targetAsteroid.mesh.position);
            if (sceneRef.current) {
              sceneRef.current.add(explosion);
            }

            // Animate explosion
            let explosionScale = 1;
            const explosionDuration = laser.targetAsteroid.isHazardous ? 1500 : 500;
            const startTime = Date.now();
            
            const animateExplosion = () => {
              const elapsed = Date.now() - startTime;
              const progress = elapsed / explosionDuration;
              
              explosionScale += 0.1;
              explosion.scale.setScalar(explosionScale);
              explosion.material.opacity = Math.max(0, 0.8 * (1 - progress));
              
              if (progress < 1) {
                requestAnimationFrame(animateExplosion);
              } else {
                if (sceneRef.current) {
                  sceneRef.current.remove(explosion);
                }
                
                // Clean up trail for hazardous asteroids when explosion ends
                if (laser.targetAsteroid.isHazardous && laser.targetAsteroid.trailSystem && sceneRef.current) {
                  sceneRef.current.remove(laser.targetAsteroid.trailSystem.particles);
                  laser.targetAsteroid.trailSystem.particles.geometry.dispose();
                  if (laser.targetAsteroid.trailSystem.particles.material instanceof THREE.Material) {
                    laser.targetAsteroid.trailSystem.particles.material.dispose();
                  }
                  // Clean up trail line
                  if (laser.targetAsteroid.trailSystem.trailLine) {
                    sceneRef.current.remove(laser.targetAsteroid.trailSystem.trailLine);
                    laser.targetAsteroid.trailSystem.trailLine.geometry.dispose();
                    if (laser.targetAsteroid.trailSystem.trailLine.material instanceof THREE.Material) {
                      laser.targetAsteroid.trailSystem.trailLine.material.dispose();
                    }
                  }
                }
              }
            };
            animateExplosion();
            
            // Delay setting selected asteroid and pausing game until after explosion completes
            setTimeout(() => {
              setSelectedAsteroid(laser.targetAsteroid.data);
              setGamePaused(true);
            }, explosionDuration + 200);
          }
        }
        
        // Remove laser
        if (sceneRef.current) {
          sceneRef.current.remove(laser.mesh);
        }
        laser.mesh.geometry.dispose();
        if (laser.mesh.material instanceof THREE.Material) {
          laser.mesh.material.dispose();
        }
        return false;
      }
      
      return true;
    });
  }, [setSelectedAsteroid, setGamePaused, setScore, setAsteroidsDestroyed, splitImpactor2025, setImpactorPartsDestroyed]);

  const spawnWave = useCallback(() => {
    console.log('🚀 SPAWNING ASTEROIDS for wave', wave, '- Available asteroids:', asteroidData.length);
    
    // ABSOLUTE PROTECTION: Only boss for wave 6+
    if (wave >= 6) {
      console.log('🔴 WAVE 6+ DETECTED - Only boss spawning allowed');
      if (wave === 6) {
        console.log('🔴 FINAL BOSS WAVE - Spawning Impactor-2025');
        const bossAsteroid = createImpactor2025(0);
        if (bossAsteroid) {
          asteroidsRef.current.push(bossAsteroid);
          setBossSpawned(true); // Track that boss has been spawned
          console.log('✅ Successfully spawned Impactor-2025 boss asteroid');
        } else {
          console.log('❌ Failed to create Impactor-2025');
        }
      }
      return;
    }

    if (asteroidData.length === 0) {
      console.log('No asteroid data available for spawning');
      return;
    }
    
    // Progressive difficulty: more asteroids as waves increase
    let asteroidsToSpawn;
    if (wave <= 2) {
      asteroidsToSpawn = 1; // Start easy with 1 asteroid
    } else if (wave <= 5) {
      asteroidsToSpawn = 2; // Waves 3-5: 2 asteroids
    } else if (wave <= 10) {
      asteroidsToSpawn = 3; // Waves 7-10: 3 asteroids (wave 6 is boss)
    } else if (wave <= 15) {
      asteroidsToSpawn = 4; // Waves 11-15: 4 asteroids
    } else {
      asteroidsToSpawn = Math.min(5 + Math.floor((wave - 15) / 5), 8); // Waves 16+: 5-8 asteroids (cap at 8)
    }
    
    console.log(`📈 Wave ${wave} difficulty: spawning ${asteroidsToSpawn} asteroids`);
    
    for (let i = 0; i < asteroidsToSpawn; i++) {
      // Add slight delay between spawns for visual effect
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * asteroidData.length);
        const randomData = asteroidData[randomIndex];
        console.log('Selected asteroid index:', randomIndex, 'Name:', randomData.name, `(${i + 1}/${asteroidsToSpawn})`);
        
        const asteroid = createAsteroid(randomData);
        if (asteroid) {
          asteroidsRef.current.push(asteroid);
          console.log('✅ Successfully spawned asteroid:', asteroid.data.name);
        } else {
          console.log('❌ Failed to create asteroid');
        }
        
        // Log total after last asteroid is spawned
        if (i === asteroidsToSpawn - 1) {
          const totalActive = asteroidsRef.current.filter(a => !a.destroyed).length;
          console.log('🎯 Wave', wave, 'completed spawning', asteroidsToSpawn, 'asteroids. Total active:', totalActive);
        }
      }, i * 500); // 500ms delay between each asteroid spawn
    }
  }, [asteroidData, createAsteroid, createImpactor2025, wave, setBossSpawned]);

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    console.log('🎯 CLICK EVENT TRIGGERED');
    
    if (!cameraRef.current || !raycasterRef.current || !mouseRef.current) {
      console.log('❌ Missing camera, raycaster, or mouse ref');
      return;
    }

    if (gamePaused) {
      console.log('⏸️ Game is PAUSED - click should not work for asteroids');
      return;
    }

    if (!gameStarted) {
      console.log('⏸️ Game NOT STARTED - click should not work');
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    mouseRef.current.x = mouseX;
    mouseRef.current.y = mouseY;

    console.log('🎯 Click detected at:', mouseX, mouseY);
    console.log('📦 Rect:', rect);
    console.log('🖱️ Event client:', event.clientX, event.clientY);

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const activeAsteroids = asteroidsRef.current.filter(asteroid => !asteroid.destroyed);
    // Include both main mesh and collision mesh for better hit detection
    const asteroidMeshes: THREE.Object3D[] = [];
    activeAsteroids.forEach(asteroid => {
      asteroidMeshes.push(asteroid.mesh);
      const collisionMesh = (asteroid.mesh as THREE.Mesh & { collisionMesh?: THREE.Mesh }).collisionMesh;
      if (collisionMesh) {
        asteroidMeshes.push(collisionMesh);
      }
    });
    
    console.log('🌌 Active asteroids:', activeAsteroids.length);
    console.log('🎯 Checking intersection with', asteroidMeshes.length, 'meshes (including collision meshes)');
    
    if (asteroidMeshes.length === 0) {
      console.log('❌ No asteroids to check intersection with!');
      return;
    }
    
    const intersects = raycasterRef.current.intersectObjects(asteroidMeshes, true);

    console.log('💥 Intersections found:', intersects.length);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      // Find the asteroid by checking both main mesh and collision mesh
      const asteroid = activeAsteroids.find(a => 
        a.mesh === clickedMesh || 
        (a.mesh as THREE.Mesh & { collisionMesh?: THREE.Mesh }).collisionMesh === clickedMesh ||
        a.mesh === clickedMesh.parent
      );
      
      if (asteroid && !asteroid.destroyed) {
        console.log('✅ Asteroid TARGETED! Name:', asteroid.data.name);
        console.log('✅ Asteroid hazardous status:', asteroid.isHazardous);
        console.log('🔫 Firing laser at asteroid...');
        
        // Calculate laser start position (from Earth's surface towards camera)
        const earthPosition = new THREE.Vector3(0, 0, 0);
        const targetPosition = asteroid.mesh.position.clone();
        const direction = targetPosition.clone().sub(earthPosition).normalize();
        const laserStartDistance = 1.2; // Start laser just above Earth's surface
        const laserStartPosition = earthPosition.clone().add(direction.multiplyScalar(laserStartDistance));
        
        // Create and fire laser
        createLaser(laserStartPosition, asteroid);
      } else {
        console.log('❌ Found intersection but asteroid not found or already destroyed');
      }
    } else {
      console.log('❌ No intersection found - click missed all asteroids');
      
      // Debug: show where asteroids are
      activeAsteroids.forEach((asteroid, index) => {
        console.log(`Asteroid ${index}: position (${asteroid.mesh.position.x.toFixed(2)}, ${asteroid.mesh.position.y.toFixed(2)}, ${asteroid.mesh.position.z.toFixed(2)})`);
      });
    }
  }, [gamePaused, gameStarted, createLaser]);

  const gameLoop = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || gamePaused) return;

    // Update lasers
    updateLasers();

    // Animate Enhanced Earth with multiple layers
    if (enhancedEarthRef.current) {
      enhancedEarthRef.current.animate();
    }
    
    // Keep basic Earth rotation as fallback (much slower)
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002; // Reduced from 0.01 to 0.002 to match enhanced Earth
    }

    // Update camera controls for smooth user interaction
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // Update asteroids
    asteroidsRef.current = asteroidsRef.current.filter(asteroid => {
      if (asteroid.destroyed) {
        sceneRef.current?.remove(asteroid.mesh);
        // Only clean up trail system immediately for non-hazardous asteroids
        // Hazardous asteroids have delayed trail cleanup that matches explosion duration
        if (asteroid.trailSystem && !asteroid.isHazardous) {
          sceneRef.current?.remove(asteroid.trailSystem.particles);
          asteroid.trailSystem.particles.geometry.dispose();
          if (asteroid.trailSystem.particles.material instanceof THREE.Material) {
            asteroid.trailSystem.particles.material.dispose();
          }
          // Clean up trail line
          if (asteroid.trailSystem.trailLine) {
            sceneRef.current?.remove(asteroid.trailSystem.trailLine);
            asteroid.trailSystem.trailLine.geometry.dispose();
            if (asteroid.trailSystem.trailLine.material instanceof THREE.Material) {
              asteroid.trailSystem.trailLine.material.dispose();
            }
          }
          // Aura is attached to mesh, so it gets cleaned up automatically
        }
        return false;
      }

      // Update position with different behavior for hazardous vs non-hazardous
      if (asteroid.isHazardous && !asteroid.impacting) {
        asteroid.mesh.position.add(asteroid.velocity);
      }
      // Non-hazardous asteroids stay completely stationary - no position updates
      
      // Update trail system for hazardous asteroids (even when impacting to maintain visibility)
      if (asteroid.isHazardous) {
        updateAsteroidTrail(asteroid);
      }
      
      const earthPosition = new THREE.Vector3(0, 0, 0);
      const direction = earthPosition.clone().sub(asteroid.mesh.position);
      const distance = direction.length();
      
      if (asteroid.isHazardous) {
        // Hazardous asteroids are pulled toward Earth by gravity
        if (distance > 0) {
          direction.normalize();
          asteroid.velocity.add(direction.multiplyScalar(0.00005)); // Gravity effect
        }
      }
      // Non-hazardous asteroids have no forces applied - they remain stationary

      // Slower asteroid rotation
      asteroid.mesh.rotation.x += 0.005; // Reduced from 0.01
      asteroid.mesh.rotation.y += 0.008; // Reduced from 0.02

      // Update warning ring orientation
      if (asteroid.warningRing && cameraRef.current) {
        asteroid.warningRing.lookAt(cameraRef.current.position);
      }

      // Check collision with Earth (only hazardous asteroids cause damage)
      if (distance < 7.5) { // Updated for larger Earth (radius 6 + some margin)
        if (asteroid.isHazardous) {
          // Only hazardous asteroids damage Earth
          const damage = 20;
          setEarthHealth(prev => {
            const newHealth = Math.max(0, prev - damage);
            if (newHealth === 0) {
              // Only end game when Earth health reaches 0
              setGameOver(true);
            }
            return newHealth;
          });
          console.log('💥 Hazardous asteroid hit Earth! Damage:', damage);
          
          // Set impacting flag to freeze trail particles
          asteroid.impacting = true;
          
          // Create impact explosion effect at collision point
          createImpactExplosion(asteroid.mesh.position);
          
          // Remove asteroid mesh immediately but keep trail for explosion duration
          sceneRef.current?.remove(asteroid.mesh);
          
          // Schedule trail cleanup to match explosion duration (5 seconds)
          setTimeout(() => {
            if (asteroid.trailSystem && sceneRef.current) {
              sceneRef.current.remove(asteroid.trailSystem.particles);
              asteroid.trailSystem.particles.geometry.dispose();
              if (asteroid.trailSystem.particles.material instanceof THREE.Material) {
                asteroid.trailSystem.particles.material.dispose();
              }
              // Clean up trail line
              if (asteroid.trailSystem.trailLine) {
                sceneRef.current.remove(asteroid.trailSystem.trailLine);
                asteroid.trailSystem.trailLine.geometry.dispose();
                if (asteroid.trailSystem.trailLine.material instanceof THREE.Material) {
                  asteroid.trailSystem.trailLine.material.dispose();
                }
              }
              // Aura was attached to mesh, already cleaned up
            }
          }, 5000); // Match explosion duration
          
          return false; // Remove asteroid but continue game if health > 0
        } else {
          // Non-hazardous asteroids just bounce off or get destroyed without damage
          console.log('🌍 Non-hazardous asteroid safely passed by Earth');
          
          // Create smaller impact explosion for non-hazardous asteroids
          createImpactExplosion(asteroid.mesh.position, false);
          
          sceneRef.current?.remove(asteroid.mesh);
          // Clean up trail system if it exists (non-hazardous shouldn't have one, but just in case)
          if (asteroid.trailSystem) {
            sceneRef.current?.remove(asteroid.trailSystem.particles);
            asteroid.trailSystem.particles.geometry.dispose();
            if (asteroid.trailSystem.particles.material instanceof THREE.Material) {
              asteroid.trailSystem.particles.material.dispose();
            }
            // Clean up trail line
            if (asteroid.trailSystem.trailLine) {
              sceneRef.current?.remove(asteroid.trailSystem.trailLine);
              asteroid.trailSystem.trailLine.geometry.dispose();
              if (asteroid.trailSystem.trailLine.material instanceof THREE.Material) {
                asteroid.trailSystem.trailLine.material.dispose();
              }
            }
            // Aura is attached to mesh, so it gets cleaned up automatically
          }
          return false;
        }
      }

      // Remove if too far away
      if (distance > 100) { // Increased removal distance for larger Earth scale
        sceneRef.current?.remove(asteroid.mesh);
        // Clean up trail system if it exists
        if (asteroid.trailSystem) {
          sceneRef.current?.remove(asteroid.trailSystem.particles);
          asteroid.trailSystem.particles.geometry.dispose();
          if (asteroid.trailSystem.particles.material instanceof THREE.Material) {
            asteroid.trailSystem.particles.material.dispose();
          }
          // Clean up trail line
          if (asteroid.trailSystem.trailLine) {
            sceneRef.current?.remove(asteroid.trailSystem.trailLine);
            asteroid.trailSystem.trailLine.geometry.dispose();
            if (asteroid.trailSystem.trailLine.material instanceof THREE.Material) {
              asteroid.trailSystem.trailLine.material.dispose();
            }
          }
          // Aura is attached to mesh, so it gets cleaned up automatically
        }
        return false;
      }

      return true;
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    if (gameStarted && !gameOver && !gameVictory) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameStarted, gameOver, gameVictory, gamePaused, createImpactExplosion, updateAsteroidTrail, updateLasers]);

  const startGame = () => {
    console.log('Starting game...');
    setGameStarted(true);
    setGameOver(false);
    setGameVictory(false);
    setShowBossCutscene(false);
    setBossSpawned(false);
    setImpactorPartsDestroyed(0);
    setScore(0);
    setWave(1);
    setAsteroidsDestroyed(0);
    setEarthHealth(100);
    
    // Clear existing asteroids and their trail systems
    asteroidsRef.current.forEach(asteroid => {
      if (sceneRef.current) {
        sceneRef.current.remove(asteroid.mesh);
        
        // Clean up trail system if it exists
        if (asteroid.trailSystem) {
          sceneRef.current.remove(asteroid.trailSystem.particles);
          asteroid.trailSystem.particles.geometry.dispose();
          if (asteroid.trailSystem.particles.material instanceof THREE.Material) {
            asteroid.trailSystem.particles.material.dispose();
          }
          // Clean up trail line
          if (asteroid.trailSystem.trailLine) {
            sceneRef.current.remove(asteroid.trailSystem.trailLine);
            asteroid.trailSystem.trailLine.geometry.dispose();
            if (asteroid.trailSystem.trailLine.material instanceof THREE.Material) {
              asteroid.trailSystem.trailLine.material.dispose();
            }
          }
        }
        
        // Dispose asteroid mesh
        asteroid.mesh.geometry.dispose();
        if (asteroid.mesh.material instanceof THREE.Material) {
          asteroid.mesh.material.dispose();
        }
      }
    });
    asteroidsRef.current = [];
    
    // Clear any active lasers
    lasersRef.current.forEach(laser => {
      if (sceneRef.current) {
        sceneRef.current.remove(laser.mesh);
        laser.mesh.geometry.dispose();
        if (laser.mesh.material instanceof THREE.Material) {
          laser.mesh.material.dispose();
        }
      }
    });
    lasersRef.current = [];
    
    spawnWave();
  };

  const continueGame = () => {
    setGamePaused(false);
    setSelectedAsteroid(null); // Clear selected asteroid when continuing
  };

  const continueToBoss = () => {
    console.log('🚀 Continuing to boss wave 6');
    setShowBossCutscene(false);
    setWave(6);
    
    // Clear only asteroids and related debris, not the entire scene
    asteroidsRef.current.forEach(asteroid => {
      if (sceneRef.current) {
        sceneRef.current.remove(asteroid.mesh);
        
        // Clean up trail system if it exists
        if (asteroid.trailSystem) {
          sceneRef.current.remove(asteroid.trailSystem.particles);
          asteroid.trailSystem.particles.geometry.dispose();
          if (asteroid.trailSystem.particles.material instanceof THREE.Material) {
            asteroid.trailSystem.particles.material.dispose();
          }
          // Clean up trail line
          if (asteroid.trailSystem.trailLine) {
            sceneRef.current.remove(asteroid.trailSystem.trailLine);
            asteroid.trailSystem.trailLine.geometry.dispose();
            if (asteroid.trailSystem.trailLine.material instanceof THREE.Material) {
              asteroid.trailSystem.trailLine.material.dispose();
            }
          }
        }
        
        // Dispose asteroid mesh
        asteroid.mesh.geometry.dispose();
        if (asteroid.mesh.material instanceof THREE.Material) {
          asteroid.mesh.material.dispose();
        }
      }
    });
    asteroidsRef.current = [];
    
    // Clear any active lasers
    lasersRef.current.forEach(laser => {
      if (sceneRef.current) {
        sceneRef.current.remove(laser.mesh);
        laser.mesh.geometry.dispose();
        if (laser.mesh.material instanceof THREE.Material) {
          laser.mesh.material.dispose();
        }
      }
    });
    lasersRef.current = [];
    
    // Force spawn ONLY the boss after a brief delay
    setTimeout(() => {
      console.log('⚡ BOSS ONLY - Manually spawning Impactor-2025 for wave 6');
      const bossAsteroid = createImpactor2025(0);
      if (bossAsteroid) {
        asteroidsRef.current.push(bossAsteroid);
        setBossSpawned(true);
        console.log('✅ Successfully spawned ONLY Impactor-2025 boss asteroid');
      } else {
        console.log('❌ Failed to create Impactor-2025');
      }
    }, 500);
  };

  // Game loop
  useEffect(() => {
    if (gameStarted && !gameOver && !gameVictory) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, gameVictory, gameLoop]);

  // Victory detection for boss fight
  useEffect(() => {
    if (wave === 6 && bossSpawned && impactorPartsDestroyed >= 6 && !gameVictory) {
      console.log('🎉 BOSS VICTORY DETECTED! All 6 impactor parts destroyed!');
      setGameVictory(true);
    }
  }, [wave, bossSpawned, impactorPartsDestroyed, gameVictory]);

  // Spawn new waves with longer delays
  useEffect(() => {
    // ABSOLUTELY NO WAVE SPAWNING DURING BOSS FIGHT
    if (wave >= 6) {
      console.log('🚫 BLOCKED: Wave progression blocked for wave', wave, '- Boss fight in progress');
      return;
    }
    
    const activeAsteroids = asteroidsRef.current.filter(a => !a.destroyed);
    console.log('Wave check - Active asteroids:', activeAsteroids.length, 'Destroyed:', asteroidsDestroyed, 'Game started:', gameStarted, 'Game over:', gameOver, 'Game paused:', gamePaused, 'Current wave:', wave, 'Cutscene:', showBossCutscene, 'Impactor parts:', impactorPartsDestroyed);
    
    // Don't check wave progression during cutscene
    if (showBossCutscene) {
      console.log('⏸️ Skipping wave progression - cutscene is showing');
      return;
    }
    
    // Don't spawn new waves if we're already on wave 6 or higher (boss fight)
    if (wave >= 6) {
      console.log('🔴 Wave 6+ detected - NO MORE WAVES during boss fight');
      return;
    }
    
    // Spawn a new wave if:
    // 1. Game is started and not over/paused
    // 2. No active asteroids remaining 
    // 3. Wave number is reasonable (not stuck)
    // 4. Not showing cutscene
    // 5. Not during boss fight (wave < 6)
    if (gameStarted && !gameOver && !gameVictory && !gamePaused && activeAsteroids.length === 0) {
      // Show cutscene before wave 6 (final boss)
      if (wave === 5) {
        console.log('📽️ Showing boss cutscene after wave 5');
        setShowBossCutscene(true);
        return;
      }
      
      console.log('Conditions met for new wave - Starting wave timer for wave', wave + 1);
      const timer = setTimeout(() => {
        console.log('Timer fired - Spawning new wave', wave + 1);
        setWave(prev => {
          const newWave = prev + 1;
          console.log('Wave incremented from', prev, 'to', newWave);
          return newWave;
        });
        // Force spawn regardless of current state
        setTimeout(() => {
          console.log('Delayed spawn call for wave', wave + 1);
          spawnWave();
        }, 100);
      }, 3000); // 3 seconds delay

      return () => {
        console.log('Clearing wave timer for wave', wave);
        clearTimeout(timer);
      };
    } else {
      console.log('Wave spawn conditions not met:', {
        gameStarted,
        gameOver,
        gamePaused,
        activeAsteroids: activeAsteroids.length,
        wave
      });
    }
  }, [gameStarted, gameOver, gameVictory, gamePaused, asteroidsDestroyed, spawnWave, wave, showBossCutscene, bossSpawned, impactorPartsDestroyed]);

  // Backup wave spawning mechanism - ensures game continues
  useEffect(() => {
    if (!gameStarted || gameOver || gameVictory || gamePaused) return;
    
    const interval = setInterval(() => {
      const activeAsteroids = asteroidsRef.current.filter(a => !a.destroyed);
      console.log('Backup check - Active asteroids:', activeAsteroids.length, 'Wave:', wave);
      
      // If no asteroids are active for more than 5 seconds, force spawn
      if (activeAsteroids.length === 0) {
        console.log('Backup spawning triggered for wave', wave + 1);
        setWave(prev => prev + 1);
        spawnWave();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, gameVictory, gamePaused, spawnWave, wave]);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full cursor-crosshair" onClick={handleClick} />
        
        {/* Game UI */}
        <div className="absolute top-4 left-4 text-white z-10">
          <div className="bg-black bg-opacity-70 p-4 rounded">
            <h1 className="text-2xl font-bold mb-2">Asteroid Defense 3D</h1>
            <p>Score: {score}</p>
            <p>Wave: {wave}</p>
            <p>Destroyed: {asteroidsDestroyed}</p>
            <p>Active Asteroids: {asteroidsRef.current?.filter(a => !a.destroyed).length || 0}</p>
            {/* Wave Difficulty Indicator */}
            <div className="mt-2">
              <p className="text-sm text-cyan-400">Wave Difficulty:</p>
              <p className="text-xs text-gray-300">
                {wave <= 2 ? '1 asteroid per wave' :
                 wave <= 5 ? '2 asteroids per wave' :
                 wave <= 10 ? '3 asteroids per wave' :
                 wave <= 15 ? '4 asteroids per wave' :
                 `${Math.min(5 + Math.floor((wave - 15) / 5), 8)} asteroids per wave`}
              </p>
            </div>
            {gamePaused && (
              <p className="text-yellow-400 font-bold mt-2">⏸️ GAME PAUSED</p>
            )}
            <div className="mt-2">
              <p className="text-sm">Earth Health:</p>
              <div className="w-32 bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    earthHealth > 60 ? 'bg-green-500' : 
                    earthHealth > 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${earthHealth}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1">{earthHealth}/100</p>
            </div>
            <p className="text-sm mt-2 text-gray-300">Click asteroids to destroy them!</p>
            <p className="text-xs mt-1 text-gray-400">Loaded asteroids: {asteroidData.length}</p>
            {selectedAsteroid && (
              <p className="text-xs mt-1 text-yellow-400">Selected: {selectedAsteroid.name}</p>
            )}
          </div>
        </div>

        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4">Asteroid Defense 3D</h1>
              <p className="text-lg mb-6">Protect Earth by clicking on incoming asteroids!</p>
              <p className="text-sm mb-2">🔴 Red rings = Hazardous asteroids on collision course (150 points, 20 damage)</p>
              <p className="text-sm mb-4">🟢 Green rings = Non-hazardous asteroids in safe orbit (75 points, 10 damage)</p>
              <p className="text-xs mb-6 text-yellow-400">
                🚀 Hazardous asteroids head straight for Earth!<br/>
                � Larger click areas for better hit detection<br/>
                🔄 One asteroid at a time - click to pause and view details<br/>
                ⏸️ Game pauses when you click an asteroid for information
              </p>
              <button
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
                disabled={asteroidData.length === 0}
              >
                {asteroidData.length === 0 ? 'Loading...' : 'Start Game'}
              </button>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-20">
            <div className="text-center text-white">
              {/* End Game GIF */}
              <div className="mb-6">
                <Image 
                  src="/images/endGameGif.gif" 
                  alt="Earth Destroyed" 
                  width={400}
                  height={300}
                  className="mx-auto rounded-lg shadow-2xl"
                  unoptimized={true}
                />
              </div>
              
              <h1 className="text-4xl font-bold mb-4 text-red-500">GAME OVER</h1>
              <p className="text-xl mb-2">Earth has been destroyed!</p>
              <p className="text-lg mb-2">Final Score: {score}</p>
              <p className="text-lg mb-2">Waves Survived: {wave}</p>
              <p className="text-lg mb-6">Asteroids Destroyed: {asteroidsDestroyed}</p>
              <button
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {gameVictory && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-20">
            <div className="text-center text-white">
              {/* Victory celebration */}
              <div className="mb-6">
                <div className="text-8xl mb-4">🌍✨</div>
                <div className="text-6xl mb-4">🎉</div>
              </div>
              
              <h1 className="text-5xl font-bold mb-4 text-green-400">YOU SAVED THE EARTH!</h1>
              <p className="text-2xl mb-4 text-yellow-300">Impactor-2025 Destroyed!</p>
              <p className="text-xl mb-2">You successfully defeated the massive asteroid</p>
              <p className="text-xl mb-2">and all its deadly fragments!</p>
              <p className="text-lg mb-2 text-red-400">💥 Impactor Parts Destroyed: {impactorPartsDestroyed}/6</p>
              <p className="text-lg mb-2 text-blue-300">Final Score: {score}</p>
              <p className="text-lg mb-2 text-blue-300">Waves Completed: {wave}</p>
              <p className="text-lg mb-6 text-blue-300">Asteroids Destroyed: {asteroidsDestroyed}</p>
              <p className="text-lg mb-6 text-green-300">🏆 EARTH DEFENDER CHAMPION 🏆</p>
              <button
                onClick={startGame}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded text-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {showBossCutscene && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-20">
            <div className="text-center text-white">
              {/* Warning visuals */}
              <div className="mb-6">
                <div className="text-8xl mb-4 animate-pulse">⚠️</div>
                <div className="text-6xl mb-4 text-red-500">💀</div>
                <div className="text-8xl mb-4">☄️</div>
              </div>
              
              <h1 className="text-4xl font-bold mb-4 text-red-400 animate-pulse">INCOMING THREAT DETECTED</h1>
              <p className="text-2xl mb-4 text-yellow-300">MASSIVE ASTEROID APPROACHING</p>
              <p className="text-xl mb-2">Scientists have detected Impactor-2025,</p>
              <p className="text-xl mb-2">a massive asteroid on a collision course with Earth!</p>
              <p className="text-lg mb-4 text-orange-300">This is our final battle...</p>
              <p className="text-md mb-6 text-gray-300">
                ⚠️ Warning: This asteroid requires multiple hits to destroy<br/>
                🔴 It will split into smaller but deadly fragments<br/>
                🌍 The fate of Earth depends on you!
              </p>
              <button
                onClick={continueToBoss}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded text-xl animate-pulse"
              >
                ENGAGE FINAL BATTLE
              </button>
            </div>
          </div>
        )}
      </div>

      <AsteroidInfoPanel asteroid={selectedAsteroid} onContinue={continueGame} />
    </div>
  );
};