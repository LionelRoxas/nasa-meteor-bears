// Server-side GROQ client utility
import Groq from "groq-sdk";

// Initialize GROQ client for server-side use only
let groqClient: Groq | null = null;

export function getGroqClient(): Groq | null {
  // Return existing client if already initialized
  if (groqClient) return groqClient;

  // Get API key from server environment
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GROQ_API_KEY not found in server environment variables");
    return null;
  }

  try {
    groqClient = new Groq({ apiKey });
    console.log("✅ GROQ client initialized successfully");
    return groqClient;
  } catch (error) {
    console.error("❌ Failed to initialize GROQ client:", error);
    return null;
  }
}

// Chat message types for GROQ API
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Helper function to convert messages to GROQ format
export function convertToGroqMessages(messages: ChatMessage[]) {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

// Generate mitigation strategies using GROQ
export async function generateMitigationStrategies(params: {
  threatLevel: string;
  impactEnergy: number;
  craterDiameter: number;
  earthquakeMagnitude: number;
  affectedRadius: number;
  populationAtRisk: number;
  impactLocation: {
    type: string;
    latitude: number;
    longitude: number;
  };
  tsunamiHeight?: number;
  timeToImpact: number;
}): Promise<string> {
  const client = getGroqClient();
  
  if (!client) {
    console.warn("⚠️ GROQ client not available, using fallback strategies");
    return generateFallbackStrategies(params);
  }

  const {
    threatLevel,
    impactEnergy,
    craterDiameter,
    earthquakeMagnitude,
    affectedRadius,
    populationAtRisk,
    impactLocation,
    tsunamiHeight,
    timeToImpact
  } = params;

  const hasTsunamiRisk = tsunamiHeight && tsunamiHeight > 5;

  const prompt = `
Generate a single comprehensive paragraph of mitigation strategies for an asteroid impact scenario with these parameters:

THREAT LEVEL: ${threatLevel}
IMPACT ENERGY: ${impactEnergy.toExponential(2)} MT TNT equivalent
CRATER DIAMETER: ${craterDiameter.toFixed(2)} km
EARTHQUAKE MAGNITUDE: M${earthquakeMagnitude.toFixed(1)}
AFFECTED RADIUS: ${affectedRadius.toFixed(1)} km
POPULATION AT RISK: ${populationAtRisk.toLocaleString()}
IMPACT LOCATION: ${impactLocation.type} at ${impactLocation.latitude.toFixed(2)}°, ${impactLocation.longitude.toFixed(2)}°
TIME TO IMPACT: ${Math.ceil(timeToImpact / 3600)} hours
${hasTsunamiRisk ? `TSUNAMI HEIGHT: ${tsunamiHeight?.toFixed(1)} meters` : ""}

Provide ONLY a single paragraph (no lists, no formatting) with actionable mitigation strategies prioritized by effectiveness. Focus on: immediate evacuation protocols, structural preparedness, emergency response coordination, long-term deflection options if applicable, and post-impact recovery measures. Be specific and realistic based on the threat level.`;

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a planetary defense expert specializing in disaster mitigation. Provide a single comprehensive paragraph with actionable strategies."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await client.chat.completions.create({
      model: "groq/compound",
      messages: convertToGroqMessages(messages),
      temperature: 0.3,
    });

    const strategies = response.choices[0].message.content?.trim();
    
    if (strategies && strategies.length > 50) {
      console.log("✅ LLM-generated mitigation strategies created");
      return strategies;
    } else {
      console.warn("⚠️ LLM response too short, using fallback");
      return generateFallbackStrategies(params);
    }
  } catch (error) {
    console.error("❌ Error generating LLM mitigation strategies:", error);
    return generateFallbackStrategies(params);
  }
}

