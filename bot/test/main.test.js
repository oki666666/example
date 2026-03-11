import test from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/main.js";

test("run returns payloads in dry-run mode", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      results_returned: 1,
      results_available: 1,
      events: [{
        title: "TypeScript Meetup",
        description: "frontend",
        accepted: 320,
        started_at: "2099-01-01T10:00:00+09:00",
        event_url: "https://example.com/event"
      }]
    })
  });

  try {
    const result = await run({
      env: {
        DRY_RUN: "true",
        MIN_ACCEPTED: "300",
        CONNPASS_MAX_PAGES: "1",
        CONNPASS_COUNT_PER_PAGE: "100"
      }
    });

    assert.equal(result.filteredEvents.length, 1);
    assert.equal(result.sent, 0);
    assert.equal(result.payloads.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
