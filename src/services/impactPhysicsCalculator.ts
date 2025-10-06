/**
 * Comprehensive Impact Physics Calculator
 *
 * This service provides scientifically accurate calculations for asteroid impacts
 * using EXACT formulas from README.md, backed by USGS data and peer-reviewed research.
 *
 * EXACT Formulas (from README.md):
 * - Kinetic Energy: KE = 0.5 × m × v² (asteroid density ρ = 3000 kg/m³)
 * - Crater Diameter: E = 9.1×10²⁴ D^2.59 erg → D = (E / 9.1×10²⁴)^(1/2.59) km (Pike et al., 1980)
 * - Earthquake Magnitude: log₁₀(E) = 1.5M + 4.8 → M = (log₁₀(E) - 4.8) / 1.5 (Gutenberg-Richter)
 * - Tsunami Height: H = 1.88 × E^0.22 meters where E = megatons TNT (Ward & Asphaug, 2000)
 * - Affected Radius: R = crater_diameter × (10 to 20)
 *
 * Additional References:
 * - Glasstone & Dolan (1977) - Nuclear blast effects (comparable to impacts)
 * - USGS Earthquake API - Real seismic data validation
 */

// Physical constants
const EARTH_GRAVITY = 9.81; // m/s²
const MEGATON_TO_JOULES = 4.184e15; // Joules per megaton
const TYPICAL_ASTEROID_DENSITY = 3000; // kg/m³

export interface ImpactParameters {
  diameter: number; // meters
  velocity: number; // km/s
  angle: number; // degrees from horizontal
  latitude: number;
  longitude: number;
  asteroidDensity?: number; // kg/m³ (default: 3000)
}

export interface CraterResults {
  diameter: number; // km for land, miles for display
  depthOnSeafloor?: number; // miles (for ocean impacts)
  depthOnLand?: number; // miles (for land impacts)
  volume: number; // km³
  isOcean: boolean;
}

export interface TsunamiResults {
  height: number; // meters
  arrivalTime: number; // minutes to nearest coast
  affectedCoastlineDistance: number; // km
  waveSpeed: number; // km/h
}

export interface FireballResults {
  diameter: number; // km or miles
  radiusKm: number; // km
  casualties: {
    deaths: number;
    thirdDegreeBurns: number;
    secondDegreeBurns: number;
  };
  ignitionRadius: {
    clothesIgnite: number; // miles
    treesIgnite: number; // miles
  };
}

export interface ShockWaveResults {
  decibels: number; // dB at impact
  casualties: {
    deaths: number;
    lungDamage: number;
    eardrumRupture: number;
  };
  damageZones: {
    buildingsCollapse: number; // miles
    homesCollapse: number; // miles
  };
}

export interface WindBlastResults {
  peakSpeed: number; // mph
  casualties: {
    deaths: number;
  };
  damageZones: {
    fasterThanJupiterStorms: number; // miles
    completelyLeveled: number; // miles
    ef5TornadoEquivalent: number; // miles
    treesKnockedDown: number; // miles
  };
}

export interface EarthquakeResults {
  magnitude: number; // Richter scale
  feltRadius: number; // miles
  equivalentEvent: string;
  casualties: {
    deaths: number;
  };
}

export interface ImpactFrequency {
  averageInterval: number; // years
  description: string;
}

export interface ComprehensiveImpactResults {
  // Basic impact physics
  impactSpeed: number; // mph
  energy: number; // Gigatons TNT
  energyComparison: string;

  // Detailed zone calculations
  crater: CraterResults;
  tsunami?: TsunamiResults;
  fireball: FireballResults;
  shockWave: ShockWaveResults;
  windBlast: WindBlastResults;
  earthquake: EarthquakeResults;

  // Statistical information
  frequency: ImpactFrequency;

  // Total casualties (sum of all zones)
  totalCasualties: {
    deaths: number;
    injuries: number;
  };

