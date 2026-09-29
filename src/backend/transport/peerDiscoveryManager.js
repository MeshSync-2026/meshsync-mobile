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
      // Check if Bluetooth permissions are already granted
      if (typeof PermissionsAndroid.check === "function") {
        const hasScan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const hasConnect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        if (hasScan && hasConnect) {
          return true;
        }
      }

      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
      const granted = await PermissionsAndroid.requestMultiple(permissions);

      // On Android 12+ (API 31+), BLUETOOTH_SCAN and BLUETOOTH_CONNECT are the mandatory permissions.
      // Do not block BLE operation if ACCESS_FINE_LOCATION is denied or approximate.
      const scanGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const connectGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;

      return Boolean(scanGranted && connectGranted);
    } else {
      if (typeof PermissionsAndroid.check === "function") {
        const hasFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (hasFine) return true;
      }
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

      const shortId = (this.nodeId || "node").slice(-6);
      const advName = `MS-${shortId}`;
      try {
        await PeripheralModule.setDeviceName(advName);
      } catch (_) {}

      this.peripheral = new PeripheralModule();

      if (typeof this.peripheral.on === "function") {
        this.peripheral.on("error", (err) => {
          console.warn("[PeerDiscovery] BLE Peripheral native module error:", err?.message || err);
        });
      }

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

          // Pass options object directly so services are not duplicated with empty service-data.
          // This keeps the legacy BLE packet under the mandatory 31-byte Android limit.
          await this.peripheral.startAdvertising({
            includeDeviceName: true,
            connectable: true,
          });

          if (this.active) {
            console.log(`[PeerDiscovery] BLE Peripheral advertising started as ${advName}`);
          }
        } catch (err) {
          if (this.active) {
            console.error("[PeerDiscovery] Failed to start peripheral services:", err?.message || err);
          }
        }
      });

      // Handle incoming writes from connected Central peers
      if (typeof this.peripheral.on === "function") {
        const onWriteHandler = (arg1, arg2, arg3) => {
          try {
            // react-native-multi-ble-peripheral emits:
            // 'write', { device, service, characteristic, offset, value }
            let charUuid, base64Val, peerAddr;
            if (arg1 && typeof arg1 === "object") {
              charUuid = arg1.characteristic;
              base64Val = arg1.value;
              peerAddr = arg1.device;
            } else {
              charUuid = arg1;
              base64Val = arg2;
              peerAddr = arg3;
            }

            if (charUuid && charUuid.toLowerCase() === CHAR_WRITE_UUID.toLowerCase()) {
              if (base64Val) {
                const chunkStr = Buffer.from(base64Val, "base64").toString("utf-8");
                const fullPayload = this.reassembler.feedChunk(chunkStr);
                if (fullPayload && this.onPayloadReceived) {
                  this.onPayloadReceived(peerAddr || "unknown-peer", fullPayload);
                }
              }
            }
          } catch (err) {
            console.error("[PeerDiscovery] Error processing incoming GATT write:", err);
          }
        };

        this.peripheral.on("write", onWriteHandler);
        this.peripheral.on("characteristicWrite", onWriteHandler);
      }
    } catch (err) {
      console.warn("[PeerDiscovery] react-native-multi-ble-peripheral native module not available:", err.message);
    }
  }

  async syncWithActivePeers() {
    if (!this.active || this.discoveredDevices.size === 0) return;
    const now = Date.now();
    for (const [peerId, record] of this.discoveredDevices.entries()) {
      if (now - record.lastSeen < 60000 && !this.connectingPeers.has(peerId)) {
        this._connectAndSync(record.device, peerId).catch(() => {});
      }
    }
  }

  async _startCentral() {
    try {
      // Check current Bluetooth adapter state before scanning
      if (typeof this.bleManager.state === "function") {
        const currentState = await this.bleManager.state();
        if (currentState === "PoweredOn") {
          this._beginScanning();
          return;
        }

        console.log(`[PeerDiscovery] BLE adapter state is '${currentState}'. Awaiting PoweredOn...`);
        if (typeof this.bleManager.onStateChange === "function") {
          const subscription = this.bleManager.onStateChange((state) => {
            if (state === "PoweredOn") {
              console.log("[PeerDiscovery] BLE adapter is now PoweredOn. Starting central scanner...");
              try {
                if (subscription && typeof subscription.remove === "function") {
                  subscription.remove();
                }
              } catch (_) {}
              if (this.active) {
                this._beginScanning();
              }
            }
          }, true);
          return;
        }
      }

      this._beginScanning();
    } catch (err) {
      console.error("[PeerDiscovery] Failed to verify BLE state:", err?.message || err);
      this._beginScanning();
    }
  }

  _beginScanning() {
    if (!this.active) return;

    try {
      this.bleManager.stopDeviceScan();
    } catch (_) {}

    try {
      this.bleManager.startDeviceScan(
        null, // Scan all devices to inspect names and service UUIDs reliably on all Android chipsets
        { allowDuplicates: true },
        async (error, device) => {
          if (error) {
            console.error("[PeerDiscovery] BLE Scan error:", error?.message || error);
            // If scanning fails temporarily, retry after a cooldown window
            if (this.active && !this._scanRetryTimeout) {
              this._scanRetryTimeout = setTimeout(() => {
                this._scanRetryTimeout = null;
                if (this.active) this._beginScanning();
              }, 4000);
            }
            return;
          }

          const devName =
            device?.name && (device.name.startsWith("MeshSync") || device.name.startsWith("MS-"))
              ? device.name
              : device?.localName && (device.localName.startsWith("MeshSync") || device.localName.startsWith("MS-"))
              ? device.localName
              : null;

          const hasMeshService =
            device?.serviceUUIDs &&
            device.serviceUUIDs.some(
              (u) => u.toLowerCase() === SERVICE_UUID.toLowerCase()
            );

          if (devName || hasMeshService) {
            let peerNodeId = devName ? devName.replace(/^(MeshSync-|MeshSync|MS-)/, "").trim() : null;
            if (!peerNodeId) peerNodeId = device.id;
            if (peerNodeId === this.nodeId || peerNodeId === this.nodeId.slice(-6)) return; // Skip self

            this.discoveredDevices.set(peerNodeId, { device, lastSeen: Date.now() });

            const now = Date.now();
            const lastConnect = this.lastConnections.get(peerNodeId) || 0;
            if (now - lastConnect < CONNECTION_COOLDOWN_MS) return;
            if (this.connectingPeers.has(peerNodeId)) return;

            // Deterministic collision avoidance:
            // Higher nodeId initiates immediately; lower nodeId waits a grace period
            const isHigherNode = String(this.nodeId) > String(peerNodeId);
            const jitterMs = isHigherNode
              ? 150 + Math.floor(Math.random() * 250)
              : 1800 + Math.floor(Math.random() * 500);

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

      // Request higher connection priority on Android for fast GATT operations
      if (Platform.OS === "android" && typeof connectedDevice.requestConnectionPriority === "function") {
        try {
          await connectedDevice.requestConnectionPriority(1); // 1 = HIGH
        } catch (_) {}
      }

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
