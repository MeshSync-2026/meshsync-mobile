// peerDiscoveryManager.js
// Production Native BLE Mesh Peer Discovery & GATT Sync Manager

import { Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { diagLog } from "../utils/diagnosticLogger";

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
        const hasAdv = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
        if (hasScan && hasConnect) {
          diagLog.success("PERM", "Bluetooth permissions already granted", { hasScan, hasConnect, hasAdv });
          diagLog.updateState({ permissions: { hasScan, hasConnect, hasAdv } });
          return true;
        }
      }

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

      // On Android 12+ (API 31+), BLUETOOTH_SCAN and BLUETOOTH_CONNECT are the mandatory permissions.
      // Do not block BLE operation if ACCESS_FINE_LOCATION is denied or approximate.
      const scanGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const connectGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;

      if (!scanGranted || !connectGranted) {
        diagLog.error("PERM", "Mandatory Bluetooth permissions denied!", { scanGranted, connectGranted });
      } else {
        diagLog.success("PERM", "Mandatory Bluetooth permissions granted!");
      }

      return Boolean(scanGranted && connectGranted);
    } else {
      if (typeof PermissionsAndroid.check === "function") {
        const hasFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (hasFine) {
          diagLog.success("PERM", "Location permission already granted (Android < 31)");
          diagLog.updateState({ permissions: { hasFine } });
          return true;
        }
      }
      diagLog.info("PERM", "Requesting ACCESS_FINE_LOCATION (Android < 31)...");
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      diagLog.info("PERM", `Location permission result: ${granted}`);
      diagLog.updateState({ permissions: { ACCESS_FINE_LOCATION: granted } });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    diagLog.error("PERM", `Permissions request failed: ${err.message}`);
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

    diagLog.updateState({ nodeId: this.nodeId, role: this.role });
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
        diagLog.warn("PERIPHERAL", `Failed to update GATT payload: ${err.message}`);
      }
    }
  }

  async start() {
    if (this.active) return;
    diagLog.info("MESH", `Starting production BLE mesh for Node ${this.nodeId}...`);

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      diagLog.error("MESH", "Bluetooth permissions denied. BLE mesh cannot start.");
      return;
    }

    this.active = true;

    // 1. Initialize Peripheral / GATT Server Advertising
    await this._startPeripheral();

    // 2. Initialize Central / Device Scanner
    await this._startCentral();
  }

  async _startPeripheral() {
    try {
      const PeripheralModule = require("react-native-multi-ble-peripheral").default;
      const { Permission, Property } = require("react-native-multi-ble-peripheral");

      if (!PeripheralModule) {
        diagLog.error("PERIPHERAL", "react-native-multi-ble-peripheral module not found");
        diagLog.updateState({ peripheralStatus: "Unavailable", peripheralError: "Native module missing" });
        return;
      }

      const shortId = (this.nodeId || "node").slice(-6);
      const advName = `MS-${shortId}`;
      diagLog.info("PERIPHERAL", `Configuring BLE Peripheral name as ${advName}...`);

      try {
        await PeripheralModule.setDeviceName(advName);
      } catch (e) {
        diagLog.warn("PERIPHERAL", `setDeviceName warning: ${e?.message || e}`);
      }

      this.peripheral = new PeripheralModule();

      if (typeof this.peripheral.on === "function") {
        this.peripheral.on("error", (err) => {
          const msg = err?.message || String(err);
          diagLog.error("PERIPHERAL", `BLE Peripheral native error: ${msg}`);
          diagLog.updateState({ peripheralStatus: "Error", peripheralError: msg });
        });
      }

      this.peripheral.on("ready", async () => {
        if (!this.active) return;
        diagLog.info("PERIPHERAL", "Peripheral manager ready. Adding GATT service & characteristics...");
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
          diagLog.info("PERIPHERAL", `Calling startAdvertising for ${advName}...`);
          await this.peripheral.startAdvertising({
            includeDeviceName: true,
            connectable: true,
          });

          if (this.active) {
            diagLog.success("PERIPHERAL", `Advertising active as ${advName}`);
            diagLog.updateState({ peripheralStatus: `Advertising: ${advName}`, peripheralError: null });
          }
        } catch (err) {
          if (this.active) {
            const msg = err?.message || String(err);
            diagLog.error("PERIPHERAL", `Failed to start peripheral advertising: ${msg}`);
            diagLog.updateState({ peripheralStatus: "Failed", peripheralError: msg });
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

            diagLog.info("GATT_WRITE", `Incoming write from ${peerAddr || "peer"}`);

            if (charUuid && charUuid.toLowerCase() === CHAR_WRITE_UUID.toLowerCase()) {
              if (base64Val) {
                const chunkStr = Buffer.from(base64Val, "base64").toString("utf-8");
                const fullPayload = this.reassembler.feedChunk(chunkStr);
                if (fullPayload && this.onPayloadReceived) {
                  diagLog.success("GATT_WRITE", `Reassembled full payload (${fullPayload.length} chars) from ${peerAddr}`);
                  this.onPayloadReceived(peerAddr || "unknown-peer", fullPayload);
                }
              }
            }
          } catch (err) {
            diagLog.error("GATT_WRITE", `Error processing incoming GATT write: ${err.message}`);
          }
        };

        this.peripheral.on("write", onWriteHandler);
        this.peripheral.on("characteristicWrite", onWriteHandler);
      }
    } catch (err) {
      diagLog.warn("PERIPHERAL", `react-native-multi-ble-peripheral not available: ${err.message}`);
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
        diagLog.info("SCANNER", `Initial Bluetooth adapter state: ${currentState}`);
        diagLog.updateState({ adapterState: currentState });

        if (currentState === "PoweredOn") {
          this._beginScanning();
          return;
        }

        diagLog.warn("SCANNER", `Adapter is '${currentState}'. Awaiting PoweredOn state...`);
        if (typeof this.bleManager.onStateChange === "function") {
          const subscription = this.bleManager.onStateChange((state) => {
            diagLog.info("SCANNER", `Adapter state transitioned to: ${state}`);
            diagLog.updateState({ adapterState: state });
            if (state === "PoweredOn") {
              diagLog.success("SCANNER", "Adapter is now PoweredOn. Launching central scanner...");
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
      diagLog.error("SCANNER", `Failed to verify BLE state: ${err?.message || err}`);
      this._beginScanning();
    }
  }

  _beginScanning() {
    if (!this.active) return;

    try {
      this.bleManager.stopDeviceScan();
    } catch (_) {}

    try {
      diagLog.info("SCANNER", "Starting BLE device scan (listening for MeshSync / MS- devices)...");
      diagLog.updateState({ scannerStatus: "Scanning", scannerError: null });

      this.bleManager.startDeviceScan(
        null, // Scan all devices to inspect names and service UUIDs reliably on all Android chipsets
        { allowDuplicates: true },
        async (error, device) => {
          if (error) {
            const msg = error?.message || String(error);
            diagLog.error("SCANNER", `BLE Scan callback error: ${msg}`);
            diagLog.updateState({ scannerStatus: "Error", scannerError: msg });

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

            if (!this.discoveredDevices.has(peerNodeId)) {
              diagLog.success("DISCOVERY", `Discovered mesh peer: ${peerNodeId} (RSSI: ${device.rssi}, ID: ${device.id})`);
            }

            this.discoveredDevices.set(peerNodeId, { device, lastSeen: Date.now() });
            diagLog.updateState({ discoveredPeers: Array.from(this.discoveredDevices.keys()) });

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
    } catch (err) {
      const msg = err?.message || String(err);
      diagLog.error("SCANNER", `Failed to start BLE scanner: ${msg}`);
      diagLog.updateState({ scannerStatus: "Failed", scannerError: msg });
    }
  }

  async _connectAndSync(device, peerNodeId) {
    if (this.connectingPeers.has(peerNodeId)) return;
    this.connectingPeers.add(peerNodeId);
    this.lastConnections.set(peerNodeId, Date.now());

    let connectedDevice = null;
    diagLog.info("SYNC", `Initiating bidirectional GATT sync with peer: ${peerNodeId}...`);
    diagLog.updateState({ lastSyncAttempt: { peerId: peerNodeId, time: new Date().toLocaleTimeString() } });

    try {
      connectedDevice = await device.connect({ timeout: 8000 });
      diagLog.success("SYNC", `GATT connected to peer: ${peerNodeId}`);

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

      diagLog.info("SYNC", `Discovering services on peer ${peerNodeId}...`);
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // 1. Central READS Remote Peer's events
      try {
        diagLog.info("SYNC", `Reading events from peer ${peerNodeId}...`);
        const readChar = await connectedDevice.readCharacteristic(
          SERVICE_UUID,
          CHAR_READ_UUID
        );

        if (readChar && readChar.value) {
          const rawChunk = Buffer.from(readChar.value, "base64").toString("utf-8");
          const fullPayload = this.reassembler.feedChunk(rawChunk);
          if (fullPayload && this.onPayloadReceived) {
            diagLog.success("SYNC", `Successfully synced events FROM peer ${peerNodeId}`);
            this.onPayloadReceived(peerNodeId, fullPayload);
          }
        }
      } catch (readErr) {
        diagLog.warn("SYNC", `Read from peer ${peerNodeId} failed: ${readErr.message}`);
      }

      // 2. Central WRITES Local events TO Remote Peer (Bidirectional Sync)
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
          diagLog.success("SYNC", `Pushed local events TO peer ${peerNodeId} (without response)`);
          diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: true } });
        } catch (fallbackErr) {
          diagLog.warn("SYNC", `Write to peer ${peerNodeId} failed: ${fallbackErr.message}`);
          diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: false, error: fallbackErr.message } });
        }
      }
    } catch (err) {
      const msg = err?.message || String(err);
      diagLog.error("SYNC", `Sync session with peer ${peerNodeId} failed: ${msg}`);
      diagLog.updateState({ lastSyncResult: { peerId: peerNodeId, success: false, error: msg } });
    } finally {
      this.connectingPeers.delete(peerNodeId);
      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
          diagLog.info("SYNC", `Disconnected cleanly from peer ${peerNodeId}`);
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