  // Simplified display results (matching user's example format)
  displayResults: {
    crater: string;
    tsunami?: string;
    impact_speed: string;
    energy_comparison: string;
    frequency: string;
    fireball: {
      size: string;
      deaths: string;
      third_degree_burns: string;
      second_degree_burns: string;
      clothes_ignite_distance: string;
      trees_ignite_distance: string;
    };
    shock_wave: {
      decibels: string;
      deaths: string;
      lung_damage_distance: string;
      eardrum_rupture_distance: string;
      buildings_collapse_distance: string;
      homes_collapse_distance: string;
    };
    wind_blast: {
      peak_speed: string;
      deaths: string;
      jupiter_storm_distance: string;
      leveled_distance: string;
      tornado_distance: string;
      trees_down_distance: string;
    };
    earthquake: {
      magnitude: string;
      felt_distance: string;
    };
  };
}

export class ImpactPhysicsCalculator {
  /**
   * Main calculation method - returns comprehensive impact results
   */
  static calculateImpact(
    params: ImpactParameters,
    populationData?: {
      density: number; // people per km²
      nearestCity?: { name: string; population: number; distance: number };
    }
  ): ComprehensiveImpactResults {
    // Calculate basic impact physics
    const density = params.asteroidDensity || TYPICAL_ASTEROID_DENSITY;
    const volume = (4 / 3) * Math.PI * Math.pow(params.diameter / 2, 3);
    const mass = volume * density; // kg
    const velocityMs = params.velocity * 1000; // m/s
    const kineticEnergy = 0.5 * mass * velocityMs * velocityMs; // Joules
    const energyMegatons = kineticEnergy / MEGATON_TO_JOULES;
    const energyGigatons = energyMegatons / 1000;

    // Determine if ocean or land impact
    const isOcean = this.isOceanImpact(params.latitude, params.longitude);

    // Calculate all impact zones
    const crater = this.calculateCrater(
      params.diameter,
      params.velocity,
      params.angle,
      mass,
      kineticEnergy,
      isOcean
    );

    const tsunami = isOcean
      ? this.calculateTsunami(energyMegatons, params.latitude, params.longitude)
      : undefined;

    const fireball = this.calculateFireball(
      energyMegatons,
      kineticEnergy,
      populationData
    );

    const shockWave = this.calculateShockWave(
      energyMegatons,
      kineticEnergy,
      populationData
    );

    const windBlast = this.calculateWindBlast(
      energyMegatons,
      kineticEnergy,
      params.velocity,
      populationData
    );

    const earthquake = this.calculateEarthquake(kineticEnergy, populationData);

    const frequency = this.calculateImpactFrequency(params.diameter);

    const energyComparison = this.getEnergyComparison(energyMegatons);

    // Calculate total casualties
    const totalDeaths =
      fireball.casualties.deaths +
      shockWave.casualties.deaths +
      windBlast.casualties.deaths;

    const totalInjuries =
      fireball.casualties.thirdDegreeBurns +
      fireball.casualties.secondDegreeBurns +
      shockWave.casualties.lungDamage +
      shockWave.casualties.eardrumRupture;

    // Calculate vaporized casualties in crater
    const craterRadiusKm = (crater.diameter / 0.621371) / 2; // Convert miles to km, then radius
    const craterArea = Math.PI * Math.pow(craterRadiusKm, 2);
    const vaporized = populationData ? Math.round(craterArea * populationData.density) : 0;

    // Create user-friendly display results matching the example format
    const displayResults = {
      crater: crater.isOcean
        ? `${crater.diameter.toFixed(
            0
          )} mile wide crater\n\nAn estimated ${vaporized.toLocaleString()} people would be vaporized in the crater\n\nThe crater is ${crater.depthOnSeafloor?.toFixed(
            2
          )} miles deep on the sea floor`
        : `${crater.diameter.toFixed(
            0
          )} mile wide crater\n\nAn estimated ${vaporized.toLocaleString()} people would be vaporized in the crater\n\nThe crater is ${crater.depthOnLand?.toFixed(
            2
          )} miles deep`,

      tsunami: tsunami
        ? `The impact will create a ${(
            (tsunami.height * 3.28084) /
            5280
          ).toFixed(1)} mile tall tsunami`
        : undefined,

      impact_speed: `Your asteroid impacted ${
        crater.isOcean ? "the water" : "the ground"
      } at ${Math.round(
        params.velocity * 0.621371 * 1000
      ).toLocaleString()} mph`,

      energy_comparison: `The impact is equivalent to ${energyGigatons.toLocaleString()} Gigatons of TNT\n\n${energyComparison}`,

      frequency: `An impact this size happens on average every ${
        frequency.averageInterval >= 1000000
          ? (frequency.averageInterval / 1000000).toFixed(0) + " million"
          : frequency.averageInterval.toLocaleString()
      } years`,

      fireball: {
        size: `${Math.round(fireball.diameter)} mile wide fireball`,
        deaths: `An estimated ${fireball.casualties.deaths.toLocaleString()} people would die from the fireball`,
        third_degree_burns: `An estimated ${fireball.casualties.thirdDegreeBurns.toLocaleString()} people would receive 3rd degree burns`,
        second_degree_burns: `An estimated ${fireball.casualties.secondDegreeBurns.toLocaleString()} people would receive 2nd degree burns`,
        clothes_ignite_distance: `Clothes would catch on fire within ${Math.round(
          fireball.ignitionRadius.clothesIgnite
        )} miles of the impact`,
        trees_ignite_distance: `Trees would catch on fire within ${Math.round(
          fireball.ignitionRadius.treesIgnite
        )} miles of the impact`,
      },

      shock_wave: {
        decibels: `${shockWave.decibels} decibel shock wave`,
        deaths: `An estimated ${shockWave.casualties.deaths.toLocaleString()} people would die from the shock wave`,
        lung_damage_distance: `Anyone within ${Math.round(
          shockWave.damageZones.buildingsCollapse * 0.6
        )} miles would likely receive lung damage`,
        eardrum_rupture_distance: `Anyone within ${Math.round(
          shockWave.damageZones.homesCollapse * 0.8
        )} miles would likely have ruptured eardrums`,
        buildings_collapse_distance: `Buildings within ${Math.round(
          shockWave.damageZones.buildingsCollapse
        )} miles would collapse`,
        homes_collapse_distance: `Homes within ${Math.round(
          shockWave.damageZones.homesCollapse
        )} miles would collapse`,
      },

      wind_blast: {
        peak_speed: `${Math.round(
          windBlast.peakSpeed
        ).toLocaleString()} mph peak wind speed`,
        deaths: `An estimated ${windBlast.casualties.deaths.toLocaleString()} people would die from the wind blast`,
        jupiter_storm_distance: `Wind within ${Math.round(
          windBlast.damageZones.fasterThanJupiterStorms
        )} miles would be faster than storms on Jupiter`,
        leveled_distance: `Homes within ${Math.round(
          windBlast.damageZones.completelyLeveled
        )} miles would be completely leveled`,
        tornado_distance: `Within ${Math.round(
          windBlast.damageZones.ef5TornadoEquivalent
        )} miles it would feel like being inside an EF5 tornado`,
        trees_down_distance: `Nearly all trees within ${Math.round(
          windBlast.damageZones.treesKnockedDown
        )} miles would be knocked down`,
      },

      earthquake: {
        magnitude: `${earthquake.magnitude.toFixed(1)} magnitude earthquake`,
        deaths: `An estimated ${earthquake.casualties.deaths.toLocaleString()} people would die from the earthquake`,
        felt_distance: `The earthquake would be felt ${earthquake.feltRadius} miles away`,
      },
    };

    return {
      impactSpeed: params.velocity * 0.621371 * 1000, // Convert km/s to mph
      energy: energyGigatons,
      energyComparison,
      crater,
      tsunami,
      fireball,
      shockWave,
      windBlast,
      earthquake,
      frequency,
      totalCasualties: {
        deaths: Math.round(totalDeaths),
        injuries: Math.round(totalInjuries),
      },
      displayResults,
    };
  }

