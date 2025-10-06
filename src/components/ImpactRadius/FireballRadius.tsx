"use client";

import { useEffect, useRef } from "react";

interface FireballRadiusProps {
  centerLat: number;
  centerLng: number;
  radiusMiles: number; // Fireball radius in miles
  casualties: {
    deaths: number;
    thirdDegreeBurns: number;
    secondDegreeBurns: number;
  };
}

export default function FireballRadius({
  centerLat,
  centerLng,
  radiusMiles,
  casualties,
}: FireballRadiusProps) {
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
    const radius = Math.min(width, height) * 0.45;

    let animationId: number;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Animate fireball with pulsing effect
      const time = Date.now() / 1000;
      const pulse = Math.sin(time * 2) * 0.05 + 1;

    // Outer plasma envelope - superheated air
    const plasmaGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.8 * pulse,
      centerX,
      centerY,
      radius * pulse
    );
    plasmaGradient.addColorStop(0, "rgba(255, 200, 100, 0)");
    plasmaGradient.addColorStop(0.5, "rgba(255, 150, 50, 0.3)");
    plasmaGradient.addColorStop(0.8, "rgba(255, 100, 20, 0.5)");
    plasmaGradient.addColorStop(1, "rgba(200, 50, 0, 0.3)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = plasmaGradient;
    ctx.fill();

    // Main fireball - intense heat
    const fireballGradient = ctx.createRadialGradient(
      centerX,
      centerY - radius * 0.1, // Offset upward (fire rises)
      0,
      centerX,
      centerY,
      radius * 0.85 * pulse
    );

    // White-hot core
    fireballGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    fireballGradient.addColorStop(0.1, "rgba(255, 255, 200, 0.9)");
    // Yellow-orange middle
    fireballGradient.addColorStop(0.3, "rgba(255, 220, 100, 0.85)");
    fireballGradient.addColorStop(0.5, "rgba(255, 180, 50, 0.8)");
    // Orange-red outer
    fireballGradient.addColorStop(0.7, "rgba(255, 120, 30, 0.75)");
    fireballGradient.addColorStop(0.85, "rgba(220, 80, 20, 0.65)");
    fireballGradient.addColorStop(1, "rgba(180, 40, 10, 0.5)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.85 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = fireballGradient;
    ctx.fill();

    // Add turbulent fire patterns
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time;
      const turbRadius = radius * (0.4 + Math.sin(time * 3 + i) * 0.1);
      const turbX = centerX + Math.cos(angle) * turbRadius;
      const turbY = centerY + Math.sin(angle) * turbRadius;

      const turbGradient = ctx.createRadialGradient(
        turbX,
        turbY,
        0,
        turbX,
        turbY,
        radius * 0.2
      );
      turbGradient.addColorStop(0, "rgba(255, 255, 100, 0.6)");
      turbGradient.addColorStop(0.5, "rgba(255, 150, 50, 0.4)");
      turbGradient.addColorStop(1, "rgba(255, 100, 20, 0)");

      ctx.beginPath();
      ctx.arc(turbX, turbY, radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = turbGradient;
      ctx.fill();
    }

    // Rising heat plume
    const plumeGradient = ctx.createLinearGradient(
      centerX,
      centerY - radius * 0.9,
      centerX,
      centerY - radius * 1.5
    );
    plumeGradient.addColorStop(0, "rgba(255, 200, 100, 0.5)");
    plumeGradient.addColorStop(0.3, "rgba(255, 150, 50, 0.3)");
    plumeGradient.addColorStop(0.6, "rgba(200, 100, 50, 0.2)");
    plumeGradient.addColorStop(1, "rgba(150, 80, 40, 0)");

    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY - radius * 1.2,
      radius * 0.6,
      radius * 0.3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = plumeGradient;
    ctx.fill();

    // Thermal radiation rings
    for (let i = 0; i < 3; i++) {
      const ringRadius = radius * (1 + i * 0.15) * pulse;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 150, 50, ${0.4 - i * 0.12})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 100, 20, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

      // Request next frame
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [centerLat, centerLng, radiusMiles, casualties]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-auto"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        <div className="font-bold text-orange-400">Fireball</div>
        <div>{radiusMiles.toFixed(1)} mile radius</div>
        <div className="text-xs text-red-300">
          {casualties.deaths.toLocaleString()} deaths
        </div>
        <div className="text-xs text-orange-300">
          {casualties.thirdDegreeBurns.toLocaleString()} 3rd° burns
        </div>
      </div>
    </div>
  );
}
