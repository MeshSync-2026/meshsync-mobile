import { getStore } from "../store/eventStore";
import { EVENT_TYPE } from "../shared/enums";

describe("eventStore Store Manager", () => {
  let store;

  beforeEach(() => {
    // Retrieve a clean instance of EventStore by instantiating or clearing store map
    store = getStore();
    store.events.clear();
    store.seen.clear();
    store.listeners.clear();
  });

  test("insert should add new event and return true", () => {
    const evt = { id: "evt-1", incident_id: "inc-1", event_type_code: EVENT_TYPE.SOS_CREATED, hlc_timestamp: "0001754611200|00000|a3f9c1e7" };
    
    const inserted = store.insert(evt);
    
    expect(inserted).toBe(true);
    expect(store.events.has("evt-1")).toBe(true);
    expect(store.getAll()).toHaveLength(1);
  });

  test("insert should not add duplicate event IDs and return false", () => {
    const evt = { id: "evt-1", incident_id: "inc-1" };
    store.insert(evt);

    const insertedAgain = store.insert(evt);

    expect(insertedAgain).toBe(false);
    expect(store.getAll()).toHaveLength(1);
  });

  test("hasSeen and markSeen should track processed sequence numbers", () => {
    expect(store.hasSeen("node-1", 5)).toBe(false);

    store.markSeen("node-1", 5);

    expect(store.hasSeen("node-1", 5)).toBe(true);
    expect(store.hasSeen("node-1", 6)).toBe(false);
  });

  test("getUnsynced should return events not yet synced to cloud", () => {
    const evt1 = { id: "evt-1", is_cloud_synced: false };
    const evt2 = { id: "evt-2", is_cloud_synced: true };
    store.insert(evt1);
    store.insert(evt2);

    const unsynced = store.getUnsynced();

    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].id).toBe("evt-1");
  });

  test("markSynced should toggle is_cloud_synced attribute on matched IDs", () => {
    const evt1 = { id: "evt-1", is_cloud_synced: false };
    const evt2 = { id: "evt-2", is_cloud_synced: false };
    store.insert(evt1);
    store.insert(evt2);

    store.markSynced(["evt-1"]);

    expect(store.events.get("evt-1").is_cloud_synced).toBe(true);
    expect(store.events.get("evt-2").is_cloud_synced).toBe(false);
  });

  test("subscribe should trigger callback with projection updates on insertions", () => {
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    const evt = {
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
    };
    store.insert(evt);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      incidents: expect.any(Array),
      responders: expect.any(Array),
      history: expect.any(Array),
      assignments: expect.any(Array),
    }));

    // Test unsubscribe
    unsubscribe();
    store.insert({ id: "evt-2", incident_id: "inc-1", event_type_code: EVENT_TYPE.SOS_RESOLVED, hlc_timestamp: "0001754611300|00000|a3f9c1e7" });
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });

  test("getProjection should successfully compile fold pipeline projections", () => {
    const evt = {
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
    };
    store.insert(evt);

    const projection = store.getProjection();
    expect(projection.incidents).toHaveLength(1);
    expect(projection.incidents[0].id).toBe("inc-1");
  });
});
