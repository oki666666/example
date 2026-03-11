const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function formatDateJst(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return `${DATE_FORMATTER.format(date)} JST`;
}

function renderEventLine(event, index) {
  const title = event.title ?? "(no title)";
  const url = event.event_url ?? "";
  const accepted = Number(event.accepted ?? 0);
  return [
    `${index + 1}. *${title}*`,
    `   開催: ${formatDateJst(event.started_at)}`,
    `   参加者: ${accepted}人`,
    `   ${url}`
  ].join("\n");
}

function splitIntoChunks(events, chunkSize = 20) {
  const chunks = [];
  for (let i = 0; i < events.length; i += chunkSize) {
    chunks.push(events.slice(i, i + chunkSize));
  }
  return chunks;
}

export function buildSlackPayloads(events, options = {}) {
  const minAccepted = Number(options.minAccepted ?? 300);
  const channel = options.channel;

  if (events.length === 0) {
    return [{
      text: `今週の connpass 人気イベント（${minAccepted}人以上 / 開催前）は 0 件でした。`,
      ...(channel ? { channel } : {})
    }];
  }

  const chunks = splitIntoChunks(events);
  return chunks.map((chunk, chunkIndex) => {
    const header = `今週の connpass 人気イベント（${minAccepted}人以上 / 開催前）\n${events.length}件ヒット${chunks.length > 1 ? `（${chunkIndex + 1}/${chunks.length}）` : ""}`;
    const body = chunk
      .map((event, index) => renderEventLine(event, chunkIndex * 20 + index))
      .join("\n\n");

    return {
      text: `${header}\n\n${body}`,
      ...(channel ? { channel } : {})
    };
  });
}

export async function postToSlack(webhookUrl, payload, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${body}`);
  }
}
