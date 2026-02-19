import type { Command } from "commander";
import { getClient } from "../client";
import type { OutputFormat } from "../output";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";

interface Channel {
  id?: string;
  name?: string;
  purpose?: { value?: string };
  topic?: { value?: string };
  num_members?: number;
  creator?: string;
  created?: number;
  is_archived?: boolean;
}

function formatChannelConcise(ch: Channel): string {
  const name = ch.name ? `#${ch.name}` : (ch.id ?? "unknown");
  const purpose = ch.purpose?.value ?? "";
  const members = ch.num_members !== undefined ? ` [${ch.num_members} members]` : "";
  return purpose ? `${name} - ${purpose}${members}` : `${name}${members}`;
}

function formatChannelDetailed(ch: Channel): string {
  const lines: string[] = [];
  lines.push(`Name: ${ch.name ? `#${ch.name}` : (ch.id ?? "unknown")}`);
  if (ch.id) lines.push(`ID: ${ch.id}`);
  if (ch.creator) lines.push(`Creator: ${ch.creator}`);
  if (ch.created) lines.push(`Created: ${new Date(ch.created * 1000).toISOString()}`);
  if (ch.purpose?.value) lines.push(`Purpose: ${ch.purpose.value}`);
  if (ch.topic?.value) lines.push(`Topic: ${ch.topic.value}`);
  if (ch.num_members !== undefined) lines.push(`Members: ${ch.num_members}`);
  lines.push(`Archived: ${ch.is_archived ? "yes" : "no"}`);
  return lines.join("\n");
}

function formatChannels(
  channels: Channel[],
  nextCursor: string | undefined,
  format: OutputFormat,
): string {
  if (format === "json") {
    return JSON.stringify({ channels, next_cursor: nextCursor ?? "" }, null, 2);
  }
  if (format === "detailed") {
    const parts = channels.map(formatChannelDetailed);
    const out = parts.join("\n\n");
    return nextCursor ? `${out}\n\nNext cursor: ${nextCursor}` : out;
  }
  // concise
  const lines = channels.map(formatChannelConcise);
  const out = lines.join("\n");
  return nextCursor ? `${out}\n\nNext cursor: ${nextCursor}` : out;
}

export function register(program: Command): void {
  program
    .command("search-channels")
    .description("Search for Slack channels")
    .requiredOption("--query <query>", "Search query")
    .option("--types <types>", "Channel types (comma-separated)", "public_channel")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--include-archived", "Include archived channels")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await client.conversations.list({
          types: opts.types,
          limit: parseInt(opts.limit, 10),
          exclude_archived: !opts.includeArchived,
          cursor: opts.cursor,
        });
        const query = opts.query.toLowerCase();
        const allChannels: Channel[] = result.channels ?? [];
        const channels = allChannels.filter((ch) => {
          const name = ch.name?.toLowerCase() ?? "";
          const purpose = ch.purpose?.value?.toLowerCase() ?? "";
          const topic = ch.topic?.value?.toLowerCase() ?? "";
          return name.includes(query) || purpose.includes(query) || topic.includes(query);
        });
        const format = resolveFormat(mergedOpts);
        const nextCursor = result.response_metadata?.next_cursor;
        console.log(formatChannels(channels, nextCursor, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
