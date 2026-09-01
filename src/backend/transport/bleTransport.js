// bleTransport.js
// BLE mesh transport implementation (Path A)

import { MeshTransport } from "./meshTransport.js";
import { getStore } from "../store/eventStore.js";

export class BleTransport extends MeshTransport {
  constructor(nodeId, role) {
    super();
    this.nodeId = nodeId;
    this.role = role || "civilian";
    this.isActive = false;
    this.peerDiscovery = null;
    this.initialized = false;
  }

  async start() {
    if (this.isActive) return;
    this.isActive = true;
    console.log(`[BLE Transport] Starting for node ${this.nodeId} (${this.role})...`);

    try {
      // Lazy load dependencies to avoid crashes if native modules are not linked/present
      // Attempt to load the local peer discovery manager or simulate it
      let PeerDiscoveryManager;
      try {
        const BLEModule = require("./peerDiscoveryManager");
        PeerDiscoveryManager = BLEModule.PeerDiscoveryManager;
      } catch (err) {
        console.warn("[BLE Transport] Native BLE modules or peerDiscoveryManager load failed, running in simulation mode:", err.message);
      }

      if (PeerDiscoveryManager) {
        this.peerDiscovery = new PeerDiscoveryManager(
          this.nodeId,
          this.role,
          async (peerId, rawPayload) => {
            console.log(`[BLE Transport] Received payload from peer: ${peerId}`);
            try {
              const incomingEvents = JSON.parse(rawPayload);
              if (Array.isArray(incomingEvents)) {
                // Add received events to store and propagate them to listeners
                const store = getStore();
                for (const evt of incomingEvents) {
                  const seen = await store.hasSeen(evt.origin_node_id, evt.seq);
                  if (seen) continue;
                  await store.insert(evt);
                  await store.markSeen(evt.origin_node_id, evt.seq);
                }
                this.emitEvents(incomingEvents);
              }
            } catch (jsonErr) {
              console.error("[BLE Transport] Failed to parse received JSON payload:", jsonErr);
            }
          }
        );

        // Update with the current G-Set log before starting
        const currentEvents = await getStore().getAll();
        this.peerDiscovery.updateLocalPayload(JSON.stringify(currentEvents));

        await this.peerDiscovery.start();
        this.initialized = true;
      } else {
        // Run simulated BLE peer discovery
        await this._startSimulation();
      }
    } catch (err) {
      console.error("[BLE Transport] Error starting BLE transport:", err);
      await this._startSimulation();
    }
  }

  async stop() {
    if (!this.isActive) return;
    this.isActive = false;
    console.log("[BLE Transport] Stopping BLE transport...");

    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }

    if (this.peerDiscovery && typeof this.peerDiscovery.stop === "function") {
      try {
        await this.peerDiscovery.stop();
      } catch (err) {
        console.error("[BLE Transport] Error stopping peer discovery:", err);
      }
    }
  }

  async sendEvents(events) {
    // Whenever our local event log updates, we serialize all events and update the BLE advertisement payload.
    // This makes the local G-Set log discoverable to other peers.
    const allEvents = await getStore().getAll();
    const payloadStr = JSON.stringify(allEvents);

    if (this.peerDiscovery && typeof this.peerDiscovery.updateLocalPayload === "function") {
      try {
        this.peerDiscovery.updateLocalPayload(payloadStr);
      } catch (err) {
        console.error("[BLE Transport] Error updating BLE payload:", err);
      }
    } else {
      console.log(`[BLE Transport Simulation] Updated local advertising payload: ${allEvents.length} events.`);
      this.simPayload = payloadStr;
    }
  }

  get isConnected() {
    // BLE is peer-to-peer / connectionless-mesh, so it's active as long as scanner/advertiser are running
    return this.isActive;
  }

  async _startSimulation() {
    console.log("[BLE Transport Simulation] BLE simulation started.");
    const allEvents = await getStore().getAll();
    this.simPayload = JSON.stringify(allEvents);

    // Periodically simulate finding a peer and exchanging logs
    this.simInterval = setInterval(() => {
      if (!this.isActive) return;

      // Simulate a random peer ID
      const peerNodeId = `sim-node-${Math.floor(1000 + Math.random() * 9000)}`;
      console.log(`[BLE Transport Simulation] Discovered simulated peer: ${peerNodeId}`);

      // Simulate receiving some random events or an empty exchange
      // In a real environment, we'd pull their payload. We can simulate they sent an empty array.
      this.emitEvents([]);
    }, 15000);
  }
}

