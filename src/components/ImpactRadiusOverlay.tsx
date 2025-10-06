/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import {
  getCraterLayers,
  craterConfig,
} from "./ImpactRadius/MapboxCraterRadius";
import {
  getFireballLayers,
  fireballConfig,
} from "./ImpactRadius/MapboxFireballRadius";
import {
  getWindBlastLayers,
  windBlastConfig,
} from "./ImpactRadius/MapboxWindBlastRadius";
import {
  getEarthquakeLayers,
  earthquakeConfig,
} from "./ImpactRadius/MapboxEarthquakeRadius";
import {
  getTsunamiLayers,
  tsunamiConfig,
} from "./ImpactRadius/MapboxTsunamiRadius";
import {
  getShockwaveLayers,
  shockwaveConfig,
} from "./ImpactRadius/MapboxShockwaveRadius";

interface ImpactRadiusOverlayProps {
  consequencePrediction: any;
  visibleRadii: {
    crater: boolean;
    fireball: boolean;
    windBlast: boolean;
    earthquake: boolean;
    tsunami: boolean;
    shockwave: boolean;
  };
  map: mapboxgl.Map | null;
}

// Helper to create a circle GeoJSON
const createCircle = (
  center: [number, number],
  radiusKm: number,
  steps = 64
) => {
  const coords = [];
  const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords],
    },
    properties: {},
  };
};

