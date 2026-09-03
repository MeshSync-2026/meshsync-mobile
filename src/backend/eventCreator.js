import { getNodeId, nextSeq } from "./store/hotState";
import { HlcClock, EVENT_TYPE, REPORT_TYPE, ACTOR_ROLE, HAZARD_CATEGORY, SEVERITY, SAFETY, WATER, INJURY } from "./shared";

let clock;
const getClock = () => (clock ??= new HlcClock(getNodeId()));

function base(eventTypeCode, incidentId) {
  const id = `${getNodeId()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    incident_id: incidentId || id, // SOS_CREATED: incident_id = own id
    origin_node_id: getNodeId(),
    seq: nextSeq(),
    event_type_code: eventTypeCode,
    hlc_timestamp: getClock().tick(),
    created_at: Date.now(),
    is_cloud_synced: false,
  };
}

export function createSosEvent({ latitude, longitude, landmarkName }) {
  return {
    ...base(EVENT_TYPE.SOS_CREATED),
    actor_role_code: ACTOR_ROLE.VICTIM,
    report_type_code: REPORT_TYPE.SOS,
    latitude, longitude,
    landmark_name: landmarkName?.slice(0, 30) || null,
  };
}

// NOTE: 'road'/'other' have no enum value yet — see gap noted above
export function createHazardEvent({ category, title, severity, latitude, longitude }) {
  return {
    ...base(EVENT_TYPE.STATUS_UPDATE),
    actor_role_code: ACTOR_ROLE.CIVILIAN_RESPONDER,
    report_type_code: REPORT_TYPE.HAZARD,
    category_code: HAZARD_CATEGORY[category?.toUpperCase()] ?? HAZARD_CATEGORY.NONE,
    severity_level: SEVERITY[severity?.toUpperCase()] ?? SEVERITY.MEDIUM,
    landmark_name: title?.slice(0, 30) || null,
    latitude, longitude,
  };
}

export function createStatusEvent({ incidentId, safety, water, injury, people }) {
  return {
    ...base(EVENT_TYPE.STATUS_UPDATE, incidentId),
    report_type_code: REPORT_TYPE.STATUS,
    status_safety: SAFETY[safety?.toUpperCase().replace(" ", "_")],
    status_water: WATER[water?.toUpperCase()],
    status_injury: INJURY[injury?.toUpperCase()],
    people_count: people,
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
