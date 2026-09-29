// Tombstone GC service — emits TOMBSTONE for resolved/cancelled incidents
// after 48 hours, but only once every event in the incident is cloud-synced
// (§8.3, SRS §3.1.15). The fold pipeline's tombstone filter does the purge.

import { getStore } from "./store/eventStore";
import { createTombstoneEvent } from "./eventCreator";
import { CONFIDENCE } from "./shared/enums";

const GC_CHECK_INTERVAL_MS = 60 * 60 * 1000; // check hourly
const PURGE_AGE_MS = 48 * 60 * 60 * 1000;    // 48h after resolution

let timer = null;
let broadcast = null;
const tombstoned = new Set();

export function startGc(broadcastFn) {
  broadcast = broadcastFn;
  if (timer) return;
  timer = setInterval(() => {
    checkAndPurge().catch((e) => console.log("[GC] Error:", e.message));
  }, GC_CHECK_INTERVAL_MS);
  console.log("[GC] Tombstone GC started — checking every hour");
}

export function stopGc() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function isTombstoned(incidentId) {
  return tombstoned.has(incidentId);
}

async function checkAndPurge() {
  const store = getStore();
  const { incidents } = await store.getProjection();
  const allEvents = await store.getAll();
  const now = Date.now();

  for (const inc of incidents || []) {
    if (tombstoned.has(inc.id)) continue;

    const done =
      inc.confidence_code === CONFIDENCE.RESOLVED ||
      inc.confidence_code === CONFIDENCE.CANCELLED;
    if (!done) continue;

    const ageMs = now - (inc.updated_at || inc.created_at || 0);
    if (ageMs < PURGE_AGE_MS) continue;

    // Only purge once every event for this incident reached the cloud —
    // otherwise unsynced events would be orphaned (§8.3).
    const incEvents = allEvents.filter((e) => e.incident_id === inc.id);
    if (!incEvents.length || !incEvents.every((e) => e.is_cloud_synced)) {
      console.log(`[GC] Deferred tombstone for ${inc.id}: unsynced events remain`);
      continue;
    }

    const tombstone = createTombstoneEvent(inc.id);
    await store.insert(tombstone);
    tombstoned.add(inc.id);
    console.log(`[GC] Emitted TOMBSTONE for ${inc.id} (age ${Math.round(ageMs / 3600000)}h)`);
    if (broadcast) broadcast(tombstone).catch(() => {});
  }
}
