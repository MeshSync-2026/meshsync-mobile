import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export class MeshEvent extends Model {
  static table = "mesh_event";
  @field("parent_id") parentId;
  @field("incident_id") incidentId;
  @field("origin_node_id") originNodeId;
  @field("seq") seq;
  @field("event_type_code") eventTypeCode;
  @field("actor_role_code") actorRoleCode;
  @field("latitude") latitude;
  @field("longitude") longitude;
  @field("landmark_name") landmarkName;
  @field("report_type_code") reportTypeCode;
  @field("category_code") categoryCode;
  @field("severity_level") severityLevel;
  @field("status_safety") statusSafety;
  @field("people_count") peopleCount;
  @field("status_water") statusWater;
  @field("status_injury") statusInjury;
  @field("target_node_id") targetNodeId;
  @field("target_zone_id") targetZoneId;
  @field("hlc_timestamp") hlcTimestamp;
  @field("created_at_ms") createdAtMs;
  @field("is_cloud_synced") isCloudSynced;

  get severity() {
    return this.severityLevel;
  }
  set severity(val) {
    this.severityLevel = val;
  }
}

export class Incident extends Model {
  static table = "incident";
  @field("creator_node_id") creatorNodeId;
  @field("latitude") latitude;
  @field("longitude") longitude;
  @field("landmark_name") landmarkName;
  @field("report_type_code") reportTypeCode;
  @field("category_code") categoryCode;
  @field("severity_level") severityLevel;
  @field("status_code") statusCode;
  @field("confidence_code") confidenceCode;
  @field("status_safety") statusSafety;
  @field("people_count") peopleCount;
  @field("status_water") statusWater;
  @field("status_injury") statusInjury;
  @field("last_heartbeat_at_ms") lastHeartbeatAtMs;
  @field("last_alive_hlc") lastAliveHlc;
  @field("last_event_hlc") lastEventHlc;
  @field("created_at_ms") createdAtMs;
  @field("updated_at_ms") updatedAtMs;

  get severity() {
    return this.severityLevel;
  }
  set severity(val) {
    this.severityLevel = val;
  }
}

export class IncidentResponder extends Model {
  static table = "incident_responder";
  @field("incident_id") incidentId;
  @field("responder_node_id") responderNodeId;
  @field("actor_role_code") actorRoleCode;
  @field("hlc_timestamp") hlcTimestamp;
  @field("joined_at_ms") joinedAtMs;
}

export class IncidentHistory extends Model {
  static table = "incident_history";
  @field("incident_id") incidentId;
  @field("actor_node_id") actorNodeId;
  @field("action_type_code") actionTypeCode;
  @field("hlc_timestamp") hlcTimestamp;
  @field("source_mesh_event_id") sourceMeshEventId;
  @field("created_at_ms") createdAtMs;
}

export class ProcessedBroadcast extends Model {
  static table = "processed_broadcast";
  @field("origin_node_id") originNodeId;
  @field("seq") seq;
  @field("received_at_ms") receivedAtMs;
}

export class Tombstone extends Model {
  static table = "tombstone";
  @field("incident_id") incidentId;
  @field("resolution_hlc") resolutionHlc;
  @field("purged_at_ms") purgedAtMs;
}

export class MeshAssignment extends Model {
  static table = "mesh_assignment";
  @field("responder_node_id") responderNodeId;
  @field("zone_id") zoneId;
  @field("incident_id") incidentId;
  @field("hlc_timestamp") hlcTimestamp;
  @field("assigned_at_ms") assignedAtMs;
}

export class ResponseZone extends Model {
  static table = "response_zone";
  @field("area_name") areaName;
  @field("created_at_ms") createdAtMs;
  @field("updated_at_ms") updatedAtMs;
}
