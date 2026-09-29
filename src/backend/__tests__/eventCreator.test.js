import {
  createSosEvent,
  createHazardEvent,
  createStatusEvent,
  createResponderEnRouteEvent,
  createResolveEvent,
} from "../eventCreator";
import { validateEvent } from "../shared/validation";
import { EVENT_TYPE, REPORT_TYPE, ACTOR_ROLE, HAZARD_CATEGORY, SEVERITY, SAFETY, WATER, INJURY } from "../shared/enums";

// Mock hotState
jest.mock("../store/hotState", () => ({
  getNodeId: () => "test-node",
  nextSeq: () => 42,
}));

// Mock HlcClock to return a predictable HLC timestamp (28 characters)
jest.mock("../shared", () => {
  const actual = jest.requireActual("../shared");
  return {
    ...actual,
    HlcClock: jest.fn().mockImplementation(() => ({
      tick: () => "0001754611200|00042|a3f9c1e7",
    })),
  };
});

describe("eventCreator Utilities", () => {
  test("createSosEvent should build a valid SOS_CREATED event passing validation", () => {
    const event = createSosEvent({
      latitude: 12.34,
      longitude: 56.78,
      landmarkName: "Main Building Ground Floor Room 10",
    });

    // Verify fields
    expect(event.origin_node_id).toBe("test-node");
    expect(event.seq).toBe(42);
    expect(event.event_type_code).toBe(EVENT_TYPE.SOS_CREATED);
    expect(event.actor_role_code).toBe(ACTOR_ROLE.VICTIM);
    expect(event.report_type_code).toBe(REPORT_TYPE.SOS);
    expect(event.latitude).toBe(12.34);
    expect(event.longitude).toBe(56.78);

    // Verify own id equals incident_id for SOS_CREATED
    expect(event.incident_id).toBe(event.id);

    // Verify landmark truncation to 30 characters
    expect(event.landmark_name).toBe("Main Building Ground Floor Roo");
    expect(event.landmark_name.length).toBe(30);
    expect(event.severity_level).toBe(SEVERITY.HIGH);
    expect(event.severity).toBe(SEVERITY.HIGH);

    // Verify against shared validateEvent
    const result = validateEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("createSosEvent should accept explicit severity / severityLevel / severity_level", () => {
    const eventWithLevel = createSosEvent({ severityLevel: SEVERITY.VERY_HIGH });
    expect(eventWithLevel.severity_level).toBe(SEVERITY.VERY_HIGH);
    expect(eventWithLevel.severity).toBe(SEVERITY.VERY_HIGH);

    const eventWithSev = createSosEvent({ severity: "low" });
    expect(eventWithSev.severity_level).toBe(SEVERITY.LOW);
    expect(eventWithSev.severity).toBe(SEVERITY.LOW);
  });

  test("createHazardEvent should map category and severity correctly", () => {
    const event = createHazardEvent({
      category: "flood",
      title: "Flash Flood Near River",
      severity: "high",
      latitude: 14.5,
      longitude: 121.0,
    });

    expect(event.event_type_code).toBe(EVENT_TYPE.STATUS_UPDATE);
    expect(event.report_type_code).toBe(REPORT_TYPE.HAZARD);
    expect(event.category_code).toBe(HAZARD_CATEGORY.FLOOD);
    expect(event.severity_level).toBe(SEVERITY.HIGH);
    expect(event.severity).toBe(SEVERITY.HIGH);
    expect(event.landmark_name).toBe("Flash Flood Near River");

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  test("createHazardEvent should fallback to NONE / MEDIUM for unknown categories and severities", () => {
    const event = createHazardEvent({
      category: "road", // 'road' has no enum mapping
      title: "Road Blocked",
      severity: "unknown-severity",
      latitude: 10.0,
      longitude: 20.0,
    });

    expect(event.category_code).toBe(HAZARD_CATEGORY.NONE);
    expect(event.severity_level).toBe(SEVERITY.MEDIUM);

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  test("createStatusEvent should format safety status and other fields", () => {
    const event = createStatusEvent({
      incidentId: "inc-123",
      safety: "need help",
      water: "low",
      injury: "severe",
      people: 4,
    });

    expect(event.incident_id).toBe("inc-123");
    expect(event.event_type_code).toBe(EVENT_TYPE.STATUS_UPDATE);
    expect(event.report_type_code).toBe(REPORT_TYPE.STATUS);
    expect(event.status_safety).toBe(SAFETY.NEED_HELP);
    expect(event.status_water).toBe(WATER.LOW);
    expect(event.status_injury).toBe(INJURY.SEVERE);
    expect(event.people_count).toBe(4);

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  test("createResponderEnRouteEvent should build responder joined event", () => {
    const event = createResponderEnRouteEvent({
      incidentId: "inc-123",
      role: ACTOR_ROLE.REGISTERED_RESPONDER,
    });

    expect(event.incident_id).toBe("inc-123");
    expect(event.event_type_code).toBe(EVENT_TYPE.RESPONDER_EN_ROUTE);
    expect(event.actor_role_code).toBe(ACTOR_ROLE.REGISTERED_RESPONDER);

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  test("createResolveEvent should build simple SOS_RESOLVED event", () => {
    const event = createResolveEvent("inc-123");

    expect(event.incident_id).toBe("inc-123");
    expect(event.event_type_code).toBe(EVENT_TYPE.SOS_RESOLVED);

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  test("createSosEvent should support locationless events with landmark fallback", () => {
    const event = createSosEvent({
      latitude: null,
      longitude: null,
      landmarkName: "Shelter B Basement Room 4",
      victimName: "John Doe",
    });

    expect(event.latitude).toBeNull();
    expect(event.longitude).toBeNull();
    expect(event.landmark_name).toBe("Shelter B Basement Room 4");
    expect(event.actor_role_code).toBe(ACTOR_ROLE.VICTIM);

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  test("createHazardEvent should support locationless events with landmark fallback", () => {
    const event = createHazardEvent({
      category: "fire",
      title: "Building Fire",
      landmarkName: "Old Market Block 3",
      latitude: null,
      longitude: null,
    });

    expect(event.latitude).toBeNull();
    expect(event.longitude).toBeNull();
    expect(event.landmark_name).toBe("Old Market Block 3");
    expect(event.category_code).toBe(HAZARD_CATEGORY.FIRE);

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });
});
