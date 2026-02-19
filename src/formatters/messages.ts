import type { OutputFormat } from "../output";

export interface MessageChannel {
  id?: string;
  name?: string;
}

export interface MessageMatch {
  ts?: string;
  text?: string;
  username?: string;
  channel?: MessageChannel;
  permalink?: string;
  previous?: { text?: string };
  next?: { text?: string };
}

export interface MessagesResult {
  matches?: MessageMatch[];
  pagination?: { total_count?: number; page?: number; pages?: number };
  paging?: { count?: number; total?: number; page?: number; pages?: number };
  next_cursor?: string;
}

export function formatDate(ts: string | undefined): string {
  if (!ts) return "";
  const ms = parseFloat(ts) * 1000;
  return new Date(ms).toISOString();
}

export function formatMessageConcise(m: MessageMatch): string {
  const channel = m.channel?.name ? `#${m.channel.name}` : (m.channel?.id ?? "unknown");
  const author = m.username ?? "unknown";
  const text = (m.text ?? "").slice(0, 80);
  const date = formatDate(m.ts);
  return `${channel} - ${author}: ${text}${date ? ` [${date}]` : ""}`;
}

export function formatMessageDetailed(m: MessageMatch): string {
  const lines: string[] = [];
  const channel = m.channel?.name ? `#${m.channel.name}` : (m.channel?.id ?? "unknown");
  lines.push(`Channel: ${channel}`);
  if (m.ts) lines.push(`TS: ${m.ts}`);
  if (m.ts) lines.push(`Date: ${formatDate(m.ts)}`);
  if (m.username) lines.push(`Author: ${m.username}`);
  if (m.text) lines.push(`Text: ${m.text}`);
  if (m.previous?.text) lines.push(`Context before: ${m.previous.text}`);
  if (m.next?.text) lines.push(`Context after: ${m.next.text}`);
  if (m.permalink) lines.push(`Permalink: ${m.permalink}`);
  return lines.join("\n");
}

export function formatMessages(result: MessagesResult | undefined, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify(result ?? {}, null, 2);
  }
  const matches = result?.matches ?? [];
  const nextCursor = result?.next_cursor;
  if (format === "detailed") {
    const parts = matches.map(formatMessageDetailed);
    const out = parts.join("\n\n");
    return nextCursor ? `${out}\n\nNext cursor: ${nextCursor}` : out;
  }
  // concise
  const lines = matches.map(formatMessageConcise);
  const out = lines.join("\n");
  return nextCursor ? `${out}\n\nNext cursor: ${nextCursor}` : out;
}
