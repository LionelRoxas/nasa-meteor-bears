import Groq from "groq-sdk";
import {
  AsteroidTrajectoryCalculator,
  AsteroidTrajectory,
} from "../utils/asteroid-trajectory";
import {
  ImpactPhysicsCalculator,
  type ImpactParameters,
  type ComprehensiveImpactResults,
} from "@/services/impactPhysicsCalculator";

// Lazy initialize Groq client to avoid client-side environment variable errors
let groq: Groq | null = null;

function getGroqClient(): Groq | null {
  if (groq) return groq;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY not available - LLM analysis will be skipped");
    return null;
  }

  groq = new Groq({ apiKey });
  return groq;
}

// Import types from Groq SDK
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

// Define our simplified message type for internal use
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Helper function to convert our message format to Groq's expected format
function convertToGroqMessages(
  messages: ChatMessage[]
): ChatCompletionMessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  })) as ChatCompletionMessageParam[];
}

// Updated interface to match the actual asteroid data structure
export interface AsteroidData {
  id: string;
  name: string;
  diameter_meters?: number;
  velocity_km_s?: number;
  distance_km?: number;
  is_hazardous?: boolean;
  absolute_magnitude_h?: number;
  kinetic_energy_mt?: number;
  // Fallback fields if NASA API format is used
  estimated_diameter?: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  close_approach_data?: Array<{
    relative_velocity: {
      kilometers_per_second: string;
    };
    miss_distance: {
      kilometers: string;
    };
  }>;
  is_potentially_hazardous_asteroid?: boolean;
}

export interface ImpactLocation {
  type: "ocean" | "land" | "city" | "mountain" | "desert";
  name: string;
  latitude: number;
  longitude: number;
  population: number;
}

export interface ConsequencePrediction {
  // NEW: Comprehensive impact results from the new calculator
  comprehensiveImpact?: ComprehensiveImpactResults;

  impactPhysics: {
    energy: number; // Joules
    craterDiameter: number; // km
    craterDepth: number; // km
    earthquakeMagnitude: number;
    affectedRadius: number; // km
    tsunamiHeight?: number; // meters (if ocean impact)
    megatonsEquivalent: number; // MT TNT
    fireballRadius: number; // km
    peakWindSpeed: number; // mph
    shockwaveDecibels: number; // dB
  };
  thermalEffects: {
    fireballRadius: number; // km
    severeBurns: { radius: number; casualties: number }; // 3rd degree
    moderateburns: { radius: number; casualties: number }; // 2nd degree
    minorBurns: { radius: number; casualties: number }; // 1st degree
    clothesIgniteRadius: number; // km
    treesIgniteRadius: number; // km
  };
  blastEffects: {
    overpressureAtRim: number; // atmospheres
    severeBlastRadius: number; // km (ΔP > 0.3 atm)
    moderateBlastRadius: number; // km (ΔP > 0.1 atm)
    lightBlastRadius: number; // km (ΔP > 0.03 atm)
    lungDamageRadius: number; // km
    eardrumRuptureRadius: number; // km
    buildingsCollapseRadius: number; // km
    homesCollapseRadius: number; // km
  };
  windEffects: {
    peakWindSpeed: number; // mph
    ef5TornadoZoneRadius: number; // km (v > 200 mph)
    homesLeveledRadius: number; // km (v > 250 mph)
    treesKnockedRadius: number; // km (v > 100 mph)
  };
  casualties: {
    vaporized: number; // Inside crater
    fireballDeaths: number; // Fireball zone
    severeBurnDeaths: number; // 3rd degree burns
    shockwaveDeaths: number; // Blast overpressure
    windBlastDeaths: number; // Wind damage
    earthquakeDeaths: number; // Seismic effects
    totalEstimated: number; // Sum of all
  };
  populationAtRisk: number;
  economicDamage: number; // billions USD
  threatLevel: "LOW" | "MODERATE" | "HIGH" | "CATASTROPHIC";
  trajectory: AsteroidTrajectory; // Precise trajectory data
  fullResponse: Record<string, unknown>; // Complete JSON response from LLM
  quickAnalysis?: string; // User-friendly 1-sentence explanation
}

class ConsequencePredictor {
  // EXACT NASA Challenge physics constants from CHALLENGE.md specifications
  private readonly ASTEROID_DENSITY = 3000; // kg/m³ as specified in CHALLENGE.md
  private readonly TNT_ENERGY_PER_KG = 4.184e6; // J/kg TNT equivalent

  // Initialize trajectory calculator
  private trajectoryCalculator = new AsteroidTrajectoryCalculator();

  // EXACT crater scaling laws from scientific literature (CHALLENGE.md + links.md)
  // From research: E = 9.1 × 10^24 D^2.59 erg relationship rearranged
  // D = (E / 9.1e24)^(1/2.59) where E is in erg, convert to SI units
  private readonly CRATER_ENERGY_EXPONENT = 1 / 2.59; // ≈ 0.386, exact from literature

  // Ward & Asphaug tsunami scaling for ocean impacts (exact formulation from links.md)
  // From Ward and Asphaug (2000): Initial cavity scaling relationships
  private readonly WARD_ASPHAUG_SCALING = 1.88; // CT parameter from Schmidt and Holsapple (1982)
  private readonly TSUNAMI_DEPTH_EXPONENT = 0.22; // β parameter from laboratory experiments

  // Gutenberg-Richter earthquake magnitude relationship (exact formula from links.md)
  private readonly GUTENBERG_RICHTER_A = 4.8; // Standard constant
  private readonly GUTENBERG_RICHTER_B = 1.5; // Standard constant

  // Calculate kinetic energy using exact physics from CHALLENGE.md
  calculateKineticEnergy(asteroid: AsteroidData): number {
    let diameterM: number;
    let velocityKmS: number;

    // Handle both data formats
    if (asteroid.diameter_meters && asteroid.velocity_km_s) {
      diameterM = asteroid.diameter_meters;
      velocityKmS = asteroid.velocity_km_s;
    } else if (asteroid.estimated_diameter && asteroid.close_approach_data) {
      diameterM =
        asteroid.estimated_diameter.kilometers.estimated_diameter_max * 1000;
      velocityKmS = parseFloat(
        asteroid.close_approach_data[0]?.relative_velocity
          .kilometers_per_second || "20"
      );
    } else {
      // Fallback values
      diameterM = 100; // 100m default
      velocityKmS = 20; // 20 km/s default
    }

    // Use NASA Challenge specifications: density 3000 kg/m³
    const radius = diameterM / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const mass = volume * this.ASTEROID_DENSITY;
    const velocityMs = velocityKmS * 1000;

    return 0.5 * mass * Math.pow(velocityMs, 2); // Kinetic energy in Joules
  }

