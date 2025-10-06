// Earthquake radius configuration for Mapbox layers
// Matches the visual style from EarthquakeRadius.tsx canvas component

export interface RadiusLayerConfig {
  radius: number; // Multiplier of base radius (0-1.2)
  color: string; // RGBA color string
}

export const getEarthquakeLayers = (): RadiusLayerConfig[] => {
  // Brown seismic waves
  return [
    { radius: 1.0, color: "rgba(245, 222, 179, 0.1)" }, // Light shaking
    { radius: 0.6, color: "rgba(222, 184, 135, 0.15)" }, // Moderate shaking
    { radius: 0.3, color: "rgba(205, 92, 92, 0.2)" }, // Severe shaking
    { radius: 0.1, color: "rgba(139, 0, 0, 0.4)" }, // Epicenter
  ];
};

export const earthquakeConfig = {
  animated: true,
  pulseSpeed: 1, // Medium pulsing for seismic waves
};
