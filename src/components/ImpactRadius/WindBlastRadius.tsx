"use client";

import { useEffect, useRef } from "react";
import { milesToPixels } from "@/utils/geoUtils";

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
  zoom?: number;
  mapWidth?: number;
  mapHeight?: number;
}

export default function WindBlastRadius({
  centerLat,
  centerLng,
  radiusMiles,
  peakSpeedMph,
  casualties,
  damageZones,
  zoom,
  mapWidth = 300,
  mapHeight = 300,
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

    const calculatedZoom = zoom ?? Math.max(0, 10 - Math.log2(radiusMiles));
    const maxRadius = milesToPixels(radiusMiles, centerLat, calculatedZoom);

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
    treesGradient.addColorStop(0.7, "rgba(220, 230, 240, 0.1)");
    treesGradient.addColorStop(1, "rgba(200, 215, 230, 0.15)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, treesRadius, 0, Math.PI * 2);
    ctx.fillStyle = treesGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 215, 230, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

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
    ef5Gradient.addColorStop(0.7, "rgba(210, 220, 235, 0.15)");
    ef5Gradient.addColorStop(1, "rgba(190, 205, 220, 0.2)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, ef5Radius, 0, Math.PI * 2);
    ctx.fillStyle = ef5Gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(190, 205, 220, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

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
    leveledGradient.addColorStop(0.7, "rgba(200, 210, 230, 0.2)");
    leveledGradient.addColorStop(1, "rgba(180, 195, 215, 0.25)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, leveledRadius, 0, Math.PI * 2);
    ctx.fillStyle = leveledGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 195, 215, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

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
    jupiterGradient.addColorStop(0.6, "rgba(190, 200, 220, 0.25)");
    jupiterGradient.addColorStop(1, "rgba(170, 185, 210, 0.3)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, jupiterRadius, 0, Math.PI * 2);
    ctx.fillStyle = jupiterGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(170, 185, 210, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw wind streaks - realistic flowing air patterns
    const windStreaks = 40;
    for (let i = 0; i < windStreaks; i++) {
      const baseAngle = (i / windStreaks) * Math.PI * 2;
      const streakPhase = (time * 0.5 + i * 0.15) % 1;

      // Wind streak starts from center and flows outward
      const startRadius = maxRadius * streakPhase * 0.3;
      const endRadius = maxRadius * streakPhase;

      if (endRadius < maxRadius * 0.15) continue; // Don't draw tiny streaks

      const opacity = (1 - streakPhase) * 0.6;

      // Add slight curve to wind path (vortex effect)
      const curveFactor = 0.4;
      const startAngle = baseAngle + streakPhase * curveFactor;
      const endAngle = baseAngle + streakPhase * curveFactor * 1.3;

      // Create curved wind streak path
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(startAngle) * startRadius,
        centerY + Math.sin(startAngle) * startRadius
      );

      // Draw curved line with control points
      const midRadius = (startRadius + endRadius) / 2;
      const midAngle = (startAngle + endAngle) / 2;
      const cpRadius = midRadius * 1.1; // Control point slightly outward for curve

      ctx.quadraticCurveTo(
        centerX + Math.cos(midAngle) * cpRadius,
        centerY + Math.sin(midAngle) * cpRadius,
        centerX + Math.cos(endAngle) * endRadius,
        centerY + Math.sin(endAngle) * endRadius
      );

      const gradient = ctx.createLinearGradient(
        centerX + Math.cos(startAngle) * startRadius,
        centerY + Math.sin(startAngle) * startRadius,
        centerX + Math.cos(endAngle) * endRadius,
        centerY + Math.sin(endAngle) * endRadius
      );
      gradient.addColorStop(0, `rgba(230, 235, 245, ${opacity * 0.3})`);
      gradient.addColorStop(0.5, `rgba(240, 245, 255, ${opacity * 0.7})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.2})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3 + Math.random() * 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Add small chevron at end to show direction
      if (streakPhase > 0.3 && streakPhase < 0.9) {
        const chevronX = centerX + Math.cos(endAngle) * endRadius;
        const chevronY = centerY + Math.sin(endAngle) * endRadius;

        ctx.save();
        ctx.translate(chevronX, chevronY);
        ctx.rotate(endAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4, -6);
        ctx.moveTo(0, 0);
        ctx.lineTo(-4, 6);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Add dust/debris particles being blown outward
    const particles = 30;
    for (let i = 0; i < particles; i++) {
      const particlePhase = (time * 0.7 + i * 0.1) % 1;
      const angle = (i / particles) * Math.PI * 2 + particlePhase * 0.5;
      const radius = maxRadius * particlePhase * 0.9;

      if (radius < maxRadius * 0.1) continue;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = 2 + Math.random() * 3;
      const opacity = (1 - particlePhase) * 0.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 240, ${opacity})`;
      ctx.fill();

      // Add motion blur trail
      const trailLength = 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - Math.cos(angle) * trailLength,
        y - Math.sin(angle) * trailLength
      );
      ctx.strokeStyle = `rgba(220, 230, 240, ${opacity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
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
  }, [centerLat, centerLng, radiusMiles, peakSpeedMph, casualties, damageZones, zoom]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
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
