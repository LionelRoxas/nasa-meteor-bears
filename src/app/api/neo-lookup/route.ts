// app/api/neo-lookup/route.ts
import { NextRequest, NextResponse } from "next/server";

// Configure for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NeoLookupResponse {
  links: {
    self: string;
  };
  id: string;
  neo_reference_id: string;
  name: string;
  designation: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    miles: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    feet: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    close_approach_date_full: string;
    epoch_date_close_approach: number;
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
      miles_per_hour: string;
    };
    miss_distance: {
      astronomical: string;
      lunar: string;
      kilometers: string;
      miles: string;
    };
    orbiting_body: string;
  }>;
  orbital_data: {
    orbit_id: string;
    orbit_determination_date: string;
    first_observation_date: string;
    last_observation_date: string;
    data_arc_in_days: number;
    observations_used: number;
    orbit_uncertainty: string;
    minimum_orbit_intersection: string;
    jupiter_tisserand_invariant: string;
    epoch_osculation: string;
    eccentricity: string;
    semi_major_axis: string;
    inclination: string;
    ascending_node_longitude: string;
    orbital_period: string;
    perihelion_distance: string;
    perihelion_argument: string;
    aphelion_distance: string;
    perihelion_time: string;
    mean_anomaly: string;
    mean_motion: string;
    equinox: string;
    orbit_class: {
      orbit_class_type: string;
      orbit_class_description: string;
      orbit_class_range: string;
    };
  };
  is_sentry_object: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get asteroid ID from query params
    const asteroidId = searchParams.get("id");

    if (!asteroidId) {
      return NextResponse.json(
        {
          success: false,
          error: "Asteroid ID is required",
          message: "Please provide an 'id' query parameter",
        },
        { status: 400 }
      );
    }

    // Get NASA API key from environment variable
    const API_KEY =
      process.env.NASA_API_KEY ||
      process.env.NEXT_PUBLIC_NASA_API_KEY ||
      "DEMO_KEY";

    // Build NASA API URL
    const nasaUrl = `https://api.nasa.gov/neo/rest/v1/neo/${asteroidId}?api_key=${API_KEY}`;

    console.log(`Fetching NEO Lookup from NASA API for ID: ${asteroidId}`);

    // Fetch from NASA API
    const response = await fetch(nasaUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Asteroid not found",
            message: `No asteroid found with ID: ${asteroidId}`,
          },
          { status: 404 }
        );
      }

      console.error(
        `NASA API error: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `NASA API error: ${response.status}`,
          message: response.statusText,
        },
        { status: response.status }
      );
    }

    const data: NeoLookupResponse = await response.json();

    // Format the response with calculated values
    const diameterMeters =
      (data.estimated_diameter.meters.estimated_diameter_min +
        data.estimated_diameter.meters.estimated_diameter_max) /
      2;

    // Get the next closest approach
    const futureApproaches = data.close_approach_data
      .filter(
        (approach) => new Date(approach.close_approach_date) >= new Date()
      )
      .sort(
        (a, b) =>
          new Date(a.close_approach_date).getTime() -
          new Date(b.close_approach_date).getTime()
      );

    const nextApproach = futureApproaches[0];

    // Get the historically closest approach
    const closestApproach = data.close_approach_data.sort(
      (a, b) =>
        parseFloat(a.miss_distance.kilometers) -
        parseFloat(b.miss_distance.kilometers)
    )[0];

    // Calculate threat metrics
    const kineticEnergy = calculateKineticEnergy(
      diameterMeters,
      nextApproach?.relative_velocity.kilometers_per_second
    );
    const threatLevel = calculateThreatLevel(
      kineticEnergy,
      data.is_potentially_hazardous_asteroid
    );

    return NextResponse.json({
      success: true,
      asteroid: {
        // Basic info
        id: data.id,
        name: data.name,
        designation: data.designation,
        nasa_url: data.nasa_jpl_url,

        // Physical properties
        absolute_magnitude: data.absolute_magnitude_h,
        diameter: {
          meters: Math.round(diameterMeters),
          kilometers: diameterMeters / 1000,
          miles: diameterMeters * 0.000621371,
          estimated_range: data.estimated_diameter,
        },

        // Threat assessment
        is_hazardous: data.is_potentially_hazardous_asteroid,
        is_sentry_object: data.is_sentry_object,
        kinetic_energy_mt: kineticEnergy,
        threat_level: threatLevel,

        // Orbital data
        orbital_data: {
          orbit_class: data.orbital_data.orbit_class.orbit_class_type,
          orbit_description:
            data.orbital_data.orbit_class.orbit_class_description,
          eccentricity: parseFloat(data.orbital_data.eccentricity),
          inclination: parseFloat(data.orbital_data.inclination),
          orbital_period_days: parseFloat(data.orbital_data.orbital_period),
          perihelion_distance_au: parseFloat(
            data.orbital_data.perihelion_distance
          ),
          aphelion_distance_au: parseFloat(data.orbital_data.aphelion_distance),
          semi_major_axis_au: parseFloat(data.orbital_data.semi_major_axis),
          minimum_orbit_intersection_au: parseFloat(
            data.orbital_data.minimum_orbit_intersection
          ),
          orbit_uncertainty: data.orbital_data.orbit_uncertainty,
          observations_used: data.orbital_data.observations_used,
          first_observation: data.orbital_data.first_observation_date,
          last_observation: data.orbital_data.last_observation_date,
        },

        // Approach data
        next_approach: nextApproach
          ? {
              date: nextApproach.close_approach_date,
              date_full: nextApproach.close_approach_date_full,
              velocity_km_s: parseFloat(
                nextApproach.relative_velocity.kilometers_per_second
              ),
              miss_distance_km: parseFloat(
                nextApproach.miss_distance.kilometers
              ),
              miss_distance_lunar: parseFloat(nextApproach.miss_distance.lunar),
              orbiting_body: nextApproach.orbiting_body,
            }
          : null,

        closest_approach_ever: closestApproach
          ? {
              date: closestApproach.close_approach_date,
              miss_distance_km: parseFloat(
                closestApproach.miss_distance.kilometers
              ),
              miss_distance_lunar: parseFloat(
                closestApproach.miss_distance.lunar
              ),
            }
          : null,

        total_approaches: data.close_approach_data.length,

        // Raw data
        raw_data: data,
      },
    });
  } catch (error) {
    console.error("NEO Lookup API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch NEO lookup data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate kinetic energy
function calculateKineticEnergy(
  diameterMeters: number,
  velocityKmS: string | undefined
): number {
  if (!velocityKmS) return 0;

  // Calculate mass (assuming rocky composition, ~3000 kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(diameterMeters / 2, 3);
  const mass = volume * 3000; // kg

  // Calculate kinetic energy (KE = 0.5 * m * v²)
  const velocityMs = parseFloat(velocityKmS) * 1000; // convert to m/s
  const energy = 0.5 * mass * velocityMs * velocityMs; // Joules
  const energyMt = energy / 4.184e15; // Convert to Megatons TNT

  return energyMt;
}

// Helper function to determine threat level
function calculateThreatLevel(energyMt: number, isHazardous: boolean): string {
  if (energyMt > 10000) return "GLOBAL_CATASTROPHE";
  if (energyMt > 1000) return "CONTINENTAL";
  if (energyMt > 100) return "REGIONAL";
  if (energyMt > 10) return "LOCAL";
  if (energyMt > 1) return "MINIMAL";
  if (isHazardous) return "POTENTIALLY_HAZARDOUS";
  return "NEGLIGIBLE";
}
