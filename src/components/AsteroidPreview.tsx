/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AsteroidPreview.tsx
"use client";

import React from "react";
import { createAsteroidMesh } from "@/lib/asteroid-utils";

interface AsteroidPreviewProps {
  diameter: number;
}

export default function AsteroidPreview({ diameter }: AsteroidPreviewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneRef = React.useRef<any>(null);
  const [threeLoaded, setThreeLoaded] = React.useState(false);

  // Load Three.js if not already loaded
  React.useEffect(() => {
    if ((window as any).THREE) {
      setThreeLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.async = true;
    script.onload = () => setThreeLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Three.js scene
  React.useEffect(() => {
    if (!canvasRef.current || !threeLoaded) return;

    const THREE = (window as any).THREE;
    if (!THREE) {
      console.error("THREE.js not loaded");
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(200, 200);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    camera.position.z = 5;

    // Create asteroid using shared utils - pass THREE as first parameter
    const asteroid = createAsteroidMesh(THREE, { diameter });

    scene.add(asteroid);

    // Lighting - bright space lighting
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(8, 5, 3);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xaabbff, 0.6);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x606060, 0.7);
    scene.add(ambientLight);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      asteroid,
      baseScale: asteroid.scale.clone(),
    };

    // Animation with random rotation speeds
    let animationId: number;
    const rotationSpeed = {
      x: Math.random() * 0.005,
      y: Math.random() * 0.005,
      z: Math.random() * 0.005,
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      asteroid.rotation.x += rotationSpeed.x;
      asteroid.rotation.y += rotationSpeed.y;
      asteroid.rotation.z += rotationSpeed.z;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      asteroid.geometry.dispose();
      (asteroid.material as any).dispose();
    };
  }, [threeLoaded, diameter]);

  // Update asteroid scale based on diameter
  React.useEffect(() => {
    if (sceneRef.current?.asteroid && sceneRef.current?.baseScale) {
      const minDiameter = 50;
      const maxDiameter = 1000;
      const minScale = 2.0;
      const maxScale = 4.5;

      const normalizedDiameter =
        (diameter - minDiameter) / (maxDiameter - minDiameter);
      const scaleFactor = minScale + normalizedDiameter * (maxScale - minScale);

      // Apply scale while preserving the original random proportions
      sceneRef.current.asteroid.scale.copy(sceneRef.current.baseScale);
      sceneRef.current.asteroid.scale.multiplyScalar(scaleFactor);
    }
  }, [diameter]);

  const formatNumber = (num: number) => {
    if (!num || isNaN(num)) return "0";
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toFixed(0);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-lg"
          style={{ width: "200px", height: "200px" }}
        />
        {!threeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            <div className="text-white/50 text-xs">Loading 3D...</div>
          </div>
        )}
      </div>
      <div className="mt-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded border border-white/20">
        <span className="text-[11px] font-light text-white/80">
          {formatNumber(diameter)}m diameter
        </span>
      </div>
    </div>
  );
}
