// peerDiscoveryManager.js
// Production Native BLE Mesh Peer Discovery & GATT Sync Manager

import { Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

// Custom UUIDs for MeshSync BLE mesh network
export const SERVICE_UUID = "d3f9c1e7-e4e3-406f-9c1d-77a427ea2a3b";
export const CHAR_READ_UUID = "c1e70001-e4e3-406f-9c1d-77a427ea2a3b";
export const CHAR_WRITE_UUID = "c1e70002-e4e3-406f-9c1d-77a427ea2a3b";

// Chunk payload size (safe MTU budget for BLE ATT transfers across iOS & Android)
const CHUNK_PAYLOAD_SIZE = 180;
const CONNECTION_COOLDOWN_MS = 15000;
const TRANSFER_EXPIRY_MS = 30000;

// Request runtime Bluetooth permissions on Android
export async function requestBluetoothPermissions() {
  if (Platform.OS !== "android") return true;

  try {
    if (Platform.Version >= 31) {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error("[PeerDiscovery] Permissions request failed:", err);
    return false;
  }
}

/**
 * Splits a raw string into framed BLE chunks.
 */
export function chunkPayload(payloadString, transferId = Math.random().toString(36).substring(2, 8)) {
  const base64 = Buffer.from(payloadString, "utf-8").toString("base64");
  const totalChunks = Math.ceil(base64.length / CHUNK_PAYLOAD_SIZE) || 1;
  const chunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_PAYLOAD_SIZE;
    const slice = base64.substring(start, start + CHUNK_PAYLOAD_SIZE);
    chunks.push(
      JSON.stringify({
        t: transferId,
        i,
        n: totalChunks,
        d: slice,
      })
    );
  }

  return chunks;
}

/**
 * State machine for reassembling chunked BLE transfers.
 */
export class ChunkReassembler {
  constructor() {
    this.transfers = new Map(); // transferId -> { total, chunks: Map<idx, data>, timestamp }
  }

  feedChunk(chunkJsonString) {
    this._cleanupExpired();

    try {
      const packet = JSON.parse(chunkJsonString);
      if (!packet || typeof packet.t !== "string" || typeof packet.i !== "number") {
        // Fallback for non-chunked raw JSON payload
        return typeof chunkJsonString === "string" ? chunkJsonString : null;
      }

      const { t: transferId, i: chunkIndex, n: totalChunks, d: data } = packet;

      if (!this.transfers.has(transferId)) {
        this.transfers.set(transferId, {
          total: totalChunks,
          chunks: new Map(),
          timestamp: Date.now(),
        });
      }

      const record = this.transfers.get(transferId);
      record.chunks.set(chunkIndex, data);
      record.timestamp = Date.now();

      if (record.chunks.size === record.total) {
        // All chunks assembled
        let fullBase64 = "";
        for (let idx = 0; idx < record.total; idx++) {
          fullBase64 += record.chunks.get(idx) || "";
        }
        this.transfers.delete(transferId);
        return Buffer.from(fullBase64, "base64").toString("utf-8");
      }

      return null; // Awaiting remaining chunks
    } catch (err) {
      console.warn("[ChunkReassembler] Malformed chunk packet:", err.message);
      return null;
    }
  }

  _cleanupExpired() {
    const now = Date.now();
    for (const [id, rec] of this.transfers.entries()) {
      if (now - rec.timestamp > TRANSFER_EXPIRY_MS) {
        this.transfers.delete(id);
      }
    }
  }
}

export class PeerDiscoveryManager {
  constructor(nodeId, role, onPayloadReceived) {
    this.nodeId = nodeId;
    this.role = role || "civilian";
    this.onPayloadReceived = onPayloadReceived;

    this.bleManager = new BleManager();
    this.peripheral = null;
    this.reassembler = new ChunkReassembler();

    this.active = false;
    this.localPayload = "[]";
    this.lastConnections = new Map(); // peerNodeId -> timestamp
    this.connectingPeers = new Set(); // peerNodeId
    this.discoveredDevices = new Map(); // peerNodeId -> { device, lastSeen }
  }

  getPeerCount() {
    const now = Date.now();
    let activePeers = 0;
    for (const [id, entry] of this.discoveredDevices.entries()) {
      const lastSeen = (entry && entry.lastSeen) || 0;
      if (now - lastSeen < 60000) {
        activePeers++;
      } else {
        this.discoveredDevices.delete(id);
      }
    }
    return activePeers;
  }

  updateLocalPayload(payloadString) {
    this.localPayload = payloadString;
    this._syncLocalPayloadToGatt();
  }

  async _syncLocalPayloadToGatt() {
    if (this.peripheral && this.active) {
      try {
        let payloadToSend = this.localPayload;
        // If payload is larger than standard BLE ATT budget, extract the most recent events
        if (Buffer.byteLength(payloadToSend, "utf-8") > 512) {
          try {
            const parsed = JSON.parse(payloadToSend);
            if (Array.isArray(parsed)) {
              const trimmed = [];
              for (let i = parsed.length - 1; i >= 0; i--) {
                trimmed.unshift(parsed[i]);
                if (Buffer.byteLength(JSON.stringify(trimmed), "utf-8") > 480) {
                  trimmed.shift();
                  break;
                }
              }
              payloadToSend = JSON.stringify(trimmed);
            }
          } catch (_) {}
        }
        const base64Val = Buffer.from(payloadToSend, "utf-8").toString("base64");
        await this.peripheral.updateValue(
          SERVICE_UUID,
          CHAR_READ_UUID,
          base64Val
        );
      } catch (err) {
        console.error("[PeerDiscovery] Failed to update GATT payload:", err.message);
      }
    }
  }

  async start() {
    if (this.active) return;

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      console.warn("[PeerDiscovery] Bluetooth permissions denied. BLE mesh unavailable.");
      return;
    }

    this.active = true;
    console.log(`[PeerDiscovery] Starting production BLE mesh for Node ${this.nodeId}...`);

    // 1. Initialize Peripheral / GATT Server Advertising
    await this._startPeripheral();

    // 2. Initialize Central / Device Scanner
    await this._startCentral();
  }

  async _startPeripheral() {
    try {
      const PeripheralModule = require("react-native-multi-ble-peripheral").default;
      const { Permission, Property } = require("react-native-multi-ble-peripheral");

      if (!PeripheralModule) return;

      const advName = `MeshSync-${this.nodeId || "node"}`;
      PeripheralModule.setDeviceName(advName);
      this.peripheral = new PeripheralModule();

      this.peripheral.on("ready", async () => {
        if (!this.active) return;
        try {
          await this.peripheral.addService(SERVICE_UUID, true);

          // Read Characteristic (for peers to pull our events)
          await this.peripheral.addCharacteristic(
            SERVICE_UUID,
            CHAR_READ_UUID,
            Property.READ | Property.NOTIFY,
            Permission.READABLE
          );

          // Write Characteristic (for peers to push their unsynced events to us)
          await this.peripheral.addCharacteristic(
            SERVICE_UUID,
            CHAR_WRITE_UUID,
            Property.WRITE | Property.WRITE_NO_RESPONSE,
            Permission.WRITEABLE
          );

          if (!this.active) return;
          await this._syncLocalPayloadToGatt();
          await this.peripheral.startAdvertising();
          if (this.active) {
            console.log(`[PeerDiscovery] BLE Peripheral advertising started as ${advName}`);
          }
        } catch (err) {
          if (this.active) {
            console.error("[PeerDiscovery] Failed to start peripheral services:", err);
          }
        }
      });

      // Handle incoming writes from connected Central peers
      if (typeof this.peripheral.on === "function") {
        this.peripheral.on("characteristicWrite", (charUuid, base64Value, peerAddress) => {
          if (charUuid && charUuid.toLowerCase() === CHAR_WRITE_UUID.toLowerCase()) {
            try {
              const chunkStr = Buffer.from(base64Value, "base64").toString("utf-8");
              const fullPayload = this.reassembler.feedChunk(chunkStr);
              if (fullPayload && this.onPayloadReceived) {
                this.onPayloadReceived(peerAddress || "unknown-peer", fullPayload);
              }
            } catch (err) {
              console.error("[PeerDiscovery] Error processing incoming GATT write:", err);
            }
          }
        });
      }
    } catch (err) {
      console.warn("[PeerDiscovery] react-native-multi-ble-peripheral native module not available:", err.message);
    }
  }

  async _startCentral() {
    try {
      this.bleManager.startDeviceScan(
        null, // Scan all devices to inspect names and service UUIDs reliably on all Android chipsets
        { allowDuplicates: true },
        async (error, device) => {
          if (error) {
            console.error("[PeerDiscovery] BLE Scan error:", error?.message || error);
            return;
          }

          const devName =
            device?.name && device.name.startsWith("MeshSync-")
              ? device.name
              : device?.localName && device.localName.startsWith("MeshSync-")
              ? device.localName
              : null;

          if (devName) {
            const peerNodeId = devName.substring("MeshSync-".length).trim();
            if (!peerNodeId || peerNodeId === this.nodeId) return; // Skip self

            this.discoveredDevices.set(peerNodeId, { device, lastSeen: Date.now() });

            const now = Date.now();
            const lastConnect = this.lastConnections.get(peerNodeId) || 0;
            if (now - lastConnect < CONNECTION_COOLDOWN_MS) return;
            if (this.connectingPeers.has(peerNodeId)) return;

            // Collision Avoidance: Add randomized jitter delay before connecting
            const jitterMs = 300 + Math.floor(Math.random() * 800);
            setTimeout(() => {
              const currentNow = Date.now();
              const recentConnect = this.lastConnections.get(peerNodeId) || 0;
              if (
                this.active &&
                !this.connectingPeers.has(peerNodeId) &&
                currentNow - recentConnect >= CONNECTION_COOLDOWN_MS
              ) {
                this._connectAndSync(device, peerNodeId);
              }
            }, jitterMs);
          }
        }
      );
      console.log("[PeerDiscovery] BLE Central scanner started.");
    } catch (err) {
      console.error("[PeerDiscovery] Failed to start BLE scanner:", err);
    }
  }

  async _connectAndSync(device, peerNodeId) {
    if (this.connectingPeers.has(peerNodeId)) return;
    this.connectingPeers.add(peerNodeId);
    this.lastConnections.set(peerNodeId, Date.now());

    let connectedDevice = null;
    console.log(`[PeerDiscovery] Initiating bidirectional sync with peer: ${peerNodeId}...`);

    try {
      connectedDevice = await device.connect({ timeout: 8000 });

      // Request higher MTU if supported (Android)
      if (Platform.OS === "android" && typeof connectedDevice.requestMTU === "function") {
        try {
          await connectedDevice.requestMTU(512);
        } catch (mtuErr) {
          // Fallback to default MTU
        }
      }

      await connectedDevice.discoverAllServicesAndCharacteristics();

      // 1. Central READS Remote Peer's events
      try {
        const readChar = await connectedDevice.readCharacteristic(
          SERVICE_UUID,
          CHAR_READ_UUID
        );

        if (readChar && readChar.value) {
          const rawChunk = Buffer.from(readChar.value, "base64").toString("utf-8");
          const fullPayload = this.reassembler.feedChunk(rawChunk);
          if (fullPayload && this.onPayloadReceived) {
            console.log(`[PeerDiscovery] Successfully synced events FROM peer ${peerNodeId}`);
            this.onPayloadReceived(peerNodeId, fullPayload);
          }
        }
      } catch (readErr) {
        console.warn(`[PeerDiscovery] Read from peer ${peerNodeId} failed:`, readErr.message);
      }

      // 2. Central WRITES Local events TO Remote Peer (Bidirectional Sync)
      try {
        if (this.localPayload && this.localPayload !== "[]") {
          const chunks = chunkPayload(this.localPayload);
          for (const chunk of chunks) {
            const base64Chunk = Buffer.from(chunk, "utf-8").toString("base64");
            await connectedDevice.writeCharacteristicWithResponseForService(
              SERVICE_UUID,
              CHAR_WRITE_UUID,
              base64Chunk
            );
          }
          console.log(`[PeerDiscovery] Successfully synced local events TO peer ${peerNodeId}`);
        }
      } catch (writeErr) {
        // Fallback: If WRITE with response fails, attempt writeWithoutResponse
        try {
          const chunks = chunkPayload(this.localPayload);
          for (const chunk of chunks) {
            const base64Chunk = Buffer.from(chunk, "utf-8").toString("base64");
            await connectedDevice.writeCharacteristicWithoutResponseForService(
              SERVICE_UUID,
              CHAR_WRITE_UUID,
              base64Chunk
            );
          }
        } catch (fallbackErr) {
          console.warn(`[PeerDiscovery] Write to peer ${peerNodeId} failed:`, fallbackErr.message);
        }
      }
    } catch (err) {
      console.error(`[PeerDiscovery] Sync session with peer ${peerNodeId} failed:`, err.message);
    } finally {
      this.connectingPeers.delete(peerNodeId);
      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
          console.log(`[PeerDiscovery] Disconnected cleanly from peer ${peerNodeId}`);
        } catch (err) {
          // ignore disconnect errors
        }
      }
    }
  }

  async stop() {
    if (!this.active) return;
    this.active = false;
    console.log("[PeerDiscovery] Stopping BLE mesh...");

    try {
      this.bleManager.stopDeviceScan();
    } catch (err) {
      // ignore
    }

    if (this.peripheral) {
      try {
        await this.peripheral.stopAdvertising();
      } catch (err) {
        // ignore
      }
    }

    this.connectingPeers.clear();
    this.discoveredDevices.clear();
  }
}
