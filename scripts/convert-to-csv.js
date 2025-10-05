const fs = require('fs');
const path = require('path');

function convertToCSV() {
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  const mlDir = path.join(__dirname, '..', 'ml-data');

  // Create ML data directory
  if (!fs.existsSync(mlDir)) {
    fs.mkdirSync(mlDir, { recursive: true });
  }

  try {
    console.log('🔄 Converting NASA data to CSV format for ML training...\n');

    // Load all datasets
    const simulationData = JSON.parse(fs.readFileSync(path.join(dataDir, 'simulation-data.json'), 'utf8'));
    const hazardousData = JSON.parse(fs.readFileSync(path.join(dataDir, 'hazardous-asteroids.json'), 'utf8'));
    const weekData = JSON.parse(fs.readFileSync(path.join(dataDir, 'week-asteroids.json'), 'utf8'));

    // 1. ASTEROID CLASSIFICATION DATASET
    console.log('📊 Creating asteroid classification dataset...');
    const asteroidFeatures = [];

    // Process all asteroids
    simulationData.all.forEach(asteroid => {
      const features = {
        id: asteroid.id,
        name: asteroid.name,
        diameter_m: asteroid.diameter,
        velocity_km_s: asteroid.velocity,
        distance_km: asteroid.distance,
        magnitude: asteroid.magnitude,
        is_hazardous: asteroid.is_hazardous ? 1 : 0,
        is_sentry_object: asteroid.is_sentry_object ? 1 : 0,
        approach_date: asteroid.approach_date,
        // Calculate derived features
        kinetic_energy_mt: calculateKineticEnergy(asteroid.diameter, asteroid.velocity),
        threat_level: calculateThreatLevel(asteroid.diameter, asteroid.velocity),
        distance_earth_radii: asteroid.distance / 6371, // Earth radii units
        velocity_escape: asteroid.velocity / 11.2, // Ratio to Earth escape velocity
        size_category: getSizeCategory(asteroid.diameter),
        // Binary features
        is_today_approach: simulationData.today.some(t => t.id === asteroid.id) ? 1 : 0,
        is_this_week: weekData.near_earth_objects ?
          Object.values(weekData.near_earth_objects).flat().some(w => w.id === asteroid.id) ? 1 : 0 : 0
      };
      asteroidFeatures.push(features);
    });

    // Save asteroid classification CSV
    const asteroidCSV = convertToCSVString(asteroidFeatures);
    fs.writeFileSync(path.join(mlDir, 'asteroids_classification.csv'), asteroidCSV);
    console.log(`✅ Created asteroids_classification.csv (${asteroidFeatures.length} records)`);

    // 2. COMET DATASET
    console.log('📊 Creating comet dataset...');
    const cometFeatures = [];

    if (simulationData.comets) {
      simulationData.comets.forEach(comet => {
        const features = {
          id: comet.id,
          name: comet.name,
          type: 'comet',
          diameter_m: comet.diameter,
          velocity_km_s: comet.velocity,
          distance_km: comet.distance,
          is_hazardous: comet.is_hazardous ? 1 : 0,
          period_years: comet.period_years,
          eccentricity: comet.eccentricity,
          inclination_deg: comet.inclination,
          perihelion_au: comet.perihelion_au,
          aphelion_au: comet.aphelion_au,
          moid_au: comet.moid_au,
          // Derived features
          orbital_energy: calculateOrbitalEnergy(comet.perihelion_au, comet.aphelion_au),
          period_category: getPeriodCategory(comet.period_years),
          eccentricity_category: getEccentricityCategory(comet.eccentricity),
          inclination_category: getInclinationCategory(comet.inclination),
          is_famous_comet: isFamousComet(comet.name) ? 1 : 0
        };
        cometFeatures.push(features);
      });
    }

    // Save comet CSV
    const cometCSV = convertToCSVString(cometFeatures);
    fs.writeFileSync(path.join(mlDir, 'comets_classification.csv'), cometCSV);
    console.log(`✅ Created comets_classification.csv (${cometFeatures.length} records)`);

    // 3. COMBINED FEATURES DATASET (for unified ML models)
    console.log('📊 Creating combined features dataset...');
    const combinedFeatures = [];

    // Add asteroids with common features
    asteroidFeatures.forEach(asteroid => {
      const combined = {
        id: asteroid.id,
        name: asteroid.name,
        object_type: 'asteroid',
        diameter_m: asteroid.diameter_m,
        velocity_km_s: asteroid.velocity_km_s,
        distance_km: asteroid.distance_km,
        is_hazardous: asteroid.is_hazardous,
        kinetic_energy_mt: asteroid.kinetic_energy_mt,
        threat_level: asteroid.threat_level,
        size_category: asteroid.size_category,
        // Orbital features (null for asteroids)
        period_years: null,
        eccentricity: null,
        inclination_deg: null,
        moid_au: null,
        // Flags
        is_asteroid: 1,
        is_comet: 0
      };
      combinedFeatures.push(combined);
    });

    // Add comets with common features
    cometFeatures.forEach(comet => {
      const combined = {
        id: comet.id,
        name: comet.name,
        object_type: 'comet',
        diameter_m: comet.diameter_m,
        velocity_km_s: comet.velocity_km_s,
        distance_km: comet.distance_km,
        is_hazardous: comet.is_hazardous,
        kinetic_energy_mt: calculateKineticEnergy(comet.diameter_m, comet.velocity_km_s),
        threat_level: calculateThreatLevel(comet.diameter_m, comet.velocity_km_s),
        size_category: getSizeCategory(comet.diameter_m),
        // Orbital features
        period_years: comet.period_years,
        eccentricity: comet.eccentricity,
        inclination_deg: comet.inclination_deg,
        moid_au: comet.moid_au,
        // Flags
        is_asteroid: 0,
        is_comet: 1
      };
      combinedFeatures.push(combined);
    });

    // Save combined CSV
    const combinedCSV = convertToCSVString(combinedFeatures);
    fs.writeFileSync(path.join(mlDir, 'combined_neo_dataset.csv'), combinedCSV);
    console.log(`✅ Created combined_neo_dataset.csv (${combinedFeatures.length} records)`);

    // 4. TIME SERIES DATASET (7-day forecast)
    console.log('📊 Creating time series dataset...');
    const timeSeriesFeatures = [];

    if (weekData.near_earth_objects) {
      Object.entries(weekData.near_earth_objects).forEach(([date, asteroids]) => {
        asteroids.forEach(asteroid => {
          const features = {
            date: date,
            id: asteroid.id,
            name: asteroid.name,
            diameter_m: asteroid.estimated_diameter?.meters?.estimated_diameter_max ||
                      asteroid.estimated_diameter?.meters?.estimated_diameter_min || 100,
            velocity_km_s: parseFloat(asteroid.close_approach_data[0]?.relative_velocity?.kilometers_per_second || 10),
            distance_km: parseFloat(asteroid.close_approach_data[0]?.miss_distance?.kilometers || 1000000),
            is_hazardous: asteroid.is_potentially_hazardous_asteroid ? 1 : 0,
            magnitude: asteroid.absolute_magnitude_h,
            days_from_today: getDaysFromToday(date),
            approach_hour: new Date(asteroid.close_approach_data[0]?.close_approach_date_full || date).getHours()
          };
          timeSeriesFeatures.push(features);
        });
      });
    }

    // Save time series CSV
    const timeSeriesCSV = convertToCSVString(timeSeriesFeatures);
    fs.writeFileSync(path.join(mlDir, 'weekly_forecast.csv'), timeSeriesCSV);
    console.log(`✅ Created weekly_forecast.csv (${timeSeriesFeatures.length} records)`);

    // 5. CREATE ML SUMMARY
    const summary = {
      datasets_created: 4,
      total_asteroids: asteroidFeatures.length,
      hazardous_asteroids: asteroidFeatures.filter(a => a.is_hazardous === 1).length,
      total_comets: cometFeatures.length,
      hazardous_comets: cometFeatures.filter(c => c.is_hazardous === 1).length,
      combined_objects: combinedFeatures.length,
      weekly_approaches: timeSeriesFeatures.length,
      features_available: {
        basic: ['diameter_m', 'velocity_km_s', 'distance_km', 'magnitude'],
        derived: ['kinetic_energy_mt', 'threat_level', 'size_category'],
        orbital: ['period_years', 'eccentricity', 'inclination_deg', 'moid_au'],
        temporal: ['approach_date', 'days_from_today']
      },
      ml_use_cases: [
        'Hazard classification (binary prediction)',
        'Threat level regression (multi-class)',
        'Impact energy prediction',
        'Trajectory forecasting (time series)',
        'Orbital family clustering'
      ]
    };

    fs.writeFileSync(path.join(mlDir, 'ml_dataset_summary.json'), JSON.stringify(summary, null, 2));
    console.log('✅ Created ML dataset summary\n');

    console.log('🎉 CSV conversion complete!');
    console.log(`📁 Files created in ${mlDir}:`);
    console.log('   • asteroids_classification.csv - Asteroid features for classification');
    console.log('   • comets_classification.csv - Comet orbital features');
    console.log('   • combined_neo_dataset.csv - Unified asteroid+comet dataset');
    console.log('   • weekly_forecast.csv - Time series for 7-day forecasting');
    console.log('   • ml_dataset_summary.json - Dataset overview\n');

    console.log('📊 Dataset Summary:');
    console.log(`   • ${summary.total_asteroids} asteroids (${summary.hazardous_asteroids} hazardous)`);
    console.log(`   • ${summary.total_comets} comets (${summary.hazardous_comets} hazardous)`);
    console.log(`   • ${summary.weekly_approaches} weekly approach records`);
    console.log(`   • ${summary.combined_objects} total objects for ML training`);

  } catch (error) {
    console.error('❌ Error converting to CSV:', error);
  }
}

