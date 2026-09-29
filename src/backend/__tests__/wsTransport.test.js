import { WsTransport, DEFAULT_EDGE_SYNC_WS_URL } from "../transport/wsTransport";
import { getStore } from "../store/eventStore";
import NetInfo from "@react-native-community/netinfo";

// Mock NetInfo
let netInfoCallback = null;
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn().mockImplementation((cb) => {
    netInfoCallback = cb;
    return jest.fn().mockImplementation(() => {
      netInfoCallback = null;
    });
  }),
}));

// Mock store
const mockInsert = jest.fn();
const mockHasSeen = jest.fn();
const mockMarkSeen = jest.fn();

jest.mock("../store/eventStore", () => ({
  getStore: () => ({
    insert: mockInsert,
    hasSeen: mockHasSeen,
    markSeen: mockMarkSeen,
  }),
}));

// Mock hotState
jest.mock("../store/hotState", () => ({
  getNodeId: () => "mock-node-id",
}));

// Mock global WebSocket
let mockSend = jest.fn();
let mockClose = jest.fn();
let mockInstances = [];

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.send = mockSend;
    this.close = mockClose;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    mockInstances.push(this);
  }
}

global.WebSocket = MockWebSocket;
jest.useFakeTimers();

describe("WsTransport Production WebSocket Transport", () => {
  let transport;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInstances = [];
    netInfoCallback = null;
    mockHasSeen.mockResolvedValue(false);
    mockInsert.mockResolvedValue(true);
    mockMarkSeen.mockResolvedValue(true);
    transport = new WsTransport("wss://custom-edge-gateway.test/ws");
  });

  afterEach(() => {
    transport.stop();
  });

  test("start should initialize WebSocket connection with custom URL", () => {
    transport.start();

    expect(mockInstances).toHaveLength(1);
    expect(mockInstances[0].url).toBe("wss://custom-edge-gateway.test/ws");
    expect(transport.connected).toBe(false);
  });

  test("onopen should set connected status and send registration message", () => {
    transport.start();
    const wsInstance = mockInstances[0];

    wsInstance.onopen();

    expect(transport.connected).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"type":"register"')
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"nodeId":"mock-node-id"')
    );
  });

  test("should start heartbeat ping timer on connect", () => {
    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();
    mockSend.mockClear();

    // Advance by 25 seconds for heartbeat
    jest.advanceTimersByTime(25000);

    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ping"')
    );
  });

  test("onmessage should process incoming events, deduplicate, and emit to listeners", async () => {
    const listener = jest.fn();
    transport.onEventsReceived(listener);

    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();

    mockHasSeen.mockResolvedValue(false);

    const testEvent = { id: "evt-1", origin_node_id: "node-1", seq: 5 };
    await wsInstance.onmessage({
      data: JSON.stringify({
        type: "events",
        events: [testEvent],
      }),
    });

    expect(mockHasSeen).toHaveBeenCalledWith("node-1", 5);
    expect(mockInsert).toHaveBeenCalledWith(testEvent);
    expect(mockMarkSeen).toHaveBeenCalledWith("node-1", 5);
    expect(listener).toHaveBeenCalledWith([testEvent]);
  });

  test("onmessage should skip already seen events", async () => {
    const listener = jest.fn();
    transport.onEventsReceived(listener);

    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();

    mockHasSeen.mockResolvedValue(true);

    const testEvent = { id: "evt-1", origin_node_id: "node-1", seq: 5 };
    await wsInstance.onmessage({
      data: JSON.stringify({
        type: "events",
        events: [testEvent],
      }),
    });

    expect(mockHasSeen).toHaveBeenCalledWith("node-1", 5);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  test("onmessage should respond to incoming ping with pong", async () => {
    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();
    mockSend.mockClear();

    await wsInstance.onmessage({
      data: JSON.stringify({ type: "ping" }),
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"type":"pong"')
    );
  });

  test("onmessage should update peer count when server sends peer_count", async () => {
    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();

    expect(transport.getPeerCount()).toBe(1);

    await wsInstance.onmessage({
      data: JSON.stringify({ type: "peer_count", count: 7 }),
    });

    expect(transport.getPeerCount()).toBe(7);
  });

  test("onclose should schedule reconnect with exponential backoff", () => {
    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();
    expect(transport.connected).toBe(true);

    wsInstance.onclose({ code: 1006 });

    expect(transport.connected).toBe(false);
    expect(mockInstances).toHaveLength(1);

    // Fast-forward reconnect timer (~1-2 seconds with jitter)
    jest.advanceTimersByTime(2500);

    expect(mockInstances).toHaveLength(2); // Second connection attempt
  });

  test("NetInfo online event should trigger immediate reconnect", () => {
    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();
    wsInstance.onclose({ code: 1006 });

    expect(mockInstances).toHaveLength(1);

    // Trigger NetInfo online event
    if (netInfoCallback) {
      netInfoCallback({ isConnected: true });
    }

    expect(mockInstances).toHaveLength(2); // Immediately reconnected
  });

  test("broadcast should send events payload and mark seen locally", async () => {
    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();
    mockSend.mockClear();

    const events = [{ id: "evt-1", origin_node_id: "node-1", seq: 10 }];
    await transport.broadcast(events);

    expect(mockMarkSeen).toHaveBeenCalledWith("node-1", 10);
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: "events", events })
    );
  });

  test("sendEvents should be the broadcast entry point used by MeshSyncContext", async () => {
    // Regression: the context once called wsTransport.send(), which does not
    // exist — the TypeError was swallowed and cloud sync never ran.
    expect(typeof transport.sendEvents).toBe("function");

    transport.start();
    const wsInstance = mockInstances[0];
    wsInstance.onopen();
    mockSend.mockClear();

    const events = [{ id: "evt-2", origin_node_id: "node-1", seq: 11 }];
    await transport.sendEvents(events);

    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: "events", events }));
  });

  test("broadcast before connecting is a silent no-op (never throws)", async () => {
    await expect(transport.broadcast([{ id: "evt-3" }])).resolves.toBeUndefined();
    await expect(transport.sendEvents([{ id: "evt-4" }])).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
