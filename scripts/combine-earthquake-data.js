const fs = require('fs').promises;
const path = require('path');

async function combineEarthquakeData() {
  console.log('🌍 Combining All Earthquake Data');
  console.log('================================\n');

  try {
    // Read weekly data
    const weeklyPath = path.join(process.cwd(), 'public', 'data', 'earthquakes_weekly.csv');
    const weeklyData = await fs.readFile(weeklyPath, 'utf8');
    const weeklyLines = weeklyData.split('\n');
    const header = weeklyLines[0];
    const weeklyEarthquakes = weeklyLines.slice(1).filter(line => line.trim());

    // Read historical major data
    const historicalPath = path.join(process.cwd(), 'public', 'data', 'earthquakes_historical_major.csv');
    const historicalData = await fs.readFile(historicalPath, 'utf8');
    const historicalLines = historicalData.split('\n');
    const historicalEarthquakes = historicalLines.slice(1).filter(line => line.trim());

    // Combine data
    const combinedLines = [header, ...weeklyEarthquakes, ...historicalEarthquakes];
    const combinedData = combinedLines.join('\n');

    // Save combined file
    const combinedPath = path.join(process.cwd(), 'public', 'data', 'earthquakes_combined_all.csv');
    await fs.writeFile(combinedPath, combinedData);

    console.log(`✅ Combined earthquake data saved:`);
    console.log(`   Weekly earthquakes: ${weeklyEarthquakes.length}`);
    console.log(`   Historical major: ${historicalEarthquakes.length}`);
    console.log(`   Total combined: ${weeklyEarthquakes.length + historicalEarthquakes.length}`);
    console.log(`   File: earthquakes_combined_all.csv\n`);

    // Create magnitude breakdown
    const magnitudes = { 'M8.0+': 0, 'M7.0-7.9': 0, 'M6.0-6.9': 0, 'M5.0-5.9': 0, 'M4.0-4.9': 0, 'M3.0-3.9': 0, 'M2.0-2.9': 0, 'Below M2.0': 0 };

    [...weeklyEarthquakes, ...historicalEarthquakes].forEach(line => {
      const magnitude = parseFloat(line.split(',')[1]);
      if (magnitude >= 8.0) magnitudes['M8.0+']++;
      else if (magnitude >= 7.0) magnitudes['M7.0-7.9']++;
      else if (magnitude >= 6.0) magnitudes['M6.0-6.9']++;
      else if (magnitude >= 5.0) magnitudes['M5.0-5.9']++;
      else if (magnitude >= 4.0) magnitudes['M4.0-4.9']++;
      else if (magnitude >= 3.0) magnitudes['M3.0-3.9']++;
      else if (magnitude >= 2.0) magnitudes['M2.0-2.9']++;
      else magnitudes['Below M2.0']++;
    });

    console.log('📊 Magnitude Distribution:');
    Object.entries(magnitudes).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} earthquakes`);
    });

  } catch (error) {
    console.error('Error combining data:', error);
  }
}

combineEarthquakeData();