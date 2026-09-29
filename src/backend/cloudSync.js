import NetInfo from "@react-native-community/netinfo";
import { getStore } from "./store/eventStore";
import { ingestBatch, pullEvents } from "./cloudApi";
import { getNodeId, getLastCloudSyncHlc, setLastCloudSyncHlc } from "./store/hotState";
import { sortByPriority } from "./shared/priority";

const RETRY_INTERVAL_MS = 60 * 1000; // retry uploads every minute (Render cold starts, transient failures)

let unsubscribe;
let retryTimer;
let syncing = false;

export function startCloudSync() {
  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncNow().catch((e) => console.log("[cloudSync] retry later:", e.message));
    }
  });
  // Periodic retry: events whose upload failed (offline, cold start) still
  // reach the cloud without waiting for the next connectivity flip.
  retryTimer = setInterval(() => {
    syncNow().catch((e) => console.log("[cloudSync] retry later:", e.message));
  }, RETRY_INTERVAL_MS);
  return unsubscribe;
}

export function stopCloudSync() {
  unsubscribe?.();
  unsubscribe = undefined;
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = null;
}

/**
 * Push unsynced events to Edge Sync, then pull new events back (§5.3, §11.2).
 * Safe to call repeatedly — concurrent calls are coalesced.
 */
export async function syncNow() {
  if (syncing) return { pushed: 0, received: 0 };
  syncing = true;
  try {
    const pushed = await pushToCloud();
    const received = await pullFromCloud();
    return { pushed, received };
  } finally {
    syncing = false;
  }
}

async function pushToCloud() {
  const store = getStore();
  const unsynced = await store.getUnsynced();
  if (!unsynced.length) return 0;

  const sorted = sortByPriority(unsynced);
  const body = await ingestBatch(sorted, getNodeId());

  // Only mark rows the server confirmed (inserted or duplicate_ignored).
  // Rejected rows stay unsynced so they can be fixed and retried (§11.3).
  const items = Array.isArray(body.items) ? body.items : [];
  const confirmedIds = items
    .filter((it) => it.row_id && (it.outcome === "inserted" || it.outcome === "duplicate_ignored"))
    .map((it) => it.row_id);
  if (confirmedIds.length) {
    await store.markSynced(confirmedIds);
    const highestConfirmed = sorted
      .filter((e) => confirmedIds.includes(e.id))
      .reduce((max, e) => (e.hlc_timestamp > max ? e.hlc_timestamp : max), "0");
    if (highestConfirmed !== "0") advanceWatermark(highestConfirmed);
  }

  return body.new_count ?? 0;
}

async function pullFromCloud() {
  const store = getStore();
  const events = await pullEvents(getLastCloudSyncHlc());

  let received = 0;
  for (const raw of events) {
    if (await store.insert(normalizeCloudEvent(raw))) received++;
  }
  if (events.length) advanceWatermark(events[events.length - 1].hlc_timestamp);

  return received;
}

/**
 * The cloud serves Postgres-native types (bigint seq → string, timestamptz →
 * ISO string). Normalize to what the local store expects, and mark pulled
 * rows as already cloud-synced so they are never re-pushed (§11.3 grow-only).
 */
function normalizeCloudEvent(evt) {
  return {
    ...evt,
    seq: typeof evt.seq === "number" ? evt.seq : parseInt(evt.seq, 10) || 0,
    created_at:
      typeof evt.created_at === "number" ? evt.created_at : Date.parse(evt.created_at) || 0,
    is_cloud_synced: true,
  };
}

function advanceWatermark(hlc) {
  const current = getLastCloudSyncHlc();
  if (hlc && (!current || hlc > current)) setLastCloudSyncHlc(hlc);
}
