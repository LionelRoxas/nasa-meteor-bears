const fs = require('fs').promises;
const path = require('path');

// USGS Earthquake API endpoints
const USGS_BASE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';

// Different time periods and magnitudes available
const EARTHQUAKE_FEEDS = {
  // Significant earthquakes in the past 30 days
  significant_month: `${USGS_BASE_URL}/significant_month.geojson`,

  // All M4.5+ earthquakes in the past 30 days
  m45_month: `${USGS_BASE_URL}/4.5_month.geojson`,

  // All M2.5+ earthquakes in the past 30 days
  m25_month: `${USGS_BASE_URL}/2.5_month.geojson`,

  // All earthquakes in the past 7 days
  all_week: `${USGS_BASE_URL}/all_week.geojson`,

  // M4.5+ in past 7 days
  m45_week: `${USGS_BASE_URL}/4.5_week.geojson`,

  // Today's earthquakes
  all_day: `${USGS_BASE_URL}/all_day.geojson`,
};

// USGS API for searching historical earthquakes
const USGS_SEARCH_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

async function fetchJSON(url) {
  try {
    console.log(`Fetching from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error.message);
    return null;
  }
}

// Fetch current earthquake data
async function fetchCurrentEarthquakes() {
  console.log('\n📊 Fetching current earthquake data from USGS...\n');

  const earthquakeData = {
    significant_recent: null,
    major_earthquakes: null,
    weekly_activity: null,
    daily_activity: null,
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'USGS Earthquake Hazards Program',
      api_endpoints: EARTHQUAKE_FEEDS
    }
  };

  // Fetch significant earthquakes (past 30 days)
  console.log('Fetching significant earthquakes...');
  const significantData = await fetchJSON(EARTHQUAKE_FEEDS.significant_month);
  if (significantData) {
    earthquakeData.significant_recent = processEarthquakeData(significantData);
    console.log(`✓ Found ${significantData.features.length} significant earthquakes`);
  }

  // Fetch M4.5+ earthquakes (past week)
  console.log('Fetching major earthquakes (M4.5+)...');
  const majorData = await fetchJSON(EARTHQUAKE_FEEDS.m45_week);
  if (majorData) {
    earthquakeData.major_earthquakes = processEarthquakeData(majorData);
    console.log(`✓ Found ${majorData.features.length} M4.5+ earthquakes this week`);
  }

  // Fetch all weekly activity
  console.log('Fetching weekly earthquake activity...');
  const weeklyData = await fetchJSON(EARTHQUAKE_FEEDS.all_week);
  if (weeklyData) {
    earthquakeData.weekly_activity = processEarthquakeData(weeklyData);
    console.log(`✓ Found ${weeklyData.features.length} total earthquakes this week`);
  }

  // Fetch today's earthquakes
  console.log('Fetching today\'s earthquakes...');
  const dailyData = await fetchJSON(EARTHQUAKE_FEEDS.all_day);
  if (dailyData) {
    earthquakeData.daily_activity = processEarthquakeData(dailyData);
    console.log(`✓ Found ${dailyData.features.length} earthquakes today`);
  }

  return earthquakeData;
}

// Fetch historical major earthquakes for comparison
async function fetchHistoricalEarthquakes() {
  console.log('\n📚 Fetching historical earthquake data...\n');

  // Query parameters for historical data
  const params = new URLSearchParams({
    format: 'geojson',
    starttime: '2000-01-01',
    endtime: new Date().toISOString().split('T')[0],
    minmagnitude: '7.0',
    orderby: 'magnitude',
    limit: '100'
  });

  const url = `${USGS_SEARCH_API}?${params}`;
  const historicalData = await fetchJSON(url);

  if (historicalData) {
    console.log(`✓ Found ${historicalData.features.length} major historical earthquakes (M7.0+)`);
    return processEarthquakeData(historicalData);
  }

  return null;
}

// Process GeoJSON earthquake data into our format
function processEarthquakeData(geojsonData) {
  if (!geojsonData || !geojsonData.features) return null;

  const processed = {
    earthquakes: [],
    summary: {
      total: geojsonData.features.length,
      max_magnitude: 0,
      min_magnitude: 10,
      avg_magnitude: 0,
      depth_range: { min: 1000, max: 0 },
      regions_affected: new Set()
    }
  };

  let magnitudeSum = 0;

  geojsonData.features.forEach(feature => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    const earthquake = {
      id: feature.id,
      magnitude: props.mag,
      location: props.place,
      time: new Date(props.time).toISOString(),
      coordinates: {
        longitude: coords[0],
        latitude: coords[1],
        depth: coords[2] // in km
      },
      tsunami_warning: props.tsunami === 1,
      felt_reports: props.felt || 0,
      damage_alert: props.alert || 'none',
      significance: props.sig,
      magnitude_type: props.magType,
      url: props.url,
      detail_url: props.detail,
      // Calculate energy release (approximation)
      energy_joules: Math.pow(10, 4.8 + 1.5 * props.mag),
      // Convert to megatons TNT equivalent
      energy_mt: Math.pow(10, 4.8 + 1.5 * props.mag) / 4.184e15
    };

    processed.earthquakes.push(earthquake);

    // Update summary statistics
    magnitudeSum += props.mag;
    processed.summary.max_magnitude = Math.max(processed.summary.max_magnitude, props.mag);
    processed.summary.min_magnitude = Math.min(processed.summary.min_magnitude, props.mag);
    processed.summary.depth_range.min = Math.min(processed.summary.depth_range.min, coords[2]);
    processed.summary.depth_range.max = Math.max(processed.summary.depth_range.max, coords[2]);

    // Extract region from location string
    if (props.place) {
      const region = props.place.split(',').pop()?.trim();
      if (region) processed.summary.regions_affected.add(region);
    }
  });

  processed.summary.avg_magnitude = magnitudeSum / processed.earthquakes.length;
  processed.summary.regions_affected = Array.from(processed.summary.regions_affected);

  // Sort by magnitude (largest first)
  processed.earthquakes.sort((a, b) => b.magnitude - a.magnitude);

  return processed;
}

// Compare earthquake energy to asteroid impacts
function createComparisonData(earthquakeData) {
  console.log('\n🔄 Creating earthquake-asteroid comparison data...\n');

  const comparisons = {
    energy_scale: {
      // Reference impacts for comparison
      tunguska_1908: {
        name: 'Tunguska Event (1908)',
        energy_mt: 15,
        equivalent_magnitude: 7.8,
        description: 'Largest impact in recorded history'
      },
      chelyabinsk_2013: {
        name: 'Chelyabinsk Meteor (2013)',
        energy_mt: 0.5,
        equivalent_magnitude: 6.2,
        description: 'Modern airburst event'
      },
      chicxulub: {
        name: 'Chicxulub Impact (66 MYA)',
        energy_mt: 100000000,
        equivalent_magnitude: 12.5,
        description: 'Dinosaur extinction event'
      }
    },
    earthquake_comparisons: []
  };

  // Add major earthquakes for comparison
  if (earthquakeData && earthquakeData.earthquakes) {
    earthquakeData.earthquakes.slice(0, 10).forEach(eq => {
      comparisons.earthquake_comparisons.push({
        location: eq.location,
        magnitude: eq.magnitude,
        energy_mt: eq.energy_mt,
        date: eq.time,
        asteroid_equivalent_diameter: Math.cbrt(eq.energy_mt * 4.184e15 / (0.5 * 3000 * Math.pow(20000, 2))) * 2,
        description: `Would require a ${Math.round(Math.cbrt(eq.energy_mt * 4.184e15 / (0.5 * 3000 * Math.pow(20000, 2))) * 2)}m asteroid at 20 km/s`
      });
    });
  }

  return comparisons;
}

// Main function
async function main() {
  console.log('🌍 USGS Geographic & Seismic Data Fetcher');
  console.log('=========================================\n');

  try {
    // Fetch all earthquake data
    const currentEarthquakes = await fetchCurrentEarthquakes();
    const historicalEarthquakes = await fetchHistoricalEarthquakes();

    // Create comparison data
    const comparisons = createComparisonData(historicalEarthquakes);

    // Combine all data
    const fullDataset = {
      current: currentEarthquakes,
      historical: historicalEarthquakes,
      comparisons: comparisons,
      metadata: {
        generated_at: new Date().toISOString(),
        data_sources: [
          'USGS Earthquake Hazards Program',
          'USGS Earthquake Catalog API'
        ],
        notes: 'Energy calculations use standard magnitude-energy relationship: log10(E) = 4.8 + 1.5M'
      }
    };

    // Create summaries for display
    const summary = {
      last_updated: new Date().toISOString(),
      earthquakes_today: currentEarthquakes.daily_activity?.summary.total || 0,
      earthquakes_this_week: currentEarthquakes.weekly_activity?.summary.total || 0,
      significant_events: currentEarthquakes.significant_recent?.summary.total || 0,
      largest_this_week: currentEarthquakes.weekly_activity?.earthquakes[0] || null,
      largest_historical: historicalEarthquakes?.earthquakes[0] || null
    };

    // Save to public/data directory
    const dataDir = path.join(process.cwd(), 'public', 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Save full earthquake dataset
    await fs.writeFile(
      path.join(dataDir, 'earthquake-data.json'),
      JSON.stringify(fullDataset, null, 2)
    );
    console.log('\n✓ Saved earthquake data to public/data/earthquake-data.json');

    // Save summary
    await fs.writeFile(
      path.join(dataDir, 'earthquake-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log('✓ Saved summary to public/data/earthquake-summary.json');

    // Print summary
    console.log('\n📊 Data Summary:');
    console.log('================');
    console.log(`Total earthquakes today: ${summary.earthquakes_today}`);
    console.log(`Total earthquakes this week: ${summary.earthquakes_this_week}`);
    console.log(`Significant events (30 days): ${summary.significant_events}`);

    if (summary.largest_this_week) {
      console.log(`\nLargest this week: M${summary.largest_this_week.magnitude} - ${summary.largest_this_week.location}`);
    }

    if (summary.largest_historical) {
      console.log(`Largest since 2000: M${summary.largest_historical.magnitude} - ${summary.largest_historical.location}`);
    }

    console.log('\n✅ Geographic data fetch complete!');

  } catch (error) {
    console.error('\n❌ Error fetching geographic data:', error);
    process.exit(1);
  }
}

// Run the script
main();