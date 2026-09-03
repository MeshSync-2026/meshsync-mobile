import {
  calculateDistance,
  formatDistance,
  calculateBearing,
  getCardinalDirection,
  projectToRadar,
  classifyBlipType,
  buildRadarBlips,
} from "../shared/radarGeo";
import { REPORT_TYPE, SEVERITY } from "../shared/enums";

describe("Radar Geo-Mathematical Utility (radarGeo)", () => {
  const origin = { latitude: 6.9271, longitude: 79.8612 }; // Colombo, Sri Lanka

  test("calculateDistance should return 0 for identical coordinates", () => {
    expect(calculateDistance(6.9271, 79.8612, 6.9271, 79.8612)).toBe(0);
  });

  test("calculateDistance should compute accurate distance between GPS coordinates", () => {
    // Target roughly 1.11 km North
    const targetNorth = { latitude: 6.9371, longitude: 79.8612 };
    const distance = calculateDistance(
      origin.latitude,
      origin.longitude,
      targetNorth.latitude,
      targetNorth.longitude
    );

    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1120);
  });

  test("formatDistance should format meters and kilometers properly", () => {
    expect(formatDistance(350)).toBe("~350 m");
    expect(formatDistance(999)).toBe("~999 m");
    expect(formatDistance(1200)).toBe("1.2 km");
    expect(formatDistance(5430)).toBe("5.4 km");
    expect(formatDistance(null)).toBe("~0 m");
  });

  test("calculateBearing should compute accurate compass angles", () => {
    // Due North
    const north = calculateBearing(6.9000, 79.8600, 6.9100, 79.8600);
    expect(north).toBeCloseTo(0, 0);

    // Due East
    const east = calculateBearing(6.9000, 79.8600, 6.9000, 79.8700);
    expect(east).toBeCloseTo(90, 0);

    // Due South
    const south = calculateBearing(6.9100, 79.8600, 6.9000, 79.8600);
    expect(south).toBeCloseTo(180, 0);

    // Due West
    const west = calculateBearing(6.9000, 79.8700, 6.9000, 79.8600);
    expect(west).toBeCloseTo(270, 0);
  });

  test("getCardinalDirection should return accurate 8-point compass names", () => {
    expect(getCardinalDirection(0)).toBe("North");
    expect(getCardinalDirection(45)).toBe("North-East");
    expect(getCardinalDirection(90)).toBe("East");
    expect(getCardinalDirection(135)).toBe("South-East");
    expect(getCardinalDirection(180)).toBe("South");
    expect(getCardinalDirection(225)).toBe("South-West");
    expect(getCardinalDirection(270)).toBe("West");
    expect(getCardinalDirection(315)).toBe("North-West");
    expect(getCardinalDirection(360)).toBe("North");
  });

  test("projectToRadar should place target on 2D screen coordinates", () => {
    const size = 260;
    const center = size / 2; // 130

    // Target 500m North
    const targetNorth = { latitude: 6.9316, longitude: 79.8612 };
    const projected = projectToRadar(origin, targetNorth, 2000, size);

    expect(projected.distanceMeters).toBeGreaterThan(450);
    expect(projected.distanceMeters).toBeLessThan(550);
    expect(projected.cardinal).toBe("North");
    expect(projected.inRange).toBe(true);

    // Because it's North, X should remain at center, Y should move upward (< 130)
    expect(projected.x).toBeCloseTo(center, 0);
    expect(projected.y).toBeLessThan(center);
  });

  test("classifyBlipType should categorize SOS as urgent and hazard as hazard", () => {
    expect(classifyBlipType({ report_type_code: REPORT_TYPE.SOS })).toBe("urgent");
    expect(classifyBlipType({ severity_level: SEVERITY.HIGH })).toBe("urgent");
    expect(classifyBlipType({ report_type_code: REPORT_TYPE.HAZARD, category_code: 1 })).toBe("hazard");
    expect(classifyBlipType({})).toBe("mesh");
  });

  test("buildRadarBlips should transform and sort live incidents by proximity", () => {
    const incidents = [
      { id: "inc-far", latitude: 6.9400, longitude: 79.8612, report_type_code: REPORT_TYPE.HAZARD, landmark_name: "Far Hazard" },
      { id: "inc-near", latitude: 6.9290, longitude: 79.8612, report_type_code: REPORT_TYPE.SOS, landmark_name: "Near SOS" },
    ];

    const blips = buildRadarBlips(origin, incidents, { maxRangeMeters: 3000 });

    expect(blips).toHaveLength(2);
    // Nearest should be first
    expect(blips[0].id).toBe("inc-near");
    expect(blips[0].type).toBe("urgent");
    expect(blips[0].label).toBe("Near SOS");

    expect(blips[1].id).toBe("inc-far");
    expect(blips[1].type).toBe("hazard");
  });
});
