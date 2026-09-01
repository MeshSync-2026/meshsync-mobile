import { initHotState, getNodeId, nextSeq, isRegistered, setRegistered } from "../store/hotState";

// Mock MMKV
const mockSet = jest.fn();
const mockGetString = jest.fn();
const mockGetNumber = jest.fn();
const mockGetBoolean = jest.fn();
const mockContains = jest.fn();

jest.mock("react-native-mmkv", () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      return {
        set: mockSet,
        getString: mockGetString,
        getNumber: mockGetNumber,
        getBoolean: mockGetBoolean,
        contains: mockContains,
      };
    }),
  };
});

describe("hotState Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("initHotState should initialize node_id, seq, and is_registered if not present", () => {
    mockContains.mockReturnValue(false); // Key does not exist

    initHotState();

    expect(mockContains).toHaveBeenCalledWith("node_id");
    expect(mockSet).toHaveBeenCalledTimes(3);
    expect(mockSet).toHaveBeenNthCalledWith(1, "node_id", expect.any(String));
    expect(mockSet).toHaveBeenNthCalledWith(2, "seq", 0);
    expect(mockSet).toHaveBeenNthCalledWith(3, "is_registered", false);
  });

  test("initHotState should not overwrite existing state", () => {
    mockContains.mockReturnValue(true); // Key exists

    initHotState();

    expect(mockContains).toHaveBeenCalledWith("node_id");
    expect(mockSet).not.toHaveBeenCalled();
  });

  test("getNodeId should fetch node_id from storage", () => {
    mockGetString.mockReturnValue("test-node-123");

    const id = getNodeId();

    expect(mockGetString).toHaveBeenCalledWith("node_id");
    expect(id).toBe("test-node-123");
  });

  test("nextSeq should increment sequence and return next number", () => {
    mockGetNumber.mockReturnValue(5); // Current seq is 5

    const next = nextSeq();

    expect(mockGetNumber).toHaveBeenCalledWith("seq");
    expect(mockSet).toHaveBeenCalledWith("seq", 6);
    expect(next).toBe(6);
  });

  test("nextSeq should handle null/empty sequence by starting at 1", () => {
    mockGetNumber.mockReturnValue(null);

    const next = nextSeq();

    expect(mockSet).toHaveBeenCalledWith("seq", 1);
    expect(next).toBe(1);
  });

  test("isRegistered should fetch boolean status", () => {
    mockGetBoolean.mockReturnValue(true);

    const registered = isRegistered();

    expect(mockGetBoolean).toHaveBeenCalledWith("is_registered");
    expect(registered).toBe(true);
  });

  test("setRegistered should update stored boolean value", () => {
    setRegistered(true);

    expect(mockSet).toHaveBeenCalledWith("is_registered", true);
  });
});
