"use client";

import { useEffect, useRef } from "react";
import { milesToPixels } from "@/utils/geoUtils";

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
  zoom?: number;
  mapWidth?: number;
  mapHeight?: number;
}

export default function ShockwaveRadius({
  centerLat,
  centerLng,
  radiusMiles,
  decibels,
  casualties,
  damageZones,
  zoom,
  mapWidth = 300,
  mapHeight = 300,
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

    const calculatedZoom = zoom ?? Math.max(0, 10 - Math.log2(radiusMiles));
    const maxRadius = milesToPixels(radiusMiles, centerLat, calculatedZoom);

    let animationId: number;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Animate shockwave propagation
      const time = Date.now() / 800;
      const waveOffset = (time % 3) / 3;

    // Draw atmospheric distortion base
    const atmosphereGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 1.2
    );
    atmosphereGradient.addColorStop(0, "rgba(220, 230, 240, 0.3)");
    atmosphereGradient.addColorStop(0.5, "rgba(200, 210, 230, 0.15)");
    atmosphereGradient.addColorStop(1, "rgba(180, 190, 210, 0.05)");

    ctx.fillStyle = atmosphereGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw multiple expanding shockwave rings - more subtle
    for (let wave = 0; wave < 4; wave++) {
      const wavePhase = (waveOffset + wave * 0.25) % 1;
      const waveRadius = maxRadius * wavePhase * 1.1;
      const opacity = (1 - wavePhase) * 0.8;

      // Main pressure wave - subtle distortion ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 200, 220, ${opacity * 0.7})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner bright compression ring
      if (waveRadius > 10) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          Math.max(0, waveRadius - 8),
          centerX,
          centerY,
          waveRadius + 8
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`);
        gradient.addColorStop(0.5, `rgba(200, 220, 255, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(150, 180, 220, ${opacity * 0.2})`);
        ctx.strokeStyle = gradient.toString();
        ctx.lineWidth = 12 * opacity;
        ctx.stroke();
      }
    }

    // Damage zones - subtle concentric circles
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
    buildingsGradient.addColorStop(0.7, "rgba(200, 210, 230, 0.15)");
    buildingsGradient.addColorStop(1, "rgba(180, 200, 220, 0.25)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, buildingsRadius, 0, Math.PI * 2);
    ctx.fillStyle = buildingsGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 200, 230, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

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
    homesGradient.addColorStop(0.7, "rgba(190, 210, 230, 0.1)");
    homesGradient.addColorStop(1, "rgba(170, 190, 220, 0.2)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, homesRadius, 0, Math.PI * 2);
    ctx.fillStyle = homesGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(170, 190, 220, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Add pressure pulse at epicenter
    const epicenterPulse = Math.sin(time * 3) * 0.15 + 0.85;
    const epicenterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 0.2 * epicenterPulse
    );
    epicenterGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    epicenterGradient.addColorStop(0.3, "rgba(240, 245, 255, 0.6)");
    epicenterGradient.addColorStop(0.6, "rgba(200, 220, 250, 0.4)");
    epicenterGradient.addColorStop(1, "rgba(180, 200, 230, 0.2)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.2 * epicenterPulse, 0, Math.PI * 2);
    ctx.fillStyle = epicenterGradient;
    ctx.fill();

    // Add radial distortion lines (heat shimmer effect)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const shimmer = Math.sin(time * 4 + i * 0.5) * 0.02;

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);

      const endX = centerX + Math.cos(angle) * maxRadius * (1 + shimmer);
      const endY = centerY + Math.sin(angle) * maxRadius * (1 + shimmer);
      ctx.lineTo(endX, endY);

      ctx.strokeStyle = "rgba(200, 220, 240, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Outer border - atmospheric boundary
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180, 200, 230, 0.7)";
    ctx.lineWidth = 4;
    ctx.stroke();

      // Request next frame
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [centerLat, centerLng, radiusMiles, decibels, casualties, damageZones, zoom]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
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
