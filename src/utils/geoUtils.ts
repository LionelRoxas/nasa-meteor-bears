/**
 * Geographic coordinate utilities for converting real-world distances to map pixels
 * Works with any map implementation (Leaflet, Mapbox, Google Maps, custom)
 */

const EARTH_RADIUS_KM = 6371; // Earth's mean radius in kilometers

/**
 * Calculate meters per pixel at a given latitude and zoom level
 * Based on Web Mercator projection (EPSG:3857)
 *
 * @param latitude - Center latitude in degrees
 * @param zoom - Map zoom level (0-20+)
 * @returns Meters per pixel at the given latitude and zoom
 */
export function getMetersPerPixel(latitude: number, zoom: number): number {
  const latRad = (latitude * Math.PI) / 180;
  return (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
}

/**
 * Convert kilometers to pixels at a given latitude and zoom level
 *
 * @param km - Distance in kilometers
 * @param latitude - Center latitude in degrees
 * @param zoom - Map zoom level
 * @returns Distance in pixels
 */
export function kmToPixels(km: number, latitude: number, zoom: number): number {
  const metersPerPixel = getMetersPerPixel(latitude, zoom);
  return (km * 1000) / metersPerPixel;
}

/**
 * Convert miles to pixels at a given latitude and zoom level
 *
 * @param miles - Distance in miles
 * @param latitude - Center latitude in degrees
 * @param zoom - Map zoom level
 * @returns Distance in pixels
 */
export function milesToPixels(miles: number, latitude: number, zoom: number): number {
  const km = miles * 1.60934; // miles to km
  return kmToPixels(km, latitude, zoom);
}

/**
 * Calculate the distance between two geographic coordinates (Haversine formula)
 *
 * @param lat1 - First latitude in degrees
 * @param lng1 - First longitude in degrees
 * @param lat2 - Second latitude in degrees
 * @param lng2 - Second longitude in degrees
 * @returns Distance in kilometers
 */
export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Convert latitude/longitude to pixel coordinates on a map
 * Uses Web Mercator projection
 *
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @param zoom - Map zoom level
 * @param mapWidth - Map width in pixels
 * @param mapHeight - Map height in pixels
 * @param centerLat - Map center latitude
 * @param centerLng - Map center longitude
 * @returns Object with x, y pixel coordinates
 */
export function latLngToPixel(
  lat: number,
  lng: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number,
  centerLat: number,
  centerLng: number
): { x: number; y: number } {
  // Web Mercator projection
  const scale = Math.pow(2, zoom);
  const worldSize = 256 * scale;

  // Convert to world coordinates
  const worldX = ((lng + 180) / 360) * worldSize;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const worldY = (worldSize / 2) - (worldSize * mercN) / (2 * Math.PI);

  // Convert center to world coordinates
  const centerWorldX = ((centerLng + 180) / 360) * worldSize;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerMercN = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));
  const centerWorldY = (worldSize / 2) - (worldSize * centerMercN) / (2 * Math.PI);

  // Calculate pixel offset from center
  const x = mapWidth / 2 + (worldX - centerWorldX);
  const y = mapHeight / 2 + (worldY - centerWorldY);

  return { x, y };
}

/**
 * Get recommended zoom level to fit a radius on screen
 *
 * @param radiusKm - Radius in kilometers
 * @param latitude - Center latitude
 * @param containerWidth - Container width in pixels
 * @returns Recommended zoom level
 */
export function getZoomForRadius(
  radiusKm: number,
  latitude: number,
  containerWidth: number
): number {
  // Start at zoom 20 and decrease until radius fits
  for (let zoom = 20; zoom >= 0; zoom--) {
    const radiusPixels = kmToPixels(radiusKm, latitude, zoom);
    if (radiusPixels * 2.5 <= containerWidth) {
      // 2.5x for padding
      return zoom;
    }
  }
  return 0;
}

/**
 * Calculate the bounding box for a radius around a point
 *
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param radiusKm - Radius in kilometers
 * @returns Bounding box {north, south, east, west}
 */
export function getBoundsForRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): { north: number; south: number; east: number; west: number } {
  const latChange = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lngChange =
    (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI) / Math.cos((centerLat * Math.PI) / 180);

  return {
    north: centerLat + latChange,
    south: centerLat - latChange,
    east: centerLng + lngChange,
    west: centerLng - lngChange,
  };
}
