import { Alert } from "react-native";

let LocationModule = null;
try {
  LocationModule = require("expo-location");
} catch (e) {
  // Graceful fallback for non native/test environments
}

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
        "Requires location permission.Please enable location access in your device settings."
      );
    }
    return false;
  }
}

/**
 * Get current device GPS coordinates.
 * Returns null and alerts user if permission is denied.
 */
export async function getCurrentLocation({ showAlertOnDenied = true, highAccuracy = true } = {}) {
  const hasPermission = await requestLocationPermission({ showAlertOnDenied });
  if (!hasPermission || !LocationModule) {
    return null;
  }

  try {
    const accuracy = highAccuracy
      ? (LocationModule.Accuracy?.High ?? 4)
      : (LocationModule.Accuracy?.Balanced ?? 3);

    const position = await LocationModule.getCurrentPositionAsync({
      accuracy,
    });

    if (!position || !position.coords) {
      throw new Error("Invalid position object received");
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      timestamp: position.timestamp || Date.now(),
    };
  } catch (error) {
    console.error("[Location] Error getting current position:", error);
    if (showAlertOnDenied) {
      Alert.alert(
        "Location Error",
        "Could not retrieve your current GPS coordinates. Please ensure GPS/Location Services are enabled."
      );
    }
    return null;
  }
}

/**
 * Format coordinates into a compact 30-character capped landmark string.
 */
export function formatCoordinateLandmark(lat, lon) {
  if (lat == null || lon == null) return "Unknown location";
  return `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lon).toFixed(4)}`.slice(0, 30);
}