  // EXACT crater scaling using scientific literature formula from links.md
  // Based on E = 9.1 × 10^24 D^2.59 erg rearranged to solve for D
  calculateCraterDiameter(energy: number): number {
    // Convert energy from Joules to erg (1 J = 10^7 erg)
    const energyErg = energy * 1e7;

    // Apply the exact formula: D = (E / 9.1e24)^(1/2.59)
    // Where E is in erg and D is in km
    const craterDiameterKm = Math.pow(
      energyErg / 9.1e24,
      this.CRATER_ENERGY_EXPONENT
    );

    return Math.max(craterDiameterKm, 0.001); // Minimum 1m crater
  }

  // EXACT Gutenberg-Richter earthquake magnitude relationship from links.md
  calculateEarthquakeMagnitude(energy: number): number {
    // Exact Gutenberg-Richter relation: log10(E) = 1.5M + 4.8
    // Solving for M: M = (log10(E) - 4.8) / 1.5
    const logEnergy = Math.log10(energy);
    return Math.max(
      0,
      (logEnergy - this.GUTENBERG_RICHTER_A) / this.GUTENBERG_RICHTER_B
    );
  }

  // Ward & Asphaug tsunami scaling for ocean impacts (exact formulation from links.md)
  calculateTsunamiHeight(
    energy: number,
    impactLocation: ImpactLocation
  ): number | undefined {
    if (impactLocation.type !== "ocean") return undefined;

    // Ward & Asphaug cavity diameter scaling: dc = CT * (energy scaling terms)
    // Simplified approximation based on their cavity depth relationships
    const energyMT = energy / (this.TNT_ENERGY_PER_KG * 1e9); // Convert to megatons

    // Initial cavity depth scaling from Ward & Asphaug
    const cavityDepth =
      this.WARD_ASPHAUG_SCALING *
      Math.pow(energyMT, this.TSUNAMI_DEPTH_EXPONENT);

    // Tsunami height approximately scales with cavity depth for moderate impacts
    return Math.min(cavityDepth * 10, 1000); // Cap at 1km for realism
  }

  // Crater depth calculation (Pike 1977-1988)
  calculateCraterDepth(diameter: number): number {
    // Simple craters (D < 3.2 km): d/D = 0.2
    // Complex craters (D >= 3.2 km): d/D = 0.15 (shallower due to collapse)
    const SIMPLE_CRATER_THRESHOLD = 3.2; // km
    const depthToRatio = diameter < SIMPLE_CRATER_THRESHOLD ? 0.2 : 0.15;
    return diameter * depthToRatio;
  }

  // Fireball radius calculation (nuclear blast scaling)
  calculateFireballRadius(energyMT: number): number {
    // R_fireball = 140 × E^0.4 meters (Glasstone & Dolan)
    // Fireball scales as approximately 5th root of energy
    const radiusMeters = 140 * Math.pow(energyMT, 0.4);
    return radiusMeters / 1000; // Convert to km
  }

  // Thermal radiation burn zones (Collins et al. 2005, nuclear scaling)
  calculateThermalBurnRadii(energyMT: number): {
    severe: number; // 3rd degree burns
    moderate: number; // 2nd degree burns
    minor: number; // 1st degree burns
    clothesIgnite: number;
    treesIgnite: number;
  } {
    // All formulas from nuclear weapons effects, validated for asteroid impacts
    return {
      severe: (1300 * Math.pow(energyMT, 0.41)) / 1000, // km
      moderate: (1900 * Math.pow(energyMT, 0.41)) / 1000, // km
      minor: (2500 * Math.pow(energyMT, 0.41)) / 1000, // km
      clothesIgnite: (1100 * Math.pow(energyMT, 0.41)) / 1000, // km
      treesIgnite: (1400 * Math.pow(energyMT, 0.41)) / 1000, // km
    };
  }

  // Overpressure and blast radius calculations
  calculateBlastRadii(energyMT: number): {
    severe: number; // ΔP > 0.3 atm (lung damage, severe destruction)
    moderate: number; // ΔP > 0.1 atm (buildings collapse)
    light: number; // ΔP > 0.03 atm (homes damaged)
    lungDamage: number; // ΔP > 0.3 atm
    eardrumRupture: number; // ΔP > 0.15 atm
  } {
    // Scaling: R = (E / factor)^0.33 (cube root scaling for blast)
    return {
      severe: Math.pow(energyMT / 100, 0.33), // km
      moderate: Math.pow(energyMT / 30, 0.33), // km
      light: Math.pow(energyMT / 10, 0.33), // km
      lungDamage: Math.pow(energyMT / 100, 0.33), // km
      eardrumRupture: Math.pow(energyMT / 50, 0.33), // km
    };
  }

  // Peak wind speed calculation (Rankine-Hugoniot relations)
  calculatePeakWindSpeed(energyMT: number, craterRadius: number): number {
    // At crater rim, estimate overpressure from energy and crater size
    // ΔP ≈ (E / (4π R²))^0.7 atmospheres
    const craterRadiusMeters = craterRadius * 1000;
    const area = 4 * Math.PI * Math.pow(craterRadiusMeters, 2);
    const energyJoules = energyMT * this.TNT_ENERGY_PER_KG * 1e9;
    const overpressureAtm = Math.pow(energyJoules / area, 0.7) / 101325; // Convert Pa to atm

    // Wind speed: v = 470 × (ΔP)^0.5 m/s
    const windSpeedMS = 470 * Math.pow(Math.max(overpressureAtm, 0.01), 0.5);

    // Convert to mph
    return windSpeedMS * 2.237; // 1 m/s = 2.237 mph
  }