// Fallback mitigation strategies
function generateFallbackStrategies(params: {
  threatLevel: string;
  impactEnergy: number;
  craterDiameter: number;
  earthquakeMagnitude: number;
  affectedRadius: number;
  populationAtRisk: number;
  impactLocation: {
    type: string;
    latitude: number;
    longitude: number;
  };
  tsunamiHeight?: number;
  timeToImpact: number;
}): string {
  const {
    threatLevel,
    impactEnergy,
    affectedRadius,
    populationAtRisk,
    impactLocation,
    earthquakeMagnitude,
    tsunamiHeight,
    timeToImpact
  } = params;

  const hasTsunamiRisk = tsunamiHeight && tsunamiHeight > 5;
  const hoursToImpact = Math.ceil(timeToImpact / 3600);

  switch (threatLevel) {
    case "CATASTROPHIC":
      return `For this catastrophic ${impactEnergy.toFixed(0)} MT impact scenario, immediate global coordination is essential: evacuate all populations within ${Math.round(affectedRadius * 2)} km of the predicted impact zone at ${impactLocation.latitude.toFixed(2)}°, ${impactLocation.longitude.toFixed(2)}° with ${hoursToImpact} hours notice, deploy kinetic impactors or gravity tractors for asteroid deflection if sufficient warning time exists, establish underground shelters and hardened infrastructure in major population centers globally, stockpile food and medical supplies for extended climate disruption lasting months to years, coordinate international emergency response teams for M${earthquakeMagnitude.toFixed(1)} equivalent seismic rescue operations${hasTsunamiRisk ? `, implement Pacific-wide tsunami warning systems with mandatory coastal evacuations for ${tsunamiHeight?.toFixed(0)}m wave heights` : ""}, and prepare for long-term agricultural disruption from atmospheric dust causing potential global cooling effects.`;

    case "HIGH":
      return `To mitigate this high-threat ${impactEnergy.toFixed(1)} MT impact affecting ${populationAtRisk.toLocaleString()} people, establish mandatory evacuation zones within ${Math.round(affectedRadius)} km of impact coordinates (${impactLocation.latitude.toFixed(2)}°, ${impactLocation.longitude.toFixed(2)}°), reinforce critical infrastructure and hospitals in surrounding ${Math.round(affectedRadius * 3)} km region to withstand M${earthquakeMagnitude.toFixed(1)} seismic activity, deploy early-warning systems for the ${hoursToImpact} hour approach window, pre-position emergency response teams and medical supplies at strategic locations outside the damage radius${hasTsunamiRisk ? `, activate coastal tsunami evacuation protocols for ${tsunamiHeight?.toFixed(0)}m waves with safe zones above 30m elevation` : ""}, consider last-resort deflection attempts using available spacecraft if lead time permits, establish emergency communication networks and backup power systems, and coordinate regional disaster response across national boundaries for optimal resource allocation.`;

    case "MODERATE":
      return `For this moderate ${impactEnergy.toFixed(2)} MT threat affecting an estimated ${populationAtRisk.toLocaleString()} people, implement precautionary evacuations within ${Math.round(affectedRadius * 0.5)} km of the predicted ${impactLocation.type} impact site at ${impactLocation.latitude.toFixed(2)}°, ${impactLocation.longitude.toFixed(2)}°, strengthen building codes and retrofit structures within ${Math.round(affectedRadius * 1.5)} km to handle M${earthquakeMagnitude.toFixed(1)} ground shaking, establish emergency shelters and evacuation routes with clear signage, deploy rapid response medical teams and search-and-rescue units to strategic staging areas, maintain real-time tracking of the asteroid's trajectory during its ${hoursToImpact} hour final approach${hasTsunamiRisk ? `, issue tsunami advisories for coastal regions with evacuation recommendations for low-lying areas` : ""}, stockpile emergency supplies including water, food, and first aid equipment, and coordinate with local authorities to ensure public awareness and preparedness through clear communication channels.`;

    case "LOW":
    default:
      return `Despite the relatively low ${impactEnergy.toFixed(3)} MT energy of this impact, prudent preparedness measures should include monitoring the final trajectory during the ${hoursToImpact} hour approach, issuing public advisories for residents within ${Math.round(affectedRadius)} km of the expected ${impactLocation.type} impact zone at ${impactLocation.latitude.toFixed(2)}°, ${impactLocation.longitude.toFixed(2)}° to stay indoors and away from windows during the event, preparing for minor M${earthquakeMagnitude.toFixed(1)} seismic activity and possible localized power outages, positioning emergency services on standby to respond to any structural damage or injuries, documenting the event for scientific research and future threat assessment, and using this as an opportunity to test and improve planetary defense coordination protocols for future higher-risk scenarios.`;
  }
}