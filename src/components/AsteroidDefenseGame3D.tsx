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

interface GameAsteroid {
  id: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  isHazardous: boolean;
  data: AsteroidData;
  destroyed: boolean;
  warningRing?: THREE.Mesh;
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
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [selectedAsteroid, setSelectedAsteroid] = useState<AsteroidData | null>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
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

  const createAsteroid = useCallback((data: AsteroidData): GameAsteroid | null => {
    if (!sceneRef.current) {
      console.log('❌ No scene available for asteroid creation');
      return null;
    }

    console.log('🚀 Creating asteroid:', data.name, 'Hazardous:', data.is_potentially_hazardous_asteroid);

    // Asteroid geometry and material with larger clickable area
    const diameter = data.estimated_diameter.kilometers.estimated_diameter_max;
    const radius = Math.max(0.3, Math.min(1.2, diameter * 4)); // Increased size even more for easier clicking
    
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
      color: data.is_potentially_hazardous_asteroid ? 0x8B0000 : 0x696969,
      shininess: 30
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
      // Non-hazardous asteroids spawn closer for tighter orbits (updated for larger Earth)
      distance = 15 + Math.random() * 8; // Updated: 15-23 units from larger Earth
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
      // Non-hazardous asteroids orbit around Earth (safe)
      const orbitRadius = Math.sqrt(mesh.position.x ** 2 + mesh.position.z ** 2);
      const orbitSpeed = 0.0003 + Math.random() * 0.0002; // Much slower orbital speed
      
      // Calculate tangential velocity for circular orbit (perpendicular to radius)
      // Normalize the orbital speed to prevent asteroids from flying away
      const normalizedOrbitSpeed = orbitSpeed / Math.max(orbitRadius, 1);
      
      velocity = new THREE.Vector3(
        -mesh.position.z * normalizedOrbitSpeed, // Perpendicular to radius for orbit
        (Math.random() - 0.5) * 0.00005, // Very slight vertical movement
        mesh.position.x * normalizedOrbitSpeed   // Perpendicular to radius for orbit
      );
      console.log('🟢 Non-hazardous asteroid - orbiting Earth with speed:', normalizedOrbitSpeed.toFixed(6));
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

  const spawnWave = useCallback(() => {
    if (asteroidData.length === 0) {
      console.log('No asteroid data available for spawning');
      return;
    }

    console.log('🚀 SPAWNING ASTEROID for wave', wave, '- Available asteroids:', asteroidData.length);
    
    // Spawn multiple asteroids for higher waves to increase difficulty
    const asteroidsToSpawn = Math.min(1 + Math.floor(wave / 5), 3); // 1-3 asteroids depending on wave
    
    for (let i = 0; i < asteroidsToSpawn; i++) {
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
    }
    
    const totalActive = asteroidsRef.current.filter(a => !a.destroyed).length;
    console.log('🎯 Wave', wave, 'spawned', asteroidsToSpawn, 'asteroids. Total active:', totalActive);
  }, [asteroidData, createAsteroid, wave]);

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
        console.log('✅ Asteroid HIT! Name:', asteroid.data.name);
        console.log('✅ Asteroid hazardous status:', asteroid.isHazardous);
        console.log('✅ Asteroid data being set:', asteroid.data);
        
        asteroid.destroyed = true;
        setSelectedAsteroid(asteroid.data);
        setGamePaused(true); // Pause the game when asteroid is clicked
        
        // Different scoring: hazardous give more points since they're the main threat
        const points = asteroid.isHazardous ? 150 : 75; // Better reward for all asteroids
        setScore(prev => prev + points);
        setAsteroidsDestroyed(prev => prev + 1);

        // Add explosion effect
        const explosionGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xff6600,
          transparent: true,
          opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(asteroid.mesh.position);
        sceneRef.current?.add(explosion);

        // Animate explosion
        let explosionScale = 1;
        const animateExplosion = () => {
          explosionScale += 0.1;
          explosion.scale.setScalar(explosionScale);
          explosion.material.opacity -= 0.05;
          
          if (explosion.material.opacity > 0) {
            requestAnimationFrame(animateExplosion);
          } else {
            sceneRef.current?.remove(explosion);
          }
        };
        animateExplosion();
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
  }, [gamePaused, gameStarted]);