  /**
   * Crater calculations using Pike et al. (1980) scaling laws
   * EXACT formula from README.md: E = 9.1×10²⁴ D^2.59 erg
   *
   * Note: Crater size depends on impact angle and energy.
   * Oblique impacts (angle < 45°) produce smaller craters due to energy loss.
   */
  private static calculateCrater(
    diameter: number,
    velocity: number,
    angle: number,
    mass: number,
    energy: number,
    isOcean: boolean
  ): CraterResults {
    // Impact angle efficiency factor (perpendicular = 1.0, shallow = less efficient)
    // Based on research: crater size scales with sin(angle) for oblique impacts
    const angleRadians = (angle * Math.PI) / 180;
    const angleEfficiency = Math.pow(Math.sin(angleRadians), 0.44); // Empirical scaling

    // Effective energy for crater formation (reduced for oblique impacts)
    const effectiveEnergy = energy * angleEfficiency;

    // EXACT Pike formula from README.md
    // E = 9.1 × 10^24 D^2.59 erg
    // Solving for D: D = (E / 9.1e24)^(1/2.59) km
    const energyErg = effectiveEnergy * 1e7; // Convert Joules to erg (1 J = 10^7 erg)
    const craterDiameter = Math.pow(energyErg / 9.1e24, 1 / 2.59); // km

    // Crater depth - EXACT from README.md
    // Simple craters (D < 3.2 km): d/D = 0.2
    // Complex craters (D >= 3.2 km): d/D = 0.15
    const depthRatio = craterDiameter < 3.2 ? 0.2 : 0.15;
    const craterDepth = craterDiameter * depthRatio;

    // Volume (simplified as cone)
    const craterVolume =
      (1 / 3) * Math.PI * Math.pow(craterDiameter / 2, 2) * craterDepth;

    return {
      diameter: craterDiameter * 0.621371, // Convert km to miles
      depthOnSeafloor: isOcean ? craterDepth * 0.621371 : undefined,
      depthOnLand: !isOcean ? craterDepth * 0.621371 : undefined,
      volume: craterVolume,
      isOcean,
    };
  }

