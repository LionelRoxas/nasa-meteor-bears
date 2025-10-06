export interface CometData {
  id: string;
  name: string;
  diameter: number; // in meters
  velocity: number; // in km/s
  composition: 'rocky' | 'metallic' | 'icy';
  density: number; // in kg/m³
}

export interface ImpactLocation {
  longitude: number;
  latitude: number;
  city?: string;
  country?: string;
}

export interface ImpactSimulation {
  comet: CometData;
  location: ImpactLocation;
  impactEnergy: number; // in megatons TNT
  craterDiameter: number; // in meters
  damageRadius: number; // in kilometers
  casualties: number;
  economicDamage: number; // in billions USD
}

export interface DamageZone {
  type: 'total_destruction' | 'severe_damage' | 'moderate_damage' | 'light_damage';
  radius: number; // in kilometers
  description: string;
  color: string;
}