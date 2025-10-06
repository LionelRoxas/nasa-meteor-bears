"use client";

import { useEffect, useRef } from "react";

interface WindBlastRadiusProps {
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  peakSpeedMph: number;
  casualties: {
    deaths: number;
  };
  damageZones: {
    fasterThanJupiterStorms: number; // miles
    completelyLeveled: number; // miles
    ef5TornadoEquivalent: number; // miles
    treesKnockedDown: number; // miles
  };
}

export default function WindBlastRadius({
  centerLat,
  centerLng,
  radiusMiles,
  peakSpeedMph,
  casualties,
  damageZones,
}: WindBlastRadiusProps) {
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

      // Animate wind flow
      const time = Date.now() / 600;

    // Trees knocked down zone (outermost - light wind)
    const treesRadius =
      (damageZones.treesKnockedDown / radiusMiles) * maxRadius;
    const treesGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      treesRadius * 0.85,
      centerX,
      centerY,
      treesRadius
    );
    treesGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    treesGradient.addColorStop(0.7, "rgba(144, 238, 144, 0.2)");
    treesGradient.addColorStop(1, "rgba(34, 139, 34, 0.3)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, treesRadius, 0, Math.PI * 2);
    ctx.fillStyle = treesGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(34, 139, 34, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // EF5 Tornado zone
    const ef5Radius =
      (damageZones.ef5TornadoEquivalent / radiusMiles) * maxRadius;
    const ef5Gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      ef5Radius * 0.85,
      centerX,
      centerY,
      ef5Radius
    );
    ef5Gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    ef5Gradient.addColorStop(0.7, "rgba(255, 215, 0, 0.25)");
    ef5Gradient.addColorStop(1, "rgba(255, 140, 0, 0.35)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, ef5Radius, 0, Math.PI * 2);
    ctx.fillStyle = ef5Gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 140, 0, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Completely leveled zone
    const leveledRadius =
      (damageZones.completelyLeveled / radiusMiles) * maxRadius;
    const leveledGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      leveledRadius * 0.85,
      centerX,
      centerY,
      leveledRadius
    );
    leveledGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    leveledGradient.addColorStop(0.7, "rgba(255, 0, 0, 0.3)");
    leveledGradient.addColorStop(1, "rgba(139, 0, 0, 0.4)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, leveledRadius, 0, Math.PI * 2);
    ctx.fillStyle = leveledGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(139, 0, 0, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Jupiter storms zone (extreme winds)
    const jupiterRadius =
      (damageZones.fasterThanJupiterStorms / radiusMiles) * maxRadius;
    const jupiterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      jupiterRadius * 0.8,
      centerX,
      centerY,
      jupiterRadius
    );
    jupiterGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    jupiterGradient.addColorStop(0.6, "rgba(138, 43, 226, 0.35)");
    jupiterGradient.addColorStop(1, "rgba(75, 0, 130, 0.5)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, jupiterRadius, 0, Math.PI * 2);
    ctx.fillStyle = jupiterGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(138, 43, 226, 0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Animated wind flow lines (spiraling outward)
    for (let i = 0; i < 24; i++) {
      const baseAngle = (i / 24) * Math.PI * 2;
      const spiralFactor = 0.3; // How much the wind curves

      ctx.beginPath();
      for (let r = jupiterRadius * 0.2; r < maxRadius * 1.1; r += 5) {
        const spiralOffset = (r / maxRadius) * spiralFactor + time + i * 0.1;
        const angle = baseAngle + spiralOffset;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (r === jupiterRadius * 0.2) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Color based on distance - faster winds closer to center
      const intensity = 1 - i / 24;
      ctx.strokeStyle = `rgba(200, 200, 255, ${0.3 * intensity})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add arrowheads to show direction
      const arrowR = maxRadius * 0.7;
      const arrowAngle = baseAngle + (arrowR / maxRadius) * spiralFactor + time + i * 0.1;
      const arrowX = centerX + Math.cos(arrowAngle) * arrowR;
      const arrowY = centerY + Math.sin(arrowAngle) * arrowR;

      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(arrowAngle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(3, 0);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fillStyle = `rgba(200, 200, 255, ${0.5 * intensity})`;
      ctx.fill();
      ctx.restore();
    }

    // Turbulence indicators (chaotic wind patterns)
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2 + time * 0.5;
      const turbRadius = maxRadius * (0.3 + Math.sin(time * 2 + i * 0.4) * 0.15);
      const turbX = centerX + Math.cos(angle) * turbRadius;
      const turbY = centerY + Math.sin(angle) * turbRadius;

      ctx.beginPath();
      ctx.arc(turbX, turbY, 15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.sin(time * 3 + i) * 0.1})`;
      ctx.fill();
    }

    // Outer blast wave boundary
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200, 200, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

      // Request next frame
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [centerLat, centerLng, radiusMiles, peakSpeedMph, casualties, damageZones]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-auto"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        <div className="font-bold text-cyan-400">Wind Blast</div>
        <div>{peakSpeedMph.toLocaleString()} mph peak</div>
        <div>{radiusMiles.toFixed(1)} mile radius</div>
        <div className="text-xs text-red-300">
          {casualties.deaths.toLocaleString()} deaths
        </div>
      </div>
    </div>
  );
}
