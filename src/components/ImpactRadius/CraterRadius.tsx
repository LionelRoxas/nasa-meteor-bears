"use client";

import { useEffect, useRef } from "react";
import { milesToPixels } from "@/utils/geoUtils";

interface CraterRadiusProps {
  centerLat: number;
  centerLng: number;
  radiusMiles: number; // Crater radius in miles
  depthMiles: number;
  isOcean: boolean;
  zoom?: number; // Map zoom level (default: auto-calculate)
  mapWidth?: number; // Container width (default: 300)
  mapHeight?: number; // Container height (default: 300)
}

export default function CraterRadius({
  centerLat,
  centerLng,
  radiusMiles,
  depthMiles,
  isOcean,
  zoom,
  mapWidth = 300,
  mapHeight = 300,
}: CraterRadiusProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate actual geographic radius in pixels
    // If no zoom provided, auto-calculate to fit radius nicely
    const calculatedZoom = zoom ?? Math.max(0, 10 - Math.log2(radiusMiles));
    const radius = milesToPixels(radiusMiles, centerLat, calculatedZoom);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw crater with depth gradient
    // Outer rim (elevated)
    const rimGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.95,
      centerX,
      centerY,
      radius * 1.05
    );

    if (isOcean) {
      // Ocean crater - darker blue with sediment
      rimGradient.addColorStop(0, "rgba(101, 67, 33, 0.8)"); // Brown sediment
      rimGradient.addColorStop(0.5, "rgba(139, 90, 43, 0.9)");
      rimGradient.addColorStop(1, "rgba(160, 110, 60, 0.7)");
    } else {
      // Land crater - dark rock/soil
      rimGradient.addColorStop(0, "rgba(80, 60, 40, 0.9)");
      rimGradient.addColorStop(0.5, "rgba(110, 85, 60, 0.95)");
      rimGradient.addColorStop(1, "rgba(130, 100, 70, 0.8)");
    }

    // Draw rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // Inner crater bowl - dramatic depth with shadows
    const craterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );

    if (isOcean) {
      // Seafloor crater - extreme depth
      craterGradient.addColorStop(0, "rgba(5, 5, 5, 1)"); // Very deep black center
      craterGradient.addColorStop(0.15, "rgba(20, 10, 5, 0.98)");
      craterGradient.addColorStop(0.35, "rgba(40, 25, 15, 0.95)");
      craterGradient.addColorStop(0.6, "rgba(65, 40, 25, 0.9)");
      craterGradient.addColorStop(0.85, "rgba(90, 60, 35, 0.85)");
      craterGradient.addColorStop(1, "rgba(110, 75, 45, 0.8)");
    } else {
      // Land crater - deep shadowed bowl
      craterGradient.addColorStop(0, "rgba(10, 5, 5, 1)"); // Deep black center
      craterGradient.addColorStop(0.15, "rgba(25, 15, 10, 0.98)");
      craterGradient.addColorStop(0.35, "rgba(45, 30, 20, 0.95)");
      craterGradient.addColorStop(0.6, "rgba(70, 50, 35, 0.9)");
      craterGradient.addColorStop(0.85, "rgba(100, 75, 55, 0.85)");
      craterGradient.addColorStop(1, "rgba(120, 95, 70, 0.8)");
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = craterGradient;
    ctx.fill();

    // Add shadow/depth ring for more 3D effect
    const depthGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.7,
      centerX,
      centerY,
      radius
    );
    depthGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    depthGradient.addColorStop(0.5, "rgba(0, 0, 0, 0.3)");
    depthGradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = depthGradient;
    ctx.fill();

    // Add crater features - terraces and slumping
    for (let i = 0; i < 3; i++) {
      const terraceRadius = radius * (0.3 + i * 0.2);
      ctx.beginPath();
      ctx.arc(centerX, centerY, terraceRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 - i * 0.04})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Central peak (for complex craters with diameter > 3.2 miles)
    if (radiusMiles > 1.6) {
      const peakGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 0.15
      );
      peakGradient.addColorStop(0, "rgba(120, 100, 80, 0.9)");
      peakGradient.addColorStop(1, "rgba(80, 60, 45, 0.7)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = peakGradient;
      ctx.fill();
    }

    // Outer glow - ejecta blanket
    const ejectaGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 1.05,
      centerX,
      centerY,
      radius * 1.5
    );

    if (isOcean) {
      ejectaGradient.addColorStop(0, "rgba(139, 90, 43, 0.4)");
      ejectaGradient.addColorStop(0.5, "rgba(160, 110, 60, 0.2)");
      ejectaGradient.addColorStop(1, "rgba(180, 130, 80, 0)");
    } else {
      ejectaGradient.addColorStop(0, "rgba(150, 120, 90, 0.5)");
      ejectaGradient.addColorStop(0.5, "rgba(180, 150, 120, 0.25)");
      ejectaGradient.addColorStop(1, "rgba(200, 170, 140, 0)");
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = ejectaGradient;
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isOcean ? "rgba(101, 67, 33, 0.8)" : "rgba(80, 60, 40, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [centerLat, centerLng, radiusMiles, depthMiles, isOcean, zoom]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
        className="w-full h-auto"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        <div className="font-bold">Crater</div>
        <div>{radiusMiles.toFixed(1)} mile radius</div>
        <div>{depthMiles.toFixed(2)} miles deep</div>
        <div className="text-xs text-gray-300">{isOcean ? "Seafloor" : "Land"}</div>
      </div>
    </div>
  );
}