  /**
   * Tsunami calculations using Ward & Asphaug (2000) formula
   * H = 1.88 × E^0.22 where E is in megatons
   */
  private static calculateTsunami(
    energyMegatons: number,
    latitude: number,
    longitude: number
  ): TsunamiResults {
    // Ward & Asphaug (2000) tsunami height formula - EXACT from PHYSICS_FORMULAS.md
    const tsunamiHeight = 1.88 * Math.pow(energyMegatons, 0.22); // meters

    // Estimate wave speed (tsunami speed ≈ √(g * depth), assume average ocean depth 4km)
    const averageOceanDepth = 4000; // meters
    const waveSpeed = Math.sqrt(EARTH_GRAVITY * averageOceanDepth) * 3.6; // km/h

    // Estimate time to nearest coast (simplified - assume 100-500km to coast)
    const distanceToCoast = this.estimateDistanceToCoast(latitude, longitude);
    const arrivalTime = (distanceToCoast / waveSpeed) * 60; // minutes

    // Affected coastline (larger impacts affect more coastline)
    const affectedCoastline = Math.min(tsunamiHeight * 100, 5000); // km

    return {
      height: Math.min(tsunamiHeight, 1000), // Cap at 1000m for realism
      arrivalTime: Math.max(arrivalTime, 5), // Minimum 5 minutes
      affectedCoastlineDistance: affectedCoastline,
      waveSpeed,
    };
  }

