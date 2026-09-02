const mockAlert = jest.fn();

jest.mock("react-native", () => ({
  Alert: {
    alert: (...args) => mockAlert(...args),
  },
  Platform: { OS: "ios" },
}));

let mockPermissionStatus = "granted";
let mockCurrentPosition = {
  coords: {
    latitude: 6.9271,
    longitude: 79.8612,
    accuracy: 5,
  },
  timestamp: 1700000000000,
};

jest.mock(
  "expo-location",
  () => ({
    getForegroundPermissionsAsync: jest.fn(async () => ({
      status: mockPermissionStatus,
    })),
    requestForegroundPermissionsAsync: jest.fn(async () => ({
      status: mockPermissionStatus,
    })),
    getCurrentPositionAsync: jest.fn(async () => mockCurrentPosition),
    Accuracy: { High: 4, Balanced: 3 },
  }),
  { virtual: true }
);

import {
  requestLocationPermission,
  getCurrentLocation,
  formatCoordinateLandmark,
} from "../../utils/location";

describe("Location Utility (location.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionStatus = "granted";
  });

  test("requestLocationPermission should return true when permission is granted", async () => {
    const granted = await requestLocationPermission({ showAlertOnDenied: true });

    expect(granted).toBe(true);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("requestLocationPermission should return false and trigger Alert when permission is denied", async () => {
    mockPermissionStatus = "denied";

    const granted = await requestLocationPermission({ showAlertOnDenied: true });

    expect(granted).toBe(false);
    expect(mockAlert).toHaveBeenCalledWith(
      "Location Permission Required",
      "MeshSync requires location permission. Please enable location access in your device settings."
    );
  });

  test("getCurrentLocation should return coordinates when granted", async () => {
    const loc = await getCurrentLocation({ showAlertOnDenied: true });

    expect(loc).toEqual({
      latitude: 6.9271,
      longitude: 79.8612,
      accuracy: 5,
      timestamp: 1700000000000,
    });
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("getCurrentLocation should return null and trigger Alert when permission denied", async () => {
    mockPermissionStatus = "denied";

    const loc = await getCurrentLocation({ showAlertOnDenied: true });

    expect(loc).toBeNull();
    expect(mockAlert).toHaveBeenCalledWith(
      "Location Permission Required",
      "MeshSync requires location permission. Please enable location access in your device settings."
    );
  });

  test("formatCoordinateLandmark should format and cap landmark string", () => {
    const landmark = formatCoordinateLandmark(6.927054, 79.861244);
    expect(landmark).toBe("Lat: 6.9271, Lng: 79.8612");
    expect(landmark.length).toBeLessThanOrEqual(30);

    expect(formatCoordinateLandmark(null, null)).toBe("Unknown location");
  });
});