// Helper functions
function calculateKineticEnergy(diameter, velocity) {
  // KE = 0.5 * m * v²
  // Mass estimation: volume * density (assuming 3000 kg/m³)
  const volume = (4/3) * Math.PI * Math.pow(diameter/2, 3);
  const mass = volume * 3000; // kg
  const velocityMs = velocity * 1000; // convert to m/s
  const energy = 0.5 * mass * velocityMs * velocityMs; // Joules
  return energy / 4.184e15; // Convert to Megatons TNT
}

function calculateThreatLevel(diameter, velocity) {
  const energy = calculateKineticEnergy(diameter, velocity);
  if (energy > 100) return 4; // GLOBAL
  if (energy > 10) return 3;  // REGIONAL
  if (energy > 1) return 2;   // LOCAL
  return 1; // MINIMAL
}

function getSizeCategory(diameter) {
  if (diameter >= 1000) return 'huge';
  if (diameter >= 200) return 'large';
  if (diameter >= 50) return 'medium';
  return 'small';
}

function calculateOrbitalEnergy(perihelion, aphelion) {
  // Simplified orbital energy calculation
  const semiMajorAxis = (perihelion + aphelion) / 2;
  return -1 / (2 * semiMajorAxis); // Specific orbital energy
}

function getPeriodCategory(period) {
  if (period < 20) return 'short';
  if (period < 100) return 'medium';
  return 'long';
}

function getEccentricityCategory(eccentricity) {
  if (eccentricity < 0.3) return 'low';
  if (eccentricity < 0.7) return 'medium';
  return 'high';
}

function getInclinationCategory(inclination) {
  if (inclination < 10) return 'low';
  if (inclination < 45) return 'medium';
  return 'high';
}

function isFamousComet(name) {
  const famousNames = ['Halley', 'Encke', 'Tuttle', 'Giacobini', 'Swift-Tuttle', 'Tempel-Tuttle'];
  return famousNames.some(famous => name.includes(famous));
}

function getDaysFromToday(dateString) {
  const today = new Date('2025-10-04'); // Current date from the data
  const targetDate = new Date(dateString);
  const diffTime = targetDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function convertToCSVString(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

// Run the conversion
convertToCSV();