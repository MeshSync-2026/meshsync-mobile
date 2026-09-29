import { startCloudSync, stopCloudSync, syncNow } from "../cloudSync";
import { getStore } from "../store/eventStore";
import { ingestBatch, pullEvents } from "../cloudApi";
import NetInfo from "@react-native-community/netinfo";

// Mock NetInfo
let netInfoListener = null;
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn().mockImplementation((callback) => {
    netInfoListener = callback;
    return jest.fn().mockImplementation(() => {
      netInfoListener = null;
    });
  }),
}));

// Mock store
const mockGetUnsynced = jest.fn();
const mockMarkSynced = jest.fn();
const mockInsert = jest.fn();
jest.mock("../store/eventStore", () => ({
  getStore: () => ({
    getUnsynced: mockGetUnsynced,
    markSynced: mockMarkSynced,
    insert: mockInsert,
  }),
}));

// Mock cloudApi
jest.mock("../cloudApi", () => ({
  ingestBatch: jest.fn(),
  pullEvents: jest.fn(),
}));

// Mock hotState
jest.mock("../store/hotState", () => ({
  getNodeId: () => "sync-node-123",
  getLastCloudSyncHlc: () => null,
  setLastCloudSyncHlc: jest.fn(),
}));

describe("cloudSync Integration Manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    netInfoListener = null;
    pullEvents.mockResolvedValue([]);
    mockInsert.mockResolvedValue(true);
  });

  afterEach(() => {
    // stop the periodic retry timer started by startCloudSync()
    stopCloudSync();
  });

  test("startCloudSync should subscribe to NetInfo events and return an unsubscribe function", () => {
    const unsub = startCloudSync();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(netInfoListener).toBeInstanceOf(Function);
    expect(typeof unsub).toBe("function");
  });

  test("stopCloudSync should unsubscribe from NetInfo events", () => {
    startCloudSync();
    const mockUnsubscribe = NetInfo.addEventListener.mock.results[0].value;

    stopCloudSync();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test("should attempt synchronization when network connection becomes active", async () => {
    mockGetUnsynced.mockResolvedValue([{ id: "evt-1" }, { id: "evt-2" }]);
    ingestBatch.mockResolvedValue({
      new_count: 2,
      items: [
        { row_id: "evt-1", outcome: "inserted" },
        { row_id: "evt-2", outcome: "inserted" },
      ],
    });

    startCloudSync();

    // Trigger online state transition
    await netInfoListener({ isConnected: true });
    await new Promise((r) => setImmediate(r));

    expect(mockGetUnsynced).toHaveBeenCalled();
    expect(ingestBatch).toHaveBeenCalledWith(
      [{ id: "evt-1" }, { id: "evt-2" }],
      "sync-node-123"
    );
    expect(mockMarkSynced).toHaveBeenCalledWith(["evt-1", "evt-2"]);
  });

  test("should NOT mark rejected rows as synced (per-row acks)", async () => {
    mockGetUnsynced.mockResolvedValue([{ id: "evt-1" }, { id: "evt-bad" }]);
    ingestBatch.mockResolvedValue({
      new_count: 1,
      rejected_count: 1,
      items: [
        { row_id: "evt-1", outcome: "inserted" },
        { row_id: "evt-bad", outcome: "rejected" },
      ],
    });

    await syncNow();

    expect(mockMarkSynced).toHaveBeenCalledWith(["evt-1"]);
  });

  test("should skip synchronization if isConnected is false", async () => {
    startCloudSync();

    // Trigger offline state transition
    await netInfoListener({ isConnected: false });

    expect(mockGetUnsynced).not.toHaveBeenCalled();
    expect(ingestBatch).not.toHaveBeenCalled();
  });

  test("should skip push if there are no unsynced events but still pull", async () => {
    mockGetUnsynced.mockResolvedValue([]);

    await syncNow();

    expect(mockGetUnsynced).toHaveBeenCalled();
    expect(ingestBatch).not.toHaveBeenCalled();
    expect(pullEvents).toHaveBeenCalled();
  });

  test("pull inserts received events into the store", async () => {
    mockGetUnsynced.mockResolvedValue([]);
    pullEvents.mockResolvedValue([
      { id: "cloud-1", hlc_timestamp: "h1" },
      { id: "cloud-2", hlc_timestamp: "h2" },
    ]);

    const result = await syncNow();

    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(result.received).toBe(2);
  });

  test("pull normalizes Postgres-native types before inserting", async () => {
    mockGetUnsynced.mockResolvedValue([]);
    pullEvents.mockResolvedValue([
      {
        id: "cloud-pg-1",
        incident_id: "inc-1",
        seq: "7",                    // bigint arrives as string from pg
        created_at: "2026-09-29T08:46:34.151Z", // timestamptz arrives as ISO string
        hlc_timestamp: "0001754611200|00042|a3f9c1e7",
      },
    ]);

    await syncNow();

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cloud-pg-1",
        seq: 7,
        created_at: Date.parse("2026-09-29T08:46:34.151Z"),
        is_cloud_synced: true, // pulled rows must never be re-pushed
      })
    );
  });

  test("pull keeps numeric seq/created_at untouched", async () => {
    mockGetUnsynced.mockResolvedValue([]);
    pullEvents.mockResolvedValue([
      { id: "cloud-num-1", seq: 3, created_at: 1790000000000, hlc_timestamp: "h1" },
    ]);

    await syncNow();

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ seq: 3, created_at: 1790000000000, is_cloud_synced: true })
    );
  });

  test("pull advances the watermark to the highest served HLC", async () => {
    const { setLastCloudSyncHlc, getLastCloudSyncHlc } = require("../store/hotState");
    mockGetUnsynced.mockResolvedValue([]);
    pullEvents.mockResolvedValue([
      { id: "c1", hlc_timestamp: "0000000000001|00000|aaaaaaaa" },
      { id: "c2", hlc_timestamp: "0000000000009|00000|a3f9c1e7" },
    ]);

    await syncNow();

    expect(getLastCloudSyncHlc()).toBe(null); // mock returns null
    expect(setLastCloudSyncHlc).toHaveBeenCalledWith("0000000000009|00000|a3f9c1e7");
  });

  test("should handle ingestion failure gracefully and log an error", async () => {
    mockGetUnsynced.mockResolvedValue([{ id: "evt-1" }]);
    ingestBatch.mockRejectedValue(new Error("Ingestion server down"));

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    startCloudSync();

    // Trigger online transition
    await netInfoListener({ isConnected: true });
    await new Promise((r) => setImmediate(r));

    expect(ingestBatch).toHaveBeenCalled();
    expect(mockMarkSynced).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("[cloudSync] retry later:", "Ingestion server down");

    consoleSpy.mockRestore();
  });

  test("stopCloudSync clears the periodic retry timer", () => {
    jest.useFakeTimers();
    startCloudSync();
    stopCloudSync();

    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
