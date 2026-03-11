import test from "node:test";
import assert from "node:assert/strict";
import { fetchConnpassEvents } from "../src/connpassClient.js";

test("fetchConnpassEvents paginates until no more events", async () => {
  const pages = [
    {
      results_returned: 2,
      results_available: 3,
      events: [{ event_id: 1 }, { event_id: 2 }]
    },
    {
      results_returned: 1,
      results_available: 3,
      events: [{ event_id: 3 }]
    }
  ];

  let callCount = 0;
  const fetchImpl = async () => ({
    ok: true,
    json: async () => pages[callCount++]
  });

  const events = await fetchConnpassEvents({
    fetchImpl,
    countPerPage: 2,
    maxPages: 5
  });

  assert.equal(callCount, 2);
  assert.deepEqual(events.map((e) => e.event_id), [1, 2, 3]);
});
