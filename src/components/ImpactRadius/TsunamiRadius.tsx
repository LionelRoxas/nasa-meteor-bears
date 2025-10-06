"use client";

import { useEffect, useRef } from "react";

interface TsunamiRadiusProps {
  centerLat: number;
  centerLng: number;
  waveHeightMeters: number;
  waveSpeedKmh: number;
  arrivalTimeMinutes: number;
  affectedCoastlineKm: number;
}

export default function TsunamiRadius({
  centerLat,
  centerLng,
  waveHeightMeters,
  waveSpeedKmh,
  arrivalTimeMinutes,
  affectedCoastlineKm,
}: TsunamiRadiusProps) {
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

      // Animate tsunami wave propagation
      const time = Date.now() / 800;
      const waveOffset = (time % 5) / 5;

    // Draw ocean base
    const oceanGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 1.2
    );
    oceanGradient.addColorStop(0, "rgba(0, 40, 80, 0.4)");
    oceanGradient.addColorStop(0.5, "rgba(0, 60, 120, 0.3)");
    oceanGradient.addColorStop(1, "rgba(0, 80, 140, 0.2)");

    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw expanding tsunami waves
    for (let wave = 0; wave < 7; wave++) {
      const wavePhase = (waveOffset + wave * 0.143) % 1;
      const waveRadius = maxRadius * 1.2 * wavePhase;
      const opacity = 1 - wavePhase;

      // Main wave crest
      const crestGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(0, waveRadius - 15),
        centerX,
        centerY,
        waveRadius + 15
      );
      crestGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.6})`);
      crestGradient.addColorStop(0.5, `rgba(200, 230, 255, ${opacity * 0.8})`);
      crestGradient.addColorStop(1, `rgba(100, 180, 255, ${opacity * 0.4})`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = crestGradient.toString();
      ctx.lineWidth = 20 * opacity;
      ctx.stroke();

      // Wave trough (darker water)
      if (waveRadius > 25) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius - 25, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 50, 100, ${opacity * 0.5})`;
        ctx.lineWidth = 10 * opacity;
        ctx.stroke();
      }

      // Foam and turbulence
      if (waveRadius > 40 && wavePhase > 0.2) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + time * 0.5;
          const foamR = waveRadius + (Math.random() - 0.5) * 10;
          const foamX = centerX + Math.cos(angle) * foamR;
          const foamY = centerY + Math.sin(angle) * foamR;

          ctx.beginPath();
          ctx.arc(foamX, foamY, 3 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
          ctx.fill();
        }
      }
    }

    // Impact epicenter - underwater disturbance
    const epicenterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 0.25
    );
    epicenterGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    epicenterGradient.addColorStop(0.2, "rgba(100, 180, 255, 0.6)");
    epicenterGradient.addColorStop(0.5, "rgba(0, 100, 200, 0.4)");
    epicenterGradient.addColorStop(1, "rgba(0, 60, 120, 0.2)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = epicenterGradient;
    ctx.fill();

    // Cavity from impact (water displacement)
    const cavityPulse = Math.sin(time * 2) * 0.1 + 1;
    const cavityGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 0.15 * cavityPulse
    );
    cavityGradient.addColorStop(0, "rgba(20, 20, 40, 0.8)");
    cavityGradient.addColorStop(0.5, "rgba(40, 60, 100, 0.6)");
    cavityGradient.addColorStop(1, "rgba(60, 100, 160, 0.3)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.15 * cavityPulse, 0, Math.PI * 2);
    ctx.fillStyle = cavityGradient;
    ctx.fill();

    // Wave height zones (danger levels)
    const waveHeightFeet = waveHeightMeters * 3.28084;

    // Extreme danger zone (close to impact) - scale with wave height
    const heightFactor = Math.min(waveHeightFeet / 100, 1.5); // Cap at 1.5x for very large waves
    const extremeRadius = maxRadius * 0.4 * heightFactor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, extremeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // High danger zone
    const highRadius = maxRadius * 0.7;
    ctx.beginPath();
    ctx.arc(centerX, centerY, highRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 140, 0, 0.6)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Moderate danger zone
    const moderateRadius = maxRadius;
    ctx.beginPath();
    ctx.arc(centerX, centerY, moderateRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Directional wave propagation indicators
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const arrowDist = maxRadius * 0.8;

      ctx.save();
      ctx.translate(
        centerX + Math.cos(angle) * arrowDist,
        centerY + Math.sin(angle) * arrowDist
      );
      ctx.rotate(angle);

      // Arrow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(15, -8);
      ctx.lineTo(15, 8);
      ctx.closePath();
      ctx.fillStyle = "rgba(200, 230, 255, 0.7)";
      ctx.fill();
      ctx.strokeStyle = "rgba(100, 180, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // Outer boundary
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100, 180, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

      // Request next frame
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [
    centerLat,
    centerLng,
    waveHeightMeters,
    waveSpeedKmh,
    arrivalTimeMinutes,
    affectedCoastlineKm,
  ]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-auto"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        <div className="font-bold text-blue-400">Tsunami</div>
        <div>{(waveHeightMeters * 3.28084 / 5280).toFixed(1)} mile high wave</div>
        <div className="text-xs text-cyan-300">
          {waveSpeedKmh.toFixed(0)} km/h wave speed
        </div>
        <div className="text-xs text-yellow-300">
          ETA: {arrivalTimeMinutes.toFixed(0)} min to coast
        </div>
      </div>
    </div>
  );
}
