import { CometData, ImpactLocation, ImpactSimulation, DamageZone } from '@/types/comet';

// Test comet data - various sizes and compositions
export const TEST_COMETS: CometData[] = [
  {
    id: 'small-rocky',
    name: 'Small Rocky Asteroid',
    diameter: 50, // 50 meters - like Chelyabinsk meteor
    velocity: 18,
    composition: 'rocky',
    density: 2500
  },
  {
    id: 'medium-metallic',
    name: 'Medium Metallic Asteroid',
    diameter: 200, // 200 meters
    velocity: 25,
    composition: 'metallic',
    density: 7800
  },
  {
    id: 'large-rocky',
    name: 'Large Rocky Asteroid',
    diameter: 1000, // 1 km
    velocity: 20,
    composition: 'rocky',
    density: 2200
  },
  {
    id: 'giant-icy',
    name: 'Giant Icy Comet',
    diameter: 5000, // 5 km - civilization threat
    velocity: 30,
    composition: 'icy',
    density: 1000
  },
  {
    id: 'extinction-level',
    name: 'Extinction Level Asteroid',
    diameter: 10000, // 10 km - like Chicxulub impactor
    velocity: 25,
    composition: 'rocky',
    density: 2500
  }
];

// Calculate impact energy using kinetic energy formula: KE = 0.5 * m * v²
function calculateImpactEnergy(comet: CometData): number {
  const radius = comet.diameter / 2; // meters
  const volume = (4/3) * Math.PI * Math.pow(radius, 3); // cubic meters
  const mass = volume * comet.density; // kg
  const velocityMs = comet.velocity * 1000; // convert km/s to m/s
  
  const energyJoules = 0.5 * mass * Math.pow(velocityMs, 2);
  const energyMegatons = energyJoules / 4.184e15; // Convert to megatons TNT
  
  return energyMegatons;
}

// Calculate crater diameter using scaling laws
function calculateCraterDiameter(comet: CometData, energy: number): number {
  // Simplified crater scaling law: D ∝ E^0.25
  // Based on empirical data, assuming typical impact conditions
  const baseDiameter = 1.3 * Math.pow(energy, 0.25) * 1000; // meters
  return baseDiameter;
}

// Calculate damage zones based on impact energy
function calculateDamageZones(energy: number): DamageZone[] {
  const zones: DamageZone[] = [];
  
  // Scale factors based on energy (rough approximations)
  const scaleFactor = Math.pow(energy, 0.3);
  
  zones.push({
    type: 'total_destruction',
    radius: 2 * scaleFactor,
    description: 'Complete destruction, vaporization',
    color: '#ff0000'
  });
  
  zones.push({
    type: 'severe_damage',
    radius: 8 * scaleFactor,
    description: 'Severe structural damage, fires',
    color: '#ff6600'
  });
  
  zones.push({
    type: 'moderate_damage',
    radius: 20 * scaleFactor,
    description: 'Moderate damage, broken windows',
    color: '#ffaa00'
  });
  
  zones.push({
    type: 'light_damage',
    radius: 50 * scaleFactor,
    description: 'Light damage, minor injuries',
    color: '#ffdd00'
  });
  
  return zones;
}

// Estimate casualties based on population density and damage zones
function estimateCasualties(location: ImpactLocation, damageZones: DamageZone[]): number {
  // Simplified population density estimation
  // In reality, this would use actual population data
  const populationDensity = 1000; // people per km²
  
  let totalCasualties = 0;
  
  damageZones.forEach(zone => {
    const area = Math.PI * Math.pow(zone.radius, 2);
    const population = area * populationDensity;
    
    // Casualty rates based on damage type
    let casualtyRate = 0;
    switch (zone.type) {
      case 'total_destruction':
        casualtyRate = 0.9;
        break;
      case 'severe_damage':
        casualtyRate = 0.5;
        break;
      case 'moderate_damage':
        casualtyRate = 0.1;
        break;
      case 'light_damage':
        casualtyRate = 0.01;
        break;
    }
    
    totalCasualties += population * casualtyRate;
  });
  
  return Math.round(totalCasualties);
}

// Estimate economic damage
function estimateEconomicDamage(damageZones: DamageZone[]): number {
  const economicDensity = 10; // million USD per km²
  
  let totalDamage = 0;
  
  damageZones.forEach(zone => {
    const area = Math.PI * Math.pow(zone.radius, 2);
    
    let damageRate = 0;
    switch (zone.type) {
      case 'total_destruction':
        damageRate = 1.0;
        break;
      case 'severe_damage':
        damageRate = 0.7;
        break;
      case 'moderate_damage':
        damageRate = 0.3;
        break;
      case 'light_damage':
        damageRate = 0.05;
        break;
    }
    
    totalDamage += area * economicDensity * damageRate;
  });
  
  return totalDamage; // in millions USD
}

export function simulateImpact(comet: CometData, location: ImpactLocation): ImpactSimulation {
  const impactEnergy = calculateImpactEnergy(comet);
  const craterDiameter = calculateCraterDiameter(comet, impactEnergy);
  const damageZones = calculateDamageZones(impactEnergy);
  const casualties = estimateCasualties(location, damageZones);
  const economicDamage = estimateEconomicDamage(damageZones);
  
  return {
    comet,
    location,
    impactEnergy,
    craterDiameter,
    damageRadius: damageZones[damageZones.length - 1]?.radius || 0,
    casualties,
    economicDamage
  };
}

export function getDamageZones(simulation: ImpactSimulation): DamageZone[] {
  return calculateDamageZones(simulation.impactEnergy);
}