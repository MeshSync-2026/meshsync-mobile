// Dedicated Geo Mathematical transformation engine for Radar View and relative navigation

import { REPORT_TYPE, SEVERITY } from "./enums.js";

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate Haversine Distance in meters between two GPS coordinates.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Format meters into human readable distance (e.g. "~350 m" or "1.2 km").
 */
export function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return "~0 m";
  if (meters < 1000) {
    return `~${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calculate Initial Azimuth Bearing Angle in degrees (0° to 360° relative to True North).
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Convert Bearing Angle into an 8 point compass cardinal direction string.
 */
export function getCardinalDirection(bearing) {
  if (bearing == null || isNaN(bearing)) return "North";
  const directions = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];
  const normalized = ((bearing % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Project Target GPS coordinates to 2D Circular Radar Screen Coordinates (x, y).
*/
export function projectToRadar(userLoc, targetLoc, maxRangeMeters = 2000, radarSize = 260) {
  if (!userLoc || !targetLoc || userLoc.latitude == null || targetLoc.latitude == null) {
    const center = radarSize / 2;
    return {
      x: center,
      y: center,
      distanceMeters: 0,
      formattedDistance: "~0 m",
      bearing: 0,
      cardinal: "North",
      inRange: false,
    };
  }

  const distance = calculateDistance(
    userLoc.latitude,
    userLoc.longitude,
    targetLoc.latitude,
    targetLoc.longitude
  );

  const bearing = calculateBearing(
    userLoc.latitude,
    userLoc.longitude,
    targetLoc.latitude,
    targetLoc.longitude
  );

  const bearingRad = (bearing * Math.PI) / 180;
  const radius = radarSize / 2;
  const padding = 16; // Keep dots inside edge ring
  const maxVisualRadius = radius - padding;

  const normalizedDistance = Math.min(distance / Math.max(maxRangeMeters, 1), 1.0) * maxVisualRadius;

  // Polar to Cartesian (0° / North is Top -Y, 90° / East is Right +X)
  const x = radius + normalizedDistance * Math.sin(bearingRad);
  const y = radius - normalizedDistance * Math.cos(bearingRad);

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    distanceMeters: Math.round(distance),
    formattedDistance: formatDistance(distance),
    bearing: Math.round(bearing),
    cardinal: getCardinalDirection(bearing),
    inRange: distance <= maxRangeMeters,
  };
}

/**
 * Classifies an incident into a radar blip category: 'urgent' | 'hazard' | 'mesh'.
 */
export function classifyBlipType(incident) {
  if (!incident) return "mesh";
  const sev = incident.severity_level ?? incident.severityLevel ?? incident.severity;
  if (
    incident.report_type_code === REPORT_TYPE.SOS ||
    incident.event_type_code === 1 || // SOS_CREATED
    sev === SEVERITY.HIGH ||
    sev === SEVERITY.VERY_HIGH ||
    sev === "high" ||
    sev === "very_high"
  ) {
    return "urgent";
  }
  if (
    incident.report_type_code === REPORT_TYPE.HAZARD ||
    incident.category_code > 0
  ) {
    return "hazard";
  }
  return "mesh";
}

/**
 * Transforms an array of incidents/peers into rendered Radar Blip objects.
 */
export function buildRadarBlips(userLoc, incidents = [], options = {}) {
  if (!userLoc || !Array.isArray(incidents)) return [];

  const { maxRangeMeters = 2000, radarSize = 260 } = options;

  return incidents
    .filter((item) => item && item.latitude != null && item.longitude != null)
    .map((item) => {
      const projection = projectToRadar(
        userLoc,
        { latitude: item.latitude, longitude: item.longitude },
        maxRangeMeters,
        radarSize
      );

      const blipType = classifyBlipType(item);

      return {
        id: item.id || `blip-${Math.random()}`,
        label: item.landmark_name || item.title || (blipType === "urgent" ? "SOS" : "ALERT"),
        type: blipType,
        ...projection,
        rawItem: item,
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