  // Wind damage radii calculation
  calculateWindDamageRadii(energyMT: number): {
    ef5Tornado: number; // v > 200 mph
    homesLeveled: number; // v > 250 mph
    treesKnocked: number; // v > 100 mph
  } {
    // Wind speed decreases with distance from impact
    // Using empirical scaling: v ∝ R^(-0.7)
    const baseRadius = Math.pow(energyMT, 0.33); // Base scaling with energy

    return {
      ef5Tornado: baseRadius * 0.8, // km (>200 mph zone)
      homesLeveled: baseRadius * 0.6, // km (>250 mph zone)
      treesKnocked: baseRadius * 1.5, // km (>100 mph zone)
    };
  }

  // Shock wave decibel calculation
  calculateShockwaveDecibels(overpressureAtm: number): number {
    // Convert overpressure to Pascals
    const overpressurePa = overpressureAtm * 101325;

    // Sound pressure level: dB = 20 × log₁₀(P / P₀)
    // Reference pressure P₀ = 20 μPa = 0.00002 Pa
    const referencePressure = 0.00002;
    const dB = 20 * Math.log10(overpressurePa / referencePressure);

    // Cap at 194 dB (maximum in atmosphere = 1 atm)
    return Math.min(dB, 194);
  }

  // Casualty calculations based on population density and effect zones
  calculateCasualties(
    populationDensity: number, // people per km²
    craterRadius: number, // km
    fireballRadius: number, // km
    thermalRadii: { severe: number; moderate: number; minor: number },
    blastRadii: { severe: number; moderate: number },
    windRadii: { homesLeveled: number },
    earthquakeMagnitude: number,
    earthquakeZoneArea: number // km²
  ): {
    vaporized: number;
    fireballDeaths: number;
    severeBurnDeaths: number;
    shockwaveDeaths: number;
    windBlastDeaths: number;
    earthquakeDeaths: number;
    totalEstimated: number;
  } {
    // Vaporized in crater
    const craterArea = Math.PI * Math.pow(craterRadius, 2);
    const vaporized = Math.round(populationDensity * craterArea);

    // Fireball deaths (90% fatality rate, excluding crater area)
    const fireballArea = Math.PI * Math.pow(fireballRadius, 2) - craterArea;
    const fireballDeaths = Math.round(populationDensity * fireballArea * 0.9);

    // Severe burn deaths (50% fatality for 3rd degree, excluding fireball)
    const severeBurnArea =
      Math.PI *
      (Math.pow(thermalRadii.severe, 2) - Math.pow(fireballRadius, 2));
    const severeBurnDeaths = Math.round(
      populationDensity * severeBurnArea * 0.5
    );

    // Shockwave deaths (70% fatality for severe blast zone)
    const severeBlastArea = Math.PI * Math.pow(blastRadii.severe, 2);
    const shockwaveDeaths = Math.round(
      populationDensity * severeBlastArea * 0.7
    );

    // Wind blast deaths (50% fatality for homes leveled zone)
    const windArea = Math.PI * Math.pow(windRadii.homesLeveled, 2);
    const windBlastDeaths = Math.round(populationDensity * windArea * 0.5);

    // Earthquake deaths (varies with magnitude)
    const earthquakeFatalityRate =
      this.getEarthquakeFatalityRate(earthquakeMagnitude);
    const earthquakeDeaths = Math.round(
      populationDensity * earthquakeZoneArea * earthquakeFatalityRate
    );

    const totalEstimated =
      vaporized +
      fireballDeaths +
      severeBurnDeaths +
      shockwaveDeaths +
      windBlastDeaths +
      earthquakeDeaths;

    return {
      vaporized,
      fireballDeaths,
      severeBurnDeaths,
      shockwaveDeaths,
      windBlastDeaths,
      earthquakeDeaths,
      totalEstimated,
    };
  }

  // Earthquake fatality rate estimation
  private getEarthquakeFatalityRate(magnitude: number): number {
    // Empirical fatality rates from historical earthquake data
    if (magnitude < 4.0) return 0.0001;
    if (magnitude < 5.0) return 0.001;
    if (magnitude < 6.0) return 0.01;
    if (magnitude < 7.0) return 0.05;
    if (magnitude < 8.0) return 0.1;
    return 0.2; // M >= 8.0
  }

  // Load and parse earthquake data for context (partner's top 10 analysis will enhance this)
  async loadTop10EarthquakeData(): Promise<
    Array<{ magnitude: number; location: string; energy: number }>
  > {
    try {
      const response = await fetch("/data/earthquakes_combined_all.csv");
      const csvText = await response.text();
      const lines = csvText.split("\n").slice(1); // Skip header row

      const earthquakes = lines
        .filter((line) => line.trim())
        .map((line) => {
          const cols = line.split(",");
          return {
            magnitude: parseFloat(cols[4] || "0"),
            location: cols[13] || "Unknown Location",
            // Exact Gutenberg-Richter energy calculation
            energy: Math.pow(
              10,
              this.GUTENBERG_RICHTER_B * parseFloat(cols[4] || "0") +
                this.GUTENBERG_RICHTER_A
            ),
          };
        })
        .sort((a, b) => b.magnitude - a.magnitude)
        .slice(0, 10); // Top 10 largest earthquakes

      return earthquakes;
    } catch (error) {
      console.error("Failed to load earthquake data:", error);
      return [];
    }
  }

  // Load and parse asteroid data for context (partner's top 10 analysis will enhance this)
  async loadTop10AsteroidData(): Promise<
    Array<{ name: string; diameter: number; energy: number }>
  > {
    try {
      const response = await fetch("/data/comprehensive-asteroids.json");
      const asteroidData = await response.json();

      // Define interface for asteroid data structure
      interface AsteroidDataItem {
        id?: string;
        name: string;
        diameter_meters?: number;
        velocity_km_s?: number;
      }

      interface ProcessedAsteroid {
        name: string;
        diameter: number;
        energy: number;
      }

      // Ensure asteroidData is an array
      const dataArray = Array.isArray(asteroidData) ? asteroidData : [];

      const asteroids = dataArray
        .filter(
          (asteroid: AsteroidDataItem) =>
            asteroid.diameter_meters && asteroid.velocity_km_s
        )
        .map((asteroid: AsteroidDataItem) => {
          // Create a proper AsteroidData object for the calculation
          const asteroidForCalculation: AsteroidData = {
            id: asteroid.id || asteroid.name,
            name: asteroid.name,
            diameter_meters: asteroid.diameter_meters,
            velocity_km_s: asteroid.velocity_km_s,
          };
          const energy = this.calculateKineticEnergy(asteroidForCalculation);
          return {
            name: asteroid.name,
            diameter: asteroid.diameter_meters || 0,
            energy: energy,
          };
        })
        .sort(
          (a: ProcessedAsteroid, b: ProcessedAsteroid) => b.energy - a.energy
        )
        .slice(0, 10); // Top 10 most energetic asteroids

      return asteroids;
    } catch (error) {
      console.error("Failed to load asteroid data:", error);
      return [];
    }
  }

