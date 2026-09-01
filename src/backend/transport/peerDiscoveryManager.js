import { Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

// Custom UUIDs for MeshSync BLE mesh network
export const SERVICE_UUID = "d3f9c1e7-e4e3-406f-9c1d-77a427ea2a3b";
export const CHARACTERISTIC_UUID = "c1e70001-e4e3-406f-9c1d-77a427ea2a3b";

// Request runtime Bluetooth permissions on Android
async function requestPermissions() {
  if (Platform.OS !== "android") return true;

  try {
    if (Platform.Version >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
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

export class PeerDiscoveryManager {
  constructor(nodeId, role, onPayloadReceived) {
    this.nodeId = nodeId;
    this.role = role || "civilian";
    this.onPayloadReceived = onPayloadReceived;

    this.bleManager = new BleManager();
    this.peripheral = null;

    this.active = false;
    this.localPayload = "[]";
    this.lastConnections = new Map(); // peerNodeId -> timestamp
    this.connectingPeers = new Set(); // peerNodeId
  }

  updateLocalPayload(payloadString) {
    this.localPayload = payloadString;
    this._syncLocalPayloadToGatt();
  }

  async _syncLocalPayloadToGatt() {
    if (this.peripheral && this.active) {
      try {
        const base64Val = Buffer.from(this.localPayload).toString("base64");
        await this.peripheral.updateValue(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          base64Val
        );
      } catch (err) {
        console.error("[PeerDiscovery] Failed to update GATT payload:", err.message);
      }
    }
  }

  async start() {
    if (this.active) return;
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn("[PeerDiscovery] Bluetooth permissions denied. BLE Sync unavailable.");
      return;
    }

    this.active = true;
    console.log(`[PeerDiscovery] Starting native BLE mesh for Node ${this.nodeId}...`);

    // 1. Start Peripheral / Advertising
    try {
      const PeripheralModule = require("react-native-multi-ble-peripheral").default;
      const { Permission, Property } = require("react-native-multi-ble-peripheral");

      PeripheralModule.setDeviceName(`MeshSync-${this.nodeId}`);
      this.peripheral = new PeripheralModule();

      this.peripheral.on("ready", async () => {
        try {
          await this.peripheral.addService(SERVICE_UUID, true);
          await this.peripheral.addCharacteristic(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            Property.READ,
            Permission.READABLE
          );
          await this._syncLocalPayloadToGatt();
          await this.peripheral.startAdvertising();
          console.log("[PeerDiscovery] Peripheral advertising started.");
        } catch (err) {
          console.error("[PeerDiscovery] Failed to start peripheral services:", err);
        }
      });
    } catch (err) {
      console.warn("[PeerDiscovery] react-native-multi-ble-peripheral not linked/found:", err.message);
    }

    // 2. Start Central / Scanning
    try {
      this.bleManager.startDeviceScan(
        [SERVICE_UUID],
        { allowDuplicates: false },
        async (error, device) => {
          if (error) {
            console.error("[PeerDiscovery] Scan error:", error);
            return;
          }
          if (device && device.name && device.name.startsWith("MeshSync-")) {
            const peerNodeId = device.name.substring("MeshSync-".length);
            if (peerNodeId === this.nodeId) return; // ignore self

            const now = Date.now();
            const lastConnect = this.lastConnections.get(peerNodeId) || 0;
            if (now - lastConnect < 15000) return; // rate limit connection attempts (15s cooldown)
            if (this.connectingPeers.has(peerNodeId)) return; // already in-progress

            this.connectingPeers.add(peerNodeId);
            this.lastConnections.set(peerNodeId, now);

            console.log(`[PeerDiscovery] Discovered peer: ${peerNodeId}. Connecting to sync events...`);
            this._connectAndSync(device, peerNodeId);
          }
        }
      );
    } catch (err) {
      console.error("[PeerDiscovery] Failed to start scanner:", err);
    }
  }

  async _connectAndSync(device, peerNodeId) {
    let connectedDevice = null;
    try {
      connectedDevice = await device.connect({ timeout: 10000 });
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Read remote node's event log
      const char = await connectedDevice.readCharacteristic(
        SERVICE_UUID,
        CHARACTERISTIC_UUID
      );

      if (char && char.value) {
        const decodedPayload = Buffer.from(char.value, "base64").toString("utf-8");
        console.log(`[PeerDiscovery] Successfully read event log from peer ${peerNodeId}`);
        if (this.onPayloadReceived) {
          this.onPayloadReceived(peerNodeId, decodedPayload);
        }
      }
    } catch (err) {
      console.error(`[PeerDiscovery] Failed to sync with peer ${peerNodeId}:`, err.message);
    } finally {
      this.connectingPeers.delete(peerNodeId);
      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
          console.log(`[PeerDiscovery] Disconnected from peer ${peerNodeId}`);
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
  }
}
