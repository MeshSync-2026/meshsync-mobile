import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const meshSyncSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "mesh_event", // the authoritative append-only log
      columns: [
        { name: "parent_id", type: "string", isOptional: true },
        { name: "incident_id", type: "string" },
        { name: "origin_node_id", type: "string" },
        { name: "seq", type: "number" },
        { name: "event_type_code", type: "number" },
        { name: "actor_role_code", type: "number", isOptional: true },
        { name: "latitude", type: "number", isOptional: true },
        { name: "longitude", type: "number", isOptional: true },
        { name: "landmark_name", type: "string", isOptional: true },
        { name: "report_type_code", type: "number", isOptional: true },
        { name: "category_code", type: "number", isOptional: true },
        { name: "severity_level", type: "number", isOptional: true },
        { name: "status_safety", type: "number", isOptional: true },
        { name: "people_count", type: "number", isOptional: true },
        { name: "status_water", type: "number", isOptional: true },
        { name: "status_injury", type: "number", isOptional: true },
        { name: "target_node_id", type: "string", isOptional: true },
        { name: "target_zone_id", type: "string", isOptional: true },
        { name: "hlc_timestamp", type: "string" },       // 28-char, indexed for sort
        { name: "created_at_ms", type: "number" },        // device-origin epoch ms
        { name: "is_cloud_synced", type: "boolean" },      // local-only, grow-only flag (§3.3.2)
      ],
    }),

    tableSchema({
      name: "incident", // projection — rebuilt by fold.js, never hand-written
      columns: [
        { name: "creator_node_id", type: "string" },
        { name: "latitude", type: "number", isOptional: true },
        { name: "longitude", type: "number", isOptional: true },
        { name: "landmark_name", type: "string", isOptional: true },
        { name: "report_type_code", type: "number", isOptional: true },
        { name: "category_code", type: "number", isOptional: true },
        { name: "severity_level", type: "number", isOptional: true },
        { name: "status_code", type: "number" },
        { name: "confidence_code", type: "number" },
        { name: "status_safety", type: "number", isOptional: true },
        { name: "people_count", type: "number", isOptional: true },
        { name: "status_water", type: "number", isOptional: true },
        { name: "status_injury", type: "number", isOptional: true },
        { name: "last_heartbeat_at_ms", type: "number", isOptional: true },
        { name: "last_alive_hlc", type: "string", isOptional: true },
        { name: "last_event_hlc", type: "string", isOptional: true },
        { name: "created_at_ms", type: "number" },
        { name: "updated_at_ms", type: "number" },
      ],
    }),

    tableSchema({
      name: "incident_responder",
      columns: [
        { name: "incident_id", type: "string" },
        { name: "responder_node_id", type: "string" },
        { name: "actor_role_code", type: "number", isOptional: true },
        { name: "hlc_timestamp", type: "string" },
        { name: "joined_at_ms", type: "number" },
      ],
    }),

    tableSchema({
      name: "incident_history",
      columns: [
        { name: "incident_id", type: "string" },
        { name: "actor_node_id", type: "string", isOptional: true },
        { name: "action_type_code", type: "number" },
        { name: "hlc_timestamp", type: "string", isOptional: true },
        { name: "source_mesh_event_id", type: "string", isOptional: true },
        { name: "created_at_ms", type: "number" },
      ],
    }),

    tableSchema({
      name: "processed_broadcast", // dedup — transport table, never gossips (§7.1)
      columns: [
        { name: "origin_node_id", type: "string" },
        { name: "seq", type: "number" },
        { name: "received_at_ms", type: "number" }, // for 7-day / 50k LRU purge
      ],
    }),

    tableSchema({
      name: "tombstone", // GC — SRS §3.1.15
      columns: [
        { name: "incident_id", type: "string" },
        { name: "resolution_hlc", type: "string" },
        { name: "purged_at_ms", type: "number" },
      ],
    }),

    tableSchema({
      name: "mesh_assignment", // dispatch orders received via ASSIGN events
      columns: [
        { name: "responder_node_id", type: "string" },
        { name: "zone_id", type: "string" },
        { name: "incident_id", type: "string", isOptional: true },
        { name: "hlc_timestamp", type: "string" },
        { name: "assigned_at_ms", type: "number" },
      ],
    }),

    tableSchema({
      name: "response_zone",
      columns: [
        { name: "area_name", type: "string" },
        { name: "created_at_ms", type: "number" },
        { name: "updated_at_ms", type: "number" },
      ],
    }),
  ],
});
