import { GeographicPoint } from './types';

/**
 * Validates coordinate bounds: latitude [-90, +90], longitude [-180, +180]
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

/**
 * Formats coordinates into standard PostGIS WKT POINT syntax with X=longitude, Y=latitude.
 */
export function formatPostGISPoint(longitude: number, latitude: number): string {
  if (!isValidCoordinates(latitude, longitude)) {
    throw new Error(`Invalid geographic coordinates: lat=${latitude}, lng=${longitude}`);
  }
  return `POINT(${longitude} ${latitude})`;
}

/**
 * Haversine formula to compute distance in meters between two lat/lng points
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinates(lat1, lon1) || !isValidCoordinates(lat2, lon2)) {
    return Infinity;
  }
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculates the mean centroid (average latitude and average longitude) for a collection of points.
 */
export function calculateCentroid(points: GeographicPoint[]): GeographicPoint {
  if (!points || points.length === 0) {
    return { latitude: 0, longitude: 0 };
  }
  let sumLat = 0;
  let sumLng = 0;
  let validCount = 0;
  for (const pt of points) {
    if (isValidCoordinates(pt.latitude, pt.longitude)) {
      sumLat += pt.latitude;
      sumLng += pt.longitude;
      validCount++;
    }
  }
  if (validCount === 0) return { latitude: 0, longitude: 0 };
  return {
    latitude: Math.round((sumLat / validCount) * 1000000) / 1000000,
    longitude: Math.round((sumLng / validCount) * 1000000) / 1000000,
  };
}

/**
 * Calculates max distance in meters from center to any point in the collection.
 */
export function calculateMaxRadiusFromCenter(
  center: GeographicPoint,
  points: GeographicPoint[]
): number {
  if (!points || points.length === 0) return 0;
  let maxDistance = 0;
  for (const pt of points) {
    const dist = calculateHaversineDistance(
      center.latitude,
      center.longitude,
      pt.latitude,
      pt.longitude
    );
    if (dist > maxDistance && dist !== Infinity) {
      maxDistance = dist;
    }
  }
  return Math.round(maxDistance * 10) / 10;
}

