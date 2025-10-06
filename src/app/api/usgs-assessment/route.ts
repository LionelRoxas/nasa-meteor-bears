/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { detectOceanImpactSync } from '@/services/oceanDetectionService';
import { detectSeismicZoneSync } from '@/services/seismicZoneService';

const EARTHQUAKE_API = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const ELEVATION_API = "https://api.open-elevation.com/api/v1/lookup";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude, impactEnergy, craterDiameter } = body;

    console.log('USGS Assessment API called for:', { latitude, longitude });

    // Get elevation
    const elevationResponse = await fetch(
      `${ELEVATION_API}?locations=${latitude},${longitude}`
    );
    const elevationData = await elevationResponse.json();
    const elevation = elevationData.results?.[0]?.elevation || 0;

    // Get earthquakes from last 10 years within 500km
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const earthquakeParams = new URLSearchParams({
      format: "geojson",
      orderby: "time",
      latitude: String(latitude),
      longitude: String(longitude),
      maxradiuskm: "500",
      starttime: tenYearsAgo.toISOString().split("T")[0],
      minmagnitude: "3.0",
      limit: "1000",
    });

    const earthquakeResponse = await fetch(`${EARTHQUAKE_API}?${earthquakeParams}`);
    const earthquakeData = await earthquakeResponse.json();
    const earthquakes = earthquakeData.features || [];

    console.log(`Found ${earthquakes.length} earthquakes in the region`);

    // Analyze seismic activity
    const avgEventsPerYear = earthquakes.length / 10;
    const maxMagnitude = Math.max(...earthquakes.map((eq: any) => eq.properties.mag || 0), 0);

    // Determine seismic zone risk
    let seismicRiskLevel: string;
    let seismicDescription: string;

    if (avgEventsPerYear > 50 || maxMagnitude > 7.5) {
      seismicRiskLevel = "VERY_HIGH";
      seismicDescription = "Very high seismic activity zone. Major earthquakes common.";
    } else if (avgEventsPerYear > 20 || maxMagnitude > 6.5) {
      seismicRiskLevel = "HIGH";
      seismicDescription = "High seismic activity zone. Significant earthquakes expected.";
    } else if (avgEventsPerYear > 5 || maxMagnitude > 5.5) {
      seismicRiskLevel = "MODERATE";
      seismicDescription = "Moderate seismic activity. Occasional strong earthquakes.";
    } else {
      seismicRiskLevel = "LOW";
      seismicDescription = "Low seismic activity. Infrequent earthquakes.";
    }

    // Use accurate seismic zone detection based on tectonic boundaries
    const seismicZoneDetection = detectSeismicZoneSync(latitude, longitude);

    // Tsunami risk assessment using accurate ocean detection
    const oceanDetection = detectOceanImpactSync(latitude, longitude);
    const isOceanImpact = oceanDetection.isOcean;
    const tsunamiEarthquakes = earthquakes.filter((eq: any) => eq.properties.tsunami === 1);

    let tsunamiRiskLevel: string;
    if (!isOceanImpact) {
      tsunamiRiskLevel = "NONE"; // Land impact - no tsunami
    } else {
      // Ocean impact - assess tsunami risk based on historical data
      if (tsunamiEarthquakes.length > 5) {
        tsunamiRiskLevel = "EXTREME";
      } else if (tsunamiEarthquakes.length > 2) {
        tsunamiRiskLevel = "HIGH";
      } else if (tsunamiEarthquakes.length > 0) {
        tsunamiRiskLevel = "MODERATE";
      } else {
        tsunamiRiskLevel = "LOW"; // Ocean impact but no historical tsunamis
      }
    }

    // Calculate expected earthquake magnitude from impact using Gutenberg-Richter
    // Exact formula: log₁₀(E) = 1.5M + 4.8, solving for M: M = (log₁₀(E) - 4.8) / 1.5
    const expectedEarthquakeMagnitude = Math.max((Math.log10(impactEnergy) - 4.8) / 1.5, 0);

    // Calculate tsunami height using Ward & Asphaug (2000) formula
    // H = 1.88 × E^0.22 where E is in megatons TNT
    // ONLY applies to ocean impacts (verified by oceanDetectionService)
    const TNT_ENERGY_PER_KG = 4.184e6; // Joules per kg of TNT
    const energyMT = impactEnergy / (TNT_ENERGY_PER_KG * 1e9); // Convert to megatons
    const expectedTsunamiHeight = isOceanImpact
      ? Math.min(1.88 * Math.pow(energyMT, 0.22), 1000) // Exact Ward & Asphaug formula, cap at 1000m
      : 0; // No tsunami for land impacts

    // Secondary hazards
    const secondaryHazards: string[] = [];
    if (expectedEarthquakeMagnitude > 5.0) {
      secondaryHazards.push("Major seismic shaking");
    }
    if (tsunamiRiskLevel === "HIGH" || tsunamiRiskLevel === "EXTREME") {
      secondaryHazards.push("Tsunami waves");
    }
    if (seismicRiskLevel === "HIGH" || seismicRiskLevel === "VERY_HIGH") {
      secondaryHazards.push("Potential fault activation");
    }
    if (craterDiameter > 1) {
      secondaryHazards.push("Ejecta blanket");
    }
    if (impactEnergy > 1e18) {
      secondaryHazards.push("Atmospheric disturbance");
    }

    const assessment = {
      seismicZone: {
        zone: seismicZoneDetection.zoneName,
        riskLevel: seismicZoneDetection.riskLevel,
        description: seismicZoneDetection.description,
        tectonicContext: seismicZoneDetection.tectonicContext,
        detectionMethod: seismicZoneDetection.method,
        confidence: seismicZoneDetection.confidence,
        averageAnnualEvents: Math.round(avgEventsPerYear),
        maxHistoricalMagnitude: maxMagnitude,
      },
      tsunamiRisk: {
        isCoastal: isOceanImpact,
        riskLevel: tsunamiRiskLevel,
        nearestCoastDistance: isOceanImpact ? 0 : 500, // Ocean impact = distance 0
        elevationAboveSeaLevel: elevation,
        tsunamiHistory: tsunamiEarthquakes.length,
        oceanName: oceanDetection.oceanName,
        detectionConfidence: oceanDetection.confidence,
      },
      expectedEarthquakeMagnitude,
      expectedTsunamiHeight,
      secondaryHazards,
    };

    console.log('USGS Assessment completed:', assessment);

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('USGS Assessment API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch USGS data' },
      { status: 500 }
    );
  }
}

