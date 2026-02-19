import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat, OutputFormat } from "../output";
import { handleSlackError } from "../errors";

interface MessageChannel {
  id?: string;
  name?: string;
}

interface MessageMatch {
  ts?: string;
  text?: string;
  username?: string;
  channel?: MessageChannel;
  permalink?: string;
  previous?: { text?: string };
  next?: { text?: string };
}

interface MessagesResult {
  matches?: MessageMatch[];
  pagination?: { total_count?: number; page?: number; pages?: number };
  paging?: { count?: number; total?: number; page?: number; pages?: number };
  next_cursor?: string;
}

function formatDate(ts: string | undefined): string {
  if (!ts) return "";
  const ms = parseFloat(ts) * 1000;
  return new Date(ms).toISOString();
}

function formatMessageConcise(m: MessageMatch): string {
  const channel = m.channel?.name ? `#${m.channel.name}` : m.channel?.id ?? "unknown";
  const author = m.username ?? "unknown";
  const text = (m.text ?? "").slice(0, 80);
  const date = formatDate(m.ts);
  return `${channel} - ${author}: ${text}${date ? ` [${date}]` : ""}`;
}

function formatMessageDetailed(m: MessageMatch): string {
  const lines: string[] = [];
  const channel = m.channel?.name ? `#${m.channel.name}` : m.channel?.id ?? "unknown";
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

function formatMessages(
  result: MessagesResult | undefined,
  format: OutputFormat
): string {
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

export function register(program: Command): void {
  program
    .command("search-messages")
    .description("Search messages in public Slack channels")
    .requiredOption("--query <query>", "Search query")
    .option("--sort <sort>", "Sort by score or timestamp", "score")
    .option("--sort-dir <dir>", "Sort direction (asc or desc)", "desc")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await client.search.messages({
          query: opts.query,
          sort: opts.sort as "score" | "timestamp",
          sort_dir: opts.sortDir as "asc" | "desc",
          count: parseInt(opts.limit, 10),
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatMessages(result.messages as MessagesResult | undefined, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
