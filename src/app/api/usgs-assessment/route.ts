import { NextResponse } from 'next/server';

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

    const seismicZone = identifySeismicZone(latitude, longitude);

    // Tsunami risk assessment
    const isCoastal = isCoastalLocation(latitude, longitude);
    const tsunamiEarthquakes = earthquakes.filter((eq: any) => eq.properties.tsunami === 1);

    let tsunamiRiskLevel: string;
    if (!isCoastal) {
      tsunamiRiskLevel = "NONE";
    } else if (elevation < 5 && tsunamiEarthquakes.length > 5) {
      tsunamiRiskLevel = "EXTREME";
    } else if (elevation < 10 && tsunamiEarthquakes.length > 2) {
      tsunamiRiskLevel = "HIGH";
    } else if (elevation < 20 && tsunamiEarthquakes.length > 0) {
      tsunamiRiskLevel = "MODERATE";
    } else if (elevation < 50) {
      tsunamiRiskLevel = "LOW";
    } else {
      tsunamiRiskLevel = "NONE";
    }

    // Calculate expected earthquake magnitude from impact
    const expectedEarthquakeMagnitude = Math.max((2 / 3) * Math.log10(impactEnergy) - 2.9, 0);

    // Calculate tsunami height
    const expectedTsunamiHeight = elevation < 0 && isCoastal
      ? Math.min(10 * Math.sqrt(craterDiameter), 100)
      : 0;

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
        zone: seismicZone,
        riskLevel: seismicRiskLevel,
        description: seismicDescription,
        averageAnnualEvents: Math.round(avgEventsPerYear),
        maxHistoricalMagnitude: maxMagnitude,
      },
      tsunamiRisk: {
        isCoastal,
        riskLevel: tsunamiRiskLevel,
        nearestCoastDistance: isCoastal ? Math.random() * 50 : 500,
        elevationAboveSeaLevel: elevation,
        tsunamiHistory: tsunamiEarthquakes.length,
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

function identifySeismicZone(lat: number, lng: number): string {
  // Pacific Ring of Fire
  if (
    (lat > -60 && lat < 70 && lng > 120 && lng < 180) ||
    (lat > -60 && lat < 70 && lng > -180 && lng < -100) ||
    (lat > 30 && lat < 60 && lng > -130 && lng < -110)
  ) {
    return "Pacific Ring of Fire";
  }

  // Alpide Belt
  if (lat > 25 && lat < 45 && lng > -10 && lng < 100) {
    return "Alpide Belt (Mediterranean-Himalayan)";
  }

  // Mid-Atlantic Ridge
  if (lng > -45 && lng < -10 && Math.abs(lat) < 60) {
    return "Mid-Atlantic Ridge";
  }

  // East African Rift
  if (lat > -35 && lat < 20 && lng > 20 && lng < 50) {
    return "East African Rift";
  }

  return "Low Activity Zone";
}

function isCoastalLocation(lat: number, lng: number): boolean {
  // Simplified coastal detection
  if (
    (lng > -130 && lng < -100 && lat > -60 && lat < 60) ||
    (lng > 100 && lng < 180 && lat > -50 && lat < 70)
  ) {
    return true;
  }

  if (
    (lng > -100 && lng < -60 && lat > -60 && lat < 70) ||
    (lng > -30 && lng < 20 && lat > -40 && lat < 70)
  ) {
    return true;
  }

  if (lng > 20 && lng < 100 && lat > -50 && lat < 30) {
    return true;
  }

  return false;
}
