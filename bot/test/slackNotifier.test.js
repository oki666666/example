import test from "node:test";
import assert from "node:assert/strict";
import { buildSlackPayloads } from "../src/slackNotifier.js";

test("buildSlackPayloads returns zero-result message", () => {
  const payloads = buildSlackPayloads([], { minAccepted: 300, channel: "#times-oki" });
  assert.equal(payloads.length, 1);
  assert.match(payloads[0].text, /0 件でした/);
  assert.equal(payloads[0].channel, "#times-oki");
});

test("buildSlackPayloads returns event list message", () => {
  const payloads = buildSlackPayloads([{
    title: "Python勉強会",
    started_at: "2026-03-20T10:00:00+09:00",
    accepted: 350,
    event_url: "https://example.com/event"
  }], { minAccepted: 300 });

  assert.equal(payloads.length, 1);
  assert.match(payloads[0].text, /Python勉強会/);
  assert.match(payloads[0].text, /350人/);
  assert.match(payloads[0].text, /https:\/\/example.com\/event/);
});