  // Find similar magnitude historical earthquakes for context
  findSimilarEarthquakes(
    asteroidEnergy: number,
    earthquakeData: Array<{
      magnitude: number;
      location: string;
      energy: number;
    }>
  ): Array<{ magnitude: number; location: string; energy: number }> {
    const targetLogEnergy = Math.log10(asteroidEnergy);

    return earthquakeData
      .filter((eq) => {
        const eqLogEnergy = Math.log10(eq.energy);
        return Math.abs(eqLogEnergy - targetLogEnergy) < 1.5; // Within 1.5 orders of magnitude
      })
      .sort((a, b) => {
        const diffA = Math.abs(Math.log10(a.energy) - targetLogEnergy);
        const diffB = Math.abs(Math.log10(b.energy) - targetLogEnergy);
        return diffA - diffB;
      })
      .slice(0, 3); // Top 3 closest matches
  }

  // Build correlation context for enhanced LLM analysis
  private buildCorrelationContext(
    correlationData: {
      asteroidFeatures: Record<string, unknown>;
      nasaData: Record<string, unknown>;
      correlatedEarthquakes: Array<{
        location: string;
        time: string;
        magnitude: number;
        magnitude_type: string;
        energy_joules?: number;
        depth_km: number;
        correlationScore: number;
        tsunami_warning: boolean;
        significance: string;
        damage_alert: string;
      }>;
      asteroidName: string;
      asteroidId: string;
    },
    energy: number,
    impactLocation: ImpactLocation
  ): string {
    const { correlatedEarthquakes } = correlationData;
    const megatonsEquivalent = energy / (this.TNT_ENERGY_PER_KG * 1e9);

    return `
ASTEROID IMPACT SIMULATION ANALYSIS:

Current Simulation Parameters:
- Asteroid: ${correlationData.asteroidName} (${correlationData.asteroidId})
- Calculated Energy: ${energy.toExponential(
      3
    )} Joules (${megatonsEquivalent.toExponential(2)} MT TNT equivalent)
- Impact Location: ${impactLocation.name} (${impactLocation.type})
- Population at Risk: ${impactLocation.population.toLocaleString()}

CORRELATED HISTORICAL EARTHQUAKE DATA (Top ${
      correlatedEarthquakes.length
    } Most Similar):

${correlatedEarthquakes
  .map(
    (eq, index: number) => `
${index + 1}. ${eq.location} - ${new Date(eq.time).toLocaleDateString()}
   - Magnitude: ${eq.magnitude} ${eq.magnitude_type}
   - Energy: ${
     eq.energy_joules
       ? (eq.energy_joules / 4.184e15).toFixed(2) + " MT TNT equivalent"
       : "N/A"
   }
   - Depth: ${eq.depth_km} km
   - Correlation Score: ${eq.correlationScore} (similarity to asteroid impact)
   - Tsunami Warning: ${eq.tsunami_warning ? "YES" : "NO"}
   - Significance: ${eq.significance}
   - Damage Alert: ${eq.damage_alert}
`
  )
  .join("")}

ANALYSIS REQUIREMENTS:
Based on these historical correlations, provide enhanced consequence predictions that incorporate:
1. Patterns from similar-energy seismic events
2. Geographic impact factors based on correlated earthquake locations
3. Population risk assessment using historical damage patterns
4. Enhanced confidence metrics based on correlation strength

Focus on realistic impact modeling that bridges asteroid physics with observed seismic event consequences.
`;
  }

  // Generate user-friendly quick analysis based on enhanced predictions or physics
  private generateQuickAnalysis(
    asteroid: AsteroidData,
    threatLevel: string,
    megatonsEquivalent: number,
    populationAtRisk: number,
    enhancedRiskAssessment?: {
      threat_category: string;
      risk_score: number;
      confidence: number;
      correlation_context: {
        top_similar_earthquakes: number;
      };
    }
  ): string {
    const diameter =
      asteroid.diameter_meters ||
      (asteroid.estimated_diameter?.kilometers.estimated_diameter_max || 0.1) *
        1000;
    const size =
      diameter > 1000
        ? "massive"
        : diameter > 500
        ? "large"
        : diameter > 100
        ? "medium"
        : "small";

    if (enhancedRiskAssessment) {
      const correlations =
        enhancedRiskAssessment.correlation_context.top_similar_earthquakes;
      const riskScore = enhancedRiskAssessment.risk_score;

      if (threatLevel === "CATASTROPHIC") {
        return `This ${size} asteroid poses extreme danger with ${riskScore}% risk based on ${correlations} similar earthquake patterns - ${populationAtRisk.toLocaleString()} people at risk.`;
      } else if (threatLevel === "HIGH") {
        return `Analysis of ${correlations} comparable earthquakes indicates significant regional impact risk affecting ${populationAtRisk.toLocaleString()} people.`;
      } else if (threatLevel === "MODERATE") {
        return `Based on ${correlations} earthquake correlations, this ${size} asteroid could cause localized damage affecting ${populationAtRisk.toLocaleString()} people.`;
      } else {
        return `Historical data from ${correlations} similar events suggests minimal impact risk with limited casualties.`;
      }
    } else {
      // Physics-based analysis
      if (threatLevel === "CATASTROPHIC") {
        return `This ${size} asteroid (${megatonsEquivalent.toFixed(
          1
        )} MT) could cause global devastation affecting ${populationAtRisk.toLocaleString()} people in the immediate impact zone.`;
      } else if (threatLevel === "HIGH") {
        return `This ${size} asteroid (${megatonsEquivalent.toFixed(
          1
        )} MT) poses significant regional threat to ${populationAtRisk.toLocaleString()} people.`;
      } else if (threatLevel === "MODERATE") {
        return `This ${size} asteroid (${megatonsEquivalent.toFixed(
          1
        )} MT) could cause localized damage affecting ${populationAtRisk.toLocaleString()} people.`;
      } else {
        return `This ${size} asteroid (${megatonsEquivalent.toFixed(
          1
        )} MT) presents minimal threat with limited impact.`;
      }
    }
  }

