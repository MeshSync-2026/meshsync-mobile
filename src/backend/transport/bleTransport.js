import { MeshTransport } from "./meshTransport";
import { getStore } from "../store/eventStore";
import { getNodeId, getActiveRole } from "../store/hotState";
import { PeerDiscoveryManager } from "./peerDiscoveryManager";

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
    console.log(`[BLE Transport] Starting production BLE transport for node ${this.nodeId} (${this.role})...`);

    try {
      this.peerDiscovery = new PeerDiscoveryManager(
        this.nodeId,
        this.role,
        async (peerId, rawPayload) => {
          console.log(`[BLE Transport] Processing incoming payload from peer: ${peerId}`);
          try {
            const incomingEvents = JSON.parse(rawPayload);
            if (Array.isArray(incomingEvents) && incomingEvents.length > 0) {
              const store = getStore();
              const newEvents = [];

              for (const evt of incomingEvents) {
                if (!evt || !evt.id) continue;
                const originNodeId = evt.origin_node_id || evt.originNodeId || "unknown";
                const seq = evt.seq ?? 0;
                const seen = await store.hasSeen(originNodeId, seq);
                if (seen) continue;

                const normalizedEvt = {
                  ...evt,
                  origin_node_id: originNodeId,
                  seq,
                };
                const inserted = await store.insert(normalizedEvt);
                await store.markSeen(originNodeId, seq);
                if (inserted !== false) {
                  newEvents.push(normalizedEvt);
                }
              }

              if (newEvents.length > 0) {
                console.log(`[BLE Transport] Ingested ${newEvents.length} new mesh events from peer ${peerId}`);
                this.emitEvents(newEvents);

                // Refresh local GATT characteristic payload with newly ingested events
                const allEvents = await store.getAll();
                this.peerDiscovery.updateLocalPayload(JSON.stringify(allEvents), false);
              }
            }
          } catch (jsonErr) {
            console.error("[BLE Transport] Failed to parse received JSON payload:", jsonErr);
          }
        }
      );

      // Load initial local events into GATT payload before advertising
      const currentEvents = await getStore().getAll();
      this.peerDiscovery.updateLocalPayload(JSON.stringify(currentEvents), false);

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
      // Whenever local event log updates, refresh the BLE GATT payload and immediately push to discovered peers
      const allEvents = await getStore().getAll();
      const payloadStr = JSON.stringify(allEvents);
      this.peerDiscovery.updateLocalPayload(payloadStr, true);
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
