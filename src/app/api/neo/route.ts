// app/api/neo/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Asteroid {
  id: string;
  neo_reference_id?: string;
  name?: string;
  name_limited?: string;
  absolute_magnitude_h?: number;
  estimated_diameter?: {
    kilometers?: {
      estimated_diameter_min?: number;
      estimated_diameter_max?: number;
    };
    meters?: {
      estimated_diameter_min?: number;
      estimated_diameter_max?: number;
    };
  };
  is_potentially_hazardous_asteroid?: boolean;
  close_approach_data?: Array<{
    close_approach_date?: string;
    relative_velocity?: {
      kilometers_per_second?: string;
    };
    miss_distance?: {
      kilometers?: string;
    };
  }>;
  orbital_data?: any;
  is_sentry_object?: boolean;
}

interface AsteroidsData {
  asteroids?: Asteroid[];
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "all";
    const asteroidId = searchParams.get("id");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : null;

    // Read the all-asteroids.json file
    const asteroidsPath = path.join(
      process.cwd(),
      "public",
      "data",
      "all-asteroids.json"
    );
    const asteroidsRaw = fs.readFileSync(asteroidsPath, "utf8");
    const asteroidsData: AsteroidsData = JSON.parse(asteroidsRaw);

    // Handle different JSON structures
    let allAsteroids: Asteroid[] = [];
    if (asteroidsData.asteroids && Array.isArray(asteroidsData.asteroids)) {
      allAsteroids = asteroidsData.asteroids;
    } else if (Array.isArray(asteroidsData)) {
      allAsteroids = asteroidsData as unknown as Asteroid[];
    } else {
      // If it's an object with asteroid IDs as keys
      allAsteroids = Object.values(asteroidsData).filter(
        (item) => typeof item === "object" && item !== null && "id" in item
      ) as Asteroid[];
    }

    // Format asteroid for simulation
    const formatForSimulation = (asteroid: Asteroid) => {
      const approach = asteroid.close_approach_data?.[0];
      const diameterKm = asteroid.estimated_diameter?.kilometers;
      const diameterM = asteroid.estimated_diameter?.meters;

      const diameter = diameterM
        ? ((diameterM.estimated_diameter_min ?? 0) +
            (diameterM.estimated_diameter_max ?? 0)) /
          2
        : diameterKm
        ? (((diameterKm.estimated_diameter_min ?? 0) +
            (diameterKm.estimated_diameter_max ?? 0)) /
            2) *
          1000
        : 100; // default

      return {
        id: asteroid.id,
        name:
          asteroid.name || asteroid.name_limited || `Asteroid ${asteroid.id}`,
        diameter: Math.round(diameter),
        velocity: parseFloat(
          approach?.relative_velocity?.kilometers_per_second || "20"
        ),
        distance: parseFloat(approach?.miss_distance?.kilometers || "100000"),
        is_hazardous: asteroid.is_potentially_hazardous_asteroid || false,
        approach_date: approach?.close_approach_date,
        magnitude: asteroid.absolute_magnitude_h || 0,
        is_sentry_object: asteroid.is_sentry_object || false,
        raw_data: asteroid,
      };
    };

    switch (action) {
      case "all":
        const allData = limit ? allAsteroids.slice(0, limit) : allAsteroids;
        return NextResponse.json({
          success: true,
          data: allData.map(formatForSimulation),
          count: allData.length,
          total: allAsteroids.length,
        });

      case "hazardous":
        const hazardousFiltered = allAsteroids.filter(
          (a) => a.is_potentially_hazardous_asteroid
        );
        const hazardous = limit
          ? hazardousFiltered.slice(0, limit)
          : hazardousFiltered;
        return NextResponse.json({
          success: true,
          data: hazardous.map(formatForSimulation),
          count: hazardous.length,
        });

      case "today":
        // Filter asteroids with close approach dates
        const today = new Date().toISOString().split("T")[0];
        const todayFiltered = allAsteroids.filter((a) => {
          const approachDate = a.close_approach_data?.[0]?.close_approach_date;
          return approachDate === today;
        });
        const todayAsteroids = limit
          ? todayFiltered.slice(0, limit)
          : todayFiltered;
        return NextResponse.json({
          success: true,
          data: todayAsteroids.map(formatForSimulation),
          count: todayAsteroids.length,
        });

      case "lookup":
        if (!asteroidId) {
          return NextResponse.json(
            { success: false, error: "id parameter is required" },
            { status: 400 }
          );
        }
        const asteroid = allAsteroids.find((a) => a.id === asteroidId);
        if (!asteroid) {
          return NextResponse.json(
            { success: false, error: "Asteroid not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          data: formatForSimulation(asteroid),
        });

      case "search":
        const query = searchParams.get("q")?.toLowerCase();
        if (!query) {
          return NextResponse.json({
            success: true,
            data: [],
            count: 0,
          });
        }
        const searchFiltered = allAsteroids.filter(
          (a) =>
            a.name?.toLowerCase().includes(query) ||
            a.name_limited?.toLowerCase().includes(query) ||
            a.id.includes(query)
        );
        const searchResults = limit
          ? searchFiltered.slice(0, limit)
          : searchFiltered;
        return NextResponse.json({
          success: true,
          data: searchResults.map(formatForSimulation),
          count: searchResults.length,
        });

      default:
        const defaultData = limit ? allAsteroids.slice(0, limit) : allAsteroids;
        return NextResponse.json({
          success: true,
          data: defaultData.map(formatForSimulation),
          count: defaultData.length,
          total: allAsteroids.length,
        });
    }
  } catch (error) {
    console.error("NEO API route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
