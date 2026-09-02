import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { meshSyncSchema } from "./schema";
import {
  MeshEvent,
  Incident,
  IncidentResponder,
  IncidentHistory,
  ProcessedBroadcast,
  Tombstone,
  MeshAssignment,
  ResponseZone
} from "./models";

const adapter = new SQLiteAdapter({
  schema: meshSyncSchema,
  dbName: "meshsync",
  jsi: true, // required — SRS §9.4 needs synchronous-feeling perf for the fold pipeline
});

export const database = new Database({
  adapter,
  modelClasses: [
    MeshEvent,
    Incident,
    IncidentResponder,
    IncidentHistory,
    ProcessedBroadcast,
    Tombstone,
    MeshAssignment,
    ResponseZone
  ],
});
