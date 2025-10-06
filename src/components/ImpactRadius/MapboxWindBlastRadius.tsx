// Wind blast radius configuration for Mapbox layers
// Matches the visual style from WindBlastRadius.tsx canvas component

export interface RadiusLayerConfig {
  radius: number; // Multiplier of base radius (0-1.2)
  color: string; // RGBA color string
}

export const getWindBlastLayers = (): RadiusLayerConfig[] => {
  // Light blue flowing air zones
  return [
    { radius: 1.0, color: "rgba(200, 215, 230, 0.15)" }, // Trees knocked
    { radius: 0.75, color: "rgba(190, 205, 220, 0.2)" }, // EF5 tornado
    { radius: 0.5, color: "rgba(180, 195, 215, 0.25)" }, // Completely leveled
    { radius: 0.3, color: "rgba(170, 185, 210, 0.3)" }, // Jupiter storms
  ];
};

export const windBlastConfig = {
  animated: true,
  pulseSpeed: 0.5, // Slow flowing effect
};
