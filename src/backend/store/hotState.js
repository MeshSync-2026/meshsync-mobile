import { Platform } from "react-native";

class WebStorageMock {
  constructor() {
    this.storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : new Map();
  }
  contains(key) {
    if (this.storage instanceof Map) {
      return this.storage.has(key);
    }
    return this.storage.getItem(key) !== null;
  }
  set(key, value) {
    const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (this.storage instanceof Map) {
      this.storage.set(key, strValue);
    } else {
      this.storage.setItem(key, strValue);
    }
  }
  getString(key) {
    if (this.storage instanceof Map) {
      return this.storage.get(key);
    }
    return this.storage.getItem(key);
  }
  getNumber(key) {
    const val = this.getString(key);
    return val !== null && val !== undefined ? Number(val) : undefined;
  }
  getBoolean(key) {
    const val = this.getString(key);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }
  delete(key) {
    if (this.storage instanceof Map) {
      this.storage.delete(key);
    } else {
      this.storage.removeItem(key);
    }
  }
}

let MMKVClass;
if (Platform.OS === 'web') {
  MMKVClass = WebStorageMock;
} else {
  try {
    MMKVClass = require('react-native-mmkv').MMKV;
  } catch (e) {
    MMKVClass = WebStorageMock;
  }
}

export const storage = new MMKVClass();

export const ROLE = { CIVILIAN: "CIVILIAN", RESPONDER: "RESPONDER" };

export function initHotState() {
  const existingNodeId = storage.getString("node_id");
  if (!existingNodeId) {
    storage.set("node_id", `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    storage.set("seq", 0);
    storage.set("is_registered", false);
    storage.set("active_role", ROLE.CIVILIAN);
  }
}

export const getNodeId = () => {
  let id = storage.getString("node_id");
  if (!id) {
    initHotState();
    id = storage.getString("node_id");
  }
  return id;
};

export const nextSeq = () => { const s = (storage.getNumber("seq") || 0) + 1; storage.set("seq", s); return s; };

// Track active SOS incident on this device (to prevent duplicate incident creation)
export const getActiveSosIncidentId = () => storage.getString("active_sos_incident_id") || null;
export const setActiveSosIncidentId = (incId) => storage.set("active_sos_incident_id", incId);
export const clearActiveSosIncidentId = () => storage.delete("active_sos_incident_id");

// Responder registration state
export const isRegistered = () => storage.getBoolean("is_registered") ?? false;
export const getAssignedZoneId = () => storage.getString("assigned_zone_id") || null;
export const getResponderToken = () => storage.getString("responder_token") || "";
export const getResponderAuthorityUserId = () => storage.getString("responder_authority_user_id") || null;

// Cloud sync watermark (last pulled/pushed HLC)
export const getLastCloudSyncHlc = () => storage.getString("last_cloud_sync_hlc") || null;
export const setLastCloudSyncHlc = (hlc) => storage.set("last_cloud_sync_hlc", hlc);

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

export function registerAsResponder({ authority_user_id, assigned_zone_id, token }) {
  storage.set("is_registered", true);
  storage.set("assigned_zone_id", assigned_zone_id || "");
  storage.set("responder_authority_user_id", authority_user_id);
  storage.set("responder_token", token || "");
  storage.set("active_role", ROLE.RESPONDER);
}

export function deregisterResponder() {
  // responder needs a logout, distinct
  // from just switching which role is currently active.
  storage.set("is_registered", false);
  storage.delete("assigned_zone_id");
  storage.delete("responder_authority_user_id");
  storage.delete("responder_token");
  storage.set("active_role", ROLE.CIVILIAN);
}

//Active role (what's currently on screen - persists across restarts)
export const getActiveRole = () => storage.getString("active_role") || ROLE.CIVILIAN;
export function setActiveRole(role) {
  if (role === ROLE.RESPONDER && !isRegistered()) return; // can't switch into a role you're not registered for
  storage.set("active_role", role);
}
