const DEFAULT_API_URL = "https://connpass.com/api/v1/event/";

export async function fetchConnpassEvents(options = {}) {
  const apiUrl = options.apiUrl ?? DEFAULT_API_URL;
  const countPerPage = Number(options.countPerPage ?? 100);
  const maxPages = Number(options.maxPages ?? 20);
  const fetchImpl = options.fetchImpl ?? fetch;

  let start = 1;
  let page = 0;
  let resultsAvailable = Infinity;
  const allEvents = [];

  while (page < maxPages && allEvents.length < resultsAvailable) {
    const url = new URL(apiUrl);
    url.searchParams.set("count", String(countPerPage));
    url.searchParams.set("start", String(start));
    url.searchParams.set("order", "2");

    const response = await fetchImpl(url, {
      headers: { "User-Agent": "connpass-popular-events-bot/1.0" }
    });

    if (!response.ok) {
      throw new Error(`connpass API request failed: ${response.status}`);
    }

    const payload = await response.json();
    const events = Array.isArray(payload.events) ? payload.events : [];
    const returned = Number(payload.results_returned ?? events.length);
    resultsAvailable = Number(payload.results_available ?? allEvents.length + events.length);

    allEvents.push(...events);

    if (returned === 0) {
      break;
    }

    page += 1;
    start += returned;
  }

  return allEvents;
}
