// Test script to fetch and display exact NASA NEO API data
// Run this to see the raw API response format

export async function testNASAAPI() {
  const API_KEY = process.env.NASA_API_KEY;

  // Test 1: Today's NEO feed
  console.log("=== Testing NEO Feed API ===");
  const today = new Date().toISOString().split("T")[0];
  const feedUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&api_key=${API_KEY}`;

  try {
    const feedResponse = await fetch(feedUrl);
    const feedData = await feedResponse.json();

    console.log("Feed Response Structure:");
    console.log(JSON.stringify(feedData, null, 2));

    // Show first asteroid in detail
    const dates = Object.keys(feedData.near_earth_objects);
    if (dates.length > 0) {
      const firstDate = dates[0];
      const asteroids = feedData.near_earth_objects[firstDate];
      if (asteroids.length > 0) {
        console.log("\n=== First Asteroid Detailed Structure ===");
        console.log(JSON.stringify(asteroids[0], null, 2));
      }
    }
  } catch (error) {
    console.error("Feed API Error:", error);
  }

  // Test 2: Specific asteroid lookup
  console.log("\n=== Testing Asteroid Lookup API ===");
  // Using a well-known asteroid ID
  const asteroidId = "54016816"; // This is a real NEO ID
  const lookupUrl = `https://api.nasa.gov/neo/rest/v1/neo/${asteroidId}?api_key=${API_KEY}`;

  try {
    const lookupResponse = await fetch(lookupUrl);
    const lookupData = await lookupResponse.json();

    console.log("Lookup Response Structure:");
    console.log(JSON.stringify(lookupData, null, 2));
  } catch (error) {
    console.error("Lookup API Error:", error);
  }

  // Test 3: Browse all NEOs
  console.log("\n=== Testing Browse API ===");
  const browseUrl = `https://api.nasa.gov/neo/rest/v1/neo/browse?page=0&size=5&api_key=${API_KEY}`;

  try {
    const browseResponse = await fetch(browseUrl);
    const browseData = await browseResponse.json();

    console.log("Browse Response Structure:");
    console.log(JSON.stringify(browseData, null, 2));
  } catch (error) {
    console.error("Browse API Error:", error);
  }
}

// Example of running the test
if (typeof window === "undefined") {
  // Node.js environment
  testNASAAPI().catch(console.error);
}
