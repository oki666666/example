import test from "node:test";
import assert from "node:assert/strict";
import {
  filterTargetEvents,
  hasMinAcceptedParticipants,
  isEngineeringEvent,
  isUpcomingEvent
} from "../src/engineeringFilter.js";

test("isEngineeringEvent returns true for engineering keyword", () => {
  const event = {
    title: "PythonとLLMではじめる実践AI開発",
    catch: "初心者歓迎"
  };
  assert.equal(isEngineeringEvent(event), true);
});

test("isEngineeringEvent returns false for exclusion keyword", () => {
  const event = {
    title: "不動産投資セミナー",
    description: "投資家向けイベント"
  };
  assert.equal(isEngineeringEvent(event), false);
});

test("hasMinAcceptedParticipants judges by accepted count", () => {
  assert.equal(hasMinAcceptedParticipants({ accepted: 300 }, 300), true);
  assert.equal(hasMinAcceptedParticipants({ accepted: 299 }, 300), false);
});

test("isUpcomingEvent checks started_at against now", () => {
  const now = new Date("2026-03-11T00:00:00Z");
  assert.equal(isUpcomingEvent({ started_at: "2026-03-12T00:00:00Z" }, now), true);
  assert.equal(isUpcomingEvent({ started_at: "2026-03-10T00:00:00Z" }, now), false);
});

test("filterTargetEvents applies all conditions and sorts by accepted", () => {
  const now = new Date("2026-03-11T00:00:00Z");
  const events = [
    {
      title: "Web開発カンファレンス",
      description: "frontend event",
      accepted: 450,
      started_at: "2026-03-20T03:00:00Z"
    },
    {
      title: "営業イベント",
      description: "営業人材向け",
      accepted: 1000,
      started_at: "2026-03-21T03:00:00Z"
    },
    {
      title: "インフラ勉強会",
      description: "kubernetes",
      accepted: 300,
      started_at: "2026-03-22T03:00:00Z"
    }
  ];

  const actual = filterTargetEvents(events, { minAccepted: 300, now });
  assert.equal(actual.length, 2);
  assert.equal(actual[0].title, "Web開発カンファレンス");
  assert.equal(actual[1].title, "インフラ勉強会");
});
