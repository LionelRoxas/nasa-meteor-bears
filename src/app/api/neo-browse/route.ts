/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/neo-browse/route.ts
import { NextRequest, NextResponse } from "next/server";

// Configure for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NeoBrowseResponse {
  links: {
    next?: string;
    previous?: string;
    self: string;
  };
  page: {
    size: number;
    total_elements: number;
    total_pages: number;
    number: number;
  };
  near_earth_objects: Array<{
    links: {
      self: string;
    };
    id: string;
    neo_reference_id: string;
    name: string;
    name_limited: string;
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
    orbital_data?: {
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
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get pagination parameters
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "20";
    const getAllPages = searchParams.get("all") === "true";

    // Get NASA API key from environment variable
    const API_KEY =
      process.env.NASA_API_KEY ||
      process.env.NEXT_PUBLIC_NASA_API_KEY ||
      "DEMO_KEY";

    if (getAllPages) {
      // Fetch multiple pages to get more data
      console.log("Fetching multiple pages of NEO Browse data from NASA API");

      const allAsteroids = [];
      const currentPage = 0;
      const maxPages = 10; // Limit to prevent overwhelming the API
      let totalElements = 0;
      let totalPages = 0;

      for (let i = 0; i < maxPages; i++) {
        const nasaUrl = `https://api.nasa.gov/neo/rest/v1/neo/browse?page=${i}&size=20&api_key=${API_KEY}`;

        const response = await fetch(nasaUrl, {
          next: { revalidate: 3600 },
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch page ${i}: ${response.status}`);
          break;
        }

        const pageData: NeoBrowseResponse = await response.json();

        // Store metadata from first page
        if (i === 0) {
          totalElements = pageData.page.total_elements;
          totalPages = pageData.page.total_pages;
        }

        // Format and add asteroids from this page
        for (const neo of pageData.near_earth_objects) {
          const approach = neo.close_approach_data?.[0];
          const diameterMeters =
            (neo.estimated_diameter.meters.estimated_diameter_min +
              neo.estimated_diameter.meters.estimated_diameter_max) /
            2;

          allAsteroids.push({
            id: neo.id,
            name: neo.name,
            designation: neo.designation,
            diameter: Math.round(diameterMeters),
            velocity: parseFloat(
              approach?.relative_velocity.kilometers_per_second || "0"
            ),
            distance: parseFloat(approach?.miss_distance.kilometers || "0"),
            is_hazardous: neo.is_potentially_hazardous_asteroid,
            is_sentry_object: neo.is_sentry_object,
            approach_date: approach?.close_approach_date,
            magnitude: neo.absolute_magnitude_h,
            nasa_url: neo.nasa_jpl_url,
            orbit_class:
              neo.orbital_data?.orbit_class.orbit_class_type || "Unknown",
            miss_distance_lunar: parseFloat(
              approach?.miss_distance.lunar || "0"
            ),
          });
        }

        // Check if there are more pages
        if (!pageData.links.next) break;
      }

      return NextResponse.json({
        success: true,
        summary: {
          total_elements: totalElements,
          total_pages: totalPages,
          pages_fetched: Math.min(maxPages, totalPages),
          asteroids_loaded: allAsteroids.length,
        },
        data: allAsteroids,
      });
    } else {
      // Single page fetch
      const nasaUrl = new URL("https://api.nasa.gov/neo/rest/v1/neo/browse");
      nasaUrl.searchParams.append("page", page);
      nasaUrl.searchParams.append("size", size);
      nasaUrl.searchParams.append("api_key", API_KEY);

      console.log(
        `Fetching NEO Browse from NASA API - Page: ${page}, Size: ${size}`
      );

      // Fetch from NASA API
      const response = await fetch(nasaUrl.toString(), {
        next: { revalidate: 3600 }, // Cache for 1 hour
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
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

      const data: NeoBrowseResponse = await response.json();

      // Format the response
      const formattedAsteroids = data.near_earth_objects.map((neo) => {
        const approach = neo.close_approach_data?.[0];
        const diameterMeters =
          (neo.estimated_diameter.meters.estimated_diameter_min +
            neo.estimated_diameter.meters.estimated_diameter_max) /
          2;

        return {
          id: neo.id,
          name: neo.name,
          designation: neo.designation,
          diameter: Math.round(diameterMeters),
          velocity: parseFloat(
            approach?.relative_velocity.kilometers_per_second || "0"
          ),
          distance: parseFloat(approach?.miss_distance.kilometers || "0"),
          is_hazardous: neo.is_potentially_hazardous_asteroid,
          is_sentry_object: neo.is_sentry_object,
          approach_date: approach?.close_approach_date,
          approach_date_full: approach?.close_approach_date_full,
          magnitude: neo.absolute_magnitude_h,
          nasa_url: neo.nasa_jpl_url,
          orbit_class:
            neo.orbital_data?.orbit_class.orbit_class_type || "Unknown",
          miss_distance_lunar: parseFloat(approach?.miss_distance.lunar || "0"),
          orbiting_body: approach?.orbiting_body,
          raw_data: neo,
        };
      });

      // Calculate statistics
      const stats = {
        hazardous_count: formattedAsteroids.filter((a) => a.is_hazardous)
          .length,
        sentry_count: formattedAsteroids.filter((a) => a.is_sentry_object)
          .length,
        average_diameter:
          formattedAsteroids.reduce((sum, a) => sum + a.diameter, 0) /
          formattedAsteroids.length,
        largest_diameter: Math.max(
          ...formattedAsteroids.map((a) => a.diameter)
        ),
        smallest_diameter: Math.min(
          ...formattedAsteroids.map((a) => a.diameter)
        ),
      };

      return NextResponse.json({
        success: true,
        pagination: {
          current_page: data.page.number,
          page_size: data.page.size,
          total_elements: data.page.total_elements,
          total_pages: data.page.total_pages,
          has_next: !!data.links.next,
          has_previous: !!data.links.previous,
        },
        statistics: stats,
        data: formattedAsteroids,
        raw_response: data,
      });
    }
  } catch (error) {
    console.error("NEO Browse API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch NEO browse data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