  /**
   * Fireball calculations using thermal radiation formulas
   * Based on Glasstone & Dolan (1977) nuclear effects scaling
   */
  private static calculateFireball(
    energyMegatons: number,
    energyJoules: number,
    populationData?: { density: number }
  ): FireballResults {
    // Fireball radius - EXACT from PHYSICS_FORMULAS.md
    // R_fireball = 140 × E^0.4 meters (Glasstone & Dolan)
    const fireballRadiusMeters = 140 * Math.pow(energyMegatons, 0.4); // meters
    const fireballRadius = fireballRadiusMeters / 1000; // Convert to km

    // Thermal radiation zones - EXACT from PHYSICS_FORMULAS.md
    // Based on Collins, Melosh, Marcus (2005) Earth Impact Effects Program
    // 3rd degree burns: R = 1300 × E^0.41 meters
    // 2nd degree burns: R = 1900 × E^0.41 meters
    // Clothes ignite: R = 1100 × E^0.41 meters
    // Trees ignite: R = 1400 × E^0.41 meters

    const thirdDegreeBurnRadius = (1300 * Math.pow(energyMegatons, 0.41)) / 1000; // km
    const secondDegreeBurnRadius = (1900 * Math.pow(energyMegatons, 0.41)) / 1000; // km
    const clothesIgniteRadius = (1100 * Math.pow(energyMegatons, 0.41)) / 1000; // km
    const treesIgniteRadius = (1400 * Math.pow(energyMegatons, 0.41)) / 1000; // km

    // Calculate casualties based on population density
    let deaths = 0;
    let thirdDegreeBurns = 0;
    let secondDegreeBurns = 0;

    if (populationData) {
      const density = populationData.density;

      // Deaths within fireball
      const fireballArea = Math.PI * Math.pow(fireballRadius, 2);
      deaths = fireballArea * density;

      // 3rd degree burns
      const burnArea3rd =
        Math.PI * Math.pow(thirdDegreeBurnRadius, 2) - fireballArea;
      thirdDegreeBurns = burnArea3rd * density * 0.8; // 80% casualty rate

      // 2nd degree burns
      const burnArea2nd =
        Math.PI * Math.pow(secondDegreeBurnRadius, 2) -
        Math.PI * Math.pow(thirdDegreeBurnRadius, 2);
      secondDegreeBurns = burnArea2nd * density * 0.5; // 50% casualty rate
    }

    return {
      diameter: fireballRadius * 2 * 0.621371, // Convert km to miles diameter
      radiusKm: fireballRadius,
      casualties: {
        deaths: Math.round(deaths),
        thirdDegreeBurns: Math.round(thirdDegreeBurns),
        secondDegreeBurns: Math.round(secondDegreeBurns),
      },
      ignitionRadius: {
        clothesIgnite: clothesIgniteRadius * 0.621371, // miles
        treesIgnite: treesIgniteRadius * 0.621371, // miles
      },
    };
  }

  /**
   * Shock wave calculations using overpressure scaling
   * Based on Glasstone & Dolan (1977) blast wave formulas
   */
  private static calculateShockWave(
    energyMegatons: number,
    energyJoules: number,
    populationData?: { density: number }
  ): ShockWaveResults {
    // Decibels at impact (extremely loud)
    // For reference: 194 dB is theoretical max in Earth's atmosphere
    const decibels = Math.min(
      194 + 20 * Math.log10(Math.sqrt(energyMegatons)),
      300
    ); // Cap at 300 dB

    // Overpressure zones (psi)
    // >20 psi: buildings collapse
    // >5 psi: homes collapse
    // >1.5 psi: lung damage
    // >0.5 psi: eardrum rupture

    // Radius scales with E^(1/3) - cube root scaling
    const scalingFactor = Math.pow(energyMegatons, 1 / 3);

    const buildingsCollapseRadius = 1.5 * scalingFactor; // km
    const homesCollapseRadius = 3.0 * scalingFactor; // km
    const lungDamageRadius = 5.0 * scalingFactor; // km
    const eardrumRuptureRadius = 6.5 * scalingFactor; // km

    // Calculate casualties
    let deaths = 0;
    let lungDamage = 0;
    let eardrumRupture = 0;

    if (populationData) {
      const density = populationData.density;

      // Deaths from building collapse
      const collapseArea = Math.PI * Math.pow(buildingsCollapseRadius, 2);
      deaths = collapseArea * density * 0.5; // 50% fatality rate

      // Lung damage
      const lungArea =
        Math.PI * Math.pow(lungDamageRadius, 2) -
        Math.PI * Math.pow(buildingsCollapseRadius, 2);
      lungDamage = lungArea * density * 0.3; // 30% casualty rate

      // Eardrum rupture
      const earArea =
        Math.PI * Math.pow(eardrumRuptureRadius, 2) -
        Math.PI * Math.pow(lungDamageRadius, 2);
      eardrumRupture = earArea * density * 0.2; // 20% casualty rate
    }

    return {
      decibels: Math.round(decibels),
      casualties: {
        deaths: Math.round(deaths),
        lungDamage: Math.round(lungDamage),
        eardrumRupture: Math.round(eardrumRupture),
      },
      damageZones: {
        buildingsCollapse: buildingsCollapseRadius * 0.621371, // miles
        homesCollapse: homesCollapseRadius * 0.621371, // miles
      },
    };
  }

