import NetInfo from "@react-native-community/netinfo";
import { getStore } from "./store/eventStore";
import { ingestBatch, pullEvents } from "./cloudApi";
import { getNodeId, getLastCloudSyncHlc, setLastCloudSyncHlc } from "./store/hotState";
import { sortByPriority } from "./shared/priority";

let unsubscribe;
let syncing = false;

export function startCloudSync() {
  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncNow().catch((e) => console.log("[cloudSync] retry later:", e.message));
    }
  });
  return unsubscribe;
}

export function stopCloudSync() {
  unsubscribe?.();
  unsubscribe = undefined;
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
  for (const evt of events) {
    if (await store.insert(evt)) received++;
  }
  if (events.length) advanceWatermark(events[events.length - 1].hlc_timestamp);

  return received;
}

function advanceWatermark(hlc) {
  const current = getLastCloudSyncHlc();
  if (hlc && (!current || hlc > current)) setLastCloudSyncHlc(hlc);
}
