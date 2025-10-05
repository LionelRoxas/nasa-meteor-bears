const fs = require('fs').promises;
const path = require('path');

// Function to escape CSV fields
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = field.toString();
  // If field contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Convert earthquake data to CSV
async function convertToCSV() {
  console.log('📊 Converting Earthquake Data to CSV');
  console.log('=====================================\n');

  try {
    // Load earthquake data
    const dataPath = path.join(process.cwd(), 'public', 'data', 'earthquake-data.json');
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));

    // 1. Convert current week earthquakes to CSV
    if (data.current?.weekly_activity?.earthquakes) {
      const weeklyEarthquakes = data.current.weekly_activity.earthquakes;

      // Define CSV headers
      const headers = [
        'id',
        'magnitude',
        'location',
        'time',
        'latitude',
        'longitude',
        'depth_km',
        'tsunami_warning',
        'felt_reports',
        'damage_alert',
        'significance',
        'magnitude_type',
        'energy_joules',
        'energy_mt',
        'url'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      weeklyEarthquakes.forEach(eq => {
        const row = [
          escapeCSV(eq.id),
          escapeCSV(eq.magnitude),
          escapeCSV(eq.location),
          escapeCSV(eq.time),
          escapeCSV(eq.coordinates.latitude),
          escapeCSV(eq.coordinates.longitude),
          escapeCSV(eq.coordinates.depth),
          escapeCSV(eq.tsunami_warning),
          escapeCSV(eq.felt_reports),
          escapeCSV(eq.damage_alert),
          escapeCSV(eq.significance),
          escapeCSV(eq.magnitude_type),
          escapeCSV(eq.energy_joules),
          escapeCSV(eq.energy_mt),
          escapeCSV(eq.url)
        ];
        csvContent += row.join(',') + '\n';
      });

      // Save weekly earthquakes CSV
      const weeklyPath = path.join(process.cwd(), 'public', 'data', 'earthquakes_weekly.csv');
      await fs.writeFile(weeklyPath, csvContent);
      console.log(`✅ Weekly earthquakes CSV saved: ${weeklyEarthquakes.length} records`);
      console.log(`   File: earthquakes_weekly.csv`);
    }

    // 2. Convert historical major earthquakes to CSV
    if (data.historical?.earthquakes) {
      const historicalEarthquakes = data.historical.earthquakes;

      // Define CSV headers
      const headers = [
        'id',
        'magnitude',
        'location',
        'date',
        'year',
        'latitude',
        'longitude',
        'depth_km',
        'tsunami_warning',
        'felt_reports',
        'damage_alert',
        'significance',
        'magnitude_type',
        'energy_joules',
        'energy_mt',
        'equivalent_asteroid_diameter_m',
        'url'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      historicalEarthquakes.forEach(eq => {
        const date = new Date(eq.time);
        // Calculate equivalent asteroid diameter
        const velocity = 20000; // m/s (typical asteroid velocity)
        const density = 3000; // kg/m³
        const mass = (2 * eq.energy_joules) / (velocity * velocity);
        const volume = mass / density;
        const radius = Math.cbrt((3 * volume) / (4 * Math.PI));
        const diameter = radius * 2;

        const row = [
          escapeCSV(eq.id),
          escapeCSV(eq.magnitude),
          escapeCSV(eq.location),
          escapeCSV(date.toISOString().split('T')[0]),
          escapeCSV(date.getFullYear()),
          escapeCSV(eq.coordinates.latitude),
          escapeCSV(eq.coordinates.longitude),
          escapeCSV(eq.coordinates.depth),
          escapeCSV(eq.tsunami_warning),
          escapeCSV(eq.felt_reports || 0),
          escapeCSV(eq.damage_alert),
          escapeCSV(eq.significance),
          escapeCSV(eq.magnitude_type),
          escapeCSV(eq.energy_joules),
          escapeCSV(eq.energy_mt),
          escapeCSV(diameter.toFixed(2)),
          escapeCSV(eq.url)
        ];
        csvContent += row.join(',') + '\n';
      });

      // Save historical earthquakes CSV
      const historicalPath = path.join(process.cwd(), 'public', 'data', 'earthquakes_historical_major.csv');
      await fs.writeFile(historicalPath, csvContent);
      console.log(`✅ Historical major earthquakes CSV saved: ${historicalEarthquakes.length} records`);
      console.log(`   File: earthquakes_historical_major.csv`);
    }

    // 3. Convert significant recent earthquakes to CSV
    if (data.current?.significant_recent?.earthquakes) {
      const significantEarthquakes = data.current.significant_recent.earthquakes;

      // Define CSV headers
      const headers = [
        'id',
        'magnitude',
        'location',
        'time',
        'latitude',
        'longitude',
        'depth_km',
        'tsunami_warning',
        'felt_reports',
        'damage_alert',
        'significance',
        'magnitude_type',
        'energy_mt',
        'impact_comparison'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      significantEarthquakes.forEach(eq => {
        // Determine impact comparison
        let impact = '';
        if (eq.energy_mt < 0.001) impact = 'Small meteorite';
        else if (eq.energy_mt < 0.01) impact = 'Fireball event';
        else if (eq.energy_mt < 0.1) impact = 'Small airburst';
        else if (eq.energy_mt < 1) impact = 'Chelyabinsk-class';
        else if (eq.energy_mt < 10) impact = 'Regional impact';
        else if (eq.energy_mt < 100) impact = 'Tunguska-class';
        else if (eq.energy_mt < 1000) impact = 'Major regional';
        else impact = 'Continental-scale';

        const row = [
          escapeCSV(eq.id),
          escapeCSV(eq.magnitude),
          escapeCSV(eq.location),
          escapeCSV(eq.time),
          escapeCSV(eq.coordinates.latitude),
          escapeCSV(eq.coordinates.longitude),
          escapeCSV(eq.coordinates.depth),
          escapeCSV(eq.tsunami_warning),
          escapeCSV(eq.felt_reports),
          escapeCSV(eq.damage_alert),
          escapeCSV(eq.significance),
          escapeCSV(eq.magnitude_type),
          escapeCSV(eq.energy_mt),
          escapeCSV(impact)
        ];
        csvContent += row.join(',') + '\n';
      });

      // Save significant earthquakes CSV
      const significantPath = path.join(process.cwd(), 'public', 'data', 'earthquakes_significant_30days.csv');
      await fs.writeFile(significantPath, csvContent);
      console.log(`✅ Significant earthquakes (30 days) CSV saved: ${significantEarthquakes.length} records`);
      console.log(`   File: earthquakes_significant_30days.csv`);
    }

    // 4. Create earthquake-asteroid comparison CSV
    if (data.comparisons?.earthquake_comparisons) {
      const comparisons = data.comparisons.earthquake_comparisons;

      // Define CSV headers
      const headers = [
        'location',
        'magnitude',
        'date',
        'energy_mt',
        'equivalent_asteroid_diameter_m',
        'description'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      comparisons.forEach(comp => {
        const row = [
          escapeCSV(comp.location),
          escapeCSV(comp.magnitude),
          escapeCSV(comp.date.split('T')[0]),
          escapeCSV(comp.energy_mt),
          escapeCSV(comp.asteroid_equivalent_diameter.toFixed(2)),
          escapeCSV(comp.description)
        ];
        csvContent += row.join(',') + '\n';
      });

      // Save comparisons CSV
      const comparisonsPath = path.join(process.cwd(), 'public', 'data', 'earthquake_asteroid_comparisons.csv');
      await fs.writeFile(comparisonsPath, csvContent);
      console.log(`✅ Earthquake-Asteroid comparisons CSV saved: ${comparisons.length} records`);
      console.log(`   File: earthquake_asteroid_comparisons.csv`);
    }

    // 5. Create summary statistics CSV
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Earthquakes This Week', data.current?.weekly_activity?.summary.total || 0],
      ['Total Earthquakes Today', data.current?.daily_activity?.summary.total || 0],
      ['Significant Events (30 days)', data.current?.significant_recent?.summary.total || 0],
      ['Major Earthquakes This Week (M4.5+)', data.current?.major_earthquakes?.summary.total || 0],
      ['Average Magnitude This Week', (data.current?.weekly_activity?.summary.avg_magnitude || 0).toFixed(2)],
      ['Max Magnitude This Week', data.current?.weekly_activity?.summary.max_magnitude || 0],
      ['Min Depth (km)', data.current?.weekly_activity?.summary.depth_range?.min || 0],
      ['Max Depth (km)', data.current?.weekly_activity?.summary.depth_range?.max || 0],
      ['Regions Affected', (data.current?.weekly_activity?.summary.regions_affected || []).length]
    ];

    let summaryCSV = summaryData.map(row => row.join(',')).join('\n');
    const summaryPath = path.join(process.cwd(), 'public', 'data', 'earthquake_summary_stats.csv');
    await fs.writeFile(summaryPath, summaryCSV);
    console.log(`✅ Summary statistics CSV saved`);
    console.log(`   File: earthquake_summary_stats.csv`);

    console.log('\n📁 All CSV files created successfully in public/data/');
    console.log('=====================================');
    console.log('Files created:');
    console.log('1. earthquakes_weekly.csv - All earthquakes from past week');
    console.log('2. earthquakes_historical_major.csv - Major earthquakes (M7.0+) since 2000');
    console.log('3. earthquakes_significant_30days.csv - Significant events from past 30 days');
    console.log('4. earthquake_asteroid_comparisons.csv - Energy comparisons');
    console.log('5. earthquake_summary_stats.csv - Summary statistics');

  } catch (error) {
    console.error('Error converting data:', error);
  }
}

// Run the conversion
convertToCSV();