export default function ImpactRadiusOverlay({
  consequencePrediction,
  visibleRadii,
  map,
}: ImpactRadiusOverlayProps) {
  const animationFrameRef = useRef<number>();

  // Parse CSS rgba/ rgb string into numeric channels
  const parseRgba = (color: string) => {
    const m = color.match(
      /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/i
    );
    if (!m) {
      return { r: 255, g: 255, b: 255, a: 0.5 };
    }
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    const a =
      m[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(m[4]!))) : 1;
    return { r, g, b, a };
  };

  useEffect(() => {
    console.log("🔵 ImpactRadiusOverlay useEffect triggered", {
      hasMap: !!map,
      hasConsequencePrediction: !!consequencePrediction,
      hasTrajectory: !!consequencePrediction?.trajectory,
      hasImpactLocation: !!consequencePrediction?.trajectory?.impact_location,
      trajectory: consequencePrediction?.trajectory,
      consequencePrediction,
      visibleRadii,
    });

    if (!map) {
      console.log("⏭️ Early return - no map");
      return;
    }

    if (!consequencePrediction) {
      console.log("⏭️ Early return - no consequencePrediction");
      return;
    }

    if (!consequencePrediction?.trajectory) {
      console.log("⏭️ Early return - no trajectory");
      return;
    }

    if (!consequencePrediction?.trajectory?.impact_location) {
      console.log(
        "⏭️ Early return - no impact_location",
        consequencePrediction.trajectory
      );
      return;
    }

    const { latitude, longitude, geographic_type } =
      consequencePrediction.trajectory.impact_location;
    const center: [number, number] = [longitude, latitude];
    const isOcean = geographic_type === "ocean";

    const { impactPhysics, thermalEffects, windEffects, blastEffects } =
      consequencePrediction;

    console.log("🎨 Setting up detailed animated radius layers at", center);
    console.log("📍 Impact data:", {
      impactPhysics,
      thermalEffects,
      windEffects,
      blastEffects,
      isOcean,
    });

    // Get layer configurations from modular components
    const craterLayers = getCraterLayers(isOcean);
    const fireballLayers = getFireballLayers();
    const windBlastLayers = getWindBlastLayers();
    const earthquakeLayers = getEarthquakeLayers();
    const tsunamiLayers = getTsunamiLayers();
    const shockwaveLayers = getShockwaveLayers();

    console.log("🎨 Layer configs loaded:", {
      craterLayers: craterLayers.length,
      fireballLayers: fireballLayers.length,
      windBlastLayers: windBlastLayers.length,
      earthquakeLayers: earthquakeLayers.length,
      tsunamiLayers: tsunamiLayers.length,
      shockwaveLayers: shockwaveLayers.length,
    });

    const radiusConfigs = [
      {
        id: "crater",
        radiusKm: impactPhysics.craterDiameter / 2,
        layers: craterLayers,
        animated: craterConfig.animated,
        pulseSpeed: craterConfig.pulseSpeed,
        visible: visibleRadii.crater,
      },
      {
        id: "fireball",
        radiusKm: thermalEffects?.fireballRadius || 0,
        layers: fireballLayers,
        animated: fireballConfig.animated,
        pulseSpeed: fireballConfig.pulseSpeed,
        visible: visibleRadii.fireball,
      },
      {
        id: "windblast",
        radiusKm: windEffects?.treesKnockedRadius || 0,
        layers: windBlastLayers,
        animated: windBlastConfig.animated,
        pulseSpeed: windBlastConfig.pulseSpeed,
        visible: visibleRadii.windBlast,
      },
      {
        id: "earthquake",
        radiusKm: impactPhysics.affectedRadius || 0,
        layers: earthquakeLayers,
        animated: earthquakeConfig.animated,
        pulseSpeed: earthquakeConfig.pulseSpeed,
        visible: visibleRadii.earthquake,
      },
      {
        id: "tsunami",
        radiusKm:
          isOcean && impactPhysics.tsunamiHeight
            ? (impactPhysics.tsunamiHeight * 100) / 2
            : 0,
        layers: tsunamiLayers,
        animated: tsunamiConfig.animated,
        pulseSpeed: tsunamiConfig.pulseSpeed,
        visible:
          visibleRadii.tsunami && isOcean && impactPhysics.tsunamiHeight > 0,
      },
      {
        id: "shockwave",
        radiusKm: blastEffects?.severeBlastRadius || 0,
        layers: shockwaveLayers,
        animated: shockwaveConfig.animated,
        pulseSpeed: shockwaveConfig.pulseSpeed,
        visible: visibleRadii.shockwave,
      },
    ];

    // Add a test marker to verify the component is working
    const testMarker = createCircle(center, 5); // 5km test circle
    if (map.getSource("test-marker")) {
      map.removeLayer("test-marker");
      map.removeSource("test-marker");
    }
    map.addSource("test-marker", {
      type: "geojson",
      data: testMarker as any,
    });
    map.addLayer({
      id: "test-marker",
      type: "fill",
      source: "test-marker",
      paint: {
        "fill-color": "#ff0000",
        "fill-opacity": 0.5,
      },
    });
    console.log("🔴 Test marker added at", center);

    // Remove all existing layers
    radiusConfigs.forEach(({ id }) => {
      for (let i = 0; i < 20; i++) {
        const layerId = `impact-${id}-${i}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(`${layerId}-outline`))
          map.removeLayer(`${layerId}-outline`);
        if (map.getSource(layerId)) map.removeSource(layerId);
      }
    });

    console.log(
      "📊 Radius configurations:",
      radiusConfigs.map(({ id, radiusKm, visible }) => ({
        id,
        radiusKm,
        visible,
      }))
    );

    // Add visible radius layers
    radiusConfigs.forEach(({ id, radiusKm, layers, visible }) => {
      if (!visible || radiusKm <= 0) {
        console.log(
          `⏭️ Skipping ${id} - visible: ${visible}, radiusKm: ${radiusKm}`
        );
        return;
      }

      console.log(
        `✅ Adding ${id} with ${layers.length} layers, radius ${radiusKm}km`
      );

      // Add each concentric circle layer
      layers.forEach((layer, index) => {
        const layerRadius = radiusKm * layer.radius;
        const circle = createCircle(center, layerRadius);
        const layerId = `impact-${id}-${index}`;

        map.addSource(layerId, {
          type: "geojson",
          data: circle as any,
        });

        const { r, g, b, a } = parseRgba(layer.color);
        map.addLayer({
          id: layerId,
          type: "fill",
          source: layerId,
          paint: {
            "fill-color": `rgb(${r}, ${g}, ${b})`,
            "fill-opacity": a,
          },
        });

        // Add outline for outermost layer only
        if (index === 0) {
          const { r: lr, g: lg, b: lb, a: la } = parseRgba(layer.color);
          map.addLayer({
            id: `${layerId}-outline`,
            type: "line",
            source: layerId,
            paint: {
              "line-color": `rgb(${lr}, ${lg}, ${lb})`,
              "line-width": 2,
              "line-opacity": Math.max(la, 0.8),
            },
          });
        }
      });
    });

    // Animation function
    const animate = () => {
      const time = Date.now() / 1000;

      radiusConfigs.forEach(
        ({ id, radiusKm, layers, animated, pulseSpeed, visible }) => {
          if (!visible || radiusKm <= 0 || !animated) return;

          const pulse = Math.sin(time * (pulseSpeed || 1)) * 0.15 + 0.85;

          layers.forEach((layer, index) => {
            const layerId = `impact-${id}-${index}`;
            if (map.getLayer(layerId)) {
              const { a } = parseRgba(layer.color);
              const baseOpacity = Number.isFinite(a) ? a : 0.5;
              map.setPaintProperty(
                layerId,
                "fill-opacity",
                baseOpacity * pulse
              );
            }
          });
        }
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      radiusConfigs.forEach(({ id }) => {
        for (let i = 0; i < 20; i++) {
          const layerId = `impact-${id}-${i}`;
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getLayer(`${layerId}-outline`))
            map.removeLayer(`${layerId}-outline`);
          if (map.getSource(layerId)) map.removeSource(layerId);
        }
      });
    };
  }, [map, consequencePrediction, visibleRadii]);

  return null;
}
