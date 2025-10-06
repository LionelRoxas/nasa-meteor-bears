"use client";

import { useEffect, useRef } from "react";

interface ShockwaveRadiusProps {
  centerLat: number;
  centerLng: number;
  radiusMiles: number; // Shockwave radius in miles
  decibels: number;
  casualties: {
    deaths: number;
    lungDamage: number;
    eardrumRupture: number;
  };
  damageZones: {
    buildingsCollapse: number; // miles
    homesCollapse: number; // miles
  };
}

export default function ShockwaveRadius({
  centerLat,
  centerLng,
  radiusMiles,
  decibels,
  casualties,
  damageZones,
}: ShockwaveRadiusProps) {
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
    const maxRadius = Math.min(width, height) * 0.48;

    let animationId: number;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Animate shockwave propagation
      const time = Date.now() / 800;
      const waveOffset = (time % 3) / 3;

    // Draw multiple expanding shockwave rings
    for (let wave = 0; wave < 5; wave++) {
      const wavePhase = (waveOffset + wave * 0.2) % 1;
      const waveRadius = maxRadius * wavePhase;
      const opacity = 1 - wavePhase;

      // Compression wave (darker)
      const compressionGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(0, waveRadius - 10),
        centerX,
        centerY,
        waveRadius + 10
      );
      compressionGradient.addColorStop(0, `rgba(100, 120, 180, ${opacity * 0.3})`);
      compressionGradient.addColorStop(0.5, `rgba(150, 170, 220, ${opacity * 0.6})`);
      compressionGradient.addColorStop(1, `rgba(100, 120, 180, ${opacity * 0.3})`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = compressionGradient.toString();
      ctx.lineWidth = 15 * opacity;
      ctx.stroke();

      // Rarefaction wave (lighter, following behind)
      if (waveRadius > 20) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius - 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180, 200, 255, ${opacity * 0.4})`;
        ctx.lineWidth = 8 * opacity;
        ctx.stroke();
      }
    }

    // Damage zones - concentric circles
    // Buildings collapse zone (severe)
    const buildingsRadius =
      (damageZones.buildingsCollapse / radiusMiles) * maxRadius;
    const buildingsGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      buildingsRadius * 0.9,
      centerX,
      centerY,
      buildingsRadius
    );
    buildingsGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    buildingsGradient.addColorStop(0.7, "rgba(139, 0, 0, 0.25)");
    buildingsGradient.addColorStop(1, "rgba(178, 34, 34, 0.35)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, buildingsRadius, 0, Math.PI * 2);
    ctx.fillStyle = buildingsGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(178, 34, 34, 0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Homes collapse zone (moderate)
    const homesRadius = (damageZones.homesCollapse / radiusMiles) * maxRadius;
    const homesGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      homesRadius * 0.9,
      centerX,
      centerY,
      homesRadius
    );
    homesGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    homesGradient.addColorStop(0.7, "rgba(255, 140, 0, 0.2)");
    homesGradient.addColorStop(1, "rgba(255, 165, 0, 0.3)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, homesRadius, 0, Math.PI * 2);
    ctx.fillStyle = homesGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 165, 0, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Overpressure visualization - distortion lines
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + time * 0.5;
      const distortPhase = Math.sin(time * 2 + i) * 0.1;

      ctx.beginPath();
      for (let r = 0; r < maxRadius; r += 10) {
        const x =
          centerX + Math.cos(angle) * r * (1 + distortPhase * (r / maxRadius));
        const y =
          centerY + Math.sin(angle) * r * (1 + distortPhase * (r / maxRadius));
        if (r === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = `rgba(150, 170, 220, ${0.2 - (i % 3) * 0.05})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Atmospheric disturbance indicator
    const disturbanceGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius
    );
    disturbanceGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    disturbanceGradient.addColorStop(0.5, "rgba(100, 120, 180, 0.05)");
    disturbanceGradient.addColorStop(1, "rgba(150, 170, 220, 0.15)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = disturbanceGradient;
    ctx.fill();

    // Outer border
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100, 120, 180, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

      // Request next frame
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [centerLat, centerLng, radiusMiles, decibels, casualties, damageZones]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-auto"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        <div className="font-bold text-blue-400">Shock Wave</div>
        <div>{radiusMiles.toFixed(1)} mile radius</div>
        <div className="text-xs text-blue-300">{decibels} dB</div>
        <div className="text-xs text-red-300">
          {casualties.deaths.toLocaleString()} deaths
        </div>
      </div>
    </div>
  );
}
