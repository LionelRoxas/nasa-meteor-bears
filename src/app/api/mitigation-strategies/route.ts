// API endpoint for generating mitigation strategies using server-side GROQ client
import { NextRequest, NextResponse } from 'next/server';
import { generateMitigationStrategies } from '@/app/utils/groqClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    } = body;

    // Validate required parameters
    if (!threatLevel || !impactEnergy || !craterDiameter || !impactLocation) {
      return NextResponse.json(
        { error: 'Missing required parameters for mitigation strategy generation' },
        { status: 400 }
      );
    }

    console.log('🛡️ Generating mitigation strategies:', {
      threatLevel,
      impactEnergy,
      populationAtRisk,
      location: `${impactLocation.latitude?.toFixed(2)}°, ${impactLocation.longitude?.toFixed(2)}°`
    });

    // Generate mitigation strategies using GROQ
    const strategies = await generateMitigationStrategies({
      threatLevel,
      impactEnergy,
      craterDiameter,
      earthquakeMagnitude,
      affectedRadius,
      populationAtRisk,
      impactLocation,
      tsunamiHeight,
      timeToImpact: timeToImpact || 86400 // Default 24 hours if not provided
    });

    console.log('✅ Mitigation strategies generated:', {
      strategiesLength: strategies.length,
      threatLevel
    });

    return NextResponse.json({
      success: true,
      mitigationStrategies: strategies,
      threatLevel,
      metadata: {
        generatedAt: new Date().toISOString(),
        impactEnergy,
        populationAtRisk,
        affectedRadius
      }
    });

  } catch (error) {
    console.error('❌ Error generating mitigation strategies:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate mitigation strategies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}