// Removed: identifySeismicZone - replaced with accurate seismicZoneService

// Removed: isCoastalLocation - replaced with accurate oceanDetectionService

function estimateCoastDistance(lat: number, lng: number): number {
  // Improved coast distance estimation based on geographic zones
  // This is still an approximation - for production, use actual coastline geometry

  // Check major ocean boundaries and estimate distance
  const boundaries = [
    // Pacific Ocean boundaries
    { minLat: -60, maxLat: 60, minLng: -180, maxLng: -100, coastLng: [-130, -100] },
    { minLat: -60, maxLat: 60, minLng: 100, maxLng: 180, coastLng: [100, 150] },
    // Atlantic Ocean boundaries
    { minLat: -60, maxLat: 70, minLng: -100, maxLng: -60, coastLng: [-80, -70] },
    { minLat: -60, maxLat: 70, minLng: -30, maxLng: 20, coastLng: [-10, 10] },
    // Indian Ocean boundaries
    { minLat: -50, maxLat: 30, minLng: 20, maxLng: 100, coastLng: [40, 80] },
  ];

  let minDistance = 500; // Default for inland locations

  for (const boundary of boundaries) {
    if (lat >= boundary.minLat && lat <= boundary.maxLat &&
        lng >= boundary.minLng && lng <= boundary.maxLng) {
      // Calculate approximate distance to coast using longitude difference
      const distToWestCoast = Math.abs(lng - boundary.coastLng[0]);
      const distToEastCoast = Math.abs(lng - boundary.coastLng[1]);
      const lngDist = Math.min(distToWestCoast, distToEastCoast);

      // Rough conversion: 1 degree ≈ 111km at equator, adjust for latitude
      const kmPerDegree = 111 * Math.cos(lat * Math.PI / 180);
      const estimatedDist = lngDist * kmPerDegree;

      minDistance = Math.min(minDistance, estimatedDist);
    }
  }

  return Math.max(minDistance, 5); // Minimum 5km for coastal areas
}
