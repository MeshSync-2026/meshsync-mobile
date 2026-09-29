import { getNodeId, nextSeq, getActiveSosIncidentId, setActiveSosIncidentId, clearActiveSosIncidentId } from "./store/hotState";
import { HlcClock, EVENT_TYPE, REPORT_TYPE, ACTOR_ROLE, HAZARD_CATEGORY, SEVERITY, SAFETY, WATER, INJURY } from "./shared";

let clock;
const getClock = () => (clock ??= new HlcClock(getNodeId()));

function base(eventTypeCode, incidentId) {
  const id = `${getNodeId()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    incident_id: incidentId || id, // SOS_CREATED: incident_id = own id if not specified
    origin_node_id: getNodeId(),
    seq: nextSeq(),
    event_type_code: eventTypeCode,
    hlc_timestamp: getClock().tick(),
    created_at: Date.now(),
    is_cloud_synced: false,
  };
}

export function createSosEvent({
  latitude,
  longitude,
  landmarkName,
  victimName,
  incidentId,
  severity,
  severity_level,
  severityLevel,
  statusSafety,
  statusWater,
  statusInjury,
  peopleCount,
}) {
  const activeIncId = incidentId || (typeof getActiveSosIncidentId === "function" ? getActiveSosIncidentId() : null);
  const eventBase = base(EVENT_TYPE.SOS_CREATED, activeIncId);

  if (!activeIncId && typeof setActiveSosIncidentId === "function") {
    setActiveSosIncidentId(eventBase.id);
  }

  const rawLandmark = landmarkName || (victimName ? `SOS: ${victimName}` : "Emergency Assistance Needed");

  let finalSeverity = SEVERITY.HIGH;
  if (severity_level != null) finalSeverity = severity_level;
  else if (severityLevel != null) finalSeverity = severityLevel;
  else if (severity && typeof severity === "string") {
    finalSeverity = SEVERITY[severity.toUpperCase()] ?? SEVERITY.HIGH;
  } else if (typeof severity === "number") {
    finalSeverity = severity;
  }

  return {
    ...eventBase,
    actor_role_code: ACTOR_ROLE.VICTIM,
    report_type_code: REPORT_TYPE.SOS,
    severity_level: finalSeverity,
    severity: finalSeverity,
    status_safety: statusSafety ?? null,
    status_water: statusWater ?? null,
    status_injury: statusInjury ?? null,
    people_count: peopleCount ?? null,
    latitude,
    longitude,
    landmark_name: rawLandmark.slice(0, 30),
  };
}

export function createHeartbeatEvent(incidentId, { latitude, longitude } = {}) {
  return {
    ...base(EVENT_TYPE.SOS_ALIVE, incidentId),
    actor_role_code: ACTOR_ROLE.VICTIM,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
}

export function createCancelledEvent(incidentId) {
  const event = {
    ...base(EVENT_TYPE.SOS_CANCELLED, incidentId),
    actor_role_code: ACTOR_ROLE.VICTIM,
  };
  if (typeof getActiveSosIncidentId === "function" && getActiveSosIncidentId() === incidentId) {
    clearActiveSosIncidentId();
  }
  return event;
}

export function createTombstoneEvent(incidentId) {
  return {
    ...base(EVENT_TYPE.TOMBSTONE, incidentId),
    actor_role_code: ACTOR_ROLE.VICTIM,
  };
}

export function createHazardEvent({
  category,
  category_code,
  categoryCode,
  title,
  details,
  severity,
  severity_level,
  severityLevel,
  latitude,
  longitude,
  landmark_name,
  landmarkName,
  incidentId,
}) {
  let finalCategory = HAZARD_CATEGORY.NONE;
  if (category_code != null) finalCategory = category_code;
  else if (categoryCode != null) finalCategory = categoryCode;
  else if (category && typeof category === "string") {
    finalCategory = HAZARD_CATEGORY[category.toUpperCase()] ?? HAZARD_CATEGORY.NONE;
  }

  let finalSeverity = SEVERITY.MEDIUM;
  if (severity_level != null) finalSeverity = severity_level;
  else if (severityLevel != null) finalSeverity = severityLevel;
  else if (severity && typeof severity === "string") {
    finalSeverity = SEVERITY[severity.toUpperCase()] ?? SEVERITY.MEDIUM;
  } else if (typeof severity === "number") {
    finalSeverity = severity;
  }

  const landmark = landmark_name || landmarkName || title || "Hazard Reported";

  return {
    ...base(EVENT_TYPE.STATUS_UPDATE, incidentId),
    actor_role_code: ACTOR_ROLE.CIVILIAN_RESPONDER,
    report_type_code: REPORT_TYPE.HAZARD,
    category_code: finalCategory,
    severity_level: finalSeverity,
    severity: finalSeverity,
    landmark_name: landmark.slice(0, 30),
    latitude,
    longitude,
  };
}

export function createStatusEvent({
  incidentId,
  safety,
  safety_code,
  safetyCode,
  water,
  water_code,
  waterCode,
  injury,
  injury_code,
  injuryCode,
  people,
  people_count,
  peopleCount,
  latitude,
  longitude,
  landmark_name,
  landmarkName,
}) {
  let finalSafety = SAFETY.SAFE;
  if (safety_code != null) finalSafety = safety_code;
  else if (safetyCode != null) finalSafety = safetyCode;
  else if (safety && typeof safety === "string") {
    finalSafety = SAFETY[safety.toUpperCase().replace(" ", "_")] ?? SAFETY.SAFE;
  }

  let finalWater = WATER.GOOD;
  if (water_code != null) finalWater = water_code;
  else if (waterCode != null) finalWater = waterCode;
  else if (water && typeof water === "string") {
    finalWater = WATER[water.toUpperCase()] ?? WATER.GOOD;
  }

  let finalInjury = INJURY.NONE;
  if (injury_code != null) finalInjury = injury_code;
  else if (injuryCode != null) finalInjury = injuryCode;
  else if (injury && typeof injury === "string") {
    finalInjury = INJURY[injury.toUpperCase()] ?? INJURY.NONE;
  }

  const finalPeople = people_count ?? peopleCount ?? (typeof people === "number" ? people : 1);
  const landmark = landmark_name || landmarkName || "Status Update";

  return {
    ...base(EVENT_TYPE.STATUS_UPDATE, incidentId),
    report_type_code: REPORT_TYPE.STATUS,
    status_safety: finalSafety,
    status_water: finalWater,
    status_injury: finalInjury,
    people_count: finalPeople,
    latitude,
    longitude,
    landmark_name: landmark.slice(0, 30),
  };
}

export function createResponderEnRouteEvent({ incidentId, role }) {
  return {
    ...base(EVENT_TYPE.RESPONDER_EN_ROUTE, incidentId),
    actor_role_code: role,
  };
}

export function createResolveEvent(incidentId) {
  return base(EVENT_TYPE.SOS_RESOLVED, incidentId);
}
