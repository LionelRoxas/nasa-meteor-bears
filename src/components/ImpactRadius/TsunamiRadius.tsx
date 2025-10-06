"use client";

import { useEffect, useRef } from "react";
import { kmToPixels } from "@/utils/geoUtils";

interface TsunamiRadiusProps {
  centerLat: number;
  centerLng: number;
  waveHeightMeters: number;
  waveSpeedKmh: number;
  arrivalTimeMinutes: number;
  affectedCoastlineKm: number;
  zoom?: number;
  mapWidth?: number;
  mapHeight?: number;
}

export default function TsunamiRadius({
  centerLat,
  centerLng,
  waveHeightMeters,
  waveSpeedKmh,
  arrivalTimeMinutes,
  affectedCoastlineKm,
  zoom,
  mapWidth = 300,
  mapHeight = 300,
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

    // Use affected coastline distance as the visual radius
    const radiusKm = affectedCoastlineKm / 2; // Approximate radius
    const calculatedZoom = zoom ?? Math.max(0, 10 - Math.log2(radiusKm / 1.60934));
    const maxRadius = kmToPixels(radiusKm, centerLat, calculatedZoom);

    let animationId: number;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Animate tsunami wave propagation
      const time = Date.now() / 800;
      const waveOffset = (time % 5) / 5;

    // Draw deep ocean base
    const oceanGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 1.2
    );
    oceanGradient.addColorStop(0, "rgba(10, 50, 100, 0.7)");
    oceanGradient.addColorStop(0.5, "rgba(15, 70, 130, 0.6)");
    oceanGradient.addColorStop(1, "rgba(20, 90, 160, 0.5)");

    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw expanding tsunami waves
    for (let wave = 0; wave < 7; wave++) {
      const wavePhase = (waveOffset + wave * 0.143) % 1;
      const waveRadius = maxRadius * 1.2 * wavePhase;
      const opacity = 1 - wavePhase;

      // Main wave crest - bright turquoise/white foam
      const crestGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(0, waveRadius - 20),
        centerX,
        centerY,
        waveRadius + 20
      );
      crestGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.9})`);
      crestGradient.addColorStop(0.3, `rgba(180, 240, 255, ${opacity * 0.85})`);
      crestGradient.addColorStop(0.6, `rgba(100, 200, 255, ${opacity * 0.7})`);
      crestGradient.addColorStop(1, `rgba(40, 150, 220, ${opacity * 0.5})`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = crestGradient.toString();
      ctx.lineWidth = 25 * opacity;
      ctx.stroke();

      // Wave trough (darker deep blue water)
      if (waveRadius > 30) {
        const troughGradient = ctx.createRadialGradient(
          centerX,
          centerY,
          Math.max(0, waveRadius - 35),
          centerX,
          centerY,
          waveRadius - 30
        );
        troughGradient.addColorStop(0, `rgba(5, 40, 80, ${opacity * 0.7})`);
        troughGradient.addColorStop(1, `rgba(10, 60, 110, ${opacity * 0.5})`);

        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius - 30, 0, Math.PI * 2);
        ctx.strokeStyle = troughGradient.toString();
        ctx.lineWidth = 15 * opacity;
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

    // Impact epicenter - churning water
    const epicenterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 0.25
    );
    epicenterGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    epicenterGradient.addColorStop(0.2, "rgba(150, 220, 255, 0.8)");
    epicenterGradient.addColorStop(0.5, "rgba(60, 150, 230, 0.6)");
    epicenterGradient.addColorStop(1, "rgba(20, 100, 180, 0.4)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = epicenterGradient;
    ctx.fill();

    // Cavity from impact (water displacement) - dark void
    const cavityPulse = Math.sin(time * 2) * 0.1 + 1;
    const cavityGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      maxRadius * 0.15 * cavityPulse
    );
    cavityGradient.addColorStop(0, "rgba(5, 10, 30, 0.95)");
    cavityGradient.addColorStop(0.5, "rgba(15, 40, 80, 0.8)");
    cavityGradient.addColorStop(1, "rgba(30, 80, 140, 0.5)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.15 * cavityPulse, 0, Math.PI * 2);
    ctx.fillStyle = cavityGradient;
    ctx.fill();

    // Wave height zones (danger levels) - subtle blue tones
    const waveHeightFeet = waveHeightMeters * 3.28084;

    // Extreme danger zone (close to impact) - scale with wave height
    const heightFactor = Math.min(waveHeightFeet / 100, 1.5); // Cap at 1.5x for very large waves
    const extremeRadius = maxRadius * 0.4 * heightFactor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, extremeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(80, 150, 220, 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // High danger zone
    const highRadius = maxRadius * 0.7;
    ctx.beginPath();
    ctx.arc(centerX, centerY, highRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100, 170, 240, 0.45)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Moderate danger zone
    const moderateRadius = maxRadius;
    ctx.beginPath();
    ctx.arc(centerX, centerY, moderateRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(120, 190, 255, 0.4)";
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

    // Outer boundary - bright ocean blue
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(60, 170, 255, 0.9)";
    ctx.lineWidth = 4;
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
    zoom,
  ]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
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
