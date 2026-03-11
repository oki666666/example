import { fetchConnpassEvents } from "./connpassClient.js";
import { filterTargetEvents } from "./engineeringFilter.js";
import { buildSlackPayloads, postToSlack } from "./slackNotifier.js";
import { fileURLToPath } from "node:url";

function loadConfig(env = process.env) {
  return {
    slackWebhookUrl: env.SLACK_WEBHOOK_URL ?? "",
    slackChannel: env.SLACK_CHANNEL ?? "#times-oki",
    minAccepted: Number(env.MIN_ACCEPTED ?? 300),
    dryRun: env.DRY_RUN === "1" || env.DRY_RUN === "true",
    maxPages: Number(env.CONNPASS_MAX_PAGES ?? 20),
    countPerPage: Number(env.CONNPASS_COUNT_PER_PAGE ?? 100),
    connpassApiUrl: env.CONNPASS_API_URL ?? "https://connpass.com/api/v1/event/"
  };
}

function printSummary(events, filteredEvents) {
  console.log(`[connpass] fetched events: ${events.length}`);
  console.log(`[connpass] matched events: ${filteredEvents.length}`);
}

export async function run(options = {}) {
  const config = loadConfig(options.env);
  const now = options.now ?? new Date();

  if (!config.dryRun && !config.slackWebhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is required unless DRY_RUN=1");
  }

  const events = await fetchConnpassEvents({
    apiUrl: config.connpassApiUrl,
    countPerPage: config.countPerPage,
    maxPages: config.maxPages
  });

  const filteredEvents = filterTargetEvents(events, {
    minAccepted: config.minAccepted,
    now
  });

  printSummary(events, filteredEvents);

  const payloads = buildSlackPayloads(filteredEvents, {
    minAccepted: config.minAccepted,
    channel: config.slackChannel
  });

  if (config.dryRun) {
    for (const [index, payload] of payloads.entries()) {
      console.log(`\n--- payload ${index + 1}/${payloads.length} ---`);
      console.log(payload.text);
    }
    return { events, filteredEvents, payloads, sent: 0 };
  }

  for (const payload of payloads) {
    await postToSlack(config.slackWebhookUrl, payload);
  }
  console.log(`[slack] sent messages: ${payloads.length}`);
  return { events, filteredEvents, payloads, sent: payloads.length };
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  run().catch((error) => {
    console.error("[error]", error.message);
    process.exitCode = 1;
  });
}