  const gameLoop = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || gamePaused) return;

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
        return false;
      }

      // Update position with different behavior for hazardous vs non-hazardous
      asteroid.mesh.position.add(asteroid.velocity);
      
      // For non-hazardous asteroids, add boundary enforcement
      if (!asteroid.isHazardous) {
        const position = asteroid.mesh.position;
        const distanceFromCenter = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        
        // If asteroid gets too far from Earth, apply centripetal force
        if (distanceFromCenter > 30) { // Updated for larger Earth scale
          console.log('🛰️ Asteroid too far, applying centripetal force');
          const centerDirection = position.clone().negate().normalize();
          asteroid.velocity.add(centerDirection.multiplyScalar(0.0003));
        }
        
        // If asteroid gets too close, apply outward force
        if (distanceFromCenter < 10) { // Updated minimum distance for larger Earth
          console.log('🛰️ Asteroid too close, applying outward force');
          const outwardDirection = position.clone().normalize();
          asteroid.velocity.add(outwardDirection.multiplyScalar(0.0001));
        }
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
      } else {
        // Non-hazardous asteroids maintain stable orbit
        // Apply slight centripetal force to maintain orbit
        if (distance > 0) {
          const orbitRadius = 18 + Math.random() * 12; // Updated target orbit radius for larger Earth
          const radiusDiff = distance - orbitRadius;
          
          if (Math.abs(radiusDiff) > 1) {
            // Gentle force to maintain orbit distance
            direction.normalize();
            const correctionForce = radiusDiff > 0 ? -0.00002 : 0.00002;
            asteroid.velocity.add(direction.multiplyScalar(correctionForce));
          }
        }
      }

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
          sceneRef.current?.remove(asteroid.mesh);
          return false; // Remove asteroid but continue game if health > 0
        } else {
          // Non-hazardous asteroids just bounce off or get destroyed without damage
          console.log('🌍 Non-hazardous asteroid safely passed by Earth');
          sceneRef.current?.remove(asteroid.mesh);
          return false;
        }
      }

      // Remove if too far away
      if (distance > 100) { // Increased removal distance for larger Earth scale
        sceneRef.current?.remove(asteroid.mesh);
        return false;
      }

      return true;
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    if (gameStarted && !gameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameStarted, gameOver, gamePaused]);

  const startGame = () => {
    console.log('Starting game...');
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setWave(1);
    setAsteroidsDestroyed(0);
    setEarthHealth(100);
    
    // Clear existing asteroids
    asteroidsRef.current.forEach(asteroid => {
      sceneRef.current?.remove(asteroid.mesh);
    });
    asteroidsRef.current = [];
    
    spawnWave();
  };

  const continueGame = () => {
    setGamePaused(false);
    setSelectedAsteroid(null); // Clear selected asteroid when continuing
  };

  // Game loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, gameLoop]);

  // Spawn new waves with longer delays
  useEffect(() => {
    const activeAsteroids = asteroidsRef.current.filter(a => !a.destroyed);
    console.log('Wave check - Active asteroids:', activeAsteroids.length, 'Destroyed:', asteroidsDestroyed, 'Game started:', gameStarted, 'Game over:', gameOver, 'Game paused:', gamePaused, 'Current wave:', wave);
    
    // Spawn a new wave if:
    // 1. Game is started and not over/paused
    // 2. No active asteroids remaining 
    // 3. Wave number is reasonable (not stuck)
    if (gameStarted && !gameOver && !gamePaused && activeAsteroids.length === 0) {
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
  }, [gameStarted, gameOver, gamePaused, asteroidsDestroyed, spawnWave, wave]);

  // Backup wave spawning mechanism - ensures game continues
  useEffect(() => {
    if (!gameStarted || gameOver || gamePaused) return;
    
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
  }, [gameStarted, gameOver, gamePaused, spawnWave, wave]);

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
      </div>

      <AsteroidInfoPanel asteroid={selectedAsteroid} onContinue={continueGame} />
    </div>
  );
};