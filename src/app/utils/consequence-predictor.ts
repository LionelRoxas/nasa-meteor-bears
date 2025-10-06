/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import {
  AsteroidTrajectoryCalculator,
  AsteroidTrajectory,
} from "../utils/asteroid-trajectory";

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
  impactPhysics: {
    energy: number; // Joules
    craterDiameter: number; // km
    earthquakeMagnitude: number;
    affectedRadius: number; // km
    tsunamiHeight?: number; // meters (if ocean impact)
    megatonsEquivalent: number; // MT TNT
  };
  populationAtRisk: number;
  economicDamage: number; // billions USD
  threatLevel: "LOW" | "MODERATE" | "HIGH" | "CATASTROPHIC";
  trajectory: AsteroidTrajectory; // Precise trajectory data
  fullResponse: Record<string, unknown>; // Complete JSON response from LLM
  quickAnalysis?: string; // User-friendly 1-sentence explanation
  mitigationStrategies?: string; // Add this line
  usgsData?: any;
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
    console.log("Starting consequence prediction for asteroid:", asteroid.name);

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

    console.log("Calculated impact location:", actualImpactLocation);

    // Step 1: Calculate physics-based parameters using EXACT scientific formulas
    const energy = this.calculateKineticEnergy(asteroid);
    const craterDiameter = this.calculateCraterDiameter(energy);
    const earthquakeMagnitude = this.calculateEarthquakeMagnitude(energy);
    const tsunamiHeight = this.calculateTsunamiHeight(
      energy,
      actualImpactLocation
    );
    const affectedRadius = Math.max(craterDiameter * 20, 5); // Significant damage radius based on crater size
    const megatonsEquivalent = energy / (this.TNT_ENERGY_PER_KG * 1e9);

    console.log("Physics calculations:", {
      energy: energy.toExponential(3),
      craterDiameter: craterDiameter.toFixed(3),
      earthquakeMagnitude: earthquakeMagnitude.toFixed(2),
      affectedRadius: affectedRadius.toFixed(1),
      megatonsEquivalent: megatonsEquivalent.toExponential(3),
    });

    // Step 2: Get enhanced correlation data from partner's API (top 10 best matches)
    let correlationData = null;
    let enhancedRiskAssessment = null;

    try {
      console.log("Fetching correlation data for asteroid:", asteroid.id);
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
        console.log("Retrieved correlation data:", {
          earthquakes: correlationData.correlatedEarthquakes.length,
          asteroidName: correlationData.asteroidName,
        });

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
          console.log(
            "Enhanced risk assessment generated:",
            enhancedRiskAssessment.threat_category
          );
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

      console.log("Enhanced threat assessment:", {
        original: enhancedThreat,
        mapped: threatLevel,
        riskScore: enhancedRiskAssessment.risk_score,
        confidence: enhancedRiskAssessment.confidence,
        correlations:
          enhancedRiskAssessment.correlation_context.top_similar_earthquakes,
      });
    } else {
      // Fallback to physics-based assessment
      if (megatonsEquivalent < 0.01) threatLevel = "LOW"; // Kiloton range
      else if (megatonsEquivalent < 1) threatLevel = "MODERATE"; // Sub-megaton
      else if (megatonsEquivalent < 100) threatLevel = "HIGH"; // Multi-megaton
      else threatLevel = "CATASTROPHIC"; // 100+ megatons

      console.log("Physics-based threat assessment:", {
        megatonsEquivalent: megatonsEquivalent.toExponential(3),
        threatLevel,
      });
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
      console.log("Calling Groq API for consequence analysis...");

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
        console.log("LLM response received, parsing JSON...");

        try {
          fullResponse = JSON.parse(content);
          console.log("Successfully parsed JSON response");
        } catch (parseError) {
          console.error("Failed to parse LLM response as JSON:", parseError);
          // Will use fallback below
        }
      } else {
        console.log("Groq client not available, using physics-only fallback");
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

      console.log("Final consequence prediction calculated with exact physics");

      // Step 6: Get USGS data for maximum accuracy via API
      console.log("Fetching USGS seismic and tsunami data...");
      let usgsAssessment; // Move this OUTSIDE any try block

      console.log("🌍 Fetching USGS assessment for coordinates:", {
        lat: trajectory.impact_location.latitude,
        lng: trajectory.impact_location.longitude,
        energy,
        craterDiameter,
      });

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

        console.log("📡 USGS API response status:", usgsResponse.status);

        if (usgsResponse.ok) {
          usgsAssessment = await usgsResponse.json();
          console.log(
            "✅ USGS Assessment received successfully:",
            usgsAssessment
          );
        } else {
          const errorText = await usgsResponse.text();
          console.warn(
            "⚠️ USGS API failed with status",
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

      const mitigationStrategies = await this.generateMitigationStrategies({
        impactPhysics: {
          energy,
          craterDiameter,
          earthquakeMagnitude:
            usgsAssessment?.expectedEarthquakeMagnitude || earthquakeMagnitude,
          affectedRadius,
          tsunamiHeight: usgsAssessment?.expectedTsunamiHeight || tsunamiHeight,
          megatonsEquivalent,
        },
        populationAtRisk: Math.round(populationAtRisk),
        economicDamage: Math.round(economicDamage / 1000),
        threatLevel,
        trajectory,
        fullResponse,
        quickAnalysis,
        usgsData: usgsAssessment,
      });

      const result = {
        impactPhysics: {
          energy,
          craterDiameter,
          earthquakeMagnitude:
            usgsAssessment?.expectedEarthquakeMagnitude || earthquakeMagnitude, // Use USGS calculated value if available
          affectedRadius,
          tsunamiHeight: usgsAssessment?.expectedTsunamiHeight || tsunamiHeight, // Use USGS value if available
          megatonsEquivalent,
        },
        populationAtRisk: Math.round(populationAtRisk),
        economicDamage: Math.round(economicDamage / 1000), // Convert to billions
        threatLevel,
        trajectory,
        fullResponse,
        quickAnalysis,
        mitigationStrategies,
        usgsData: usgsAssessment, // CRITICAL: Include USGS assessment data
      };

      console.log(
        "📦 Consequence prediction result includes usgsData:",
        !!result.usgsData
      );
      if (result.usgsData) {
        console.log("🎯 USGS data in result:", {
          hasSeismicZone: !!result.usgsData.seismicZone,
          hasTsunamiRisk: !!result.usgsData.tsunamiRisk,
          zone: result.usgsData.seismicZone?.zone,
        });
      }

      return result;
    } catch (error) {
      console.error("Error calling Groq API:", error);

      // Physics-only fallback using exact formulas
      console.log("Using exact physics-only fallback analysis");

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
          earthquakeMagnitude,
          affectedRadius,
          tsunamiHeight,
          megatonsEquivalent,
        },
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
        mitigationStrategies:
          "Mitigation strategies unavailable - LLM service error",
        usgsData: null, // No USGS data in fallback
      };
    }
  }

  // Generate mitigation strategies based on predicted consequences
  private async generateMitigationStrategies(
    prediction: ConsequencePrediction
  ): Promise<string> {
    const { threatLevel, impactPhysics, populationAtRisk, trajectory } =
      prediction;

    const impactLocation = trajectory.impact_location;
    const isOceanImpact = impactLocation.geographic_type === "ocean";
    const hasTsunamiRisk =
      isOceanImpact &&
      impactPhysics.tsunamiHeight &&
      impactPhysics.tsunamiHeight > 5;

    // Try to get LLM-enhanced mitigation recommendations
    try {
      const groqClient = getGroqClient();

      if (groqClient) {
        const mitigationPrompt = `
Generate a single comprehensive paragraph of mitigation strategies for an asteroid impact scenario with these parameters:

THREAT LEVEL: ${threatLevel}
IMPACT ENERGY: ${impactPhysics.megatonsEquivalent.toExponential(
          2
        )} MT TNT equivalent
CRATER DIAMETER: ${impactPhysics.craterDiameter.toFixed(2)} km
EARTHQUAKE MAGNITUDE: M${impactPhysics.earthquakeMagnitude.toFixed(1)}
AFFECTED RADIUS: ${impactPhysics.affectedRadius.toFixed(1)} km
POPULATION AT RISK: ${populationAtRisk.toLocaleString()}
IMPACT LOCATION: ${
          impactLocation.geographic_type
        } at ${impactLocation.latitude.toFixed(
          2
        )}°, ${impactLocation.longitude.toFixed(2)}°
${
  hasTsunamiRisk
    ? `TSUNAMI HEIGHT: ${impactPhysics.tsunamiHeight?.toFixed(1)} meters`
    : ""
}

Provide ONLY a single paragraph (no lists, no formatting) with actionable mitigation strategies prioritized by effectiveness. Focus on: immediate evacuation protocols, structural preparedness, emergency response coordination, long-term deflection options if applicable, and post-impact recovery measures. Be specific and realistic based on the threat level.`;

        const messages: ChatMessage[] = [
          {
            role: "system",
            content:
              "You are a planetary defense expert specializing in disaster mitigation. Provide a single comprehensive paragraph with actionable strategies.",
          },
          {
            role: "user",
            content: mitigationPrompt,
          },
        ];

        const response = await groqClient.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: convertToGroqMessages(messages),
          temperature: 0.3,
          max_tokens: 500,
        });

        const llmResponse = response.choices[0].message.content?.trim();
        if (llmResponse && llmResponse.length > 50) {
          console.log("LLM-generated mitigation strategies received");
          return llmResponse;
        }
      }
    } catch (error) {
      console.warn(
        "Could not generate LLM mitigation strategies, using fallback:",
        error
      );
    }

    // Fallback: Physics-based mitigation strategies
    let strategies = "";

    switch (threatLevel) {
      case "CATASTROPHIC":
        strategies = `For this catastrophic ${impactPhysics.megatonsEquivalent.toFixed(
          0
        )} MT impact scenario, immediate global coordination is essential: evacuate all populations within ${Math.round(
          impactPhysics.affectedRadius * 2
        )} km of the predicted impact zone at ${impactLocation.latitude.toFixed(
          2
        )}°, ${impactLocation.longitude.toFixed(2)}° with at least ${Math.ceil(
          prediction.trajectory.time_to_impact / 86400
        )} days notice, deploy kinetic impactors or gravity tractors for asteroid deflection if sufficient warning time exists, establish underground shelters and hardened infrastructure in major population centers globally, stockpile food and medical supplies for extended climate disruption lasting months to years, coordinate international emergency response teams for M${impactPhysics.earthquakeMagnitude.toFixed(
          1
        )} equivalent seismic rescue operations${
          hasTsunamiRisk
            ? `, implement Pacific-wide tsunami warning systems with mandatory coastal evacuations for ${impactPhysics.tsunamiHeight?.toFixed(
                0
              )}m wave heights`
            : ""
        }, and prepare for long-term agricultural disruption from atmospheric dust causing potential global cooling effects.`;
        break;

      case "HIGH":
        strategies = `To mitigate this high-threat ${impactPhysics.megatonsEquivalent.toFixed(
          1
        )} MT impact affecting ${populationAtRisk.toLocaleString()} people, establish mandatory evacuation zones within ${Math.round(
          impactPhysics.affectedRadius
        )} km of impact coordinates (${impactLocation.latitude.toFixed(
          2
        )}°, ${impactLocation.longitude.toFixed(
          2
        )}°), reinforce critical infrastructure and hospitals in surrounding ${Math.round(
          impactPhysics.affectedRadius * 3
        )} km region to withstand M${impactPhysics.earthquakeMagnitude.toFixed(
          1
        )} seismic activity, deploy early-warning systems for the ${Math.ceil(
          prediction.trajectory.time_to_impact / 3600
        )} hour approach window, pre-position emergency response teams and medical supplies at strategic locations outside the damage radius${
          hasTsunamiRisk
            ? `, activate coastal tsunami evacuation protocols for ${impactPhysics.tsunamiHeight?.toFixed(
                0
              )}m waves with safe zones above 30m elevation`
            : ""
        }, consider last-resort deflection attempts using available spacecraft if lead time permits, establish emergency communication networks and backup power systems, and coordinate regional disaster response across national boundaries for optimal resource allocation.`;
        break;

      case "MODERATE":
        strategies = `For this moderate ${impactPhysics.megatonsEquivalent.toFixed(
          2
        )} MT threat affecting an estimated ${populationAtRisk.toLocaleString()} people, implement precautionary evacuations within ${Math.round(
          impactPhysics.affectedRadius * 0.5
        )} km of the predicted ${
          impactLocation.geographic_type
        } impact site at ${impactLocation.latitude.toFixed(
          2
        )}°, ${impactLocation.longitude.toFixed(
          2
        )}°, strengthen building codes and retrofit structures within ${Math.round(
          impactPhysics.affectedRadius * 1.5
        )} km to handle M${impactPhysics.earthquakeMagnitude.toFixed(
          1
        )} ground shaking, establish emergency shelters and evacuation routes with clear signage, deploy rapid response medical teams and search-and-rescue units to strategic staging areas, maintain real-time tracking of the asteroid's trajectory during its ${Math.ceil(
          prediction.trajectory.time_to_impact / 3600
        )} hour final approach${
          hasTsunamiRisk
            ? `, issue tsunami advisories for coastal regions with evacuation recommendations for low-lying areas`
            : ""
        }, stockpile emergency supplies including water, food, and first aid equipment, and coordinate with local authorities to ensure public awareness and preparedness through clear communication channels.`;
        break;

      case "LOW":
      default:
        strategies = `Despite the relatively low ${impactPhysics.megatonsEquivalent.toFixed(
          3
        )} MT energy of this impact, prudent preparedness measures should include monitoring the final trajectory during the ${Math.ceil(
          prediction.trajectory.time_to_impact / 3600
        )} hour approach, issuing public advisories for residents within ${Math.round(
          impactPhysics.affectedRadius
        )} km of the expected ${
          impactLocation.geographic_type
        } impact zone at ${impactLocation.latitude.toFixed(
          2
        )}°, ${impactLocation.longitude.toFixed(
          2
        )}° to stay indoors and away from windows during the event, preparing for minor M${impactPhysics.earthquakeMagnitude.toFixed(
          1
        )} seismic activity and possible localized power outages, positioning emergency services on standby to respond to any structural damage or injuries, documenting the event for scientific research and future threat assessment, and using this as an opportunity to test and improve planetary defense coordination protocols for future higher-risk scenarios.`;
    }

    console.log("Physics-based mitigation strategies generated");
    return strategies;
  }
}

export default ConsequencePredictor;
