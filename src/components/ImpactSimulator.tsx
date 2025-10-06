/* eslint-disable @typescript-eslint/no-explicit-any */
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
const EARTH_RADIUS_UNITS = 6;
const EARTH_RADIUS_KM = 6371;
const KM_PER_UNIT = EARTH_RADIUS_KM / EARTH_RADIUS_UNITS;

// Create asteroid using simple vertex offset (from codepen example)
// Create asteroid using simplified version of sidebar geometry
function createAsteroidFromPreview(diameter: number): THREE.Mesh {
  const size = diameter / 1000;
  // Lower subdivision for performance (2 instead of 5)
  const geometry = new THREE.IcosahedronGeometry(size, 1);

  const positionAttribute = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();

  // Single pass: create irregular organic shape (no smoothing)
  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);

    const length = vertex.length();
    vertex.normalize();

    // Same noise pattern as sidebar
    const noise1 =
      Math.sin(vertex.x * 2.1 + vertex.y * 1.7) *
      Math.cos(vertex.z * 2.3) *
      0.25;
    const noise2 =
      Math.sin(vertex.y * 3.2 + vertex.z * 2.8) *
      Math.cos(vertex.x * 3.1) *
      0.18;
    const noise3 =
      Math.sin(vertex.z * 1.9 + vertex.x * 2.2) *
      Math.cos(vertex.y * 1.8) *
      0.15;

    const displacement = 1 + noise1 + noise2 + noise3;
    vertex.multiplyScalar(length * displacement);

    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xccccdd,
    roughness: 0.85,
    metalness: 0.08,
    flatShading: false,
  });

  const asteroid = new THREE.Mesh(geometry, material);
  asteroid.castShadow = true;
  asteroid.receiveShadow = true;

  return asteroid;
}

