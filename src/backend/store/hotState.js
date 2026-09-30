import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const safeAsyncGet = async (key) => {
  try {
    if (typeof window === "undefined" && Platform.OS === "web") return null;
    return await AsyncStorage.getItem(key);
  } catch (_) {
    return null;
  }
};

const safeAsyncSet = (key, val) => {
  try {
    if (typeof window === "undefined" && Platform.OS === "web") return;
    AsyncStorage.setItem(key, String(val)).catch(() => {});
  } catch (_) {}
};

const safeAsyncRemove = (key) => {
  try {
    if (typeof window === "undefined" && Platform.OS === "web") return;
    AsyncStorage.removeItem(key).catch(() => {});
  } catch (_) {}
};

class PersistentStorage {
  constructor() {
    this.memory = new Map();
  }

  contains(key) {
    return this.memory.has(key);
  }

  set(key, value) {
    const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    this.memory.set(key, strValue);
    safeAsyncSet(`@meshsync_hot_${key}`, strValue);
  }

  getString(key) {
    const val = this.memory.get(key);
    return val !== undefined && val !== null ? String(val) : null;
  }

  getNumber(key) {
    const val = this.memory.get(key);
    return val !== null && val !== undefined ? Number(val) : undefined;
  }

  getBoolean(key) {
    const val = this.memory.get(key);
    if (val === "true" || val === true) return true;
    if (val === "false" || val === false) return false;
    return undefined;
  }

  delete(key) {
    this.memory.delete(key);
    safeAsyncRemove(`@meshsync_hot_${key}`);
  }

  clearAll() {
    for (const key of this.memory.keys()) {
      safeAsyncRemove(`@meshsync_hot_${key}`);
    }
    this.memory.clear();
  }
}

let MMKVClass;
if (Platform.OS === "web") {
  MMKVClass = PersistentStorage;
} else {
  try {
    const mmkvModule = require("react-native-mmkv");
    MMKVClass = (mmkvModule && mmkvModule.MMKV) || PersistentStorage;
  } catch (e) {
    MMKVClass = PersistentStorage;
  }
}

let storageInstance;
try {
  storageInstance = new MMKVClass();
} catch (e) {
  storageInstance = new PersistentStorage();
}

export const storage = storageInstance;

export const ROLE = { CIVILIAN: "CIVILIAN", RESPONDER: "RESPONDER" };

export async function hydrateHotState() {
  try {
    const keys = [
      "node_id",
      "seq",
      "is_registered",
      "active_role",
      "assigned_zone_id",
      "responder_authority_user_id",
      "responder_token",
      "active_sos_incident_id",
      "status_safety",
      "status_water",
      "status_injury",
      "status_people",
      "landmark",
    ];
    for (const k of keys) {
      const val = await safeAsyncGet(`@meshsync_hot_${k}`);
      if (val !== null && val !== undefined) {
        if (k === "seq" || k.startsWith("status_")) {
          storage.set(k, Number(val));
        } else if (k === "is_registered") {
          storage.set(k, val === "true");
        } else {
          storage.set(k, val);
        }
      }
    }
  } catch (err) {
    console.warn("[hotState] Failed hydrating hot state:", err);
  }

  return initHotState();
}

export function initHotState() {
  let existingNodeId = storage.getString("node_id");

  if (!existingNodeId) {
    const newId = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    storage.set("node_id", newId);
    storage.set("seq", 0);
    storage.set("is_registered", false);
    storage.set("active_role", ROLE.CIVILIAN);
    safeAsyncSet("@meshsync_hot_node_id", newId);
    safeAsyncSet("@meshsync_hot_seq", "0");
    safeAsyncSet("@meshsync_hot_is_registered", "false");
    safeAsyncSet("@meshsync_hot_active_role", ROLE.CIVILIAN);
  }
  return storage.getString("node_id");
}

export const getNodeId = () => {
  let id = storage.getString("node_id");
  if (!id) {
    initHotState();
    id = storage.getString("node_id");
  }
  return id;
};

export const nextSeq = () => {
  const s = (storage.getNumber("seq") || 0) + 1;
  storage.set("seq", s);
  return s;
};

// Track active SOS incident on this device (to prevent duplicate incident creation)
export const getActiveSosIncidentId = () => storage.getString("active_sos_incident_id") || null;
export const setActiveSosIncidentId = (incId) => storage.set("active_sos_incident_id", incId);
export const clearActiveSosIncidentId = () => storage.delete("active_sos_incident_id");

// Last My Status codes — carried into SOS events so severity is derivable
export function setLastStatus({ safety, water, injury, people }) {
  storage.set("status_safety", safety ?? 0);
  storage.set("status_water", water ?? 0);
  storage.set("status_injury", injury ?? 0);
  storage.set("status_people", people ?? 1);
}
export const getLastStatus = () => ({
  safety: storage.getNumber("status_safety") ?? 0,
  water: storage.getNumber("status_water") ?? 0,
  injury: storage.getNumber("status_injury") ?? 0,
  people: storage.getNumber("status_people") ?? 1,
});

// User-edited landmark, reused for SOS landmark_name
export const setLandmark = (name) => storage.set("landmark", name);
export const getLandmark = () => storage.getString("landmark") || null;

// Responder registration state
export const isRegistered = () => storage.getBoolean("is_registered") ?? false;
export const getAssignedZoneId = () => storage.getString("assigned_zone_id") || null;
export const getResponderToken = () => storage.getString("responder_token") || "";
export const getResponderAuthorityUserId = () => storage.getString("responder_authority_user_id") || null;

// Cloud sync watermark (last pulled/pushed HLC)
export const getLastCloudSyncHlc = () => storage.getString("last_cloud_sync_hlc") || null;
export const setLastCloudSyncHlc = (hlc) => storage.set("last_cloud_sync_hlc", hlc);

// One-time production cleanup flag — first launch after install purges
// stale/test events from the local store (bumped to v2 for bench/ooo filter).
export const hasCompletedProdCleanup = () => storage.getBoolean("prod_db_cleaned_v2") ?? false;
export const markProdCleanupComplete = () => storage.set("prod_db_cleaned_v2", true);

export function registerAsResponder({ authority_user_id, assigned_zone_id, token }) {
  storage.set("is_registered", true);
  storage.set("assigned_zone_id", assigned_zone_id || "");
  storage.set("responder_authority_user_id", authority_user_id);
  storage.set("responder_token", token || "");
  storage.set("active_role", ROLE.RESPONDER);
}

export function deregisterResponder() {
  storage.set("is_registered", false);
  storage.delete("assigned_zone_id");
  storage.delete("responder_authority_user_id");
  storage.delete("responder_token");
  storage.set("active_role", ROLE.CIVILIAN);
}

// Active role (what's currently on screen - persists across restarts)
export const getActiveRole = () => storage.getString("active_role") || ROLE.CIVILIAN;
export function setActiveRole(role) {
  if (role === ROLE.RESPONDER && !isRegistered()) return;
  storage.set("active_role", role);
}

// Full reset — wipes all hot state and re-initializes (node_id regenerates, §7.2).
export function resetAll() {
  if (typeof storage.clearAll === "function") {
    storage.clearAll();
  } else {
    for (const key of storage.getAllKeys ? storage.getAllKeys() : []) storage.delete(key);
  }
  initHotState();
}
