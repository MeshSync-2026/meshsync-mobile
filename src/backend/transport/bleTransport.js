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

  async _buildBlePayload(priorityEvents = []) {
    const allEvents = await getStore().getAll();
    const mergedMap = new Map();

    if (Array.isArray(priorityEvents)) {
      for (const evt of priorityEvents) {
        if (evt && evt.id) mergedMap.set(evt.id, evt);
      }
    }
    if (Array.isArray(allEvents)) {
      for (const evt of allEvents) {
        if (evt && evt.id && !mergedMap.has(evt.id)) {
          mergedMap.set(evt.id, evt);
        }
      }
    }

    const sorted = Array.from(mergedMap.values())
      .sort((a, b) => (b.created_at || b.createdAt || 0) - (a.created_at || a.createdAt || 0))
      .slice(0, 10)
      .map((evt) => {
        const compact = {};
        for (const [k, v] of Object.entries(evt)) {
          if (v === null || v === undefined) continue;
          if (k === "is_cloud_synced") continue;
          if (k === "severity" && evt.severity_level != null) continue;
          compact[k] = v;
        }
        return compact;
      });

    return JSON.stringify(sorted);
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
                const payloadStr = await this._buildBlePayload(newEvents);
                this.peerDiscovery.updateLocalPayload(payloadStr, false);
              }
            }
          } catch (jsonErr) {
            console.error("[BLE Transport] Failed to parse received JSON payload:", jsonErr);
          }
        }
      );

      // Load initial local events into GATT payload before advertising
      const initialPayload = await this._buildBlePayload();
      this.peerDiscovery.localPayload = initialPayload;

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
      const payloadStr = await this._buildBlePayload(events);
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