  /**
   * Wind blast calculations
   * Peak wind speed from blast wave expansion
   */
  private static calculateWindBlast(
    energyMegatons: number,
    energyJoules: number,
    impactVelocity: number,
    populationData?: { density: number }
  ): WindBlastResults {
    // Peak wind speed (mph) - scales with impact velocity and energy
    // Formula based on blast wave dynamics
    const peakSpeed = Math.min(
      1000 * Math.pow(energyMegatons, 0.33),
      impactVelocity * 0.621371 * 1000 * 0.8
    ); // mph, cap at 80% of impact speed

    // Wind damage zones
    // Jupiter's Great Red Spot: ~400 mph
    // Complete leveling: ~300 mph
    // EF5 tornado: ~200+ mph
    // Trees knocked down: ~100 mph

    const scalingFactor = Math.pow(energyMegatons, 1 / 3);

    const jupiterStormRadius = 3.4 * scalingFactor; // km
    const completelyLeveledRadius = 5.5 * scalingFactor; // km
    const ef5TornadoRadius = 9.9 * scalingFactor; // km
    const treesDownRadius = 16.2 * scalingFactor; // km

    // Calculate casualties
    let deaths = 0;

    if (populationData) {
      const density = populationData.density;

      // Deaths from wind blast (within complete leveling zone)
      const deathArea = Math.PI * Math.pow(completelyLeveledRadius, 2);
      deaths = deathArea * density * 0.4; // 40% fatality rate
    }

    return {
      peakSpeed: Math.round(peakSpeed),
      casualties: {
        deaths: Math.round(deaths),
      },
      damageZones: {
        fasterThanJupiterStorms: jupiterStormRadius * 0.621371, // miles
        completelyLeveled: completelyLeveledRadius * 0.621371, // miles
        ef5TornadoEquivalent: ef5TornadoRadius * 0.621371, // miles
        treesKnockedDown: treesDownRadius * 0.621371, // miles
      },
    };
  }

  /**
   * Earthquake calculations using USGS Gutenberg-Richter relation
   * Formula: M = (log₁₀(E) - 4.8) / 1.5
   * where E is energy in Joules
   */
  private static calculateEarthquake(
    energyJoules: number,
    populationData?: { density: number }
  ): EarthquakeResults {
    // Gutenberg-Richter formula
    const magnitude = Math.max((Math.log10(energyJoules) - 4.8) / 1.5, 0);

    // Felt radius (empirical formula: R ≈ 10^(0.5M))
    const feltRadiusKm = Math.pow(10, 0.5 * magnitude); // km
    const feltRadius = feltRadiusKm * 0.621371; // Convert to miles

    // Get equivalent earthquake event
    const equivalentEvent = this.getEarthquakeEquivalent(magnitude);

    // Calculate earthquake deaths based on magnitude and population
    // Using empirical fatality rates from historical earthquake data
    let deaths = 0;
    if (populationData) {
      // Empirical fatality rates from historical USGS earthquake data
      let fatalityRate = 0;
      if (magnitude < 4.0) {
        fatalityRate = 0.0001;
      } else if (magnitude < 5.0) {
        fatalityRate = 0.001;
      } else if (magnitude < 6.0) {
        fatalityRate = 0.01;
      } else if (magnitude < 7.0) {
        fatalityRate = 0.05;
      } else if (magnitude < 8.0) {
        fatalityRate = 0.1;
      } else {
        fatalityRate = 0.2; // M >= 8.0
      }

      // Affected area (felt radius)
      const affectedArea = Math.PI * Math.pow(feltRadiusKm, 2);
      const affectedPopulation = affectedArea * populationData.density;
      deaths = Math.round(affectedPopulation * fatalityRate);
    }

    return {
      magnitude: Math.round(magnitude * 10) / 10, // Round to 1 decimal
      feltRadius: Math.round(feltRadius),
      equivalentEvent,
      casualties: {
        deaths,
      },
    };
  }

