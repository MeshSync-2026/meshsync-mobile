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
  if (!storage.contains("node_id")) {
    storage.set("node_id", `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    storage.set("seq", 0);
    storage.set("is_registered", false);
    storage.set("active_role", ROLE.CIVILIAN);
  }
}

export const getNodeId = () => storage.getString("node_id");
export const nextSeq = () => { const s = (storage.getNumber("seq") || 0) + 1; storage.set("seq", s); return s; };

// --- Responder registration state (SRS §3.1.11 / §3.10.1) ---
export const isRegistered = () => storage.getBoolean("is_registered") ?? false;
export const getAssignedZoneId = () => storage.getString("assigned_zone_id") || null;

export function registerAsResponder({ authority_user_id, assigned_zone_id, token }) {
  storage.set("is_registered", true);
  storage.set("assigned_zone_id", assigned_zone_id || "");
  storage.set("responder_authority_user_id", authority_user_id);
  storage.set("responder_token", token || "");
  storage.set("active_role", ROLE.RESPONDER);
}

export function deregisterResponder() {
  // Full logout — SRS doesn't describe this explicitly, but a responder
  // handing back a device (end of shift) needs a real logout, distinct
  // from just switching which role is currently active.
  storage.set("is_registered", false);
  storage.delete("assigned_zone_id");
  storage.delete("responder_authority_user_id");
  storage.delete("responder_token");
  storage.set("active_role", ROLE.CIVILIAN);
}

// --- Active role (what's currently on screen — persists across restarts) ---
export const getActiveRole = () => storage.getString("active_role") || ROLE.CIVILIAN;
export function setActiveRole(role) {
  if (role === ROLE.RESPONDER && !isRegistered()) return; // can't switch into a role you're not registered for
  storage.set("active_role", role);
}
