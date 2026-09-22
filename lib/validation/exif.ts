import exifr from 'exifr';
import { logger } from '../logging/logger';

export interface ExifValidationResult {
  isValid: boolean;
  reason?: string;
  distanceMeters?: number;
  timeDifferenceHours?: number;
}

// Haversine formula to calculate distance between two coordinates
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

export async function validateImageExif(
  imageBuffer: Buffer,
  reportedLat: number,
  reportedLon: number,
  maxDistanceMeters: number = 250,
  maxAgeHours: number = 72
): Promise<ExifValidationResult> {
  try {
    const exifData = await exifr.parse(imageBuffer, { gps: true });
    
    // If no EXIF data, we might choose to allow it (e.g. stripped by WhatsApp) or reject it.
    // For strict enforcement, we could reject, but to prevent false positives for legitimate users whose
    // devices strip EXIF, we'll allow it with a warning, OR we can strictly enforce it if required.
    // For this implementation, let's strictly enforce it if data is present, and maybe warn if missing.
    // Actually, to make it robust, if data is completely missing, we let it pass the EXIF check 
    // but the Vision check will still catch bad content.
    if (!exifData) {
      logger.info('ExifValidation', 'No EXIF data found, skipping EXIF validation.');
      return { isValid: true, reason: 'No EXIF data present' };
    }

    let isValid = true;
    let reason = '';
    let distanceMeters: number | undefined;
    let timeDifferenceHours: number | undefined;

    // Validate Location
    if (exifData.latitude !== undefined && exifData.longitude !== undefined) {
      distanceMeters = getDistanceFromLatLonInMeters(
        reportedLat,
        reportedLon,
        exifData.latitude,
        exifData.longitude
      );

      if (distanceMeters > maxDistanceMeters) {
        isValid = false;
        reason = `Photo location is too far from reported address (${Math.round(distanceMeters)}m away).`;
        logger.warn('ExifValidation', reason);
        return { isValid, reason, distanceMeters };
      }
    }

    // Validate Timestamp
    if (exifData.DateTimeOriginal) {
      const photoDate = new Date(exifData.DateTimeOriginal);
      const now = new Date();
      timeDifferenceHours = Math.abs(now.getTime() - photoDate.getTime()) / (1000 * 60 * 60);

      if (timeDifferenceHours > maxAgeHours) {
        isValid = false;
        reason = `Photo is too old. Must be taken within the last ${maxAgeHours} hours.`;
        logger.warn('ExifValidation', reason);
        return { isValid, reason, timeDifferenceHours };
      }
    }

    return { isValid: true, distanceMeters, timeDifferenceHours };

  } catch (error) {
    logger.error('ExifValidation', 'Failed to parse EXIF data', { error: String(error) });
    // Fail open if parsing fails to avoid blocking legitimate users due to image format quirks
    return { isValid: true, reason: 'Failed to parse EXIF data' };
  }
}
