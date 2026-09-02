const mockStorageData = new Map();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock(
  "react-native-mmkv",
  () => {
    return {
      MMKV: function () {
        this.set = (key, val) => mockStorageData.set(key, val);
        this.getString = (key) => (mockStorageData.has(key) ? String(mockStorageData.get(key)) : null);
        this.getNumber = (key) => (mockStorageData.has(key) ? Number(mockStorageData.get(key)) : undefined);
        this.getBoolean = (key) => (mockStorageData.has(key) ? Boolean(mockStorageData.get(key)) : undefined);
        this.contains = (key) => mockStorageData.has(key);
        this.delete = (key) => mockStorageData.delete(key);
        this.clearAll = () => mockStorageData.clear();
      },
    };
  },
  { virtual: true }
);

import {
  initHotState,
  getNodeId,
  nextSeq,
  isRegistered,
  getAssignedZoneId,
  registerAsResponder,
  deregisterResponder,
  getActiveRole,
  setActiveRole,
  ROLE,
} from "../store/hotState";

describe("hotState Store Manager", () => {
  beforeEach(() => {
    mockStorageData.clear();
  });

  test("initHotState should initialize node_id, seq, is_registered, and active_role if not present", () => {
    initHotState();

    expect(mockStorageData.has("node_id")).toBe(true);
    expect(mockStorageData.get("seq")).toBe(0);
    expect(mockStorageData.get("is_registered")).toBe(false);
    expect(mockStorageData.get("active_role")).toBe(ROLE.CIVILIAN);
  });

  test("initHotState should not overwrite existing state", () => {
    mockStorageData.set("node_id", "existing-node-id");
    mockStorageData.set("seq", 15);

    initHotState();

    expect(getNodeId()).toBe("existing-node-id");
    expect(mockStorageData.get("seq")).toBe(15);
  });

  test("getNodeId should fetch node_id from storage", () => {
    mockStorageData.set("node_id", "test-node-123");

    const id = getNodeId();
    expect(id).toBe("test-node-123");
  });

  test("nextSeq should increment sequence and return next number", () => {
    mockStorageData.set("seq", 5);

    const next = nextSeq();

    expect(next).toBe(6);
    expect(mockStorageData.get("seq")).toBe(6);
  });

  test("nextSeq should handle null/empty sequence by starting at 1", () => {
    const next = nextSeq();

    expect(next).toBe(1);
    expect(mockStorageData.get("seq")).toBe(1);
  });

  test("isRegistered should fetch boolean status", () => {
    mockStorageData.set("is_registered", true);
    expect(isRegistered()).toBe(true);

    mockStorageData.set("is_registered", false);
    expect(isRegistered()).toBe(false);
  });

  test("registerAsResponder should store tokens, zone ID, and switch role to RESPONDER", () => {
    registerAsResponder({
      authority_user_id: "auth-123",
      assigned_zone_id: "zone-north",
      token: "jwt-token-xyz",
    });

    expect(isRegistered()).toBe(true);
    expect(getAssignedZoneId()).toBe("zone-north");
    expect(mockStorageData.get("responder_authority_user_id")).toBe("auth-123");
    expect(mockStorageData.get("responder_token")).toBe("jwt-token-xyz");
    expect(getActiveRole()).toBe(ROLE.RESPONDER);
  });

  test("deregisterResponder should wipe session and reset role to CIVILIAN", () => {
    registerAsResponder({
      authority_user_id: "auth-123",
      assigned_zone_id: "zone-north",
      token: "jwt-token-xyz",
    });

    deregisterResponder();

    expect(isRegistered()).toBe(false);
    expect(getAssignedZoneId()).toBe(null);
    expect(mockStorageData.has("responder_authority_user_id")).toBe(false);
    expect(mockStorageData.has("responder_token")).toBe(false);
    expect(getActiveRole()).toBe(ROLE.CIVILIAN);
  });

  test("setActiveRole should switch to CIVILIAN without restrictions", () => {
    setActiveRole(ROLE.CIVILIAN);
    expect(getActiveRole()).toBe(ROLE.CIVILIAN);
  });

  test("setActiveRole should not switch to RESPONDER if not registered", () => {
    mockStorageData.set("is_registered", false);

    setActiveRole(ROLE.RESPONDER);

    expect(getActiveRole()).toBe(ROLE.CIVILIAN);
  });

  test("setActiveRole should switch to RESPONDER if registered", () => {
    mockStorageData.set("is_registered", true);

    setActiveRole(ROLE.RESPONDER);

    expect(getActiveRole()).toBe(ROLE.RESPONDER);
  });
});
