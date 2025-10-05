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

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    camera.position.set(0, 10, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Setup renderer with conservative settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.sortObjects = true;
    renderer.localClippingEnabled = false; // Disable clipping that might cause artifacts
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 10;
    controls.maxDistance = 100;
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

    // Create starfield using a different approach - textured sphere
    const starsTexture = new THREE.DataTexture(
      new Uint8Array(
        Array.from({ length: 256 * 256 * 3 }, () =>
          Math.random() > 0.99 ? 255 : 0
        )
      ),
      256,
      256,
      THREE.RGBFormat
    );
    starsTexture.needsUpdate = true;

    const starsSphere = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({
        map: starsTexture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      })
    );
    scene.add(starsSphere);

    // Create asteroid
    const createAsteroid = () => {
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

      const asteroidMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b0000,
        shininess: 30,
        emissive: 0x442211,
        emissiveIntensity: 0.1,
      });

      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);

      // Position asteroid
      const scaledDistance =
        asteroidParams.distance / KM_PER_UNIT + EARTH_RADIUS_UNITS;
      const angle = (asteroidParams.angle * Math.PI) / 180;

      asteroid.position.set(
        Math.cos(angle) * scaledDistance,
        Math.sin(angle) * scaledDistance * 0.5,
        Math.sin(angle) * scaledDistance
      );

      // Initial velocity
      const direction = new THREE.Vector3(0, 0, 0)
        .sub(asteroid.position)
        .normalize();
      const speed = asteroidParams.velocity * 0.001;
      asteroidVelocityRef.current = direction.multiplyScalar(speed);

      asteroid.castShadow = true;
      asteroid.receiveShadow = true;

      return asteroid;
    };

    const asteroid = createAsteroid();
    scene.add(asteroid);
    asteroidRef.current = asteroid;

    // Add warning ring
    const ringGeometry = new THREE.RingGeometry(
      (asteroidParams.diameter / 1000) * 2.5,
      (asteroidParams.diameter / 1000) * 3,
      16
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
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

      // Clear old particles
      explosionParticlesRef.current.forEach((particle) => {
        particle.geometry.dispose();
        (particle.material as THREE.Material).dispose();
        sceneRef.current?.remove(particle);
      });
      explosionParticlesRef.current = [];

      // Create new explosion
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

      // Animate Earth
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
        const earthPosition = new THREE.Vector3(0, 0, 0);
        const distanceToEarthCenter = asteroid.position.length();

        const distanceFromSurface = Math.max(
          0,
          (distanceToEarthCenter - EARTH_RADIUS_UNITS) * KM_PER_UNIT
        );
        onDistanceUpdate?.(distanceFromSurface);

        // Apply gravity
        const gravityDirection = earthPosition
          .clone()
          .sub(asteroid.position)
          .normalize();
        const gravity = 0.001 * (50 / Math.max(distanceToEarthCenter, 1));
        asteroidVelocityRef.current.add(
          gravityDirection.multiplyScalar(gravity)
        );

        // Update position
        asteroid.position.add(asteroidVelocityRef.current);

        // Rotate asteroid
        asteroid.rotation.x += 0.02;
        asteroid.rotation.y += 0.03;

        // Update ring orientation
        const ring = asteroid.children[0];
        if (ring) {
          ring.lookAt(camera.position);
        }

        // Trail effect - simpler implementation
        if (Math.random() > 0.8) {
          const trailGeometry = new THREE.SphereGeometry(0.03, 3, 3);
          const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4500,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          });
          const trail = new THREE.Mesh(trailGeometry, trailMaterial);
          trail.position.copy(asteroid.position);
          scene.add(trail);
          asteroidTrailRef.current.push(trail);

          // Limit trail length
          if (asteroidTrailRef.current.length > 15) {
            const oldTrail = asteroidTrailRef.current.shift();
            if (oldTrail) {
              oldTrail.geometry.dispose();
              (oldTrail.material as THREE.Material).dispose();
              scene.remove(oldTrail);
            }
          }
        }

        // Camera movement
        if (distanceToEarthCenter > 25) {
          camera.position.lerp(new THREE.Vector3(10, 15, 35), 0.02);
        } else if (distanceToEarthCenter > 15) {
          const offset = asteroid.position
            .clone()
            .normalize()
            .multiplyScalar(-20);
          offset.y += 10;
          camera.position.lerp(asteroid.position.clone().add(offset), 0.05);
        } else {
          camera.position.lerp(new THREE.Vector3(8, 10, 20), 0.05);
        }
        camera.lookAt(0, 0, 0);

        // Check impact
        if (
          distanceToEarthCenter <=
          earthRadius + asteroidParams.diameter / 1000
        ) {
          asteroid.visible = false;
          createExplosion(asteroid.position);
          impactOccurredRef.current = true;
        }
      } else if (!isSimulating) {
        controlsRef.current?.update();
      }

      // Animate explosions
      explosionParticlesRef.current = explosionParticlesRef.current.filter(
        (particle) => {
          if (particle.userData.velocity) {
            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.multiplyScalar(0.95);

            const material = particle.material as THREE.MeshBasicMaterial;
            material.opacity -= 0.02;

            if (material.opacity <= 0) {
              particle.geometry.dispose();
              material.dispose();
              scene.remove(particle);
              return false;
            }
          }
          return true;
        }
      );

      // Fade trail
      asteroidTrailRef.current = asteroidTrailRef.current.filter((trail) => {
        const material = trail.material as THREE.MeshBasicMaterial;
        material.opacity -= 0.02;
        if (material.opacity <= 0) {
          trail.geometry.dispose();
          material.dispose();
          scene.remove(trail);
          return false;
        }
        return true;
      });

      // Camera shake
      if (
        impactOccurredRef.current &&
        explosionParticlesRef.current.length > 15
      ) {
        const shake = 0.2;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
      }

      // Idle rotation
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
  }, [
    isSimulating,
    hasImpacted,
    createExplosion,
    onDistanceUpdate,
    asteroidParams,
  ]);

  // Reset simulation
  useEffect(() => {
    if (
      !hasImpacted &&
      !isSimulating &&
      sceneRef.current &&
      asteroidRef.current
    ) {
      // Clear all effects
      asteroidTrailRef.current.forEach((trail) => {
        trail.geometry.dispose();
        (trail.material as THREE.Material).dispose();
        sceneRef.current?.remove(trail);
      });
      asteroidTrailRef.current = [];

      explosionParticlesRef.current.forEach((particle) => {
        particle.geometry.dispose();
        (particle.material as THREE.Material).dispose();
        sceneRef.current?.remove(particle);
      });
      explosionParticlesRef.current = [];
      impactOccurredRef.current = false;

      // Reset asteroid position
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

      // Reset camera
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 5, 20); // Match the closer initial position
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current?.update();
      }
    }
  }, [hasImpacted, isSimulating, asteroidParams]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
