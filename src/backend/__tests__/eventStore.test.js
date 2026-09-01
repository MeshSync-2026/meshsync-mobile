// In-memory collections to simulate WatermelonDB in Jest (prefixed with 'mock' for Jest scope rule)
const mockEventsDb = new Map();
const mockProcessedDb = new Set();

jest.mock("../db", () => {
  const meshEventCollection = {
    query: (queryFilter) => ({
      fetchCount: async () => {
        if (!queryFilter) return mockEventsDb.size;
        if (queryFilter.type === "where" && queryFilter.field === "id") {
          return mockEventsDb.has(queryFilter.val) ? 1 : 0;
        }
        return 0;
      },
      fetch: async () => {
        let items = Array.from(mockEventsDb.values());
        if (queryFilter && queryFilter.type === "where" && queryFilter.field === "is_cloud_synced") {
          items = items.filter((item) => item.isCloudSynced === queryFilter.val);
        } else if (queryFilter && queryFilter.type === "oneOf" && queryFilter.field === "id") {
          items = items.filter((item) => queryFilter.vals.includes(item.id));
        }
        return items;
      },
    }),
    create: async (builder) => {
      const record = {
        _raw: {},
        update: async (updater) => {
          await updater(record);
        },
      };
      await builder(record);
      record.id = record._raw.id;
      mockEventsDb.set(record.id, record);
      return record;
    },
  };

  const processedCollection = {
    query: (filter1, filter2) => ({
      fetchCount: async () => {
        const origin = filter1?.val;
        const seq = filter2?.val;
        return mockProcessedDb.has(`${origin}:${seq}`) ? 1 : 0;
      },
    }),
    create: async (builder) => {
      const record = {};
      await builder(record);
      mockProcessedDb.add(`${record.originNodeId}:${record.seq}`);
      return record;
    },
  };

  return {
    database: {
      collections: {
        get: (name) => {
          if (name === "mesh_event") return meshEventCollection;
          if (name === "processed_broadcast") return processedCollection;
          return null;
        },
      },
      write: async (fn) => fn(),
    },
  };
});

jest.mock(
  "@nozbe/watermelondb",
  () => ({
    Q: {
      where: (field, val) => ({ type: "where", field, val }),
      oneOf: (vals) => ({ type: "oneOf", field: "id", vals }),
    },
  }),
  { virtual: true }
);

import { getStore } from "../store/eventStore";
import { EVENT_TYPE } from "../shared/enums";

describe("eventStore SQLite Store Manager", () => {
  let store;

  beforeEach(() => {
    mockEventsDb.clear();
    mockProcessedDb.clear();
    store = getStore();
  });

  test("insert should add new event and return true", async () => {
    const evt = {
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
    };

    const inserted = await store.insert(evt);

    expect(inserted).toBe(true);
    expect(mockEventsDb.has("evt-1")).toBe(true);

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("evt-1");
  });

  test("insert should not add duplicate event IDs and return false", async () => {
    const evt = {
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
    };

    await store.insert(evt);
    const insertedAgain = await store.insert(evt);

    expect(insertedAgain).toBe(false);
    const all = await store.getAll();
    expect(all).toHaveLength(1);
  });

  test("hasSeen and markSeen should track processed sequence numbers", async () => {
    expect(await store.hasSeen("node-1", 5)).toBe(false);

    await store.markSeen("node-1", 5);

    expect(await store.hasSeen("node-1", 5)).toBe(true);
    expect(await store.hasSeen("node-1", 6)).toBe(false);
  });

  test("getUnsynced should return events not yet synced to cloud", async () => {
    await store.insert({
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
      is_cloud_synced: false,
    });

    await store.insert({
      id: "evt-2",
      incident_id: "inc-2",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 2,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
      is_cloud_synced: true,
    });

    const unsynced = await store.getUnsynced();

    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].id).toBe("evt-1");
  });

  test("markSynced should toggle is_cloud_synced attribute on matched IDs", async () => {
    await store.insert({
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
      is_cloud_synced: false,
    });

    await store.markSynced(["evt-1"]);

    const evt1 = mockEventsDb.get("evt-1");
    expect(evt1.isCloudSynced).toBe(true);
  });

  test("subscribe should trigger callback with projection updates on insertions", async () => {
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
    await store.insert(evt);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        incidents: expect.any(Array),
      })
    );

    // Test unsubscribe
    unsubscribe();
    await store.insert({
      id: "evt-2",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_RESOLVED,
      origin_node_id: "node-1",
      seq: 2,
      hlc_timestamp: "0001754611300|00000|a3f9c1e7",
      created_at: Date.now(),
    });
    expect(listener).toHaveBeenCalledTimes(1); // Not called after unsubscribe
  });

  test("getProjection should successfully compile fold pipeline projections", async () => {
    const evt = {
      id: "evt-1",
      incident_id: "inc-1",
      event_type_code: EVENT_TYPE.SOS_CREATED,
      origin_node_id: "node-1",
      seq: 1,
      hlc_timestamp: "0001754611200|00000|a3f9c1e7",
      created_at: Date.now(),
    };
    await store.insert(evt);

    const projection = await store.getProjection();
    expect(projection.incidents).toHaveLength(1);
    expect(projection.incidents[0].id).toBe("inc-1");
  });
});
