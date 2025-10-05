const fs = require('fs').promises;
const path = require('path');

// NASA NEO API configuration
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const NASA_API_URL = 'https://api.nasa.gov/neo/rest/v1';

// Delay between API calls to respect rate limits
const API_DELAY = NASA_API_KEY === 'DEMO_KEY' ? 2000 : 500; // 2s for demo, 0.5s for real key

// Track unique asteroids
const uniqueAsteroids = new Map(); // Using ID as key to prevent duplicates
const approachEvents = []; // Store all approach events separately

// Statistics
const stats = {
  totalApiCalls: 0,
  totalAsteroidsFound: 0,
  duplicatesSkipped: 0,
  dateRangesFetched: [],
  startTime: Date.now()
};

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch data from NASA API
async function fetchNASAData(startDate, endDate) {
  const url = `${NASA_API_URL}/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;

  try {
    console.log(`📡 Fetching: ${startDate} to ${endDate}`);
    const response = await fetch(url);

    if (response.status === 429) {
      console.log('⚠️ Rate limit hit, waiting 60 seconds...');
      await sleep(60000);
      return fetchNASAData(startDate, endDate); // Retry
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    stats.totalApiCalls++;
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${startDate} to ${endDate}:`, error.message);
    return null;
  }
}

// Process asteroid data and deduplicate
function processAsteroidData(rawData, dateRange) {
  if (!rawData || !rawData.near_earth_objects) return;

  let newAsteroids = 0;
  let duplicates = 0;

  // Process each date in the response
  Object.entries(rawData.near_earth_objects).forEach(([date, asteroids]) => {
    asteroids.forEach(asteroid => {
      const asteroidId = asteroid.id;

      // Store approach event
      asteroid.close_approach_data.forEach(approach => {
        approachEvents.push({
          asteroid_id: asteroidId,
          asteroid_name: asteroid.name,
          approach_date: approach.close_approach_date,
          approach_date_full: approach.close_approach_date_full,
          velocity_km_s: parseFloat(approach.relative_velocity.kilometers_per_second),
          distance_km: parseFloat(approach.miss_distance.kilometers),
          is_hazardous: asteroid.is_potentially_hazardous_asteroid
        });
      });

      // Check if we already have this asteroid
      if (uniqueAsteroids.has(asteroidId)) {
        duplicates++;
        // Update if we have more complete data
        const existing = uniqueAsteroids.get(asteroidId);
        if (!existing.orbital_data && asteroid.orbital_data) {
          uniqueAsteroids.set(asteroidId, processUniqueAsteroid(asteroid));
        }
      } else {
        // New unique asteroid
        uniqueAsteroids.set(asteroidId, processUniqueAsteroid(asteroid));
        newAsteroids++;
      }
    });
  });

  stats.totalAsteroidsFound += newAsteroids;
  stats.duplicatesSkipped += duplicates;

  console.log(`   ✓ Found ${newAsteroids} new unique asteroids (${duplicates} duplicates skipped)`);
  console.log(`   📊 Total unique asteroids: ${uniqueAsteroids.size}`);
}

// Process and structure unique asteroid data
function processUniqueAsteroid(asteroid) {
  // Get diameter (averaging min and max estimates)
  const diameter = asteroid.estimated_diameter.meters
    ? (asteroid.estimated_diameter.meters.estimated_diameter_min +
       asteroid.estimated_diameter.meters.estimated_diameter_max) / 2
    : 100; // Default if missing

  // Get the most recent close approach data
  const approaches = asteroid.close_approach_data || [];
  const latestApproach = approaches[0] || {};

  return {
    id: asteroid.id,
    name: asteroid.name,
    nasa_jpl_url: asteroid.nasa_jpl_url,
    absolute_magnitude_h: asteroid.absolute_magnitude_h,
    diameter_meters: diameter,
    diameter_km: diameter / 1000,
    is_hazardous: asteroid.is_potentially_hazardous_asteroid,
    is_sentry_object: asteroid.is_sentry_object || false,

    // Orbital characteristics
    orbital_data: asteroid.orbital_data ? {
      orbit_id: asteroid.orbital_data.orbit_id,
      orbit_determination_date: asteroid.orbital_data.orbit_determination_date,
      first_observation_date: asteroid.orbital_data.first_observation_date,
      last_observation_date: asteroid.orbital_data.last_observation_date,
      observations_used: asteroid.orbital_data.observations_used,
      orbit_uncertainty: asteroid.orbital_data.orbit_uncertainty,
      minimum_orbit_intersection: asteroid.orbital_data.minimum_orbit_intersection,
      jupiter_tisserand_invariant: asteroid.orbital_data.jupiter_tisserand_invariant,
      epoch_osculation: asteroid.orbital_data.epoch_osculation,
      eccentricity: asteroid.orbital_data.eccentricity,
      semi_major_axis: asteroid.orbital_data.semi_major_axis,
      inclination: asteroid.orbital_data.inclination,
      ascending_node_longitude: asteroid.orbital_data.ascending_node_longitude,
      orbital_period: asteroid.orbital_data.orbital_period,
      perihelion_distance: asteroid.orbital_data.perihelion_distance,
      perihelion_argument: asteroid.orbital_data.perihelion_argument,
      aphelion_distance: asteroid.orbital_data.aphelion_distance,
      perihelion_time: asteroid.orbital_data.perihelion_time,
      mean_anomaly: asteroid.orbital_data.mean_anomaly,
      mean_motion: asteroid.orbital_data.mean_motion,
      equinox: asteroid.orbital_data.equinox,
      orbit_class: asteroid.orbital_data.orbit_class
    } : null,

    // Latest approach data for reference
    latest_approach: latestApproach ? {
      date: latestApproach.close_approach_date,
      velocity_km_s: parseFloat(latestApproach.relative_velocity?.kilometers_per_second || 0),
      distance_km: parseFloat(latestApproach.miss_distance?.kilometers || 0)
    } : null,

    // Number of recorded approaches
    total_approaches: approaches.length
  };
}

