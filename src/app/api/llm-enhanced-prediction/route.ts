import { NextRequest, NextResponse } from "next/server";

interface LLMRequestBody {
  asteroidId: string;
  context: string;
  asteroidData: {
    diameter_meters: number;
    diameter_km: number;
    is_hazardous: boolean;
    is_sentry_object: boolean;
    kinetic_energy_mt: number;
    threat_level: string;
    orbit_class: string;
    nasa_url: string;
  };
  correlatedEarthquakes: Array<{
    magnitude: number;
    location: string;
    time: string;
    depth_km: number;
    energy_joules?: number;
    significance: number;
    correlationScore: string;
    correlationFactors: any;
  }>;
}

interface EnhancedPrediction {
  hazard_probability: number;
  risk_score: number;
  confidence: number;
  recommendation: string;
  threat_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  model_version: string;
  llm_analysis: {
    historical_comparison: string;
    risk_factors: string[];
    confidence_factors: string[];
    similar_events: string;
    impact_assessment: string;
    recommendation_detailed: string;
  };
  correlation_context: {
    top_similar_earthquakes: number;
    average_correlation_score: number;
    energy_comparison_summary: string;
    hazard_pattern_analysis: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LLMRequestBody = await request.json();
    const { asteroidId, context, asteroidData, correlatedEarthquakes } = body;

    if (!asteroidId || !context || !asteroidData) {
      return NextResponse.json(
        { error: "Missing required fields: asteroidId, context, and asteroidData" },
        { status: 400 }
      );
    }

    console.log(`Generating enhanced prediction for asteroid ${asteroidId} using LLM`);

    // Check if GROQ API key is available
    const groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not found, using fallback prediction');
      return NextResponse.json(generateFallbackPrediction(asteroidData, correlatedEarthquakes));
    }

    // Prepare LLM prompt
    const prompt = buildLLMPrompt(context, asteroidData, correlatedEarthquakes);

    // Call GROQ API
    const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert astrophysicist and seismic analyst specializing in asteroid impact assessment. Analyze the provided data and return a JSON response with detailed risk assessment.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('GROQ API error:', errorText);
      return NextResponse.json(generateFallbackPrediction(asteroidData, correlatedEarthquakes));
    }

    const llmData = await llmResponse.json();
    const llmAnalysis = JSON.parse(llmData.choices[0].message.content);

    // Process and validate LLM response
    const enhancedPrediction = processLLMResponse(llmAnalysis, asteroidData, correlatedEarthquakes);

    console.log(`Enhanced prediction generated successfully for asteroid ${asteroidId}`);

    return NextResponse.json(enhancedPrediction);

  } catch (error) {
    console.error('LLM enhanced prediction error:', error);

    // Return fallback prediction on error
    const body = await request.json().catch(() => ({}));
    const fallback = generateFallbackPrediction(
      body?.asteroidData,
      body?.correlatedEarthquakes || []
    );

    return NextResponse.json(fallback);
  }
}

function buildLLMPrompt(context: string, asteroidData: any, correlatedEarthquakes: any[]): string {
  return `
${context}

Based on this comprehensive data, please provide a detailed risk assessment in the following JSON format:

{
  "hazard_probability": <number between 0 and 1>,
  "risk_score": <number between 0 and 100>,
  "confidence": <number between 0 and 1>,
  "threat_category": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "historical_comparison": "<detailed comparison with correlated earthquakes>",
  "risk_factors": ["<factor1>", "<factor2>", "<factor3>"],
  "confidence_factors": ["<confidence_reason1>", "<confidence_reason2>"],
  "similar_events": "<description of most similar historical events>",
  "impact_assessment": "<potential impact scenarios based on correlations>",
  "recommendation_detailed": "<specific monitoring and preparedness recommendations>",
  "energy_comparison_summary": "<summary of energy comparisons with earthquakes>",
  "hazard_pattern_analysis": "<analysis of hazard patterns from correlations>"
}

Consider:
1. The correlation scores with historical earthquakes
2. Energy comparisons between asteroid and seismic events
3. NASA's current threat classification
4. Orbital characteristics and approach parameters
5. Historical precedents from the correlated earthquake data
6. Confidence based on data quality and correlation strength

Provide quantitative risk assessment with clear reasoning.
`;
}

