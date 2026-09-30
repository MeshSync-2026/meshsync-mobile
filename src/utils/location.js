import { Alert } from "react-native";

let LocationModule = null;
try {
  LocationModule = require("expo-location");
} catch (e) {
  // Graceful fallback for non native/test environments
}

let cachedLocation = null;

/**
 * Request foreground location permission.
 * If denied and showAlertOnDenied is true, displays a popup alert to the user.
 */
export async function requestLocationPermission({ showAlertOnDenied = true } = {}) {
  if (!LocationModule) {
    if (showAlertOnDenied) {
      Alert.alert(
        "Location Permission Required",
        "MeshSync requires location permission to broadcast emergency alerts and compute nearby mesh radar positions. Please enable location access in your device settings."
      );
    }
    return false;
  }

  try {
    // Check if location services (GPS toggle) are enabled on device
    if (typeof LocationModule.hasServicesEnabledAsync === "function") {
      const servicesEnabled = await LocationModule.hasServicesEnabledAsync();
      if (!servicesEnabled && showAlertOnDenied) {
        Alert.alert(
          "Location Services Disabled",
          "Location / GPS services are currently turned off. Please turn on GPS/Location in your device settings."
        );
      }
    }

    const { status: existingStatus } = await LocationModule.getForegroundPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await LocationModule.requestForegroundPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      if (showAlertOnDenied) {
        Alert.alert(
          "Location Permission Required",
          "Requires location permission. Please enable location access in your device settings."
        );
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Location] Error requesting permission:", error);
    if (showAlertOnDenied) {
      Alert.alert(
        "Location Permission Required",
        "Requires location permission. Please enable location access in your device settings."
      );
    }
    return false;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Location request timed out after ${ms}ms`));
    }, ms);
    Promise.resolve(promise)
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Get current device GPS coordinates.
 * Implements multi-tier fallback: Last Known -> High Accuracy (2.5s timeout) -> Balanced Accuracy (2s timeout) -> Memory Cache.
 * Returns null and alerts user only if all attempts and fallbacks fail.
 */
export async function getCurrentLocation({ showAlertOnDenied = true, highAccuracy = true } = {}) {
  const hasPermission = await requestLocationPermission({ showAlertOnDenied });
  if (!hasPermission || !LocationModule) {
    return null;
  }

  // Tier 1: Try requested accuracy with a 2.5s timeout so offline SOS/Hazard never hangs
  try {
    const accuracy = highAccuracy
      ? (LocationModule.Accuracy?.High ?? 4)
      : (LocationModule.Accuracy?.Balanced ?? 3);

    const position = await withTimeout(
      LocationModule.getCurrentPositionAsync({
        accuracy,
        mayShowUserSettingsDialog: showAlertOnDenied,
      }),
      2500
    );

    if (position && position.coords) {
      cachedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        timestamp: position.timestamp || Date.now(),
      };
      return cachedLocation;
    }
  } catch (tier1Error) {
    console.warn("[Location] High accuracy fix failed, attempting balanced fallback:", tier1Error?.message || tier1Error);
  }

  // Tier 2: Fallback to Balanced accuracy with 1.5s timeout
  try {
    if (LocationModule.Accuracy?.Balanced != null) {
      const fallbackPosition = await withTimeout(
        LocationModule.getCurrentPositionAsync({
          accuracy: LocationModule.Accuracy.Balanced,
          mayShowUserSettingsDialog: false,
        }),
        1500
      );

      if (fallbackPosition && fallbackPosition.coords) {
        cachedLocation = {
          latitude: fallbackPosition.coords.latitude,
          longitude: fallbackPosition.coords.longitude,
          accuracy: fallbackPosition.coords.accuracy ?? null,
          timestamp: fallbackPosition.timestamp || Date.now(),
        };
        return cachedLocation;
      }
    }
  } catch (tier2Error) {
    console.warn("[Location] Balanced fallback fix failed:", tier2Error?.message || tier2Error);
  }

  // Tier 3: Fallback to device's last known location
  try {
    if (typeof LocationModule.getLastKnownPositionAsync === "function") {
      const lastKnown = await withTimeout(
        LocationModule.getLastKnownPositionAsync({
          maxAge: 3600000, // up to 1 hour
        }),
        1000
      );

      if (lastKnown && lastKnown.coords) {
        cachedLocation = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy ?? null,
          timestamp: lastKnown.timestamp || Date.now(),
        };
        return cachedLocation;
      }
    }
  } catch (tier3Error) {
    console.warn("[Location] Last known position retrieval failed:", tier3Error?.message || tier3Error);
  }

  // Tier 4: Return in-memory cached location if previously obtained during session
  if (cachedLocation) {
    return cachedLocation;
  }

  // If all tiers failed and alert requested, alert user
  if (showAlertOnDenied) {
    Alert.alert(
      "Location Error",
      "Could not retrieve your current GPS coordinates. Please ensure GPS/Location Services are enabled."
    );
  }
  return null;
}

/**
 * Format coordinates into a compact 30-character capped landmark string.
 */
export function formatCoordinateLandmark(lat, lon) {
  if (lat == null || lon == null) return "Unknown location";
  return `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lon).toFixed(4)}`.slice(0, 30);
}
