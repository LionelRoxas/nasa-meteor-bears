const fs = require('fs');
const path = require('path');

const API_KEY = 'VaddZijr7tkVtctNa37JufAGi3YvgzB2kKobacFb';

async function fetchAndStoreAsteroidData() {
  const dataDir = path.join(__dirname, '..', 'public', 'data');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    console.log('Fetching asteroid data from NASA NEO API...');

    // 1. Get today's close approaches
    const today = new Date().toISOString().split('T')[0];
    console.log(`Fetching data for ${today}...`);

    const todayResponse = await fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&api_key=${API_KEY}`
    );
    const todayData = await todayResponse.json();

    fs.writeFileSync(
      path.join(dataDir, 'today-asteroids.json'),
      JSON.stringify(todayData, null, 2)
    );
    console.log('✅ Saved today-asteroids.json');

    // 2. Get next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    console.log(`Fetching 7-day forecast: ${today} to ${nextWeekStr}...`);

    const weekResponse = await fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${nextWeekStr}&api_key=${API_KEY}`
    );
    const weekData = await weekResponse.json();

    fs.writeFileSync(
      path.join(dataDir, 'week-asteroids.json'),
      JSON.stringify(weekData, null, 2)
    );
    console.log('✅ Saved week-asteroids.json');

    // 3. Browse all asteroids (first 100 pages for comprehensive data)
    console.log('Fetching comprehensive asteroid database...');
    const allAsteroids = [];

    for (let page = 0; page < 5; page++) { // Limiting to 5 pages for now (100 asteroids)
      console.log(`Fetching page ${page + 1}/5...`);

      const browseResponse = await fetch(
        `https://api.nasa.gov/neo/rest/v1/neo/browse?page=${page}&size=20&api_key=${API_KEY}`
      );
      const browseData = await browseResponse.json();

      if (browseData.near_earth_objects) {
        allAsteroids.push(...browseData.near_earth_objects);
      }

      // Don't overwhelm the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    fs.writeFileSync(
      path.join(dataDir, 'all-asteroids.json'),
      JSON.stringify(allAsteroids, null, 2)
    );
    console.log(`✅ Saved all-asteroids.json (${allAsteroids.length} asteroids)`);

    // 4. Get detailed data for potentially hazardous asteroids
    console.log('Filtering potentially hazardous asteroids...');

    const hazardousAsteroids = [];

    // From today's and week's data
    const allNeoData = [...Object.values(todayData.near_earth_objects || {}).flat()];
    if (weekData.near_earth_objects) {
      allNeoData.push(...Object.values(weekData.near_earth_objects).flat());
    }

    const hazardousFromFeed = allNeoData.filter(neo => neo.is_potentially_hazardous_asteroid);
    hazardousAsteroids.push(...hazardousFromFeed);

    // From browsed data
    const hazardousFromBrowse = allAsteroids.filter(neo => neo.is_potentially_hazardous_asteroid);
    hazardousAsteroids.push(...hazardousFromBrowse);

    // Remove duplicates
    const uniqueHazardous = hazardousAsteroids.filter((neo, index, self) =>
      index === self.findIndex(n => n.id === neo.id)
    );

    fs.writeFileSync(
      path.join(dataDir, 'hazardous-asteroids.json'),
      JSON.stringify(uniqueHazardous, null, 2)
    );
    console.log(`✅ Saved hazardous-asteroids.json (${uniqueHazardous.length} hazardous asteroids)`);

    // 5. Create processed simulation data
    console.log('Processing data for simulation...');

    const processAsteroidForSimulation = (neo) => {
      const approach = neo.close_approach_data?.[0];
      const diameter = neo.estimated_diameter?.meters ?
        (neo.estimated_diameter.meters.estimated_diameter_min +
         neo.estimated_diameter.meters.estimated_diameter_max) / 2 : 100;

      return {
        id: neo.id,
        name: neo.name,
        diameter: Math.round(diameter),
        velocity: approach ? parseFloat(approach.relative_velocity.kilometers_per_second) : 20,
        distance: approach ? parseFloat(approach.miss_distance.kilometers) : 100000,
        is_hazardous: neo.is_potentially_hazardous_asteroid || false,
        approach_date: approach?.close_approach_date,
        magnitude: neo.absolute_magnitude_h,
        nasa_url: neo.nasa_jpl_url,
        is_sentry_object: neo.is_sentry_object || false,
        sentry_data: neo.sentry_data,
        raw_data: neo // Keep full NASA data for reference
      };
    };

    const simulationData = {
      today: allNeoData.map(processAsteroidForSimulation),
      hazardous: uniqueHazardous.map(processAsteroidForSimulation),
      all: allAsteroids.slice(0, 50).map(processAsteroidForSimulation), // First 50 for performance
      last_updated: new Date().toISOString(),
      data_source: 'NASA NEO API',
      api_endpoint: 'https://api.nasa.gov/neo/rest/v1/'
    };

    fs.writeFileSync(
      path.join(dataDir, 'simulation-data.json'),
      JSON.stringify(simulationData, null, 2)
    );
    console.log('✅ Saved simulation-data.json');

    // 6. Create summary statistics
    const summary = {
      last_updated: new Date().toISOString(),
      total_asteroids_tracked: allAsteroids.length,
      hazardous_asteroids: uniqueHazardous.length,
      todays_approaches: allNeoData.length,
      largest_asteroid: {
        name: allAsteroids.reduce((max, neo) => {
          const maxDiameter = neo.estimated_diameter?.meters?.estimated_diameter_max || 0;
          const currentMax = max.estimated_diameter?.meters?.estimated_diameter_max || 0;
          return maxDiameter > currentMax ? neo : max;
        }, {}).name || 'Unknown',
        diameter: Math.max(...allAsteroids.map(neo =>
          neo.estimated_diameter?.meters?.estimated_diameter_max || 0
        ))
      },
      closest_approach: {
        name: allNeoData.reduce((closest, neo) => {
          const distance = parseFloat(neo.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity);
          const closestDistance = parseFloat(closest.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity);
          return distance < closestDistance ? neo : closest;
        }, {}).name || 'Unknown',
        distance: Math.min(...allNeoData.map(neo =>
          parseFloat(neo.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity)
        ))
      }
    };

    fs.writeFileSync(
      path.join(dataDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log('✅ Saved summary.json');

    console.log('\n🎉 All asteroid data fetched and saved successfully!');
    console.log(`📁 Data saved to: ${dataDir}`);
    console.log(`📊 Summary: ${summary.total_asteroids_tracked} total, ${summary.hazardous_asteroids} hazardous, ${summary.todays_approaches} today`);

  } catch (error) {
    console.error('❌ Error fetching asteroid data:', error);
  }
}

// Run the script
fetchAndStoreAsteroidData();