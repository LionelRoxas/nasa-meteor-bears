"use client";

import { useEffect, useRef } from "react";

interface EarthquakeRadiusProps {
  centerLat: number;
  centerLng: number;
  radiusMiles: number; // Felt radius in miles
  magnitude: number;
  casualties: {
    deaths: number;
  };
}

export default function EarthquakeRadius({
  centerLat,
  centerLng,
  radiusMiles,
  magnitude,
  casualties,
}: EarthquakeRadiusProps) {
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

      // Animate seismic waves
      const time = Date.now() / 1000;
      const waveOffset = (time % 4) / 4;

    // Draw seismic wave propagation
    for (let wave = 0; wave < 6; wave++) {
      const wavePhase = (waveOffset + wave * 0.167) % 1;
      const waveRadius = maxRadius * wavePhase;
      const opacity = (1 - wavePhase) * 0.7;

      // P-wave (primary, faster)
      const pWaveGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(0, waveRadius - 5),
        centerX,
        centerY,
        waveRadius + 5
      );
      pWaveGradient.addColorStop(0, `rgba(139, 69, 19, ${opacity * 0.3})`);
      pWaveGradient.addColorStop(0.5, `rgba(160, 82, 45, ${opacity * 0.6})`);
      pWaveGradient.addColorStop(1, `rgba(139, 69, 19, ${opacity * 0.3})`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = pWaveGradient.toString();
      ctx.lineWidth = 10 * opacity;
      ctx.stroke();

      // S-wave (secondary, slower) - follows behind
      if (waveRadius > 30) {
        const sWaveRadius = waveRadius - 25;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sWaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(101, 67, 33, ${opacity * 0.5})`;
        ctx.lineWidth = 6 * opacity;
        ctx.stroke();
      }
    }

    // Ground shaking intensity zones
    // Severe shaking zone (near epicenter)
    const severeRadius = maxRadius * 0.3;
    const severeGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      severeRadius
    );
    severeGradient.addColorStop(0, "rgba(139, 0, 0, 0.4)");
    severeGradient.addColorStop(0.5, "rgba(178, 34, 34, 0.3)");
    severeGradient.addColorStop(1, "rgba(205, 92, 92, 0.2)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, severeRadius, 0, Math.PI * 2);
    ctx.fillStyle = severeGradient;
    ctx.fill();

    // Moderate shaking zone
    const moderateRadius = maxRadius * 0.6;
    const moderateGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      severeRadius,
      centerX,
      centerY,
      moderateRadius
    );
    moderateGradient.addColorStop(0, "rgba(255, 140, 0, 0.25)");
    moderateGradient.addColorStop(0.5, "rgba(255, 165, 0, 0.2)");
    moderateGradient.addColorStop(1, "rgba(255, 200, 124, 0.15)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, moderateRadius, 0, Math.PI * 2);
    ctx.fillStyle = moderateGradient;
    ctx.fill();

    // Light shaking zone (felt radius)
    const lightGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      moderateRadius,
      centerX,
      centerY,
      maxRadius
    );
    lightGradient.addColorStop(0, "rgba(210, 180, 140, 0.2)");
    lightGradient.addColorStop(0.5, "rgba(222, 184, 135, 0.15)");
    lightGradient.addColorStop(1, "rgba(245, 222, 179, 0.1)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = lightGradient;
    ctx.fill();

    // Epicenter marker
    const epicenterGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      20
    );
    epicenterGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    epicenterGradient.addColorStop(0.5, "rgba(255, 0, 0, 0.8)");
    epicenterGradient.addColorStop(1, "rgba(139, 0, 0, 0.6)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = epicenterGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add fault line visualization (radiating cracks)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.sin(time + i) * 0.1;
      const crackLength = maxRadius * (0.6 + Math.random() * 0.3);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);

      // Jagged crack pattern
      for (let d = 0; d < crackLength; d += 15) {
        const jitter = (Math.random() - 0.5) * 10;
        const x = centerX + Math.cos(angle) * d + Math.cos(angle + Math.PI / 2) * jitter;
        const y = centerY + Math.sin(angle) * d + Math.sin(angle + Math.PI / 2) * jitter;
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(80, 50, 30, ${0.4 - i * 0.04})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Modified Mercalli Intensity contours
    const mmiContours = [
      { radius: severeRadius, label: "IX-X", color: "rgba(139, 0, 0, 0.8)" },
      { radius: moderateRadius, label: "VI-VIII", color: "rgba(255, 140, 0, 0.7)" },
      { radius: maxRadius, label: "III-V", color: "rgba(210, 180, 140, 0.6)" },
    ];

    mmiContours.forEach(({ radius, color }) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Outer boundary
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(139, 69, 19, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

      // Request next frame
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [centerLat, centerLng, radiusMiles, magnitude, casualties]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-auto"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        <div className="font-bold text-amber-600">Earthquake</div>
        <div>Magnitude {magnitude.toFixed(1)}</div>
        <div>Felt {radiusMiles.toFixed(0)} miles away</div>
        <div className="text-xs text-red-300">
          {casualties.deaths.toLocaleString()} deaths
        </div>
      </div>
    </div>
  );
}
