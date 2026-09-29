import { MeshTransport } from "./meshTransport";
import { getStore } from "../store/eventStore";
import { getNodeId, getActiveRole } from "../store/hotState";
import { PeerDiscoveryManager } from "./peerDiscoveryManager";
import { diagLog } from "../utils/diagnosticLogger";

export class BleTransport extends MeshTransport {
  constructor(nodeId, role) {
    super();
    this.nodeId = nodeId || getNodeId();
    this.role = role || getActiveRole() || "civilian";
    this.isActive = false;
    this.peerDiscovery = null;
    this.initialized = false;
  }

  async start() {
    if (this.isActive) return;
    this.isActive = true;
    diagLog.info("TRANSPORT", `Starting BLE transport for node ${this.nodeId} (${this.role})`);

    try {
      this.peerDiscovery = new PeerDiscoveryManager(
        this.nodeId,
        this.role,
        async (peerId, rawPayload) => {
          diagLog.info("TRANSPORT", `Processing payload from peer: ${peerId} (${rawPayload?.length || 0} bytes)`);
          try {
            const incomingEvents = JSON.parse(rawPayload);
            const eventsList = Array.isArray(incomingEvents)
              ? incomingEvents
              : incomingEvents?.events && Array.isArray(incomingEvents.events)
              ? incomingEvents.events
              : incomingEvents && incomingEvents.id
              ? [incomingEvents]
              : [];

            if (eventsList.length > 0) {
              const store = getStore();
              const newEvents = [];

              for (const evt of eventsList) {
                if (!evt || !evt.id) continue;
                const seen = await store.hasSeen(evt.origin_node_id, evt.seq);
                if (seen) continue;

                await store.insert(evt);
                await store.markSeen(evt.origin_node_id, evt.seq);
                newEvents.push(evt);
              }

              if (newEvents.length > 0) {
                diagLog.success("TRANSPORT", `Ingested ${newEvents.length} new mesh events from peer ${peerId}`);
                diagLog.updateState({
                  eventsIngestedCount: (diagLog.state.eventsIngestedCount || 0) + newEvents.length,
                });
                this.emitEvents(newEvents);

                // Update local advertising payload with newly ingested events
                await this.sendEvents();
              } else {
                diagLog.info("TRANSPORT", `Received ${eventsList.length} events from ${peerId}, but all were already seen`);
              }
            } else {
              diagLog.warn("TRANSPORT", `Received empty event list from peer ${peerId}`);
            }
          } catch (jsonErr) {
            diagLog.error("TRANSPORT", `Failed to parse payload from ${peerId}: ${jsonErr.message}`);
          }
        }
      );

      // Load initial local events into GATT payload before advertising
      const currentEvents = await getStore().getAll();
      this.peerDiscovery.updateLocalPayload(JSON.stringify(currentEvents));

      await this.peerDiscovery.start();
      this.initialized = true;
    } catch (err) {
      console.error("[BLE Transport] Error starting BLE transport:", err);
    }
  }

  async stop() {
    if (!this.isActive) return;
    this.isActive = false;
    console.log("[BLE Transport] Stopping BLE transport...");

    if (this.peerDiscovery && typeof this.peerDiscovery.stop === "function") {
      try {
        await this.peerDiscovery.stop();
      } catch (err) {
        console.error("[BLE Transport] Error stopping peer discovery:", err);
      }
    }
    this.peerDiscovery = null;
    this.initialized = false;
  }

  async sendEvents(events) {
    if (!this.isActive || !this.peerDiscovery) return;

    try {
      // Whenever local event log updates, refresh the BLE GATT payload
      const allEvents = await getStore().getAll();
      const payloadStr = JSON.stringify(allEvents);
      this.peerDiscovery.updateLocalPayload(payloadStr);

      // Actively push newly broadcasted events to all known active peers immediately
      if (typeof this.peerDiscovery.syncWithActivePeers === "function") {
        this.peerDiscovery.syncWithActivePeers().catch(() => {});
      }
    } catch (err) {
      console.error("[BLE Transport] Error updating BLE payload:", err);
    }
  }

  get isConnected() {
    return this.isActive && this.initialized;
  }

  getPeerCount() {
    if (!this.peerDiscovery) return 0;
    return typeof this.peerDiscovery.getPeerCount === "function"
      ? this.peerDiscovery.getPeerCount()
      : (this.peerDiscovery.discoveredDevices?.size || 0);
  }
}
