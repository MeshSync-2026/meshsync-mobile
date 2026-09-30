// peerDiscoveryManager.js
// Production Native BLE Mesh Peer Discovery & GATT Sync Manager

import { Platform, PermissionsAndroid, NativeModules, NativeEventEmitter } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { diagLog } from "../utils/diagnosticLogger";

// Custom UUIDs for MeshSync BLE mesh network
export const SERVICE_UUID = "d3f9c1e7-e4e3-406f-9c1d-77a427ea2a3b";
export const CHAR_READ_UUID = "c1e70001-e4e3-406f-9c1d-77a427ea2a3b";
export const CHAR_WRITE_UUID = "c1e70002-e4e3-406f-9c1d-77a427ea2a3b";

// Chunk payload size (safe MTU budget for BLE ATT transfers across iOS & Android)
const CHUNK_PAYLOAD_SIZE = 180;
const MAX_GATT_READ_BYTES = 450;
const CONNECTION_COOLDOWN_MS = 12000;
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
      diagLog.info("PERM", "Requesting Bluetooth & Location permissions from user...");
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      diagLog.info("PERM", "Permissions result", granted);
      diagLog.updateState({ permissions: granted });
      const ok = Object.values(granted).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );
      if (ok) {
        diagLog.success("PERM", "Mandatory Bluetooth permissions granted!");
      } else {
        diagLog.error("PERM", "Mandatory Bluetooth permissions denied!", granted);
      }
      return ok;
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      diagLog.updateState({ permissions: { hasFine: granted === PermissionsAndroid.RESULTS.GRANTED } });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    diagLog.error("PERM", `Permissions request failed: ${err.message}`);
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
    this.completedTransfers = new Map(); // transferId -> timestamp
  }

  feedChunk(chunkJsonString) {
    this._cleanupExpired();

    try {
      const packet = JSON.parse(chunkJsonString);
      if (!packet || typeof packet.t !== "string" || typeof packet.i !== "number") {
        // Fallback for non-chunked raw JSON payload (e.g. JSON array of events)
        return typeof chunkJsonString === "string" ? chunkJsonString : null;
      }

      const { t: transferId, i: chunkIndex, n: totalChunks, d: data } = packet;

      if (this.completedTransfers.has(transferId)) {
        return null; // Already reassembled this transferId
      }

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
        this.completedTransfers.set(transferId, Date.now());
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
    for (const [id, ts] of this.completedTransfers.entries()) {
      if (now - ts > TRANSFER_EXPIRY_MS) {
        this.completedTransfers.delete(id);
      }
    }
  }
}

