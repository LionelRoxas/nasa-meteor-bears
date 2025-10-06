// Crater radius configuration for Mapbox layers
// Matches the visual style from CraterRadius.tsx canvas component

export interface RadiusLayerConfig {
  radius: number; // Multiplier of base radius (0-1.2)
  color: string; // RGBA color string
}

export const getCraterLayers = (isOcean: boolean): RadiusLayerConfig[] => {
  if (isOcean) {
    // Ocean crater - seafloor with sediment (brown/tan tones)
    return [
      { radius: 1.05, color: "rgba(160, 110, 60, 0.7)" }, // Ejecta blanket outer
      { radius: 1.0, color: "rgba(139, 90, 43, 0.9)" }, // Rim middle
      { radius: 0.95, color: "rgba(101, 67, 33, 0.8)" }, // Rim inner
      { radius: 0.85, color: "rgba(110, 75, 45, 0.8)" },
      { radius: 0.7, color: "rgba(90, 60, 35, 0.85)" },
      { radius: 0.6, color: "rgba(65, 40, 25, 0.9)" },
      { radius: 0.35, color: "rgba(40, 25, 15, 0.95)" },
      { radius: 0.15, color: "rgba(20, 10, 5, 0.98)" },
      { radius: 0.05, color: "rgba(5, 5, 5, 1)" }, // Deep black center
    ];
  } else {
    // Land crater - dark rock/soil
    return [
      { radius: 1.05, color: "rgba(130, 100, 70, 0.8)" }, // Ejecta blanket outer
      { radius: 1.0, color: "rgba(110, 85, 60, 0.95)" }, // Rim middle
      { radius: 0.95, color: "rgba(80, 60, 40, 0.9)" }, // Rim inner
      { radius: 0.85, color: "rgba(120, 95, 70, 0.8)" },
      { radius: 0.7, color: "rgba(100, 75, 55, 0.85)" },
      { radius: 0.6, color: "rgba(70, 50, 35, 0.9)" },
      { radius: 0.35, color: "rgba(45, 30, 20, 0.95)" },
      { radius: 0.15, color: "rgba(25, 15, 10, 0.98)" },
      { radius: 0.05, color: "rgba(10, 5, 5, 1)" }, // Deep black center
    ];
  }
};

export const craterConfig = {
  animated: false,
  pulseSpeed: 0,
};
