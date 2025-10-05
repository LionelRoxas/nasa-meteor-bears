const fs = require('fs');
const path = require('path');

async function fetchCometData() {
  const dataDir = path.join(__dirname, '..', 'public', 'data');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    console.log('Fetching Near-Earth Comets data from NASA AWS bucket...');

    // This is a current valid token - you'll need to update this when it expires
    const AWS_URL = `https://data-nasa-bucket-production.s3.us-east-1.amazonaws.com/legacy/Near-Earth_Comets_-_Orbital_Elements/b67r-rgxc.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZJ34W7PDBKAXMI3Y%2F20251004%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251004T220439Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEM7%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCkX8bj%2FiHOqC87O1khGBMTruk%2FvtHF5i%2BqEmxx5oZOGQIhAPQy1klihTmeTSysek972m1U775%2F%2Fz6SU6%2F3Cr5zaIzKKpQFCGcQABoMNjM5Njc0ODA5Mjg2IgyLvEZxD18i2%2FyeVP8q8QQEV%2Fiiea2D6ykhDWsH72OCTfzMnNyMsKA9n4QaGQ2vj%2BvTOyA4x0PGwjPlrpm9248JgU0WrwpCZhAU%2FT3ACcmFIM5A8T%2Fu7Ion0ko%2F7MAXBP2LFmMCTM1hXv7C1LeM39iGDc5eaPDaQoEOqYj7e42YyjXyYK8%2BGmEF810o2LtLLLgLg5%2BLV6IFZKxIAjopRkDelvKWbgf%2FEnaZd7GQgxqD0zwFcwR9%2B9xq5jfEBPOpNwmkt1k5zhaJ7CV8i94FoRb5TJlBR%2Bvwkk7WRH2yNC6yrQFlxB5GKX5Q9G3HrHSj%2BjeDCSMN3d6EqgOXa6a3ykAOqutgn%2FpzKFDInijdhWDWvBksLBXtkmoteYY4RQZQqNkuNBFPJin7p6VNL%2F9yfB%2BqF084glSp9DsEUcMgWjZzrUuoA18398WnaRy9qef4ZdBttm7rmzK7PdmyMwVj%2FQYnaXFc41FpX1ifefSgO%2BgZ45ZBT6%2BChKg1HqeyTamTeVZAm1MWU99rXTlOKX1pMxCTNgLqOia09jLl%2FeFNZHFsD9wMSQbb%2BI3AebC5Vq1JGUwnUBInfIGrZuI1Ulg3A%2BcPLhwXoUvgWLm4nz%2Brq6HRBvstfWOD4HXtLQdsrxIdukw4%2BaKYMYqtinfwmWZL7LeFl9gyCSU1PwJRartUfCsIISf62tcfWP%2BWx8fypiInPjqq6TNLWHGz7DUyM7vJbxc621bEuNfWpRH%2BsUqOS%2FUTS%2BAVPONg0Y8tIjcYfg%2B1l6YWWfW3NOtkcMfjS6xzx0ttnYk7ePUaXs5pFMV3p156Z13deMEh9KDbNg5skumhH9x7xGkgIR2a0zEl55kTEGPfMO%2BihscGOpoBJTFQapdaln6nkC9pGFH1pUMlnCgxA0COY6Vg6tINFXIFmhGKkOGPHOjqvKhQIgWuLjKQjkGO9k9zpiUjw7PUE2Z8hhPqan9UzDLc7PPmpc9MuMsHW2xHXLJ1gxZGGLekwfWBAV5Hq1qkuGexIHChxvLCedWtVzlF%2BoXU%2BPJxwex1pGYwIC5zuG0igjW%2FeZ2sfR1qrjk%2Bv96mTQ%3D%3D&X-Amz-Signature=69abfe9114358edb1e80b7b5642b00dd835470f5d4dcf530036ac747ac09a3fa&X-Amz-SignedHeaders=host&x-id=GetObject`;

    const response = await fetch(AWS_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const cometData = await response.json();
    console.log(`✅ Fetched ${cometData.length} comets from NASA`);

    // Save raw comet data
    fs.writeFileSync(
      path.join(dataDir, 'raw-comets.json'),
      JSON.stringify(cometData, null, 2)
    );
    console.log('✅ Saved raw-comets.json');

    // Process comet data for simulation
    const processedComets = cometData.map(comet => {
      // Convert orbital elements to simulation parameters
      const q_au = parseFloat(comet.q_au_1 || 1); // Perihelion distance in AU
      const period_years = parseFloat(comet.p_yr || 5); // Orbital period in years
      const eccentricity = parseFloat(comet.e || 0.7); // Orbital eccentricity
      const inclination = parseFloat(comet.i_deg || 0); // Inclination in degrees

      // Estimate approach parameters
      const au_to_km = 149597870.7; // 1 AU in kilometers
      const distance_km = q_au * au_to_km; // Convert AU to km

      // Estimate velocity using orbital mechanics (simplified)
      // v = sqrt(μ * (2/r - 1/a)) where μ is standard gravitational parameter
      const mu_sun = 1.327e11; // km³/s² for the Sun
      const a_km = distance_km / (1 - eccentricity); // Semi-major axis
      const velocity_km_s = Math.sqrt(mu_sun * (2 / distance_km - 1 / a_km)) / 1000; // Convert to km/s

      // Estimate diameter based on orbital period (very rough approximation)
      // Larger periods generally mean larger, more distant objects
      const estimated_diameter = Math.max(1, Math.min(10000, period_years * 200)); // meters

      return {
        id: `comet-${comet.object.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: comet.object_name || comet.object,
        type: 'comet',
        diameter: Math.round(estimated_diameter),
        velocity: Math.round(velocity_km_s * 10) / 10,
        distance: Math.round(distance_km),
        is_hazardous: distance_km < 7500000, // Less than 0.05 AU
        approach_date: 'periodic',
        magnitude: 15 + Math.random() * 5, // Estimated magnitude

        // Comet-specific data
        period_years: period_years,
        eccentricity: eccentricity,
        inclination: inclination,
        perihelion_au: q_au,
        aphelion_au: parseFloat(comet.q_au_2 || 5),
        moid_au: parseFloat(comet.moid_au || 0.1), // Minimum Orbit Intersection Distance

        // Raw orbital elements
        orbital_elements: {
          epoch_tdb: comet.epoch_tdb,
          tp_tdb: comet.tp_tdb, // Time of perihelion passage
          e: comet.e, // Eccentricity
          i_deg: comet.i_deg, // Inclination
          w_deg: comet.w_deg, // Argument of perihelion
          node_deg: comet.node_deg, // Longitude of ascending node
          q_au_1: comet.q_au_1, // Perihelion distance
          q_au_2: comet.q_au_2, // Aphelion distance
          p_yr: comet.p_yr, // Orbital period
          moid_au: comet.moid_au, // Minimum orbit intersection distance
          ref: comet.ref // Reference
        },

        raw_data: comet // Keep original data
      };
    });

    // Save processed comet data
    fs.writeFileSync(
      path.join(dataDir, 'processed-comets.json'),
      JSON.stringify(processedComets, null, 2)
    );
    console.log('✅ Saved processed-comets.json');

    // Filter potentially hazardous comets
    const hazardousComets = processedComets.filter(comet =>
      comet.is_hazardous || comet.moid_au < 0.05
    );

    fs.writeFileSync(
      path.join(dataDir, 'hazardous-comets.json'),
      JSON.stringify(hazardousComets, null, 2)
    );
    console.log(`✅ Saved hazardous-comets.json (${hazardousComets.length} hazardous comets)`);

    // Update the main simulation data to include comets
    let simulationData;
    try {
      const existingData = fs.readFileSync(path.join(dataDir, 'simulation-data.json'), 'utf8');
      simulationData = JSON.parse(existingData);
    } catch (error) {
      simulationData = {
        today: [],
        hazardous: [],
        all: [],
        last_updated: new Date().toISOString(),
        data_source: 'NASA NEO API',
        api_endpoint: 'https://api.nasa.gov/neo/rest/v1/'
      };
    }

    // Add comets to simulation data
    simulationData.comets = processedComets;
    simulationData.hazardous_comets = hazardousComets;
    simulationData.comet_count = processedComets.length;
    simulationData.last_updated = new Date().toISOString();

    fs.writeFileSync(
      path.join(dataDir, 'simulation-data.json'),
      JSON.stringify(simulationData, null, 2)
    );
    console.log('✅ Updated simulation-data.json with comet data');

    // Create comet summary
    const cometSummary = {
      total_comets: processedComets.length,
      hazardous_comets: hazardousComets.length,
      shortest_period: Math.min(...processedComets.map(c => c.period_years)),
      longest_period: Math.max(...processedComets.map(c => c.period_years)),
      closest_approach: Math.min(...processedComets.map(c => c.distance)),
      famous_comets: processedComets.filter(c =>
        c.name.includes('Halley') ||
        c.name.includes('Encke') ||
        c.name.includes('Tuttle') ||
        c.name.includes('Giacobini')
      ).map(c => ({ name: c.name, period: c.period_years })),
      last_updated: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(dataDir, 'comet-summary.json'),
      JSON.stringify(cometSummary, null, 2)
    );
    console.log('✅ Saved comet-summary.json');

    console.log('\n🎉 Comet data integration complete!');
    console.log(`📊 Summary: ${cometSummary.total_comets} total comets, ${cometSummary.hazardous_comets} potentially hazardous`);
    console.log(`⭐ Famous comets found: ${cometSummary.famous_comets.map(c => c.name).join(', ')}`);

  } catch (error) {
    console.error('❌ Error fetching comet data:', error);
  }
}

// Run the script
fetchCometData();