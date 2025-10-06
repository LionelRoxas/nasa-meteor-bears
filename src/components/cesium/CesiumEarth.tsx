"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer, Entity, CameraFlyTo } from "resium";
import {
  Ion,
  Cartesian3,
  Color,
  Viewer as CesiumViewer,
  buildModuleUrl,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartographic,
  Math as CesiumMath,
  Cartesian2,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Set Cesium Ion token
const CESIUM_ION_TOKEN =
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWEwZWFhYi1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzYiLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4OWfUZUG8hqyNY6rOK8cg1c0CfqLp0";

// Configure Cesium base URL for assets
if (typeof window !== "undefined") {
  (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
  // Set the base URL for Cesium assets
  (
    buildModuleUrl as unknown as { setBaseUrl: (url: string) => void }
  ).setBaseUrl("/cesium/");
}

Ion.defaultAccessToken = CESIUM_ION_TOKEN;

interface CesiumEarthProps {
  impactLocation: { lat: number; lng: number };
  showImpactZones?: boolean;
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  isSimulating?: boolean;
  asteroidParams?: {
    diameter: number;
    velocity: number;
    angle: number;
    distance: number;
  };
  onImpact?: () => void;
}

export default function CesiumEarth({
  impactLocation,
  showImpactZones = false,
  onLocationSelect,
  isSimulating = false,
  asteroidParams,
  onImpact,
}: CesiumEarthProps) {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [asteroidPosition, setAsteroidPosition] = useState<Cartesian3 | null>(
    null
  );
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [showAsteroid, setShowAsteroid] = useState(false);

  // Handle click events on the globe
  useEffect(() => {
    if (!viewerRef.current || !onLocationSelect) return;

    const viewer = viewerRef.current;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: { position: Cartesian2 }) => {
      const cartesian = viewer.camera.pickEllipsoid(
        click.position,
        viewer.scene.globe.ellipsoid
      );
      if (cartesian) {
        const cartographic = Cartographic.fromCartesian(cartesian);
        const lat = CesiumMath.toDegrees(cartographic.latitude);
        const lng = CesiumMath.toDegrees(cartographic.longitude);
        onLocationSelect({ lat, lng });
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [onLocationSelect]);

  // Animate asteroid during simulation
  useEffect(() => {
    if (!isSimulating || !viewerRef.current || !asteroidParams) {
      setShowAsteroid(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    setShowAsteroid(true);
    const viewer = viewerRef.current;

    // Calculate starting position (distance from Earth in km)
    const startDistance = asteroidParams.distance * 1000; // Convert to meters
    const startHeight = startDistance;

    // Animation duration based on velocity (simplified)
    const duration = 5000; // 5 seconds for animation
    startTimeRef.current = Date.now();

    const animate = () => {
      if (!startTimeRef.current || !viewerRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate current height (exponential easing for realistic fall)
      const currentHeight = startHeight * (1 - Math.pow(progress, 2));

      if (progress >= 1) {
        // Impact!
        setShowAsteroid(false);
        if (onImpact) {
          onImpact();
        }
        return;
      }

      // Update asteroid position
      const currentPos = Cartesian3.fromDegrees(
        impactLocation.lng,
        impactLocation.lat,
        currentHeight
      );
      setAsteroidPosition(currentPos);

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);

      // Update camera to follow asteroid (gradually zoom in)
      if (viewer.camera && progress > 0.2) {
        const cameraHeight = Math.max(currentHeight * 3, 1000000);
        const cameraPos = Cartesian3.fromDegrees(
          impactLocation.lng,
          impactLocation.lat,
          cameraHeight
        );
        viewer.camera.position = cameraPos;
        viewer.camera.lookAt(currentPos, new Cartesian3(0, 0, 100000));
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSimulating, asteroidParams, impactLocation, onImpact]);

  return (
    <div className="w-full h-full">
      <Viewer
        ref={(ref) => {
          if (ref?.cesiumElement) {
            viewerRef.current = ref.cesiumElement;
          }
        }}
        full
        animation={false}
        timeline={false}
        vrButton={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
        requestRenderMode={true}
        maximumRenderTimeChange={Infinity}
        creditContainer={document.createElement("div")}
      >
        {/* Camera fly to impact location */}
        <CameraFlyTo
          destination={Cartesian3.fromDegrees(
            impactLocation.lng,
            impactLocation.lat,
            5000000 // 5000 km altitude
          )}
          duration={2}
        />

        {/* Asteroid entity (animated) */}
        {showAsteroid && asteroidPosition && (
          <Entity
            name="Asteroid"
            description="Incoming asteroid"
            position={asteroidPosition}
            point={{
              pixelSize: 20,
              color: Color.ORANGE,
              outlineColor: Color.RED,
              outlineWidth: 3,
            }}
            label={{
              text: "☄️ Asteroid",
              font: "14pt sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cartesian2(0, -30),
              showBackground: true,
              backgroundColor: Color.BLACK.withAlpha(0.7),
            }}
          />
        )}

        {/* Impact location marker */}
        {!isSimulating && (
          <Entity
            name="Impact Location"
            description={`Impact coordinates: ${impactLocation.lat.toFixed(
              4
            )}°, ${impactLocation.lng.toFixed(4)}°`}
            position={Cartesian3.fromDegrees(
              impactLocation.lng,
              impactLocation.lat,
              0
            )}
            point={{
              pixelSize: 15,
              color: Color.RED,
              outlineColor: Color.WHITE,
              outlineWidth: 2,
            }}
          />
        )}

        {/* Impact zones (if enabled) */}
        {showImpactZones && (
          <>
            {/* Crater zone */}
            <Entity
              name="Crater"
              position={Cartesian3.fromDegrees(
                impactLocation.lng,
                impactLocation.lat,
                0
              )}
              ellipse={{
                semiMinorAxis: 2000, // 2 km
                semiMajorAxis: 2000,
                material: Color.RED.withAlpha(0.3),
                outline: true,
                outlineColor: Color.RED,
              }}
            />

            {/* Fireball zone */}
            <Entity
              name="Fireball"
              position={Cartesian3.fromDegrees(
                impactLocation.lng,
                impactLocation.lat,
                0
              )}
              ellipse={{
                semiMinorAxis: 5000, // 5 km
                semiMajorAxis: 5000,
                material: Color.ORANGE.withAlpha(0.25),
                outline: true,
                outlineColor: Color.ORANGE,
              }}
            />

            {/* Severe blast zone */}
            <Entity
              name="Severe Blast"
              position={Cartesian3.fromDegrees(
                impactLocation.lng,
                impactLocation.lat,
                0
              )}
              ellipse={{
                semiMinorAxis: 15000, // 15 km
                semiMajorAxis: 15000,
                material: Color.PURPLE.withAlpha(0.2),
                outline: true,
                outlineColor: Color.PURPLE,
              }}
            />

            {/* Moderate blast zone */}
            <Entity
              name="Moderate Blast"
              position={Cartesian3.fromDegrees(
                impactLocation.lng,
                impactLocation.lat,
                0
              )}
              ellipse={{
                semiMinorAxis: 30000, // 30 km
                semiMajorAxis: 30000,
                material: Color.BLUE.withAlpha(0.15),
                outline: true,
                outlineColor: Color.BLUE,
              }}
            />

            {/* Light blast zone */}
            <Entity
              name="Light Blast"
              position={Cartesian3.fromDegrees(
                impactLocation.lng,
                impactLocation.lat,
                0
              )}
              ellipse={{
                semiMinorAxis: 50000, // 50 km
                semiMajorAxis: 50000,
                material: Color.CYAN.withAlpha(0.1),
                outline: true,
                outlineColor: Color.CYAN,
              }}
            />
          </>
        )}
      </Viewer>
    </div>
  );
}
