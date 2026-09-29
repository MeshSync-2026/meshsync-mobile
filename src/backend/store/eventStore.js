import { database } from "../db";
import { foldPipeline } from "../shared";

const meshEvents = database.collections.get("mesh_event");
const processedBroadcast = database.collections.get("processed_broadcast");

class EventStore {
  constructor() {
    this.listeners = new Set();
  }

  async insert(evt) {
    const { Q } = require("@nozbe/watermelondb");
    const count = await meshEvents.query(Q.where("id", evt.id)).fetchCount();
    if (count > 0) return false; // idempotent

    await database.write(async () => {
      await meshEvents.create((rec) => {
        rec._raw.id = evt.id; // WatermelonDB requires the PK to literally be named 'id'
        rec.parentId = evt.parent_id ?? null;
        rec.incidentId = evt.incident_id;
        rec.originNodeId = evt.origin_node_id;
        rec.seq = evt.seq;
        rec.eventTypeCode = evt.event_type_code;
        rec.actorRoleCode = evt.actor_role_code ?? null;
        rec.latitude = evt.latitude ?? null;
        rec.longitude = evt.longitude ?? null;
        rec.landmarkName = evt.landmark_name ?? null;
        rec.reportTypeCode = evt.report_type_code ?? null;
        rec.categoryCode = evt.category_code ?? null;
        rec.severityLevel = evt.severity_level ?? evt.severityLevel ?? evt.severity ?? null;
        rec.statusSafety = evt.status_safety ?? null;
        rec.peopleCount = evt.people_count ?? null;
        rec.statusWater = evt.status_water ?? null;
        rec.statusInjury = evt.status_injury ?? null;
        rec.targetNodeId = evt.target_node_id ?? null;
        rec.targetZoneId = evt.target_zone_id ?? null;
        rec.hlcTimestamp = evt.hlc_timestamp;
        rec.createdAtMs = evt.created_at;
        rec.isCloudSynced = evt.is_cloud_synced ?? false;
      });
    });

    await this._notify();
    return true;
  }

  async hasSeen(originNodeId, seq) {
    const { Q } = require("@nozbe/watermelondb");
    const count = await processedBroadcast
      .query(Q.where("origin_node_id", originNodeId), Q.where("seq", seq))
      .fetchCount();
    return count > 0;
  }

  async markSeen(originNodeId, seq) {
    await database.write(async () => {
      await processedBroadcast.create((rec) => {
        rec.originNodeId = originNodeId;
        rec.seq = seq;
        rec.receivedAtMs = Date.now();
      });
    });
  }

  async getAll() {
    const rows = await meshEvents.query().fetch();
    return rows.map((r) => ({
      id: r.id,
      parent_id: r.parentId,
      incident_id: r.incidentId,
      origin_node_id: r.originNodeId,
      seq: r.seq,
      event_type_code: r.eventTypeCode,
      actor_role_code: r.actorRoleCode,
      latitude: r.latitude,
      longitude: r.longitude,
      landmark_name: r.landmarkName,
      report_type_code: r.reportTypeCode,
      category_code: r.categoryCode,
      severity_level: r.severityLevel,
      severity: r.severityLevel,
      status_safety: r.statusSafety,
      people_count: r.peopleCount,
      status_water: r.statusWater,
      status_injury: r.statusInjury,
      target_node_id: r.targetNodeId,
      target_zone_id: r.targetZoneId,
      hlc_timestamp: r.hlcTimestamp,
      created_at: r.createdAtMs,
      is_cloud_synced: r.isCloudSynced,
    }));
  }

  async getUnsynced() {
    const { Q } = require("@nozbe/watermelondb");
    const rows = await meshEvents.query(Q.where("is_cloud_synced", false)).fetch();
    return rows.map((r) => ({
      id: r.id,
      parent_id: r.parentId,
      incident_id: r.incidentId,
      origin_node_id: r.originNodeId,
      seq: r.seq,
      event_type_code: r.eventTypeCode,
      actor_role_code: r.actorRoleCode,
      latitude: r.latitude,
      longitude: r.longitude,
      landmark_name: r.landmarkName,
      report_type_code: r.reportTypeCode,
      category_code: r.categoryCode,
      severity_level: r.severityLevel,
      severity: r.severityLevel,
      status_safety: r.statusSafety,
      people_count: r.peopleCount,
      status_water: r.statusWater,
      status_injury: r.statusInjury,
      target_node_id: r.targetNodeId,
      target_zone_id: r.targetZoneId,
      hlc_timestamp: r.hlcTimestamp,
      created_at: r.createdAtMs,
      is_cloud_synced: r.isCloudSynced,
    }));
  }

  async markSynced(ids) {
    const { Q } = require("@nozbe/watermelondb");
    const rows = await meshEvents.query(Q.where("id", Q.oneOf(ids))).fetch();
    await database.write(async () => {
      for (const rec of rows) {
        await rec.update((record) => {
          record.isCloudSynced = true;
        });
      }
    });
  }

  async getProjection() {
    const events = await this.getAll();
    return foldPipeline(events, Date.now());
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async _notify() {
    const projection = await this.getProjection();
    this.listeners.forEach((fn) => {
      try {
        fn(projection);
      } catch (err) {
        console.error("Error in eventStore subscription listener:", err);
      }
    });
  }
}

let store;
export const getStore = () => (store ??= new EventStore());
