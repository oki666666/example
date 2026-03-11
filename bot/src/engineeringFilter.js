import { ENGINEERING_KEYWORDS, EXCLUSION_KEYWORDS } from "./keywords.js";

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function toSearchableText(event) {
  return normalizeText([
    event.title,
    event.catch,
    event.description,
    event.hash_tag
  ].join(" "));
}

function containsAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

export function isEngineeringEvent(event) {
  const text = toSearchableText(event);
  if (containsAnyKeyword(text, EXCLUSION_KEYWORDS)) {
    return false;
  }
  return containsAnyKeyword(text, ENGINEERING_KEYWORDS);
}

export function hasMinAcceptedParticipants(event, minAccepted) {
  const accepted = Number(event.accepted ?? 0);
  return Number.isFinite(accepted) && accepted >= minAccepted;
}

export function isUpcomingEvent(event, now = new Date()) {
  const startedAt = new Date(event.started_at);
  if (Number.isNaN(startedAt.getTime())) {
    return false;
  }
  return startedAt > now;
}

export function filterTargetEvents(events, options = {}) {
  const minAccepted = Number(options.minAccepted ?? 300);
  const now = options.now ?? new Date();

  return events
    .filter((event) => isEngineeringEvent(event))
    .filter((event) => hasMinAcceptedParticipants(event, minAccepted))
    .filter((event) => isUpcomingEvent(event, now))
    .sort((a, b) => {
      const acceptedDiff = Number(b.accepted ?? 0) - Number(a.accepted ?? 0);
      if (acceptedDiff !== 0) return acceptedDiff;
      return new Date(a.started_at) - new Date(b.started_at);
    });
}
