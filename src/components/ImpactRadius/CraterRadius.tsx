"use client";

import { useEffect, useRef } from "react";

interface CraterRadiusProps {
  centerLat: number;
  centerLng: number;
  radiusMiles: number; // Crater radius in miles
  depthMiles: number;
  isOcean: boolean;
}

export default function CraterRadius({
  centerLat,
  centerLng,
  radiusMiles,
  depthMiles,
  isOcean,
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
    const radius = Math.min(width, height) * 0.4;

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

    // Inner crater bowl - gets darker towards center
    const craterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );

    if (isOcean) {
      // Seafloor crater - very dark with impact melt
      craterGradient.addColorStop(0, "rgba(40, 20, 10, 0.95)"); // Dark impact melt
      craterGradient.addColorStop(0.3, "rgba(60, 35, 20, 0.9)");
      craterGradient.addColorStop(0.6, "rgba(85, 50, 30, 0.85)");
      craterGradient.addColorStop(1, "rgba(100, 65, 35, 0.8)"); // Displaced sediment
    } else {
      // Land crater - exposed bedrock and impact melt
      craterGradient.addColorStop(0, "rgba(30, 15, 10, 0.95)"); // Central impact melt (black)
      craterGradient.addColorStop(0.2, "rgba(50, 30, 20, 0.9)"); // Fractured bedrock
      craterGradient.addColorStop(0.5, "rgba(70, 50, 35, 0.85)");
      craterGradient.addColorStop(0.8, "rgba(95, 70, 50, 0.8)");
      craterGradient.addColorStop(1, "rgba(110, 85, 60, 0.75)"); // Crater walls
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = craterGradient;
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
  }, [centerLat, centerLng, radiusMiles, depthMiles, isOcean]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
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
