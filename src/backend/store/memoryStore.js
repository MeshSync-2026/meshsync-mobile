// In-memory event store — fallback when WatermelonDB's native module is
// unavailable (Expo Go / web preview). Same interface as the WatermelonDB
// EventStore: insert, hasSeen, markSeen, getAll, getUnsynced, markSynced,
// getProjection, subscribe. Data does NOT persist across launches.

import { foldPipeline } from "../shared";

class MemoryEventStore {
  constructor() {
    this.events = new Map(); // id → event
    this.seen = new Set();   // "origin_node_id|seq"
    this.listeners = new Set();
  }

  async insert(evt) {
    if (this.events.has(evt.id)) return false;
    this.events.set(evt.id, { ...evt });
    await this._notify();
    return true;
  }

  async hasSeen(originNodeId, seq) {
    return this.seen.has(`${originNodeId}|${seq}`);
  }

  async markSeen(originNodeId, seq) {
    this.seen.add(`${originNodeId}|${seq}`);
  }

  _serialize(e) {
    return { ...e, is_cloud_synced: Boolean(e.is_cloud_synced) };
  }

  async getAll() {
    return Array.from(this.events.values()).map((e) => this._serialize(e));
  }

  async getUnsynced() {
    return (await this.getAll()).filter((e) => !e.is_cloud_synced);
  }

  async markSynced(ids) {
    const set = new Set(ids);
    for (const e of this.events.values()) {
      if (set.has(e.id)) e.is_cloud_synced = true;
    }
    await this._notify();
  }

  async getProjection() {
    const events = await this.getAll();
    return foldPipeline(events, Date.now());
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Trailing debounce — a burst of inserts (e.g. WS reconnect pushing the
  // backlog) coalesces into ONE fold + listener pass instead of N folds,
  // each O(all events), which previously stalled the JS thread.
  _notify() {
    if (this._notifyPending) return this._notifyPending;
    this._notifyPending = new Promise((resolve) => {
      setTimeout(async () => {
        this._notifyPending = null;
        try {
          const projection = await this.getProjection();
          this.listeners.forEach((fn) => {
            try {
              fn(projection);
            } catch (err) {
              console.error("Error in memoryStore subscription listener:", err);
            }
          });
        } finally {
          resolve();
        }
      }, 50);
    });
    return this._notifyPending;
  }
}

let memoryStore;
export const getMemoryStore = () => (memoryStore ??= new MemoryEventStore());