// Create simple debris rock
function createDebrisRock(THREE: any, size: number): any {
  // Higher subdivision for smoother surface (4 instead of 1)
  const geometry = new THREE.IcosahedronGeometry(size, 1);

  const positionAttribute = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  const smoothedPositions: number[] = [];

  // First pass: create organic irregular shape with layered noise
  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);

    const length = vertex.length();
    vertex.normalize();

    // Multi-layered noise for natural rock appearance
    const noise1 =
      Math.sin(vertex.x * 3.1 + vertex.y * 2.3) *
      Math.cos(vertex.z * 2.7) *
      0.1;
    const noise2 =
      Math.sin(vertex.y * 2.8 + vertex.z * 3.4) *
      Math.cos(vertex.x * 2.1) *
      0.075;
    const noise3 =
      Math.sin(vertex.z * 3.7 + vertex.x * 2.9) *
      Math.cos(vertex.y * 3.2) *
      0.06;

    // Add some random bumps for organic feel
    const randomness = 0;

    // Combine for irregular rock shape
    const displacement = 1 + noise1 + noise2 + noise3 + randomness;

    vertex.multiplyScalar(length * displacement);
    smoothedPositions.push(vertex.x, vertex.y, vertex.z);
  }

  // Second pass: Laplacian smoothing to eliminate sharp edges
  const smoothingIterations = 2;
  for (let iter = 0; iter < smoothingIterations; iter++) {
    const tempPositions = [...smoothedPositions];

    for (let i = 0; i < positionAttribute.count; i++) {
      const neighbors: any[] = [];
      const currentVertex = new THREE.Vector3(
        smoothedPositions[i * 3],
        smoothedPositions[i * 3 + 1],
        smoothedPositions[i * 3 + 2]
      );

      // Find neighboring vertices
      for (let j = 0; j < positionAttribute.count; j++) {
        if (i === j) continue;

        const otherVertex = new THREE.Vector3(
          smoothedPositions[j * 3],
          smoothedPositions[j * 3 + 1],
          smoothedPositions[j * 3 + 2]
        );

        const distance = currentVertex.distanceTo(otherVertex);
        if (distance < 0.35 * size) {
          neighbors.push(otherVertex);
        }
      }

      // Average with neighbors for smoothing
      if (neighbors.length > 0) {
        const avg = new THREE.Vector3();
        neighbors.forEach((n: any) => avg.add(n));
        avg.divideScalar(neighbors.length);

        // 80% smoothing
        currentVertex.lerp(avg, 0.8);

        tempPositions[i * 3] = currentVertex.x;
        tempPositions[i * 3 + 1] = currentVertex.y;
        tempPositions[i * 3 + 2] = currentVertex.z;
      }
    }

    smoothedPositions.splice(0, smoothedPositions.length, ...tempPositions);
  }

  // Apply smoothed positions to geometry
  for (let i = 0; i < positionAttribute.count; i++) {
    positionAttribute.setXYZ(
      i,
      smoothedPositions[i * 3],
      smoothedPositions[i * 3 + 1],
      smoothedPositions[i * 3 + 2]
    );
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  // Random gray coloring with variation
  const grayValue = 0.5 + Math.random() * 0.3;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(grayValue, grayValue, grayValue),
    roughness: 0,
    metalness: 0.0,
    flatShading: false, // Smooth shading
  });

  const rock = new THREE.Mesh(geometry, material);
  rock.castShadow = true;
  rock.receiveShadow = true;

  // Random scaling for natural variation
  rock.scale.set(
    1 + Math.random() * 0.6,
    1 + Math.random() * 0.8,
    1 + Math.random() * 0.6
  );

  return rock;
}

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
  const debrisRef = useRef<THREE.Mesh[]>([]);

  const asteroidVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const explosionParticlesRef = useRef<THREE.Mesh[]>([]);
  const asteroidTrailRef = useRef<THREE.Mesh[]>([]);
  const impactOccurredRef = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    camera.position.set(0, 8, 22);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 8;
    controls.maxDistance = 500;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.update();
    controlsRef.current = controls;

    const enhancedEarth = new EnhancedEarth(scene);
    enhancedEarth.setScale(EARTH_RADIUS_UNITS);
    enhancedEarthRef.current = enhancedEarth;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-2, 0.5, 1.5);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Create debris field around Earth
    const createDebrisField = () => {
      const debris: THREE.Mesh[] = [];

      // Very close debris (15-30 units from Earth center)
      for (let i = 0; i < 20; i++) {
        const size = 0.05 + Math.random() * 0.15;
        const rock = createDebrisRock(THREE, size);

        const distance = 15 + Math.random() * 15;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI * 0.6;

        rock.position.set(
          Math.cos(theta) * Math.cos(phi) * distance,
          Math.sin(phi) * distance,
          Math.sin(theta) * Math.cos(phi) * distance
        );

        rock.userData.rotationSpeed = {
          x: (Math.random() - 0.5) * 0.003,
          y: (Math.random() - 0.5) * 0.003,
          z: (Math.random() - 0.5) * 0.003,
        };

        scene.add(rock);
        debris.push(rock);
      }

      // Medium distance debris
      for (let i = 0; i < 50; i++) {
        const size = 0.1 + Math.random() * 0.25;
        const rock = createDebrisRock(THREE, size);

        const distance = 100 + Math.random() * 30;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI * 0.8;

        rock.position.set(
          Math.cos(theta) * Math.cos(phi) * distance,
          Math.sin(phi) * distance,
          Math.sin(theta) * Math.cos(phi) * distance
        );

        rock.userData.rotationSpeed = {
          x: (Math.random() - 0.5) * 0.002,
          y: (Math.random() - 0.5) * 0.002,
          z: (Math.random() - 0.5) * 0.002,
        };

        scene.add(rock);
        debris.push(rock);
      }

      // Far debris belt
      for (let i = 0; i < 40; i++) {
        const size = 0.2 + Math.random() * 0.5;
        const rock = createDebrisRock(THREE, size);

        const distance = 60 + Math.random() * 90;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        rock.position.set(
          Math.cos(theta) * Math.cos(phi) * distance,
          Math.sin(phi) * distance,
          Math.sin(theta) * Math.cos(phi) * distance
        );

        rock.userData.rotationSpeed = {
          x: (Math.random() - 0.5) * 0.001,
          y: (Math.random() - 0.5) * 0.001,
          z: (Math.random() - 0.5) * 0.001,
        };

        scene.add(rock);
        debris.push(rock);
      }

      // Very far debris
      for (let i = 0; i < 30; i++) {
        const size = 0.3 + Math.random() * 0.8;
        const rock = createDebrisRock(THREE, size);

        const distance = 150 + Math.random() * 250;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        rock.position.set(
          Math.cos(theta) * Math.cos(phi) * distance,
          Math.sin(phi) * distance,
          Math.sin(theta) * Math.cos(phi) * distance
        );

        rock.userData.rotationSpeed = {
          x: (Math.random() - 0.5) * 0.0005,
          y: (Math.random() - 0.5) * 0.0005,
          z: (Math.random() - 0.5) * 0.0005,
        };

        scene.add(rock);
        debris.push(rock);
      }

      return debris;
    };

    debrisRef.current = createDebrisField();

    // Create main asteroid
    const asteroid = createAsteroidFromPreview(asteroidParams.diameter);

    const scaledDistance =
      asteroidParams.distance / KM_PER_UNIT + EARTH_RADIUS_UNITS;
    const angle = (asteroidParams.angle * Math.PI) / 180;

    asteroid.position.set(
      Math.cos(angle) * scaledDistance,
      Math.sin(angle) * scaledDistance * 0.5,
      Math.sin(angle) * scaledDistance
    );

    const direction = new THREE.Vector3(0, 0, 0)
      .sub(asteroid.position)
      .normalize();
    const speed = asteroidParams.velocity * 0.0005;
    asteroidVelocityRef.current = direction.multiplyScalar(speed);

    scene.add(asteroid);
    asteroidRef.current = asteroid;

    // Add warning ring
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

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      controlsRef.current?.update();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      controlsRef.current?.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [asteroidParams]);

  const createExplosion = useCallback(
    (position: THREE.Vector3) => {
      if (!sceneRef.current) return;

      explosionParticlesRef.current.forEach((particle) => {
        sceneRef.current?.remove(particle);
      });
      explosionParticlesRef.current = [];

      for (let i = 0; i < 20; i++) {
        const particleGeometry = new THREE.SphereGeometry(
          0.1 + Math.random() * 0.2,
          4,
          4
        );
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: 0xffa500,
          transparent: true,
          opacity: 1,
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);

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

      if (enhancedEarthRef.current) {
        enhancedEarthRef.current.animate();
      }

      // Animate debris field
      debrisRef.current.forEach((rock) => {
        if (rock.userData.rotationSpeed) {
          rock.rotation.x += rock.userData.rotationSpeed.x;
          rock.rotation.y += rock.userData.rotationSpeed.y;
          rock.rotation.z += rock.userData.rotationSpeed.z;
        }
      });

      if (
        isSimulating &&
        asteroidRef.current &&
        !hasImpacted &&
        !impactOccurredRef.current
      ) {
        const asteroid = asteroidRef.current;
        const earthPosition = new THREE.Vector3(0, 0, 0);
        const distanceToEarthCenter = asteroid.position.length();
        const distanceFromSurface = Math.max(
          0,
          (distanceToEarthCenter - EARTH_RADIUS_UNITS) * KM_PER_UNIT
        );
        onDistanceUpdate?.(distanceFromSurface);

        const gravityDirection = earthPosition
          .clone()
          .sub(asteroid.position)
          .normalize();
        const gravity = 0.0005 * (50 / Math.max(distanceToEarthCenter, 1));
        asteroidVelocityRef.current.add(
          gravityDirection.multiplyScalar(gravity)
        );

        asteroid.position.add(asteroidVelocityRef.current);
        asteroid.rotation.x += 0.01;
        asteroid.rotation.y += 0.015;

        const ring = asteroid.children[0];
        if (ring) {
          ring.lookAt(camera.position);
        }

        if (Math.random() > 0.3) {
          const trailGeometry = new THREE.SphereGeometry(0.05, 4, 4);
          const trailMaterial = new THREE.MeshBasicMaterial({
            color: distanceToEarthCenter < 20 ? 0xff8844 : 0xccccdd,
            transparent: true,
            opacity: 0.7,
          });
          const trail = new THREE.Mesh(trailGeometry, trailMaterial);
          trail.position.copy(asteroid.position);
          scene.add(trail);
          asteroidTrailRef.current.push(trail);

          if (asteroidTrailRef.current.length > 30) {
            const oldTrail = asteroidTrailRef.current.shift();
            if (oldTrail) scene.remove(oldTrail);
          }
        }

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

        if (
          distanceToEarthCenter <=
          earthRadius + (asteroid.geometry.boundingSphere?.radius || 0.5)
        ) {
          asteroid.visible = false;
          createExplosion(asteroid.position);
          impactOccurredRef.current = true;
        }
      } else if (!isSimulating) {
        controlsRef.current?.update();
      }

      explosionParticlesRef.current.forEach((particle, index) => {
        if (particle.userData.velocity) {
          particle.position.add(particle.userData.velocity);
          particle.userData.velocity.multiplyScalar(0.95);

          const material = particle.material as THREE.MeshBasicMaterial;
          material.opacity -= 0.02;

          if (material.opacity <= 0) {
            scene.remove(particle);
            explosionParticlesRef.current.splice(index, 1);
          }
        }
      });

      asteroidTrailRef.current.forEach((trail, index) => {
        const material = trail.material as THREE.MeshBasicMaterial;
        material.opacity -= 0.01;
        if (material.opacity <= 0) {
          scene.remove(trail);
          asteroidTrailRef.current.splice(index, 1);
        }
      });

      if (
        impactOccurredRef.current &&
        explosionParticlesRef.current.length > 15
      ) {
        const shake = 0.2;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
      }

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
      asteroidTrailRef.current.forEach((trail) =>
        sceneRef.current?.remove(trail)
      );
      asteroidTrailRef.current = [];
      explosionParticlesRef.current.forEach((particle) =>
        sceneRef.current?.remove(particle)
      );
      explosionParticlesRef.current = [];
      impactOccurredRef.current = false;

      asteroidRef.current.visible = true;
      const scaledDistance =
        asteroidParams.distance / KM_PER_UNIT + EARTH_RADIUS_UNITS;
      const angle = (asteroidParams.angle * Math.PI) / 180;
      asteroidRef.current.position.set(
        Math.cos(angle) * scaledDistance,
        Math.sin(angle) * scaledDistance * 0.5,
        Math.sin(angle) * scaledDistance
      );

      const direction = new THREE.Vector3(0, 0, 0)
        .sub(asteroidRef.current.position)
        .normalize();
      const speed = asteroidParams.velocity * 0.001;
      asteroidVelocityRef.current = direction.multiplyScalar(speed);

      if (cameraRef.current) {
        cameraRef.current.position.set(0, 8, 22);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current?.update();
      }
    }
  }, [hasImpacted, isSimulating, asteroidParams]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
