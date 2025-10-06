// Shockwave radius configuration for Mapbox layers
// Matches the visual style from ShockwaveRadius.tsx canvas component

export interface RadiusLayerConfig {
  radius: number; // Multiplier of base radius (0-1.2)
  color: string; // RGBA color string
}

export const getShockwaveLayers = (): RadiusLayerConfig[] => {
  // Atmospheric pressure waves
  return [
    { radius: 1.0, color: "rgba(180, 200, 230, 0.7)" },
    { radius: 0.75, color: "rgba(190, 210, 230, 0.1)" }, // Homes collapse
    { radius: 0.5, color: "rgba(200, 210, 230, 0.15)" }, // Buildings collapse
    { radius: 0.2, color: "rgba(240, 245, 255, 0.6)" }, // Epicenter
  ];
};

export const shockwaveConfig = {
  animated: true,
  pulseSpeed: 3, // Fast atmospheric shockwave
};