function processLLMResponse(llmAnalysis: any, asteroidData: any, correlatedEarthquakes: any[]): EnhancedPrediction {
  // Calculate correlation metrics
  const correlationScores = correlatedEarthquakes.map(eq => parseFloat(eq.correlationScore));
  const avgCorrelationScore = correlationScores.length > 0
    ? correlationScores.reduce((a, b) => a + b, 0) / correlationScores.length
    : 0;

  // Ensure hazard probability is reasonable based on NASA data
  let hazardProbability = Math.max(0, Math.min(1, llmAnalysis.hazard_probability || 0.1));

  // Adjust based on NASA classification
  if (asteroidData.is_sentry_object) {
    hazardProbability = Math.max(hazardProbability, 0.7);
  } else if (asteroidData.is_hazardous) {
    hazardProbability = Math.max(hazardProbability, 0.4);
  }

  // Determine threat category
  let threatCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (hazardProbability >= 0.8) threatCategory = 'CRITICAL';
  else if (hazardProbability >= 0.6) threatCategory = 'HIGH';
  else if (hazardProbability >= 0.3) threatCategory = 'MEDIUM';

  return {
    hazard_probability: hazardProbability,
    risk_score: Math.round(hazardProbability * 100),
    confidence: Math.max(0.5, Math.min(1, llmAnalysis.confidence || 0.7)),
    recommendation: llmAnalysis.recommendation_detailed || "Continue monitoring with standard protocols",
    threat_category: llmAnalysis.threat_category || threatCategory,
    model_version: "LLM-Enhanced-v1.0",
    llm_analysis: {
      historical_comparison: llmAnalysis.historical_comparison || "Limited historical correlation data available",
      risk_factors: Array.isArray(llmAnalysis.risk_factors) ? llmAnalysis.risk_factors : ["Insufficient data"],
      confidence_factors: Array.isArray(llmAnalysis.confidence_factors) ? llmAnalysis.confidence_factors : ["NASA classification"],
      similar_events: llmAnalysis.similar_events || "No directly similar events identified",
      impact_assessment: llmAnalysis.impact_assessment || "Impact assessment requires additional modeling",
      recommendation_detailed: llmAnalysis.recommendation_detailed || "Standard monitoring protocols recommended"
    },
    correlation_context: {
      top_similar_earthquakes: correlatedEarthquakes.length,
      average_correlation_score: avgCorrelationScore,
      energy_comparison_summary: llmAnalysis.energy_comparison_summary || "Energy comparison analysis pending",
      hazard_pattern_analysis: llmAnalysis.hazard_pattern_analysis || "Pattern analysis requires additional data"
    }
  };
}

function generateFallbackPrediction(asteroidData: any, correlatedEarthquakes: any[]): EnhancedPrediction {
  // Generate reasonable prediction based on NASA data when LLM is unavailable
  let hazardProbability = 0.1;
  let threatCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  if (asteroidData?.is_sentry_object) {
    hazardProbability = 0.85;
    threatCategory = 'CRITICAL';
  } else if (asteroidData?.is_hazardous) {
    hazardProbability = 0.55;
    threatCategory = 'HIGH';
  } else if (asteroidData?.kinetic_energy_mt > 100) {
    hazardProbability = 0.35;
    threatCategory = 'MEDIUM';
  }

  const correlationScores = correlatedEarthquakes?.map(eq => parseFloat(eq.correlationScore)) || [];
  const avgCorrelationScore = correlationScores.length > 0
    ? correlationScores.reduce((a, b) => a + b, 0) / correlationScores.length
    : 0;

  return {
    hazard_probability: hazardProbability,
    risk_score: Math.round(hazardProbability * 100),
    confidence: 0.75,
    recommendation: "LLM analysis unavailable - using NASA classification",
    threat_category: threatCategory,
    model_version: "Fallback-v1.0",
    llm_analysis: {
      historical_comparison: "LLM analysis not available - using correlation scores for basic comparison",
      risk_factors: asteroidData?.is_hazardous ? ["NASA hazardous classification", "Large size", "Close approach"] : ["Standard orbital parameters"],
      confidence_factors: ["NASA official classification", "Orbital data quality"],
      similar_events: `${correlatedEarthquakes?.length || 0} correlated seismic events identified`,
      impact_assessment: "Detailed impact assessment requires LLM analysis",
      recommendation_detailed: asteroidData?.is_sentry_object
        ? "Critical monitoring required - Sentry object classification"
        : "Continue standard monitoring protocols"
    },
    correlation_context: {
      top_similar_earthquakes: correlatedEarthquakes?.length || 0,
      average_correlation_score: avgCorrelationScore,
      energy_comparison_summary: "Energy analysis requires LLM processing",
      hazard_pattern_analysis: "Pattern analysis requires LLM processing"
    }
  };
}