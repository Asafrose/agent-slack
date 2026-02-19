import type { Command } from "commander";
import { getClient } from "../client";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";

interface Reaction {
  name?: string;
  count?: number;
}

interface ThreadMessage {
  ts?: string;
  thread_ts?: string;
  user?: string;
  bot_id?: string;
  username?: string;
  text?: string;
  reactions?: Reaction[];
  files?: Array<{ name?: string }>;
}

interface ResponseMetadata {
  next_cursor?: string;
}

function formatTimestamp(ts: string): string {
  const date = new Date(parseFloat(ts) * 1000);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatAuthor(msg: ThreadMessage): string {
  if (msg.username) return msg.username;
  if (msg.user) return msg.user;
  if (msg.bot_id) return `bot:${msg.bot_id}`;
  return "unknown";
}

function formatConciseThread(messages: ThreadMessage[]): string {
  const lines: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const author = formatAuthor(msg);
    const time = msg.ts ? formatTimestamp(msg.ts) : "";
    const text = msg.text ?? "";
    if (i === 0) {
      lines.push(`${author}: ${text} [${time}]`);
    } else {
      lines.push(`> ${author}: ${text} [${time}]`);
    }
  }
  return lines.join("\n");
}

function formatDetailedMessage(msg: ThreadMessage, isParent: boolean): string {
  const lines: string[] = [];
  const label = isParent ? "THREAD PARENT" : "REPLY";
  lines.push(`=== ${label} (ts: ${msg.ts ?? "unknown"}) ===`);
  lines.push(`From: ${formatAuthor(msg)}`);
  if (msg.ts) lines.push(`Time: ${formatTimestamp(msg.ts)} (${msg.ts})`);
  lines.push(`Text: ${msg.text ?? ""}`);

  if (msg.reactions && msg.reactions.length > 0) {
    const reactionStr = msg.reactions.map((r) => `:${r.name}: (${r.count})`).join(", ");
    lines.push(`Reactions: ${reactionStr}`);
  }

  if (msg.files && msg.files.length > 0) {
    const fileStr = msg.files.map((f) => f.name ?? "unnamed").join(", ");
    lines.push(`Files: ${fileStr}`);
  }

  return lines.join("\n");
}

export function register(program: Command): void {
  program
    .command("read-thread")
    .description("Read messages from a Slack thread")
    .requiredOption("--channel <channel>", "Channel ID containing the thread")
    .requiredOption("--ts <ts>", "Timestamp of the parent message")
    .option("--limit <limit>", "Maximum number of messages", "100")
    .option("--oldest <ts>", "Only messages after this timestamp")
    .option("--latest <ts>", "Only messages before this timestamp")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const mergedOpts = { ...(cmd.parent?.opts() ?? {}), ...opts };
        const client = await getClient();
        const result = await client.conversations.replies({
          channel: opts.channel,
          ts: opts.ts,
          limit: parseInt(opts.limit, 10),
          oldest: opts.oldest,
          latest: opts.latest,
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);

        if (format === "json") {
          console.log(
            JSON.stringify(
              { messages: result.messages, response_metadata: result.response_metadata },
              null,
              2,
            ),
          );
          return;
        }

        const messages: ThreadMessage[] = result.messages ?? [];
        const meta: ResponseMetadata | undefined = result.response_metadata;

        if (format === "detailed") {
          const output = messages.map((msg, i) => formatDetailedMessage(msg, i === 0)).join("\n\n");
          console.log(output || "No messages found.");
          if (meta?.next_cursor) {
            console.log(`\n--- Next cursor: ${meta.next_cursor} ---`);
          }
        } else {
          const output = formatConciseThread(messages);
          console.log(output || "No messages found.");
          if (meta?.next_cursor) {
            console.log(`--- Next cursor: ${meta.next_cursor} ---`);
          }
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
