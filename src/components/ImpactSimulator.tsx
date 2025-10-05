// components/ImpactSimulator.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EnhancedEarth } from "@/lib/EnhancedEarth";

interface ImpactSimulatorProps {
  asteroidParams: {
    diameter: number;
    velocity: number;
    angle: number;
    distance: number;
  };
  isSimulating: boolean;
  hasImpacted: boolean;
  onImpact: () => void;
  onDistanceUpdate?: (distance: number) => void;
}

// Scale constants
const EARTH_RADIUS_UNITS = 6; // Earth radius in scene units
const EARTH_RADIUS_KM = 6371; // Earth's actual radius in km
const KM_PER_UNIT = EARTH_RADIUS_KM / EARTH_RADIUS_UNITS; // ~1,062 km per scene unit

export default function ImpactSimulator({
  asteroidParams,
  isSimulating,
  hasImpacted,
  onImpact,
  onDistanceUpdate,
}: ImpactSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const enhancedEarthRef = useRef<EnhancedEarth | null>(null);
  const asteroidRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Simulation state
  const asteroidVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const explosionParticlesRef = useRef<THREE.Mesh[]>([]);
  const asteroidTrailRef = useRef<THREE.Mesh[]>([]);
  const impactOccurredRef = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // Dark space background
    sceneRef.current = scene;

    // Setup camera - SLIGHTLY FURTHER OUT
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      10000 // Increased far plane for distant stars
    );
    camera.position.set(0, 8, 22); // Zoomed out a bit more
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 8; // Slightly closer minimum
    controls.maxDistance = 500; // Much further maximum for seeing stars
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.update();
    controlsRef.current = controls;

    // Create Enhanced Earth
    const enhancedEarth = new EnhancedEarth(scene);
    enhancedEarth.setScale(EARTH_RADIUS_UNITS);
    enhancedEarthRef.current = enhancedEarth;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2, 0.5, 1.5);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Add realistic starfield - FAR AWAY
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starColors = [];
    const starSizes = [];

    // Create lots of stars at extreme distances
    for (let i = 0; i < 3000; i++) {
      // Use spherical coordinates for even distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());

      // Much farther distances for realistic space
      let radius;
      if (i < 5000) {
        // Far background stars
        radius = 4000 + Math.random() * 1000; // 4000-5000 units away
      } else if (i < 8000) {
        // Mid-distance stars
        radius = 3000 + Math.random() * 1000; // 3000-4000 units away
      } else {
        // "Closer" bright stars (still very far)
        radius = 2000 + Math.random() * 1000; // 2000-3000 units away
      }

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      starsVertices.push(x, y, z);

      // Vary star colors slightly
      const colorVariation = Math.random();
      if (colorVariation < 0.7) {
        starColors.push(1, 1, 1); // White
      } else if (colorVariation < 0.85) {
        starColors.push(0.8, 0.9, 1); // Blue-white
      } else {
        starColors.push(1, 0.98, 0.8); // Yellow-white
      }

      // Vary sizes for brightness variation
      starSizes.push(Math.random() * 1.5 + 0.5);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3)
    );
    starsGeometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(starSizes, 1)
    );

    const starsMaterial = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: false, // Keep stars same visual size regardless of distance
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false, // Prevent depth issues
      blending: THREE.AdditiveBlending, // Makes stars glow nicely
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Create asteroid
    const createAsteroid = () => {
      // Scale asteroid size appropriately
      const radius = asteroidParams.diameter / 1000;
      const asteroidGeometry = new THREE.IcosahedronGeometry(radius, 1);

      // Make it irregular
      const positions = asteroidGeometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const vertex = new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        );
        vertex.multiplyScalar(0.8 + Math.random() * 0.4);
        positions[i] = vertex.x;
        positions[i + 1] = vertex.y;
        positions[i + 2] = vertex.z;
      }
      asteroidGeometry.attributes.position.needsUpdate = true;
      asteroidGeometry.computeVertexNormals();

      // Hazardous asteroid coloring
      const asteroidMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b0000, // Dark red
        shininess: 30,
        emissive: 0x442211,
        emissiveIntensity: 0.1,
      });

      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);

      // Position asteroid at starting distance
      const scaledDistance =
        asteroidParams.distance / KM_PER_UNIT + EARTH_RADIUS_UNITS;
      const angle = (asteroidParams.angle * Math.PI) / 180;

      asteroid.position.set(
        Math.cos(angle) * scaledDistance,
        Math.sin(angle) * scaledDistance * 0.5,
        Math.sin(angle) * scaledDistance
      );

      // Initial velocity toward Earth (SLOWER for cinematic effect)
      const direction = new THREE.Vector3(0, 0, 0)
        .sub(asteroid.position)
        .normalize();
      const speed = asteroidParams.velocity * 0.0005; // Reduced from 0.001 to 0.0003
      asteroidVelocityRef.current = direction.multiplyScalar(speed);

      asteroid.castShadow = true;
      asteroid.receiveShadow = true;

      return asteroid;
    };

    const asteroid = createAsteroid();
    scene.add(asteroid);
    asteroidRef.current = asteroid;

    // Add hazardous warning ring
    const ringGeometry = new THREE.RingGeometry(
      asteroid.geometry.boundingSphere?.radius || 0.5 * 2.5,
      asteroid.geometry.boundingSphere?.radius || 0.5 * 3,
      16
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    asteroid.add(ring);

    // Window resize handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      controlsRef.current?.update();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      controlsRef.current?.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [asteroidParams]);

  // Create explosion effect
  const createExplosion = useCallback(
    (position: THREE.Vector3) => {
      if (!sceneRef.current) return;

      // Clear old explosion particles
      explosionParticlesRef.current.forEach((particle) => {
        sceneRef.current?.remove(particle);
      });
      explosionParticlesRef.current = [];

      // Create explosion particles
      for (let i = 0; i < 20; i++) {
        const particleGeometry = new THREE.SphereGeometry(
          0.1 + Math.random() * 0.2,
          4,
          4
        );
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: 0xffa500, // Orange
          transparent: true,
          opacity: 1,
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);

        // Random explosion direction
        const angle = (i / 20) * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.2;
        particle.userData.velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.random() * 0.3,
          Math.sin(angle) * speed
        );

        sceneRef.current.add(particle);
        explosionParticlesRef.current.push(particle);
      }

      onImpact();
    },
    [onImpact]
  );

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const earthRadius = EARTH_RADIUS_UNITS;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Animate Enhanced Earth
      if (enhancedEarthRef.current) {
        enhancedEarthRef.current.animate();
      }

      // Asteroid simulation
      if (
        isSimulating &&
        asteroidRef.current &&
        !hasImpacted &&
        !impactOccurredRef.current
      ) {
        const asteroid = asteroidRef.current;

        // Calculate distance to Earth center
        const earthPosition = new THREE.Vector3(0, 0, 0);
        const distanceToEarthCenter = asteroid.position.length();

        // Convert to kilometers from surface
        const distanceFromSurface = Math.max(
          0,
          (distanceToEarthCenter - EARTH_RADIUS_UNITS) * KM_PER_UNIT
        );
        onDistanceUpdate?.(distanceFromSurface);

        // Apply gravity (REDUCED for slower, more cinematic descent)
        const gravityDirection = earthPosition
          .clone()
          .sub(asteroid.position)
          .normalize();
        const gravity = 0.0005 * (50 / Math.max(distanceToEarthCenter, 1)); // Reduced from 0.001 to 0.0003
        asteroidVelocityRef.current.add(
          gravityDirection.multiplyScalar(gravity)
        );

        // Update position
        asteroid.position.add(asteroidVelocityRef.current);

        // Rotate asteroid
        asteroid.rotation.x += 0.02;
        asteroid.rotation.y += 0.03;

        // Update warning ring orientation to face camera
        const ring = asteroid.children[0];
        if (ring) {
          ring.lookAt(camera.position);
        }

        // Create trail effect
        if (Math.random() > 0.3) {
          const trailGeometry = new THREE.SphereGeometry(0.05, 4, 4);
          const trailMaterial = new THREE.MeshBasicMaterial({
            color: distanceToEarthCenter < 20 ? 0xff0000 : 0xff4500,
            transparent: true,
            opacity: 0.7,
          });
          const trail = new THREE.Mesh(trailGeometry, trailMaterial);
          trail.position.copy(asteroid.position);
          scene.add(trail);
          asteroidTrailRef.current.push(trail);

          // Remove old trail points
          if (asteroidTrailRef.current.length > 30) {
            const oldTrail = asteroidTrailRef.current.shift();
            if (oldTrail) scene.remove(oldTrail);
          }
        }

        // Dynamic camera movement during approach - adjusted for closer view
        if (distanceToEarthCenter > 25) {
          camera.position.lerp(new THREE.Vector3(5, 10, 25), 0.02);
        } else if (distanceToEarthCenter > 15) {
          const offset = asteroid.position
            .clone()
            .normalize()
            .multiplyScalar(-15);
          offset.y += 8;
          camera.position.lerp(asteroid.position.clone().add(offset), 0.05);
        } else {
          camera.position.lerp(new THREE.Vector3(4, 6, 15), 0.05);
        }
        camera.lookAt(0, 0, 0);

        // Check for impact
        if (
          distanceToEarthCenter <=
          earthRadius + (asteroid.geometry.boundingSphere?.radius || 0.5)
        ) {
          asteroid.visible = false;
          createExplosion(asteroid.position);
          impactOccurredRef.current = true;
        }
      } else if (!isSimulating) {
        // Update orbit controls when not simulating
        controlsRef.current?.update();
      }

      // Animate explosion particles
      explosionParticlesRef.current.forEach((particle, index) => {
        if (particle.userData.velocity) {
          particle.position.add(particle.userData.velocity);
          particle.userData.velocity.multiplyScalar(0.95);

          // Fade out
          const material = particle.material as THREE.MeshBasicMaterial;
          material.opacity -= 0.02;

          if (material.opacity <= 0) {
            scene.remove(particle);
            explosionParticlesRef.current.splice(index, 1);
          }
        }
      });

      // Fade trail
      asteroidTrailRef.current.forEach((trail, index) => {
        const material = trail.material as THREE.MeshBasicMaterial;
        material.opacity -= 0.01;
        if (material.opacity <= 0) {
          scene.remove(trail);
          asteroidTrailRef.current.splice(index, 1);
        }
      });

      // Camera shake on impact
      if (
        impactOccurredRef.current &&
        explosionParticlesRef.current.length > 15
      ) {
        const shake = 0.2;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
      }

      // Idle asteroid rotation when not simulating
      if (!isSimulating && asteroidRef.current) {
        asteroidRef.current.rotation.x += 0.003;
        asteroidRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isSimulating, hasImpacted, createExplosion, onDistanceUpdate]);

  // Reset when simulation stops
  useEffect(() => {
    if (
      !hasImpacted &&
      !isSimulating &&
      sceneRef.current &&
      asteroidRef.current
    ) {
      // Clear effects
      asteroidTrailRef.current.forEach((trail) =>
        sceneRef.current?.remove(trail)
      );
      asteroidTrailRef.current = [];
      explosionParticlesRef.current.forEach((particle) =>
        sceneRef.current?.remove(particle)
      );
      explosionParticlesRef.current = [];
      impactOccurredRef.current = false;

      // Reset asteroid
      asteroidRef.current.visible = true;
      const scaledDistance =
        asteroidParams.distance / KM_PER_UNIT + EARTH_RADIUS_UNITS;
      const angle = (asteroidParams.angle * Math.PI) / 180;
      asteroidRef.current.position.set(
        Math.cos(angle) * scaledDistance,
        Math.sin(angle) * scaledDistance * 0.5,
        Math.sin(angle) * scaledDistance
      );

      // Reset velocity
      const direction = new THREE.Vector3(0, 0, 0)
        .sub(asteroidRef.current.position)
        .normalize();
      const speed = asteroidParams.velocity * 0.001;
      asteroidVelocityRef.current = direction.multiplyScalar(speed);

      // Reset camera - matching closer initial position
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 8, 22);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current?.update();
      }
    }
  }, [hasImpacted, isSimulating, asteroidParams]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
