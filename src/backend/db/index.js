// Database bootstrap.
// WatermelonDB requires the native WMDatabaseBridge module — present in dev
// builds / APKs, absent in Expo Go. Feature-detect it: when missing (Expo Go,
// web), export `database = null` and the app falls back to the in-memory
// store (see store/eventStore.js) so the UI can still be previewed.

import { NativeModules } from "react-native";

let database = null;

if (NativeModules.WMDatabaseBridge || NativeModules.WMDatabaseJSIBridge) {
  const { Database } = require("@nozbe/watermelondb");
  const SQLiteAdapter = require("@nozbe/watermelondb/adapters/sqlite").default;
  const { meshSyncSchema } = require("./schema");
  const {
    MeshEvent,
    Incident,
    IncidentResponder,
    IncidentHistory,
    ProcessedBroadcast,
    Tombstone,
    MeshAssignment,
    ResponseZone,
  } = require("./models");

  const adapter = new SQLiteAdapter({
    schema: meshSyncSchema,
    dbName: "meshsync",
    jsi: true, // required — SRS §9.4 needs synchronous-feeling perf for the fold pipeline
  });

  database = new Database({
    adapter,
    modelClasses: [
      MeshEvent,
      Incident,
      IncidentResponder,
      IncidentHistory,
      ProcessedBroadcast,
      Tombstone,
      MeshAssignment,
      ResponseZone,
    ],
  });
} 

export { database };