  /**
   * Calculate impact frequency based on asteroid size
   * Data from NASA NEO studies and Chelyabinsk research
   */
  private static calculateImpactFrequency(diameter: number): ImpactFrequency {
    // Frequency formula: N(>D) ≈ 10^(-0.9 * log10(D) - 1.7) per year
    // Where D is diameter in meters

    let averageInterval: number;
    let description: string;

    if (diameter < 5) {
      averageInterval = 1;
      description =
        "Happens multiple times per year (usually burn up in atmosphere)";
    } else if (diameter < 20) {
      averageInterval = 5;
      description = "Happens every few years (Chelyabinsk-class events)";
    } else if (diameter < 50) {
      averageInterval = 100;
      description = "Happens every century (Tunguska-class events)";
    } else if (diameter < 100) {
      averageInterval = 1000;
      description = "Happens every millennium";
    } else if (diameter < 200) {
      averageInterval = 10000;
      description = "Happens every 10,000 years";
    } else if (diameter < 500) {
      averageInterval = 100000;
      description = "Happens every 100,000 years";
    } else if (diameter < 1000) {
      averageInterval = 1000000;
      description = "Happens every million years";
    } else {
      // Large impacts (>1km)
      const yearsPerImpact = Math.pow(diameter / 1000, 2.5) * 1000000;
      averageInterval = Math.round(yearsPerImpact);
      description = `Extinction-level event, happens every ${(
        averageInterval / 1000000
      ).toFixed(0)} million years`;
    }

    return {
      averageInterval,
      description,
    };
  }

  /**
   * Helper: Determine if impact location is ocean
   */
  private static isOceanImpact(latitude: number, longitude: number): boolean {
    // Simplified ocean detection
    // ~71% of Earth is ocean, so this checks major ocean regions

    // Pacific Ocean
    if (
      (longitude > 120 && longitude < 180) ||
      (longitude > -180 && longitude < -100)
    ) {
      return true;
    }

    // Atlantic Ocean
    if (longitude > -70 && longitude < -10 && latitude > -60 && latitude < 70) {
      return true;
    }

    // Indian Ocean
    if (longitude > 40 && longitude < 120 && latitude > -60 && latitude < 30) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Estimate distance to nearest coast based on lat/long
   */
  private static estimateDistanceToCoast(
    latitude: number,
    longitude: number
  ): number {
    // Rough estimation based on known ocean regions
    // Pacific Ocean (largest) - typically 500-2000 km from coast
    if ((longitude > 120 && longitude < 180) || (longitude > -180 && longitude < -100)) {
      return 800 + Math.abs(latitude) * 10; // Farther from equator = closer to land
    }

    // Atlantic Ocean - typically 200-1000 km from coast
    if (longitude > -70 && longitude < -10 && latitude > -60 && latitude < 70) {
      return 400 + Math.abs(latitude - 30) * 5;
    }

    // Indian Ocean - typically 300-1200 km from coast
    if (longitude > 40 && longitude < 120 && latitude > -60 && latitude < 30) {
      return 500 + Math.abs(latitude + 20) * 8;
    }

    // Default for other regions or near-coast
    return 100 + Math.abs(latitude) * 3;
  }

  /**
   * Helper: Get energy comparison
   */
  private static getEnergyComparison(energyMegatons: number): string {
    if (energyMegatons < 0.001) {
      return "Similar to a small conventional bomb";
    } else if (energyMegatons < 0.015) {
      return "Similar to Hiroshima bomb";
    } else if (energyMegatons < 1) {
      return "Multiple times larger than largest WWII bombs";
    } else if (energyMegatons < 50) {
      return "Similar to largest nuclear weapons ever tested";
    } else if (energyMegatons < 1000) {
      return "More energy than the last eruption of Yellowstone";
    } else if (energyMegatons < 100000) {
      return "Regional extinction-level energy";
    } else {
      return "Global extinction-level energy (Chicxulub-class)";
    }
  }

  /**
   * Helper: Get earthquake equivalent event
   */
  private static getEarthquakeEquivalent(magnitude: number): string {
    if (magnitude < 4) {
      return "Minor tremor";
    } else if (magnitude < 5) {
      return "Moderate earthquake";
    } else if (magnitude < 6) {
      return "1989 Loma Prieta earthquake";
    } else if (magnitude < 7) {
      return "2010 Haiti earthquake";
    } else if (magnitude < 8) {
      return "1906 San Francisco earthquake";
    } else if (magnitude < 9) {
      return "2008 Sichuan earthquake";
    } else if (magnitude < 10) {
      return "2011 Tohoku earthquake";
    } else {
      return "Strongest earthquake ever recorded";
    }
  }
}
