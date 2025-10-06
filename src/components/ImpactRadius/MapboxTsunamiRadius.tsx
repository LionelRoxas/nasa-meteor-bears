// Tsunami radius configuration for Mapbox layers
// Matches the visual style from TsunamiRadius.tsx canvas component

export interface RadiusLayerConfig {
  radius: number; // Multiplier of base radius (0-1.2)
  color: string; // RGBA color string
}

export const getTsunamiLayers = (): RadiusLayerConfig[] => {
  // Blue ocean waves
  return [
    { radius: 1.2, color: "rgba(20, 90, 160, 0.5)" },
    { radius: 1.0, color: "rgba(15, 70, 130, 0.6)" },
    { radius: 0.7, color: "rgba(10, 50, 100, 0.7)" },
    { radius: 0.25, color: "rgba(30, 80, 140, 0.5)" }, // Cavity
    { radius: 0.15, color: "rgba(5, 10, 30, 0.95)" }, // Water displacement
  ];
};

export const tsunamiConfig = {
  animated: true,
  pulseSpeed: 0.8, // Wave-like pulsing
};
