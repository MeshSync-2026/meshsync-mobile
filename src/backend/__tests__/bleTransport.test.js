import { BleTransport } from "../transport/bleTransport";
import {
  chunkPayload,
  ChunkReassembler,
  SERVICE_UUID,
  CHAR_READ_UUID,
  CHAR_WRITE_UUID,
} from "../transport/peerDiscoveryManager";
import { getStore } from "../store/eventStore";

// Mock eventStore
const mockInsert = jest.fn();
const mockHasSeen = jest.fn();
const mockMarkSeen = jest.fn();
const mockGetAll = jest.fn().mockResolvedValue([]);

jest.mock("../store/eventStore", () => ({
  getStore: () => ({
    insert: mockInsert,
    hasSeen: mockHasSeen,
    markSeen: mockMarkSeen,
    getAll: mockGetAll,
  }),
}));

// Mock react-native
jest.mock("react-native", () => ({
  Platform: { OS: "android", Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: {
      BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
      BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
      BLUETOOTH_ADVERTISE: "android.permission.BLUETOOTH_ADVERTISE",
      ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
    },
    RESULTS: { GRANTED: "granted" },
    requestMultiple: jest.fn().mockResolvedValue({
      "android.permission.BLUETOOTH_SCAN": "granted",
      "android.permission.BLUETOOTH_CONNECT": "granted",
      "android.permission.BLUETOOTH_ADVERTISE": "granted",
      "android.permission.ACCESS_FINE_LOCATION": "granted",
    }),
    request: jest.fn().mockResolvedValue("granted"),
  },
}));

// Mock react-native-ble-plx
const mockStartDeviceScan = jest.fn();
const mockStopDeviceScan = jest.fn();

jest.mock(
  "react-native-ble-plx",
  () => ({
    BleManager: jest.fn().mockImplementation(() => ({
      startDeviceScan: mockStartDeviceScan,
      stopDeviceScan: mockStopDeviceScan,
    })),
  }),
  { virtual: true }
);

// Mock react-native-multi-ble-peripheral
const mockPeripheralAddService = jest.fn().mockResolvedValue(true);
const mockPeripheralAddCharacteristic = jest.fn().mockResolvedValue(true);
const mockPeripheralUpdateValue = jest.fn().mockResolvedValue(true);
const mockPeripheralStartAdvertising = jest.fn().mockResolvedValue(true);
const mockPeripheralStopAdvertising = jest.fn().mockResolvedValue(true);

jest.mock(
  "react-native-multi-ble-peripheral",
  () => {
    class MockPeripheral {
      static setDeviceName = jest.fn();
      constructor() {
        this.callbacks = {};
      }
      on(event, cb) {
        this.callbacks[event] = cb;
        if (event === "ready") {
          cb();
        }
      }
      addService = mockPeripheralAddService;
      addCharacteristic = mockPeripheralAddCharacteristic;
      updateValue = mockPeripheralUpdateValue;
      startAdvertising = mockPeripheralStartAdvertising;
      stopAdvertising = mockPeripheralStopAdvertising;
    }
    return {
      __esModule: true,
      default: MockPeripheral,
      Permission: { READABLE: 1, WRITEABLE: 2 },
      Property: { READ: 1, WRITE: 2, WRITE_NO_RESPONSE: 4, NOTIFY: 16 },
    };
  },
  { virtual: true }
);

describe("BLE Mesh Chunking & Reassembly Protocol", () => {
  test("chunkPayload should split large payloads into MTU-safe chunks", () => {
    const largeObject = Array.from({ length: 20 }, (_, idx) => ({
      id: `evt-${idx}`,
      type: "SOS_CREATED",
      description: "Emergency incident report requiring assistance",
    }));
    const rawJson = JSON.stringify(largeObject);

    const chunks = chunkPayload(rawJson, "tx-123");
    expect(chunks.length).toBeGreaterThan(1);

    const firstParsed = JSON.parse(chunks[0]);
    expect(firstParsed.t).toBe("tx-123");
    expect(firstParsed.i).toBe(0);
    expect(firstParsed.n).toBe(chunks.length);
    expect(typeof firstParsed.d).toBe("string");
  });

  test("ChunkReassembler should assemble all chunks back into the original payload", () => {
    const originalText = JSON.stringify({ message: "Disaster recovery mesh sync test" });
    const chunks = chunkPayload(originalText, "tx-999");
    const reassembler = new ChunkReassembler();

    let result = null;
    for (const chunk of chunks) {
      result = reassembler.feedChunk(chunk);
    }

    expect(result).toBe(originalText);
    expect(JSON.parse(result).message).toBe("Disaster recovery mesh sync test");
  });
});

describe("BleTransport Production Transport", () => {
  let transport;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAll.mockResolvedValue([]);
    mockHasSeen.mockResolvedValue(false);
    mockInsert.mockResolvedValue(true);
    mockMarkSeen.mockResolvedValue(true);
    transport = new BleTransport("node-alpha", "responder");
  });

  afterEach(async () => {
    await transport.stop();
  });

  test("start should initialize PeerDiscoveryManager and start device scanning and advertising", async () => {
    await transport.start();

    expect(transport.isActive).toBe(true);
    expect(transport.initialized).toBe(true);
    expect(mockStartDeviceScan).toHaveBeenCalled();
    expect(mockPeripheralAddService).toHaveBeenCalledWith(SERVICE_UUID, true);
    expect(mockPeripheralAddCharacteristic).toHaveBeenCalledTimes(2);
    expect(mockPeripheralStartAdvertising).toHaveBeenCalled();
  });

  test("sendEvents should refresh local GATT advertisement payload", async () => {
    const events = [{ id: "evt-1", incident_id: "inc-1", seq: 1 }];
    mockGetAll.mockResolvedValueOnce(events);

    await transport.start();
    await transport.sendEvents();

    expect(mockGetAll).toHaveBeenCalled();
    expect(mockPeripheralUpdateValue).toHaveBeenCalled();
  });

  test("stop should cleanly teardown BLE scanning and advertising", async () => {
    await transport.start();
    await transport.stop();

    expect(transport.isActive).toBe(false);
    expect(transport.initialized).toBe(false);
    expect(mockStopDeviceScan).toHaveBeenCalled();
    expect(mockPeripheralStopAdvertising).toHaveBeenCalled();
  });

  test("incoming payload should insert new events, mark seen, and emit events", async () => {
    const listener = jest.fn();
    transport.onEventsReceived(listener);

    await transport.start();

    mockHasSeen.mockResolvedValue(false);

    const incomingEvents = [{ id: "evt-remote-1", origin_node_id: "node-beta", seq: 3 }];
    
    // Trigger onPayloadReceived callback on peerDiscovery
    await transport.peerDiscovery.onPayloadReceived("node-beta", JSON.stringify(incomingEvents));

    expect(mockHasSeen).toHaveBeenCalledWith("node-beta", 3);
    expect(mockInsert).toHaveBeenCalledWith(incomingEvents[0]);
    expect(mockMarkSeen).toHaveBeenCalledWith("node-beta", 3);
    expect(listener).toHaveBeenCalledWith(incomingEvents);
  });
});
