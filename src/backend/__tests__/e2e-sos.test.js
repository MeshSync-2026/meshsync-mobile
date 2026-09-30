// Temporary e2e — mirrors the exact Expo Go runtime path for My Status → SOS
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {},
}));

import { getMemoryStore } from "../store/memoryStore";
import { createStatusEvent, createSosEvent } from "../eventCreator";
import {
  initHotState,
  getLastStatus,
  setLastStatus,
  getActiveSosIncidentId,
} from "../store/hotState";
import { deriveSeverity } from "../shared/severity";

describe("e2e: Send Status → SOS → cancel-state", () => {
  test("status update → SOS sends and marks active incident", async () => {
    initHotState();
    const store = getMemoryStore();

    // --- Step 1: My Status (Need Help = safety code 1) ---
    const statusEvt = createStatusEvent({
      incidentId: undefined,
      safety_code: 1,
      water_code: 0,
      injury_code: 0,
      people_count: 2,
      latitude: null,
      longitude: null,
      landmark_name: "Test",
    });
    expect(await store.insert(statusEvt)).toBe(true);
    setLastStatus({ safety: 1, water: 0, injury: 0, people: 2 });

    // --- Step 2: SOS ---
    const status = getLastStatus();
    const severityLevel = deriveSeverity(status);
    expect(severityLevel).toBe(1); // LOW — one warning

    const sosEvt = createSosEvent({
      latitude: null,
      longitude: null,
      landmarkName: "Test",
      victimName: "",
      severityLevel,
      statusSafety: status.safety,
      statusWater: status.water,
      statusInjury: status.injury,
      peopleCount: status.people,
    });
    expect(await store.insert(sosEvt)).toBe(true);

    // Button flips on this value
    expect(sosEvt.incident_id).toBeTruthy();
    expect(getActiveSosIncidentId()).toBe(sosEvt.incident_id);

    const proj = await store.getProjection();
    const sosInc = proj.incidents.find((i) => i.report_type_code === 1);
    expect(sosInc).toBeTruthy();
    expect(sosInc.severity_level).toBe(1);
  });
});
