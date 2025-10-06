// Fireball radius configuration for Mapbox layers
// Matches the visual style from FireballRadius.tsx canvas component

export interface RadiusLayerConfig {
  radius: number; // Multiplier of base radius (0-1.2)
  color: string; // RGBA color string
}

export const getFireballLayers = (): RadiusLayerConfig[] => {
  // White-hot core to orange-red outer gradient
  return [
    { radius: 1.0, color: "rgba(180, 40, 10, 0.5)" }, // Outer red
    { radius: 0.85, color: "rgba(220, 80, 20, 0.65)" },
    { radius: 0.7, color: "rgba(255, 120, 30, 0.75)" }, // Orange-red
    { radius: 0.5, color: "rgba(255, 180, 50, 0.8)" }, // Yellow-orange
    { radius: 0.3, color: "rgba(255, 220, 100, 0.85)" },
    { radius: 0.1, color: "rgba(255, 255, 200, 0.9)" }, // Yellow
    { radius: 0.05, color: "rgba(255, 255, 255, 0.95)" }, // White-hot core
  ];
};

export const fireballConfig = {
  animated: true,
  pulseSpeed: 2, // Fast pulsing for fire effect
};