// Generate date ranges for batch fetching
function generateDateRanges() {
  const ranges = [];
  const today = new Date();

  // 1. Fetch current week (today to 7 days ahead)
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  ranges.push({
    start: formatDate(today),
    end: formatDate(weekEnd),
    description: 'Current week'
  });

  // 2. Fetch past month in weekly chunks
  for (let i = 1; i <= 4; i++) {
    const start = new Date(today);
    start.setDate(start.getDate() - (i * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    ranges.push({
      start: formatDate(start),
      end: formatDate(end),
      description: `Past week ${i}`
    });
  }

  // 3. Fetch future month in weekly chunks
  for (let i = 1; i <= 4; i++) {
    const start = new Date(today);
    start.setDate(start.getDate() + (i * 7) + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    ranges.push({
      start: formatDate(start),
      end: formatDate(end),
      description: `Future week ${i}`
    });
  }

  // 4. Add some historical data (random weeks from past year)
  for (let i = 0; i < 10; i++) {
    const daysAgo = 60 + (i * 30); // Every month going back
    const start = new Date(today);
    start.setDate(start.getDate() - daysAgo);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    ranges.push({
      start: formatDate(start),
      end: formatDate(end),
      description: `Historical week ${i + 1}`
    });
  }

  return ranges;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Calculate ML-relevant features
function calculateMLFeatures(asteroid) {
  if (!asteroid.latest_approach) return null;

  const diameter = asteroid.diameter_meters;
  const velocity = asteroid.latest_approach.velocity_km_s * 1000; // m/s
  const distance = asteroid.latest_approach.distance_km * 1000; // m

  // Calculate kinetic energy (if it were to impact)
  const volume = (4/3) * Math.PI * Math.pow(diameter/2, 3);
  const mass = volume * 3000; // Assuming 3000 kg/m³ density
  const kineticEnergy = 0.5 * mass * velocity * velocity; // Joules
  const energyMT = kineticEnergy / 4.184e15; // Megatons TNT

  // Calculate approach parameter (how close relative to Earth's radius)
  const earthRadius = 6371000; // meters
  const approachParameter = distance / earthRadius;

  // Calculate gravitational influence factor
  const gravityFactor = earthRadius / distance;

  return {
    asteroid_id: asteroid.id,
    diameter_m: diameter,
    velocity_km_s: asteroid.latest_approach.velocity_km_s,
    distance_km: asteroid.latest_approach.distance_km,
    kinetic_energy_mt: energyMT,
    is_hazardous: asteroid.is_hazardous,
    absolute_magnitude: asteroid.absolute_magnitude_h,
    approach_parameter: approachParameter,
    gravity_influence: gravityFactor,
    orbit_uncertainty: asteroid.orbital_data?.orbit_uncertainty || 9,
    moid: parseFloat(asteroid.orbital_data?.minimum_orbit_intersection || 1),
    inclination: parseFloat(asteroid.orbital_data?.inclination || 0),
    eccentricity: parseFloat(asteroid.orbital_data?.eccentricity || 0)
  };
}

// Main execution
async function main() {
  console.log('🚀 NASA Asteroid Comprehensive Data Fetcher');
  console.log('==========================================\n');
  console.log(`📋 API Key: ${NASA_API_KEY === 'DEMO_KEY' ? 'Demo (Limited)' : 'Full Access'}`);
  console.log(`⏱️ Delay between calls: ${API_DELAY}ms\n`);

  // Generate date ranges for fetching
  const dateRanges = generateDateRanges();
  console.log(`📅 Will fetch ${dateRanges.length} date ranges\n`);

  // Fetch data for each date range
  for (const range of dateRanges) {
    console.log(`\n🔍 Fetching ${range.description}: ${range.start} to ${range.end}`);

    const data = await fetchNASAData(range.start, range.end);
    if (data) {
      processAsteroidData(data, range);
      stats.dateRangesFetched.push(range);
    }

    // Rate limiting
    await sleep(API_DELAY);

    // Stop if we have enough data (especially for DEMO_KEY)
    if (NASA_API_KEY === 'DEMO_KEY' && stats.totalApiCalls >= 10) {
      console.log('\n⚠️ Demo key limit approaching, stopping fetch...');
      break;
    }
  }

  // Convert Map to Array for JSON serialization
  const asteroidsArray = Array.from(uniqueAsteroids.values());

  // Sort by various criteria
  const hazardousAsteroids = asteroidsArray.filter(a => a.is_hazardous);
  const largeAsteroids = asteroidsArray.filter(a => a.diameter_meters > 500);
  const closeApproaches = asteroidsArray.filter(a =>
    a.latest_approach && a.latest_approach.distance_km < 1000000
  );

  // Prepare ML training data
  const mlFeatures = asteroidsArray
    .map(calculateMLFeatures)
    .filter(f => f !== null);

  // Create comprehensive dataset
  const comprehensiveData = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_unique_asteroids: uniqueAsteroids.size,
      total_approach_events: approachEvents.length,
      hazardous_count: hazardousAsteroids.length,
      large_asteroids_count: largeAsteroids.length,
      close_approaches_count: closeApproaches.length,
      api_calls_made: stats.totalApiCalls,
      duplicates_removed: stats.duplicatesSkipped,
      date_ranges_fetched: stats.dateRangesFetched,
      fetch_duration_seconds: (Date.now() - stats.startTime) / 1000
    },
    asteroids: asteroidsArray,
    hazardous_asteroids: hazardousAsteroids,
    large_asteroids: largeAsteroids,
    close_approaches: closeApproaches,
    approach_events: approachEvents,
    ml_features: mlFeatures
  };

  // Save to files
  const dataDir = path.join(process.cwd(), 'public', 'data');
  await fs.mkdir(dataDir, { recursive: true });

  // Save comprehensive dataset
  await fs.writeFile(
    path.join(dataDir, 'comprehensive-asteroids.json'),
    JSON.stringify(comprehensiveData, null, 2)
  );

  // Save ML-ready dataset
  await fs.writeFile(
    path.join(dataDir, 'ml-training-data.json'),
    JSON.stringify({
      features: mlFeatures,
      metadata: {
        total_samples: mlFeatures.length,
        hazardous_samples: mlFeatures.filter(f => f.is_hazardous).length,
        feature_names: Object.keys(mlFeatures[0] || {}),
        generated_at: new Date().toISOString()
      }
    }, null, 2)
  );

  // Save summary
  const summary = {
    last_updated: new Date().toISOString(),
    unique_asteroids: uniqueAsteroids.size,
    hazardous_asteroids: hazardousAsteroids.length,
    approach_events: approachEvents.length,
    largest_asteroid: asteroidsArray.reduce((max, a) =>
      a.diameter_meters > (max?.diameter_meters || 0) ? a : max, null),
    most_hazardous: hazardousAsteroids[0],
    closest_approach: asteroidsArray.reduce((min, a) =>
      (a.latest_approach?.distance_km || Infinity) < (min?.latest_approach?.distance_km || Infinity) ? a : min, null),
    fetch_stats: stats
  };

  await fs.writeFile(
    path.join(dataDir, 'asteroid-fetch-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // Print results
  console.log('\n========================================');
  console.log('📊 Final Results:');
  console.log(`✅ Unique asteroids collected: ${uniqueAsteroids.size}`);
  console.log(`⚠️ Hazardous asteroids: ${hazardousAsteroids.length}`);
  console.log(`🎯 Close approaches: ${closeApproaches.length}`);
  console.log(`📡 Total API calls: ${stats.totalApiCalls}`);
  console.log(`🔄 Duplicates removed: ${stats.duplicatesSkipped}`);
  console.log(`⏱️ Time taken: ${((Date.now() - stats.startTime) / 1000).toFixed(1)} seconds`);

  console.log('\n📁 Files saved:');
  console.log('  - comprehensive-asteroids.json (all data)');
  console.log('  - ml-training-data.json (ML features)');
  console.log('  - asteroid-fetch-summary.json (summary)');

  if (NASA_API_KEY === 'DEMO_KEY') {
    console.log('\n💡 Tip: Set NASA_API_KEY environment variable for more data!');
    console.log('   Get your free key at: https://api.nasa.gov/');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});