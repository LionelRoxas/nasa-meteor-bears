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

// Convert asteroid data to CSV
async function convertAsteroidsToCSV() {
  console.log('🚀 Converting Asteroid Data to CSV');
  console.log('=====================================\n');

  try {
    // Load comprehensive asteroid data
    const dataPath = path.join(process.cwd(), 'public', 'data', 'comprehensive-asteroids.json');
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));

    // 1. Convert ALL asteroids to comprehensive CSV
    if (data.asteroids) {
      const asteroids = data.asteroids;
      console.log(`Processing ${asteroids.length} unique asteroids...`);

      // Define comprehensive CSV headers
      const headers = [
        'id',
        'name',
        'diameter_meters',
        'diameter_km',
        'is_hazardous',
        'is_sentry_object',
        'absolute_magnitude_h',
        'latest_approach_date',
        'latest_velocity_km_s',
        'latest_distance_km',
        'total_approaches',
        'nasa_jpl_url',
        // Orbital parameters
        'orbit_id',
        'orbit_uncertainty',
        'minimum_orbit_intersection',
        'eccentricity',
        'semi_major_axis',
        'inclination',
        'orbital_period',
        'perihelion_distance',
        'aphelion_distance',
        'mean_anomaly',
        'mean_motion',
        'orbit_class_type',
        'orbit_class_description',
        'orbit_class_range',
        // Calculated fields
        'estimated_mass_kg',
        'kinetic_energy_mt',
        'potential_crater_km',
        'threat_category'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      asteroids.forEach(asteroid => {
        // Calculate mass and energy
        const diameter = asteroid.diameter_meters || 100;
        const volume = (4/3) * Math.PI * Math.pow(diameter/2, 3);
        const mass = volume * 3000; // Assuming 3000 kg/m³ density

        // Calculate potential impact energy if we have velocity
        let kineticEnergyMT = 0;
        let craterSize = 0;
        let threatCategory = 'UNKNOWN';

        if (asteroid.latest_approach?.velocity_km_s) {
          const velocity = asteroid.latest_approach.velocity_km_s * 1000; // m/s
          const kineticEnergy = 0.5 * mass * velocity * velocity; // Joules
          kineticEnergyMT = kineticEnergy / 4.184e15; // Convert to Megatons TNT

          // Estimate crater size
          craterSize = (1.8 * Math.pow(kineticEnergy / (2700 * 9.81), 0.25)) / 1000; // km

          // Determine threat category
          if (kineticEnergyMT < 1) threatCategory = 'MINIMAL';
          else if (kineticEnergyMT < 10) threatCategory = 'LOCAL';
          else if (kineticEnergyMT < 100) threatCategory = 'REGIONAL';
          else if (kineticEnergyMT < 1000) threatCategory = 'CONTINENTAL';
          else threatCategory = 'GLOBAL';
        }

        const row = [
          escapeCSV(asteroid.id),
          escapeCSV(asteroid.name),
          escapeCSV(asteroid.diameter_meters?.toFixed(2)),
          escapeCSV(asteroid.diameter_km?.toFixed(4)),
          escapeCSV(asteroid.is_hazardous),
          escapeCSV(asteroid.is_sentry_object),
          escapeCSV(asteroid.absolute_magnitude_h),
          escapeCSV(asteroid.latest_approach?.date),
          escapeCSV(asteroid.latest_approach?.velocity_km_s),
          escapeCSV(asteroid.latest_approach?.distance_km),
          escapeCSV(asteroid.total_approaches),
          escapeCSV(asteroid.nasa_jpl_url),
          // Orbital data
          escapeCSV(asteroid.orbital_data?.orbit_id),
          escapeCSV(asteroid.orbital_data?.orbit_uncertainty),
          escapeCSV(asteroid.orbital_data?.minimum_orbit_intersection),
          escapeCSV(asteroid.orbital_data?.eccentricity),
          escapeCSV(asteroid.orbital_data?.semi_major_axis),
          escapeCSV(asteroid.orbital_data?.inclination),
          escapeCSV(asteroid.orbital_data?.orbital_period),
          escapeCSV(asteroid.orbital_data?.perihelion_distance),
          escapeCSV(asteroid.orbital_data?.aphelion_distance),
          escapeCSV(asteroid.orbital_data?.mean_anomaly),
          escapeCSV(asteroid.orbital_data?.mean_motion),
          escapeCSV(asteroid.orbital_data?.orbit_class?.orbit_class_type),
          escapeCSV(asteroid.orbital_data?.orbit_class?.orbit_class_description),
          escapeCSV(asteroid.orbital_data?.orbit_class?.orbit_class_range),
          // Calculated fields
          escapeCSV(mass.toFixed(0)),
          escapeCSV(kineticEnergyMT.toFixed(4)),
          escapeCSV(craterSize.toFixed(2)),
          escapeCSV(threatCategory)
        ];
        csvContent += row.join(',') + '\n';
      });

      // Save all asteroids CSV
      const allPath = path.join(process.cwd(), 'public', 'data', 'asteroids_all.csv');
      await fs.writeFile(allPath, csvContent);
      console.log(`✅ All asteroids CSV saved: ${asteroids.length} records`);
      console.log(`   File: asteroids_all.csv`);
    }

    // 2. Convert hazardous asteroids to CSV
    if (data.hazardous_asteroids) {
      const hazardous = data.hazardous_asteroids;

      const headers = [
        'id',
        'name',
        'diameter_meters',
        'is_sentry_object',
        'absolute_magnitude_h',
        'latest_approach_date',
        'latest_velocity_km_s',
        'latest_distance_km',
        'kinetic_energy_mt',
        'threat_level'
      ];

      let csvContent = headers.join(',') + '\n';

      hazardous.forEach(asteroid => {
        const diameter = asteroid.diameter_meters || 100;
        const volume = (4/3) * Math.PI * Math.pow(diameter/2, 3);
        const mass = volume * 3000;

        let kineticEnergyMT = 0;
        let threatLevel = 'UNKNOWN';

        if (asteroid.latest_approach?.velocity_km_s) {
          const velocity = asteroid.latest_approach.velocity_km_s * 1000;
          const kineticEnergy = 0.5 * mass * velocity * velocity;
          kineticEnergyMT = kineticEnergy / 4.184e15;

          if (kineticEnergyMT < 10) threatLevel = 'LOW';
          else if (kineticEnergyMT < 100) threatLevel = 'MODERATE';
          else if (kineticEnergyMT < 1000) threatLevel = 'HIGH';
          else threatLevel = 'EXTREME';
        }

        const row = [
          escapeCSV(asteroid.id),
          escapeCSV(asteroid.name),
          escapeCSV(asteroid.diameter_meters?.toFixed(2)),
          escapeCSV(asteroid.is_sentry_object),
          escapeCSV(asteroid.absolute_magnitude_h),
          escapeCSV(asteroid.latest_approach?.date),
          escapeCSV(asteroid.latest_approach?.velocity_km_s),
          escapeCSV(asteroid.latest_approach?.distance_km),
          escapeCSV(kineticEnergyMT.toFixed(4)),
          escapeCSV(threatLevel)
        ];
        csvContent += row.join(',') + '\n';
      });

      const hazardousPath = path.join(process.cwd(), 'public', 'data', 'asteroids_hazardous.csv');
      await fs.writeFile(hazardousPath, csvContent);
      console.log(`✅ Hazardous asteroids CSV saved: ${hazardous.length} records`);
      console.log(`   File: asteroids_hazardous.csv`);
    }

    // 3. Convert ML features to CSV
    if (data.ml_features) {
      const mlFeatures = data.ml_features;

      const headers = [
        'asteroid_id',
        'diameter_m',
        'velocity_km_s',
        'distance_km',
        'kinetic_energy_mt',
        'is_hazardous',
        'absolute_magnitude',
        'approach_parameter',
        'gravity_influence',
        'orbit_uncertainty',
        'moid',
        'inclination',
        'eccentricity'
      ];

      let csvContent = headers.join(',') + '\n';

      mlFeatures.forEach(feature => {
        const row = [
          escapeCSV(feature.asteroid_id),
          escapeCSV(feature.diameter_m?.toFixed(2)),
          escapeCSV(feature.velocity_km_s?.toFixed(3)),
          escapeCSV(feature.distance_km?.toFixed(2)),
          escapeCSV(feature.kinetic_energy_mt?.toFixed(6)),
          escapeCSV(feature.is_hazardous ? 1 : 0), // Convert boolean to binary
          escapeCSV(feature.absolute_magnitude?.toFixed(2)),
          escapeCSV(feature.approach_parameter?.toFixed(6)),
          escapeCSV(feature.gravity_influence?.toFixed(8)),
          escapeCSV(feature.orbit_uncertainty),
          escapeCSV(feature.moid?.toFixed(6)),
          escapeCSV(feature.inclination?.toFixed(4)),
          escapeCSV(feature.eccentricity?.toFixed(6))
        ];
        csvContent += row.join(',') + '\n';
      });

      const mlPath = path.join(process.cwd(), 'public', 'data', 'asteroids_ml_features.csv');
      await fs.writeFile(mlPath, csvContent);
      console.log(`✅ ML features CSV saved: ${mlFeatures.length} records`);
      console.log(`   File: asteroids_ml_features.csv`);
    }

    // 4. Convert approach events to CSV
    if (data.approach_events) {
      const events = data.approach_events;

      const headers = [
        'asteroid_id',
        'asteroid_name',
        'approach_date',
        'approach_date_full',
        'velocity_km_s',
        'distance_km',
        'is_hazardous'
      ];

      let csvContent = headers.join(',') + '\n';

      events.forEach(event => {
        const row = [
          escapeCSV(event.asteroid_id),
          escapeCSV(event.asteroid_name),
          escapeCSV(event.approach_date),
          escapeCSV(event.approach_date_full),
          escapeCSV(event.velocity_km_s),
          escapeCSV(event.distance_km),
          escapeCSV(event.is_hazardous)
        ];
        csvContent += row.join(',') + '\n';
      });

      const eventsPath = path.join(process.cwd(), 'public', 'data', 'asteroid_approaches.csv');
      await fs.writeFile(eventsPath, csvContent);
      console.log(`✅ Approach events CSV saved: ${events.length} records`);
      console.log(`   File: asteroid_approaches.csv`);
    }

    // 5. Create summary statistics CSV
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Unique Asteroids', data.metadata.total_unique_asteroids],
      ['Hazardous Asteroids', data.metadata.hazardous_count],
      ['Large Asteroids (>500m)', data.metadata.large_asteroids_count],
      ['Close Approaches (<1M km)', data.metadata.close_approaches_count],
      ['Total Approach Events', data.metadata.total_approach_events],
      ['API Calls Made', data.metadata.api_calls_made],
      ['Duplicates Removed', data.metadata.duplicates_removed],
      ['Data Generated', data.metadata.generated_at]
    ];

    let summaryCSV = summaryData.map(row => row.join(',')).join('\n');
    const summaryPath = path.join(process.cwd(), 'public', 'data', 'asteroid_summary_stats.csv');
    await fs.writeFile(summaryPath, summaryCSV);
    console.log(`✅ Summary statistics CSV saved`);
    console.log(`   File: asteroid_summary_stats.csv`);

    console.log('\n📁 All asteroid CSV files created successfully!');
    console.log('=====================================');
    console.log('Files created:');
    console.log('1. asteroids_all.csv - All 1976 unique asteroids with full details');
    console.log('2. asteroids_hazardous.csv - 75 potentially hazardous asteroids');
    console.log('3. asteroids_ml_features.csv - ML-ready feature set');
    console.log('4. asteroid_approaches.csv - All approach events');
    console.log('5. asteroid_summary_stats.csv - Summary statistics');
    console.log('\n📊 Total unique asteroids: ' + data.metadata.total_unique_asteroids);

  } catch (error) {
    console.error('Error converting data:', error);
  }
}

// Run the conversion
convertAsteroidsToCSV();