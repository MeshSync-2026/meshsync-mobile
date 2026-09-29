// Heartbeat service — emits SOS_ALIVE every 30 minutes while this device
// has an active SOS incident (Architecture Plan §6.1, SRS §3.1.2).

import { getStore } from "./store/eventStore";
import { createHeartbeatEvent } from "./eventCreator";
import { getNodeId } from "./store/hotState";
import { REPORT_TYPE, CONFIDENCE } from "./shared/enums";

const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let timer = null;
let broadcast = null;

export function startHeartbeat(broadcastFn) {
  broadcast = broadcastFn;
  if (timer) return;
  timer = setInterval(() => {
    checkAndEmit().catch((e) => console.log("[Heartbeat] Error:", e.message));
  }, HEARTBEAT_INTERVAL_MS);
  console.log("[Heartbeat] Service started — every 30 minutes while SOS is active");
}

export function stopHeartbeat() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function checkAndEmit() {
  const store = getStore();
  const nodeId = getNodeId();
  const { incidents } = await store.getProjection();

  const myActiveSos = (incidents || []).filter(
    (inc) =>
      inc.creator_node_id === nodeId &&
      inc.report_type_code === REPORT_TYPE.SOS &&
      inc.confidence_code !== CONFIDENCE.RESOLVED &&
      inc.confidence_code !== CONFIDENCE.CANCELLED
  );

  for (const inc of myActiveSos) {
    const heartbeat = createHeartbeatEvent(inc.id, {
      latitude: inc.latitude,
      longitude: inc.longitude,
    });
    await store.insert(heartbeat);
    console.log(`[Heartbeat] Emitted SOS_ALIVE for incident ${inc.id}`);
    if (broadcast) broadcast(heartbeat).catch(() => {});
  }
}