  async predictConsequences(
    asteroid: AsteroidData
  ): Promise<ConsequencePrediction> {
    // Step 0: Calculate precise trajectory to determine exact impact location
    const trajectory =
      this.trajectoryCalculator.calculateImpactTrajectory(asteroid);

    // Use calculated impact location from trajectory (override provided location)
    const actualImpactLocation: ImpactLocation = {
      type: trajectory.impact_location.geographic_type,
      name: `${trajectory.impact_location.latitude.toFixed(
        2
      )}°, ${trajectory.impact_location.longitude.toFixed(2)}°`,
      latitude: trajectory.impact_location.latitude,
      longitude: trajectory.impact_location.longitude,
      population: trajectory.impact_location.population_density * 100, // Estimate population in area
    };

    // NEW: Get comprehensive impact results from the new calculator
    let comprehensiveImpact: ComprehensiveImpactResults | undefined;
    try {
      const asteroidDiameter =
        asteroid.diameter_meters ||
        (asteroid.estimated_diameter?.kilometers.estimated_diameter_max ||
          0.1) * 1000;
      const asteroidVelocity =
        asteroid.velocity_km_s ||
        parseFloat(
          asteroid.close_approach_data?.[0]?.relative_velocity
            .kilometers_per_second || "20"
        );

      const impactParams: ImpactParameters = {
        diameter: asteroidDiameter,
        velocity: asteroidVelocity,
        angle: 45,
        latitude: actualImpactLocation.latitude,
        longitude: actualImpactLocation.longitude,
        asteroidDensity: this.ASTEROID_DENSITY,
      };

      // Calculate comprehensive impact (includes population data estimation)
      comprehensiveImpact = ImpactPhysicsCalculator.calculateImpact(
        impactParams,
        {
          density: trajectory.impact_location.population_density || 100,
        }
      );
    } catch (error) {
      console.warn(
        "⚠️ Could not calculate comprehensive impact, using fallback:",
        error
      );
      comprehensiveImpact = undefined;
    }

    // Step 1: Calculate physics-based parameters using EXACT scientific formulas
    const energy = this.calculateKineticEnergy(asteroid);
    const craterDiameter = this.calculateCraterDiameter(energy);
    const craterDepth = this.calculateCraterDepth(craterDiameter);
    const craterRadius = craterDiameter / 2;
    const earthquakeMagnitude = this.calculateEarthquakeMagnitude(energy);
    const tsunamiHeight = this.calculateTsunamiHeight(
      energy,
      actualImpactLocation
    );
    const affectedRadius = Math.max(craterDiameter * 20, 5); // Significant damage radius based on crater size
    const megatonsEquivalent = energy / (this.TNT_ENERGY_PER_KG * 1e9);

    // Calculate fireball and thermal effects
    const fireballRadius = this.calculateFireballRadius(megatonsEquivalent);
    const thermalRadii = this.calculateThermalBurnRadii(megatonsEquivalent);

    // Calculate blast/overpressure effects
    const blastRadii = this.calculateBlastRadii(megatonsEquivalent);

    // Calculate wind effects
    const peakWindSpeed = this.calculatePeakWindSpeed(
      megatonsEquivalent,
      craterRadius
    );
    const windRadii = this.calculateWindDamageRadii(megatonsEquivalent);

    // Calculate overpressure and shock wave decibels at crater rim
    const craterRadiusMeters = craterRadius * 1000;
    const areaAtRim = 4 * Math.PI * Math.pow(craterRadiusMeters, 2);
    const overpressureAtRim = Math.pow(energy / areaAtRim, 0.7) / 101325; // atm
    const shockwaveDecibels =
      this.calculateShockwaveDecibels(overpressureAtRim);

    // Estimate population density at impact location
    const populationDensity =
      trajectory.impact_location.population_density || 100; // people per km²
    const earthquakeZoneArea = Math.PI * Math.pow(affectedRadius, 2);

    // Calculate casualties for each effect type
    const casualties = this.calculateCasualties(
      populationDensity,
      craterRadius,
      fireballRadius,
      thermalRadii,
      blastRadii,
      windRadii,
      earthquakeMagnitude,
      earthquakeZoneArea
    );

    // Step 2: Get enhanced correlation data from partner's API (top 10 best matches)
    let correlationData = null;
    let enhancedRiskAssessment = null;

    try {
      const correlationResponse = await fetch(
        "/api/correlate-asteroid-earthquakes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asteroidId: asteroid.id }),
        }
      );

      if (correlationResponse.ok) {
        correlationData = await correlationResponse.json();

        // Generate enhanced LLM analysis using the correlation context
        const enhancedResponse = await fetch("/api/llm-enhanced-prediction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asteroidId: asteroid.id,
            context: this.buildCorrelationContext(
              correlationData,
              energy,
              actualImpactLocation
            ),
            asteroidData: correlationData.nasaData,
            correlatedEarthquakes: correlationData.correlatedEarthquakes,
          }),
        });

        if (enhancedResponse.ok) {
          enhancedRiskAssessment = await enhancedResponse.json();
        }
      }
    } catch (error) {
      console.warn(
        "Could not fetch enhanced correlation data, using fallback analysis:",
        error
      );
    }

    // Step 3: Use enhanced data or fallback to original method
    const top10Earthquakes =
      correlationData?.correlatedEarthquakes ||
      (await this.loadTop10EarthquakeData());
    const top10Asteroids = await this.loadTop10AsteroidData();
    const similarEarthquakes = this.findSimilarEarthquakes(
      energy,
      top10Earthquakes
    );

    // Step 3: Determine threat level - use enhanced assessment if available, otherwise fallback to physics
    let threatLevel: "LOW" | "MODERATE" | "HIGH" | "CATASTROPHIC";

    if (enhancedRiskAssessment) {
      // Use enhanced threat assessment from correlation analysis
      const enhancedThreat = enhancedRiskAssessment.threat_category;
      threatLevel =
        enhancedThreat === "CRITICAL"
          ? "CATASTROPHIC"
          : enhancedThreat === "HIGH"
          ? "HIGH"
          : enhancedThreat === "MEDIUM"
          ? "MODERATE"
          : "LOW";
    } else {
      // Fallback to physics-based assessment
      if (megatonsEquivalent < 0.01) threatLevel = "LOW"; // Kiloton range
      else if (megatonsEquivalent < 1) threatLevel = "MODERATE"; // Sub-megaton
      else if (megatonsEquivalent < 100) threatLevel = "HIGH"; // Multi-megaton
      else threatLevel = "CATASTROPHIC"; // 100+ megatons
    }

    // Step 4: Create detailed scientific prompt for LLM with exact physics and context data
    const asteroidDiameter =
      asteroid.diameter_meters ||
      (asteroid.estimated_diameter?.kilometers.estimated_diameter_max || 0.1) *
        1000;
    const asteroidVelocity =
      asteroid.velocity_km_s ||
      parseFloat(
        asteroid.close_approach_data?.[0]?.relative_velocity
          .kilometers_per_second || "20"
      );

    const contextPrompt = `
You are a planetary defense expert analyzing an asteroid impact scenario using EXACT SCIENTIFIC FORMULAS from peer-reviewed research. Return ONLY a valid JSON object for realistic 2D terrain visualization.

MANDATORY JSON STRUCTURE:
{
  "threatAssessment": {
    "level": "${threatLevel}",
    "description": "Scientific description based on ${megatonsEquivalent.toExponential(
      2
    )} MT TNT equivalent"
  },
  "immediateEffects": {
    "description": "Effects in first minutes to hours after impact",
    "airBurst": ${energy < 1e13},
    "groundImpact": ${energy >= 1e13},
    "atmosphericHeating": "Atmospheric entry heating analysis",
    "shockwaveRadius": ${Math.round(affectedRadius * 1.5)},
    "thermalRadius": ${Math.round(affectedRadius * 0.8)}
  },
  "regionalEffects": {
    "description": "Effects within ${affectedRadius.toFixed(
      0
    )}km radius using crater scaling laws",
    "structuralDamage": "Assessment for M${earthquakeMagnitude.toFixed(
      1
    )} seismic magnitude",
    "fires": "Thermal effects from ${megatonsEquivalent.toExponential(
      2
    )} MT energy release",
    "debris": "Ejecta pattern from ${craterDiameter.toFixed(
      2
    )}km diameter crater",
    "seismicDamageRadius": ${Math.round(affectedRadius * 2)},
    "debrisFieldRadius": ${Math.round(craterDiameter * 50)}
  },
  "globalEffects": {
    "description": "Worldwide consequences for ${threatLevel} level impact",
    "climaticImpact": "Atmospheric dust and temperature effects",
    "economicDisruption": "Global economic impact assessment",
    "infrastructureImpact": "Critical infrastructure damage analysis"
  },
  "populationImpact": {
    "casualtyEstimate": "Estimated casualties within ${affectedRadius.toFixed(
      0
    )}km impact zone",
    "evacuationNeeded": "Required evacuation radius and population",
    "medicalResponse": "Medical response requirements for impact consequences"
  },
  "visualEffects": {
    "craterGlow": ${craterDiameter > 0.1},
    "seismicWaves": ${Math.ceil(earthquakeMagnitude)},
    "fireRadius": ${Math.round(affectedRadius * 0.5)},
    "debrisCloud": ${energy > 1e12},
    "atmosphericGlow": ${energy > 1e14},
    "craterDepth": ${craterDiameter * 0.1},
    "ejectaPattern": "radial",
    "shockwaveVisualization": true
  },
  "terrainVisualization": {
    "impactCrater": {
      "diameter": ${craterDiameter.toFixed(2)},
      "depth": ${(craterDiameter * 0.1).toFixed(2)},
      "rimHeight": ${(craterDiameter * 0.05).toFixed(2)},
      "centralPeak": ${craterDiameter > 5}
    },
    "damageZones": [
      {
        "zone": "total_destruction",
        "radius": ${craterDiameter * 5},
        "description": "Complete devastation zone",
        "color": "#8B0000"
      },
      {
        "zone": "severe_damage",
        "radius": ${affectedRadius * 0.5},
        "description": "Severe structural damage",
        "color": "#FF4500"
      },
      {
        "zone": "moderate_damage",
        "radius": ${affectedRadius},
        "description": "Moderate structural damage",
        "color": "#FFA500"
      },
      {
        "zone": "light_damage",
        "radius": ${affectedRadius * 1.5},
        "description": "Light damage and broken windows",
        "color": "#FFFF00"
      }
    ],
    "environmentalEffects": {
      "fires": {
        "radius": ${Math.round(affectedRadius * 0.6)},
        "intensity": "${
          energy > 1e15 ? "extreme" : energy > 1e13 ? "high" : "moderate"
        }"
      },
      "seismicCracks": {
        "pattern": "radial_and_concentric",
        "maxDistance": ${Math.round(affectedRadius * 3)}
      },
      "debrisField": {
        "radius": ${Math.round(craterDiameter * 100)},
        "density": "${energy > 1e15 ? "dense" : "moderate"}"
      }
    }
  },
  "historicalComparison": "Energy comparable to: ${
    similarEarthquakes
      .map(
        (eq: { location: string; magnitude: number }) =>
          `${eq.location} (M${eq.magnitude.toFixed(1)})`
      )
      .join(", ") || "No comparable historical seismic events"
  }"
}

EXACT SCIENTIFIC CALCULATIONS USED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASTEROID PARAMETERS:
- Name: ${asteroid.name}
- Diameter: ${(asteroidDiameter / 1000).toFixed(3)} km
- Velocity: ${asteroidVelocity.toFixed(1)} km/s
- Density: ${this.ASTEROID_DENSITY} kg/m³ (NASA Challenge specification)

IMPACT PHYSICS (Using Published Scientific Formulas):
- Kinetic Energy: ${energy.toExponential(
      3
    )} Joules = ${megatonsEquivalent.toExponential(3)} MT TNT equivalent
- Crater Diameter: ${craterDiameter.toFixed(
      3
    )} km (E = 9.1×10²⁴ D^2.59 erg scaling law)
- Earthquake Magnitude: M${earthquakeMagnitude.toFixed(
      2
    )} (Gutenberg-Richter: log₁₀(E) = 1.5M + 4.8)
${
  tsunamiHeight
    ? `- Tsunami Height: ${tsunamiHeight.toFixed(
        1
      )} meters (Ward & Asphaug 2000: H = CT × (E/10¹⁵)^β, β=0.22)`
    : ""
}
- Damage Radius: ${affectedRadius.toFixed(1)} km (crater-scaled impact zone)

IMPACT LOCATION:
- Site: ${actualImpactLocation.name} (${actualImpactLocation.type} terrain)
- Population Density: ${actualImpactLocation.population.toLocaleString()} people nearby
- Coordinates: ${actualImpactLocation.latitude.toFixed(
      2
    )}°, ${actualImpactLocation.longitude.toFixed(2)}°

TOP 10 CONTEXT DATA:
- Similar Energy Earthquakes: ${top10Earthquakes
      .slice(0, 3)
      .map(
        (eq: { location: string; magnitude: number }) =>
          `${eq.location} (M${eq.magnitude.toFixed(1)})`
      )
      .join(", ")}
- Comparable Asteroids: ${top10Asteroids
      .slice(0, 3)
      .map((ast) => `${ast.name} (${(ast.diameter / 1000).toFixed(1)}km)`)
      .join(", ")}

SCIENTIFIC REFERENCES:
- Pike et al. crater scaling laws (D ∝ E^${this.CRATER_ENERGY_EXPONENT.toFixed(
      3
    )})
- Ward & Asphaug (2000) tsunami cavity scaling (CT=${
      this.WARD_ASPHAUG_SCALING
    }, β=${this.TSUNAMI_DEPTH_EXPONENT})
- Gutenberg-Richter seismic energy relationship (A=${
      this.GUTENBERG_RICHTER_A
    }, B=${this.GUTENBERG_RICHTER_B})
- Schmidt & Holsapple (1982) impact scaling parameters
- NASA Challenge density specification (ρ=${this.ASTEROID_DENSITY} kg/m³)

Return ONLY the JSON object for 2D terrain visualization.`;

    try {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a scientific asteroid impact expert. Return only valid JSON based on exact physics calculations provided. Use precise scientific terminology for realistic 2D terrain visualization.",
        },
        {
          role: "user",
          content: contextPrompt,
        },
      ];

      const groqClient = getGroqClient();
      let fullResponse: Record<string, unknown> = {};

      if (groqClient) {
        const response = await groqClient.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: convertToGroqMessages(messages),
          temperature: 0.1, // Very low temperature for scientific consistency
          max_tokens: 2000,
        });

        const content = response.choices[0].message.content || "{}";

        try {
          fullResponse = JSON.parse(content);
        } catch (parseError) {
          console.error("Failed to parse LLM response as JSON:", parseError);
          // Will use fallback below
        }
      } else {
      }

      // If LLM didn't provide a response or wasn't available, use scientifically-accurate fallback
      if (Object.keys(fullResponse).length === 0) {
        fullResponse = {
          threatAssessment: {
            level: threatLevel,
            description: `${threatLevel} threat: ${megatonsEquivalent.toExponential(
              2
            )} MT TNT equivalent`,
          },
          immediateEffects: {
            description:
              "Physics-based impact analysis using exact scaling laws",
            airBurst: energy < 1e13,
            groundImpact: energy >= 1e13,
            atmosphericHeating:
              "Kinetic energy conversion during atmospheric passage",
            shockwaveRadius: Math.round(affectedRadius * 1.5),
            thermalRadius: Math.round(affectedRadius * 0.8),
          },
          visualEffects: {
            craterGlow: craterDiameter > 0.1,
            seismicWaves: Math.ceil(earthquakeMagnitude),
            fireRadius: Math.round(affectedRadius * 0.5),
            debrisCloud: energy > 1e12,
            atmosphericGlow: energy > 1e14,
          },
          terrainVisualization: {
            impactCrater: {
              diameter: craterDiameter.toFixed(2),
              depth: (craterDiameter * 0.1).toFixed(2),
              rimHeight: (craterDiameter * 0.05).toFixed(2),
              centralPeak: craterDiameter > 5,
            },
            damageZones: [
              {
                zone: "total_destruction",
                radius: craterDiameter * 5,
                description: "Complete devastation zone",
                color: "#8B0000",
              },
              {
                zone: "severe_damage",
                radius: affectedRadius * 0.5,
                description: "Severe structural damage",
                color: "#FF4500",
              },
              {
                zone: "moderate_damage",
                radius: affectedRadius,
                description: "Moderate structural damage",
                color: "#FFA500",
              },
              {
                zone: "light_damage",
                radius: affectedRadius * 1.5,
                description: "Light damage and broken windows",
                color: "#FFFF00",
              },
            ],
          },
          historicalComparison: `Similar energy to ${
            similarEarthquakes.map((eq) => eq.location).join(", ") ||
            "no recorded seismic events"
          }`,
        };
      }

      // Step 5: Calculate population and economic impacts based on exact affected area
      let populationAtRisk = 0;
      let economicDamage = 0;

      const damageArea = Math.PI * Math.pow(affectedRadius, 2); // km²

      switch (actualImpactLocation.type) {
        case "city":
          populationAtRisk = Math.min(
            actualImpactLocation.population,
            damageArea * 3000
          );
          economicDamage = populationAtRisk * 0.2 + craterDiameter * 50;
          break;
        case "ocean":
          populationAtRisk = tsunamiHeight
            ? tsunamiHeight * 100000
            : damageArea * 50;
          economicDamage = populationAtRisk * 0.1 + (tsunamiHeight || 0) * 10;
          break;
        case "land":
          populationAtRisk =
            damageArea * (actualImpactLocation.population / 5000);
          economicDamage = populationAtRisk * 0.08 + craterDiameter * 10;
          break;
        case "mountain":
        case "desert":
          populationAtRisk = damageArea * 2;
          economicDamage = craterDiameter * 5;
          break;
      }
      let usgsAssessment;

      try {
        const usgsResponse = await fetch("/api/usgs-assessment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: trajectory.impact_location.latitude,
            longitude: trajectory.impact_location.longitude,
            impactEnergy: energy,
            craterDiameter: craterDiameter,
          }),
        });

        if (usgsResponse.ok) {
          usgsAssessment = await usgsResponse.json();
        } else {
          const errorText = await usgsResponse.text();
          console.warn(
            "USGS API failed with status",
            usgsResponse.status,
            errorText
          );
          usgsAssessment = null;
        }
      } catch (error) {
        console.error("❌ USGS fetch error:", error);
        usgsAssessment = null;
      }

      const quickAnalysis = this.generateQuickAnalysis(
        asteroid,
        threatLevel,
        megatonsEquivalent,
        Math.round(populationAtRisk),
        enhancedRiskAssessment
      );

      const result = {
        comprehensiveImpact, // NEW: Include comprehensive impact results
        impactPhysics: {
          energy,
          craterDiameter,
          craterDepth,
          earthquakeMagnitude:
            usgsAssessment?.expectedEarthquakeMagnitude || earthquakeMagnitude, // Use USGS calculated value if available
          affectedRadius,
          tsunamiHeight: usgsAssessment?.expectedTsunamiHeight || tsunamiHeight, // Use USGS value if available
          megatonsEquivalent,
          fireballRadius,
          peakWindSpeed,
          shockwaveDecibels,
        },
        thermalEffects: {
          fireballRadius,
          severeBurns: {
            radius: thermalRadii.severe,
            casualties: casualties.severeBurnDeaths,
          },
          moderateburns: {
            radius: thermalRadii.moderate,
            casualties: Math.round(
              populationDensity *
                Math.PI *
                (Math.pow(thermalRadii.moderate, 2) -
                  Math.pow(thermalRadii.severe, 2)) *
                0.3
            ),
          },
          minorBurns: {
            radius: thermalRadii.minor,
            casualties: Math.round(
              populationDensity *
                Math.PI *
                (Math.pow(thermalRadii.minor, 2) -
                  Math.pow(thermalRadii.moderate, 2)) *
                0.1
            ),
          },
          clothesIgniteRadius: thermalRadii.clothesIgnite,
          treesIgniteRadius: thermalRadii.treesIgnite,
        },
        blastEffects: {
          overpressureAtRim,
          severeBlastRadius: blastRadii.severe,
          moderateBlastRadius: blastRadii.moderate,
          lightBlastRadius: blastRadii.light,
          lungDamageRadius: blastRadii.lungDamage,
          eardrumRuptureRadius: blastRadii.eardrumRupture,
          buildingsCollapseRadius: blastRadii.moderate, // Buildings collapse at moderate blast
          homesCollapseRadius: blastRadii.light, // Homes damaged at light blast
        },
        windEffects: {
          peakWindSpeed,
          ef5TornadoZoneRadius: windRadii.ef5Tornado,
          homesLeveledRadius: windRadii.homesLeveled,
          treesKnockedRadius: windRadii.treesKnocked,
        },
        casualties,
        populationAtRisk: Math.round(populationAtRisk),
        economicDamage: Math.round(economicDamage / 1000), // Convert to billions
        threatLevel,
        trajectory,
        fullResponse,
        quickAnalysis,
        usgsData: usgsAssessment, // CRITICAL: Include USGS assessment data
      };

      return result;
    } catch (error) {
      console.error("Error calling Groq API:", error);

      const fallbackPopulation = Math.round(
        affectedRadius * affectedRadius * 200
      );
      const fallbackQuickAnalysis = this.generateQuickAnalysis(
        asteroid,
        threatLevel,
        megatonsEquivalent,
        fallbackPopulation
      );

      return {
        impactPhysics: {
          energy,
          craterDiameter,
          craterDepth,
          earthquakeMagnitude,
          affectedRadius,
          tsunamiHeight,
          megatonsEquivalent,
          fireballRadius,
          peakWindSpeed,
          shockwaveDecibels,
        },
        thermalEffects: {
          fireballRadius,
          severeBurns: {
            radius: thermalRadii.severe,
            casualties: casualties.severeBurnDeaths,
          },
          moderateburns: {
            radius: thermalRadii.moderate,
            casualties: Math.round(
              populationDensity *
                Math.PI *
                (Math.pow(thermalRadii.moderate, 2) -
                  Math.pow(thermalRadii.severe, 2)) *
                0.3
            ),
          },
          minorBurns: {
            radius: thermalRadii.minor,
            casualties: Math.round(
              populationDensity *
                Math.PI *
                (Math.pow(thermalRadii.minor, 2) -
                  Math.pow(thermalRadii.moderate, 2)) *
                0.1
            ),
          },
          clothesIgniteRadius: thermalRadii.clothesIgnite,
          treesIgniteRadius: thermalRadii.treesIgnite,
        },
        blastEffects: {
          overpressureAtRim,
          severeBlastRadius: blastRadii.severe,
          moderateBlastRadius: blastRadii.moderate,
          lightBlastRadius: blastRadii.light,
          lungDamageRadius: blastRadii.lungDamage,
          eardrumRuptureRadius: blastRadii.eardrumRupture,
          buildingsCollapseRadius: blastRadii.moderate,
          homesCollapseRadius: blastRadii.light,
        },
        windEffects: {
          peakWindSpeed,
          ef5TornadoZoneRadius: windRadii.ef5Tornado,
          homesLeveledRadius: windRadii.homesLeveled,
          treesKnockedRadius: windRadii.treesKnocked,
        },
        casualties,
        populationAtRisk: fallbackPopulation,
        economicDamage: Math.round(craterDiameter * 10),
        threatLevel,
        trajectory,
        fullResponse: {
          threatAssessment: {
            level: threatLevel,
            description: "Exact physics analysis - LLM unavailable",
          },
          visualEffects: {
            craterGlow: craterDiameter > 0.1,
            seismicWaves: Math.ceil(earthquakeMagnitude),
            fireRadius: Math.round(affectedRadius * 0.5),
            debrisCloud: energy > 1e12,
          },
          terrainVisualization: {
            impactCrater: {
              diameter: craterDiameter.toFixed(2),
              depth: (craterDiameter * 0.1).toFixed(2),
              rimHeight: (craterDiameter * 0.05).toFixed(2),
              centralPeak: craterDiameter > 5,
            },
            damageZones: [
              {
                zone: "total_destruction",
                radius: craterDiameter * 5,
                description: "Complete devastation zone",
                color: "#8B0000",
              },
              {
                zone: "severe_damage",
                radius: affectedRadius * 0.5,
                description: "Severe structural damage",
                color: "#FF4500",
              },
            ],
          },
        },
        quickAnalysis: fallbackQuickAnalysis,
      };
    }
  }
}

export default ConsequencePredictor;
