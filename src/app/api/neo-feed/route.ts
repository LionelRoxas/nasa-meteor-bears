// app/api/neo-feed/route.ts
import { NextRequest, NextResponse } from "next/server";

// Configure for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NeoFeedResponse {
  links: {
    next?: string;
    previous?: string;
    self: string;
  };
  element_count: number;
  near_earth_objects: {
    [date: string]: Array<{
      links: {
        self: string;
      };
      id: string;
      neo_reference_id: string;
      name: string;
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
      is_sentry_object: boolean;
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get date range parameters or default to last 7 days
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const startDate =
      searchParams.get("start_date") ||
      (() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
      })();

    // Get NASA API key from environment variable
    const API_KEY =
      process.env.NASA_API_KEY ||
      process.env.NEXT_PUBLIC_NASA_API_KEY ||
      "DEMO_KEY";

    // Build NASA API URL
    const nasaUrl = new URL("https://api.nasa.gov/neo/rest/v1/feed");
    nasaUrl.searchParams.append("start_date", startDate);
    nasaUrl.searchParams.append("end_date", endDate);
    nasaUrl.searchParams.append("api_key", API_KEY);

    console.log(`Fetching NEO Feed from NASA API: ${startDate} to ${endDate}`);

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

    const data: NeoFeedResponse = await response.json();

    // Flatten and format the response
    const allNeos = [];
    let hazardousCount = 0;
    let sentryCount = 0;

    for (const date in data.near_earth_objects) {
      const neosForDate = data.near_earth_objects[date];
      for (const neo of neosForDate) {
        const approach = neo.close_approach_data[0]; // Get closest approach
        const diameterMeters =
          (neo.estimated_diameter.meters.estimated_diameter_min +
            neo.estimated_diameter.meters.estimated_diameter_max) /
          2;

        if (neo.is_potentially_hazardous_asteroid) hazardousCount++;
        if (neo.is_sentry_object) sentryCount++;

        allNeos.push({
          id: neo.id,
          name: neo.name,
          diameter: Math.round(diameterMeters),
          velocity: parseFloat(
            approach?.relative_velocity.kilometers_per_second || "0"
          ),
          distance: parseFloat(approach?.miss_distance.kilometers || "0"),
          is_hazardous: neo.is_potentially_hazardous_asteroid,
          is_sentry_object: neo.is_sentry_object,
          approach_date: date,
          approach_date_full: approach?.close_approach_date_full,
          magnitude: neo.absolute_magnitude_h,
          nasa_url: neo.nasa_jpl_url,
          miss_distance_lunar: parseFloat(approach?.miss_distance.lunar || "0"),
          orbiting_body: approach?.orbiting_body,
          raw_data: neo,
        });
      }
    }

    // Sort by approach date and distance
    allNeos.sort((a, b) => {
      const dateCompare =
        new Date(a.approach_date).getTime() -
        new Date(b.approach_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.distance - b.distance;
    });

    return NextResponse.json({
      success: true,
      date_range: {
        start: startDate,
        end: endDate,
      },
      summary: {
        total_count: data.element_count,
        hazardous_count: hazardousCount,
        sentry_count: sentryCount,
        dates_covered: Object.keys(data.near_earth_objects).length,
      },
      data: allNeos,
      raw_response: data,
    });
  } catch (error) {
    console.error("NEO Feed API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch NEO feed data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