export class PeerDiscoveryManager {
  constructor(nodeId, role, onPayloadReceived) {
    this.nodeId = nodeId;
    // Compact 8-char suffix so "MeshSync-<shortId>" (17 bytes) always fits inside the 31-byte legacy BLE adv budget
    this.shortNodeId = String(nodeId || "node")
      .replace(/^node-/, "")
      .slice(-8);
    this.role = role || "civilian";
    this.onPayloadReceived = onPayloadReceived;

    this.bleManager = new BleManager();
    diagLog.updateState({ nodeId: this.nodeId, role: this.role });
    this.peripheral = null;
    this.peripheralReady = false;
    this.nativeWriteSub = null;
    this.stateSub = null;
    this.reassembler = new ChunkReassembler();

    this.active = false;
    this.isScanning = false;
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

  updateLocalPayload(payloadString, triggerImmediate = false) {
    const changed = this.localPayload !== payloadString;
    this.localPayload = payloadString;

    if (!this.active) {
      this.start().catch((err) =>
        console.warn("[PeerDiscovery] Deferred start failed:", err?.message || err)
      );
      return;
    }

    this._syncLocalPayloadToGatt();

    if ((changed || triggerImmediate) && this.active && this.localPayload !== "[]") {
      this.triggerImmediateSync();
    }
  }

  /**
   * Clear connection cooldowns and immediately push new events to all currently discovered peers.
   */
  triggerImmediateSync() {
    if (!this.active) return;
    this.lastConnections.clear();

    const now = Date.now();
    for (const [peerNodeId, entry] of this.discoveredDevices.entries()) {
      if (!entry || !entry.device) continue;
      if (now - (entry.lastSeen || 0) > 60000) continue;
      if (this.connectingPeers.has(peerNodeId)) continue;

      const jitterMs = 100 + Math.floor(Math.random() * 400);
      setTimeout(() => {
        if (this.active && !this.connectingPeers.has(peerNodeId)) {
          this._connectAndSync(entry.device, peerNodeId);
        }
      }, jitterMs);
    }
  }

  /**
   * Strip null/undefined and local-only fields so events fit cleanly inside BLE GATT read/write packets.
   */
  _compactEvent(evt) {
    if (!evt || typeof evt !== "object") return evt;
    const compact = {};
    for (const [k, v] of Object.entries(evt)) {
      if (v === null || v === undefined) continue;
      if (k === "is_cloud_synced") continue;
      if (k === "severity" && evt.severity_level != null) continue;
      compact[k] = v;
    }
    return compact;
  }

  /**
   * Build a compact JSON payload that fits in a single GATT characteristic read (<= 490 bytes),
   * prioritizing the newest events first. Never returns "[]" if at least one event exists.
   */
  _buildReadCharacteristicPayload() {
    if (!this.localPayload || this.localPayload === "[]") {
      return "[]";
    }
    try {
      const parsed = JSON.parse(this.localPayload);
      if (!Array.isArray(parsed) || parsed.length === 0) return "[]";
      const sorted = [...parsed]
        .sort((a, b) => (b.created_at || b.createdAt || 0) - (a.created_at || a.createdAt || 0))
        .map((e) => this._compactEvent(e));

      const selected = [];
      for (const evt of sorted) {
        selected.push(evt);
        const candidate = JSON.stringify(selected);
        if (Buffer.byteLength(candidate, "utf-8") > MAX_GATT_READ_BYTES && selected.length > 1) {
          selected.pop();
          break;
        }
      }
      return JSON.stringify(selected);
    } catch (e) {
      if (Buffer.byteLength(this.localPayload, "utf-8") <= MAX_GATT_READ_BYTES) {
        return this.localPayload;
      }
      return "[]";
    }
  }

  async _syncLocalPayloadToGatt() {
    if (this.peripheral && this.active && this.peripheralReady) {
      try {
        const readPayload = this._buildReadCharacteristicPayload();
        // Pass a Buffer so peripheral.updateValue's value.toString('base64') encodes UTF-8 -> Base64 once
        const payloadBuffer = Buffer.from(readPayload, "utf-8");
        await this.peripheral.updateValue(
          SERVICE_UUID,
          CHAR_READ_UUID,
          payloadBuffer
        );
      } catch (err) {
        console.error("[PeerDiscovery] Failed to update GATT payload:", err.message);
      }
    }
  }

  _handleIncomingChunkBase64(base64Value, peerAddress) {
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

  async start() {
    if (this.active) return;

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      diagLog.error("MESH", "Bluetooth permissions denied. BLE mesh cannot start.");
      console.warn("[PeerDiscovery] Bluetooth permissions denied. BLE mesh unavailable.");
      return;
    }

    this.active = true;
    this.isScanning = true;
    diagLog.info("MESH", `Starting production BLE mesh for Node ${this.nodeId}...`);
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

      // Keep advertisement local name <= 17 chars ("MeshSync-" + 8 chars) so it never exceeds 31-byte legacy BLE adv limit
      const advName = `MeshSync-${this.shortNodeId}`;
      await PeripheralModule.setDeviceName(advName);
      this.peripheral = new PeripheralModule();

      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 1500);

        this.peripheral.on("error", (err) => {
          console.warn("[PeerDiscovery] Peripheral error:", err?.message || err);
          clearTimeout(timeout);
          resolve();
        });

        this.peripheral.on("ready", async () => {
          if (!this.active) {
            clearTimeout(timeout);
            resolve();
            return;
          }
          try {
            await this.peripheral.addService(SERVICE_UUID, true);

            // Read Characteristic (for peers to pull our recent events)
            await this.peripheral.addCharacteristic(
              SERVICE_UUID,
              CHAR_READ_UUID,
              Property.READ | Property.NOTIFY,
              Permission.READABLE
            );

            // Write Characteristic (for peers to push their chunked events to us)
            await this.peripheral.addCharacteristic(
              SERVICE_UUID,
              CHAR_WRITE_UUID,
              Property.WRITE | Property.WRITE_NO_RESPONSE,
              Permission.WRITEABLE
            );

            if (!this.active) {
              clearTimeout(timeout);
              resolve();
              return;
            }
            this.peripheralReady = true;
            await this._syncLocalPayloadToGatt();
            await this.peripheral.startAdvertising(
              {},
              {
                connectable: true,
                includeDeviceName: true,
              }
            );
            if (this.active) {
              diagLog.success("PERIPHERAL", `Advertising active as ${advName}`);
              diagLog.updateState({ peripheralStatus: `Advertising: ${advName}`, peripheralError: null });
              console.log(`[PeerDiscovery] BLE Peripheral advertising started as ${advName}`);
            }
          } catch (err) {
            if (this.active) {
              diagLog.error("PERIPHERAL", `Failed to start peripheral advertising: ${err?.message || err}`);
              diagLog.updateState({ peripheralStatus: "Failed", peripheralError: err?.message || String(err) });
              console.error("[PeerDiscovery] Failed to start peripheral services:", err);
            }
          } finally {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

      // Listen directly to NativeEventEmitter('onWrite') because Android's ReactNativeMultiBlePeripheralModule.kt
      // emits id as a String ("0") while the library's JS wrapper compares id === this.id (number 0).
      if (NativeModules && NativeModules.ReactNativeMultiBlePeripheral) {
        try {
          const nativeEmitter = new NativeEventEmitter(NativeModules.ReactNativeMultiBlePeripheral);
          this.nativeWriteSub = nativeEmitter.addListener("onWrite", (event) => {
            if (!this.active || !event) return;
            const charUuid = event.characteristic || event.characteristicUuid;
            const base64Value = event.value;
            const peerAddress = event.device || "unknown-peer";
            if (
              charUuid &&
              charUuid.toLowerCase() === CHAR_WRITE_UUID.toLowerCase() &&
              base64Value
            ) {
              this._handleIncomingChunkBase64(base64Value, peerAddress);
            }
          });
        } catch (emitterErr) {
          console.warn("[PeerDiscovery] NativeEventEmitter setup skipped:", emitterErr.message);
        }
      }

      // Also attach JS peripheral listeners for iOS / mock environments
      if (typeof this.peripheral.on === "function") {
        this.peripheral.on("write", (event) => {
          if (!this.active || !event) return;
          const charUuid = event.characteristicUuid || event.characteristic;
          const base64Value = event.value;
          const peerAddress = event.device || "unknown-peer";
          if (
            charUuid &&
            charUuid.toLowerCase() === CHAR_WRITE_UUID.toLowerCase() &&
            base64Value
          ) {
            this._handleIncomingChunkBase64(base64Value, peerAddress);
          }
        });

        this.peripheral.on("characteristicWrite", (charUuid, base64Value, peerAddress) => {
          if (!this.active) return;
          if (
            charUuid &&
            charUuid.toLowerCase() === CHAR_WRITE_UUID.toLowerCase() &&
            base64Value
          ) {
            this._handleIncomingChunkBase64(base64Value, peerAddress);
          }
        });
      }
    } catch (err) {
      diagLog.warn("PERIPHERAL", `react-native-multi-ble-peripheral native module not available: ${err.message}`);
      diagLog.updateState({ peripheralStatus: "Unavailable", peripheralError: err.message });
      console.warn("[PeerDiscovery] react-native-multi-ble-peripheral native module not available:", err.message);
    }
  }

  async _startCentral() {
    const beginScan = () => {
      if (!this.active) return;
      try {
        this.bleManager.startDeviceScan(
          null, // Scan all devices to inspect names and service UUIDs reliably on all Android chipsets
          { allowDuplicates: true },
          async (error, device) => {
            if (error) {
              diagLog.error("SCANNER", `BLE scan error: ${error?.message || error}`);
              diagLog.updateState({ scannerStatus: "Error", scannerError: error?.message || String(error) });
              console.error("[PeerDiscovery] BLE Scan error:", error?.message || error);
              return;
            }

            const rawName = device?.name || device?.localName || "";
            const hasMeshPrefix =
              rawName.startsWith("MeshSync-") || rawName.startsWith("MS-");
            const hasMeshService =
              Array.isArray(device?.serviceUUIDs) &&
              device.serviceUUIDs.some(
                (u) => typeof u === "string" && u.toLowerCase() === SERVICE_UUID.toLowerCase()
              );

            if (hasMeshPrefix || hasMeshService) {
              const peerNodeId = hasMeshPrefix
                ? rawName.replace(/^(MeshSync-|MS-)/, "").trim()
                : device?.id;

              if (
                !peerNodeId ||
                peerNodeId === this.nodeId ||
                peerNodeId === this.shortNodeId
              ) {
                return; // Skip self
              }

              this.discoveredDevices.set(peerNodeId, { device, lastSeen: Date.now() });
              diagLog.updateState({ discoveredPeers: [...this.discoveredDevices.keys()] });

              const now = Date.now();
              const lastConnect = this.lastConnections.get(peerNodeId) || 0;
              if (now - lastConnect < CONNECTION_COOLDOWN_MS) return;
              if (this.connectingPeers.has(peerNodeId)) return;

              // Collision Avoidance: Add randomized jitter delay before connecting
              const jitterMs = 250 + Math.floor(Math.random() * 600);
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
        diagLog.info("SCANNER", "Starting BLE device scan (listening for MeshSync / MS- devices)...");
        diagLog.updateState({ scannerStatus: "Scanning", scannerError: null });
        console.log("[PeerDiscovery] BLE Central scanner started.");
      } catch (err) {
        diagLog.error("SCANNER", `Failed to start BLE scanner: ${err.message}`);
        diagLog.updateState({ scannerStatus: "Failed", scannerError: err.message });
        console.error("[PeerDiscovery] Failed to start BLE scanner:", err);
      }
    };

    if (typeof this.bleManager.onStateChange === "function") {
      this.stateSub = this.bleManager.onStateChange((state) => {
        diagLog.updateState({ adapterState: state });
        if (state === "PoweredOn" && this.active) {
          beginScan();
        } else if (state !== "PoweredOn") {
          diagLog.warn("SCANNER", `Bluetooth adapter state: ${state} — waiting for PoweredOn`);
          diagLog.updateState({ scannerStatus: `Waiting (${state})` });
        }
      }, true);
    } else {
      beginScan();
    }
  }

  async _connectAndSync(device, peerNodeId) {
    if (this.connectingPeers.has(peerNodeId)) return;
    this.connectingPeers.add(peerNodeId);
    this.lastConnections.set(peerNodeId, Date.now());

    let connectedDevice = null;
    diagLog.info("SYNC", `Initiating bidirectional GATT sync with peer: ${peerNodeId}...`);
    console.log(`[PeerDiscovery] Initiating bidirectional sync with peer: ${peerNodeId}...`);

    try {
      connectedDevice = await device.connect({ timeout: 8000 });
      diagLog.success("SYNC", `GATT connected to peer: ${peerNodeId}`);

      // Request higher MTU if supported (Android)
      if (Platform.OS === "android" && typeof connectedDevice.requestMTU === "function") {
        try {
          await connectedDevice.requestMTU(512);
        } catch (mtuErr) {
          // Fallback to default MTU
        }
      }

      diagLog.info("SYNC", `Discovering services on peer ${peerNodeId}...`);
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // 1. Central READS Remote Peer's events using readCharacteristicForService
      try {
        const readFn =
          typeof connectedDevice.readCharacteristicForService === "function"
            ? connectedDevice.readCharacteristicForService.bind(connectedDevice)
            : typeof connectedDevice.readCharacteristic === "function"
            ? connectedDevice.readCharacteristic.bind(connectedDevice)
            : null;

        if (readFn) {
          diagLog.info("SYNC", `Reading events from peer ${peerNodeId}...`);
          const readChar = await readFn(SERVICE_UUID, CHAR_READ_UUID);

          if (readChar && readChar.value) {
            const rawChunk = Buffer.from(readChar.value, "base64").toString("utf-8");
            const fullPayload = this.reassembler.feedChunk(rawChunk);
            if (fullPayload && this.onPayloadReceived) {
              diagLog.success("SYNC", `Successfully synced events FROM peer ${peerNodeId}`);
              this.onPayloadReceived(peerNodeId, fullPayload);
            }
          }
        } else {
          diagLog.warn("SYNC", `No read API available on peer ${peerNodeId}`);
        }
      } catch (readErr) {
        diagLog.warn("SYNC", `Read from peer ${peerNodeId} failed: ${readErr.message}`);
        console.warn(`[PeerDiscovery] Read from peer ${peerNodeId} failed:`, readErr.message);
      }

      // 2. Central WRITES Local events TO Remote Peer (Bidirectional Chunked Sync)
      try {
        if (this.localPayload && this.localPayload !== "[]") {
          const chunks = chunkPayload(this.localPayload);
          diagLog.info("SYNC", `Writing ${chunks.length} local event chunks to peer ${peerNodeId}...`);
          for (const chunk of chunks) {
            const base64Chunk = Buffer.from(chunk, "utf-8").toString("base64");
            await connectedDevice.writeCharacteristicWithResponseForService(
              SERVICE_UUID,
              CHAR_WRITE_UUID,
              base64Chunk
            );
          }
          diagLog.success("SYNC", `Successfully pushed local events TO peer ${peerNodeId}`);
          diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: true } });
          console.log(`[PeerDiscovery] Successfully synced local events TO peer ${peerNodeId}`);
        }
      } catch (writeErr) {
        // Fallback: If WRITE with response fails, attempt writeWithoutResponse
        try {
          if (this.localPayload && this.localPayload !== "[]") {
            const chunks = chunkPayload(this.localPayload);
            for (const chunk of chunks) {
              const base64Chunk = Buffer.from(chunk, "utf-8").toString("base64");
              await connectedDevice.writeCharacteristicWithoutResponseForService(
                SERVICE_UUID,
                CHAR_WRITE_UUID,
                base64Chunk
              );
            }
            diagLog.success("SYNC", `Pushed local events TO peer ${peerNodeId} (without response)`);
            diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: true } });
          }
        } catch (fallbackErr) {
          diagLog.warn("SYNC", `Write to peer ${peerNodeId} failed: ${fallbackErr.message}`);
          diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: false, error: fallbackErr.message } });
          console.warn(`[PeerDiscovery] Write to peer ${peerNodeId} failed:`, fallbackErr.message);
        }
      }
    } catch (err) {
      diagLog.error("SYNC", `Sync session with peer ${peerNodeId} failed: ${err.message}`);
      diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: false, error: err.message } });
      console.error(`[PeerDiscovery] Sync session with peer ${peerNodeId} failed:`, err.message);
    } finally {
      this.connectingPeers.delete(peerNodeId);
      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
          diagLog.info("SYNC", `Disconnected cleanly from peer ${peerNodeId}`);
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
    this.isScanning = false;
    this.peripheralReady = false;
    console.log("[PeerDiscovery] Stopping BLE mesh...");

    if (this.stateSub && typeof this.stateSub.remove === "function") {
      try {
        this.stateSub.remove();
      } catch (err) {
        // ignore
      }
      this.stateSub = null;
    }

    if (this.nativeWriteSub && typeof this.nativeWriteSub.remove === "function") {
      try {
        this.nativeWriteSub.remove();
      } catch (err) {
        // ignore
      }
      this.nativeWriteSub = null;
    }

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
      if (typeof this.peripheral.destroy === "function") {
        try {
          await this.peripheral.destroy();
        } catch (err) {
          // ignore
        }
      }
      this.peripheral = null;
    }

    this.connectingPeers.clear();
    this.discoveredDevices.clear();
  }
}
