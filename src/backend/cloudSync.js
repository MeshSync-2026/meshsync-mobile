import NetInfo from "@react-native-community/netinfo";
import { getStore } from "./store/eventStore";
import { ingestBatch } from "./cloudApi";
import { getNodeId } from "./store/hotState";

let unsubscribe;
export function startCloudSync() {
  unsubscribe = NetInfo.addEventListener((state) => state.isConnected && trySync());
}
export function stopCloudSync() { unsubscribe?.(); }

async function trySync() {
  const store = getStore();
  const unsynced = await store.getUnsynced();
  if (!unsynced.length) return;
  try {
    await ingestBatch(unsynced, getNodeId());
    await store.markSynced(unsynced.map((e) => e.id));
  } catch (e) {
    console.log("[cloudSync] retry later:", e.message);
  }
}
