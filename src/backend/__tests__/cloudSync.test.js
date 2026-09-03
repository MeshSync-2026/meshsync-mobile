import { startCloudSync, stopCloudSync } from "../cloudSync";
import { getStore } from "../store/eventStore";
import { ingestBatch } from "../cloudApi";
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
jest.mock("../store/eventStore", () => ({
  getStore: () => ({
    getUnsynced: mockGetUnsynced,
    markSynced: mockMarkSynced,
  }),
}));

// Mock cloudApi
jest.mock("../cloudApi", () => ({
  ingestBatch: jest.fn(),
}));

// Mock hotState
jest.mock("../store/hotState", () => ({
  getNodeId: () => "sync-node-123",
}));

describe("cloudSync Integration Manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    netInfoListener = null;
  });

  test("startCloudSync should subscribe to NetInfo events", () => {
    startCloudSync();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(netInfoListener).toBeInstanceOf(Function);
  });

  test("stopCloudSync should unsubscribe from NetInfo events", () => {
    startCloudSync();
    const mockUnsubscribe = NetInfo.addEventListener.mock.results[0].value;

    stopCloudSync();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test("should attempt synchronization when network connection becomes active", async () => {
    mockGetUnsynced.mockReturnValue([{ id: "evt-1" }, { id: "evt-2" }]);
    ingestBatch.mockResolvedValue({ success: true });

    startCloudSync();

    // Trigger online state transition
    await netInfoListener({ isConnected: true });

    expect(mockGetUnsynced).toHaveBeenCalled();
    expect(ingestBatch).toHaveBeenCalledWith([{ id: "evt-1" }, { id: "evt-2" }], "sync-node-123");
    expect(mockMarkSynced).toHaveBeenCalledWith(["evt-1", "evt-2"]);
  });

  test("should skip synchronization if isConnected is false", async () => {
    startCloudSync();

    // Trigger offline state transition
    await netInfoListener({ isConnected: false });

    expect(mockGetUnsynced).not.toHaveBeenCalled();
    expect(ingestBatch).not.toHaveBeenCalled();
  });

  test("should skip synchronization if there are no unsynced events", async () => {
    mockGetUnsynced.mockReturnValue([]);

    startCloudSync();

    // Trigger online state transition
    await netInfoListener({ isConnected: true });

    expect(mockGetUnsynced).toHaveBeenCalled();
    expect(ingestBatch).not.toHaveBeenCalled();
  });

  test("should handle ingestion failure gracefully and log an error", async () => {
    mockGetUnsynced.mockReturnValue([{ id: "evt-1" }]);
    ingestBatch.mockRejectedValue(new Error("Ingestion server down"));
    
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    startCloudSync();

    // Trigger online transition
    await netInfoListener({ isConnected: true });

    expect(ingestBatch).toHaveBeenCalled();
    expect(mockMarkSynced).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("[cloudSync] retry later:", "Ingestion server down");

    consoleSpy.mockRestore();
  });
});
