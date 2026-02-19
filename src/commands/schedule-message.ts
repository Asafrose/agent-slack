import type { Command } from "commander";
import { getClient } from "../client";
import { resolveTextInput } from "../input";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

function resolvePostAt(value: string): number {
  // Accept Unix timestamp (integer string) or ISO 8601 datetime string
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  const ms = Date.parse(value);
  if (isNaN(ms)) {
    throw new Error(
      `Invalid --post-at value: "${value}". Provide a Unix timestamp or ISO 8601 datetime.`,
    );
  }
  return Math.floor(ms / 1000);
}

export function register(program: Command): void {
  program
    .command("schedule-message")
    .description("Schedule a message to be sent to a Slack channel")
    .requiredOption("--channel <channel>", "Channel ID or name")
    .requiredOption("--post-at <timestamp>", "When to send: Unix timestamp or ISO 8601 datetime")
    .option("--text <text>", "Message text")
    .option("--text-file <file>", "File containing message text")
    .option("--thread-ts <ts>", "Thread timestamp to reply to")
    .option("--reply-broadcast", "Also post reply to channel")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const mergedOpts = { ...(cmd.parent?.opts() ?? {}), ...opts };
        const client = await getClient();
        const text = await resolveTextInput({ text: opts.text, textFile: opts.textFile });
        const postAt = resolvePostAt(opts.postAt);
        const result = await client.chat.scheduleMessage({
          channel: opts.channel,
          text,
          post_at: postAt,
          thread_ts: opts.threadTs,
          reply_broadcast: opts.replyBroadcast,
        });
        const format = resolveFormat(mergedOpts);
        if (format === "concise") {
          const humanTime = new Date(postAt * 1000).toISOString();
          console.log(
            `Message scheduled in ${opts.channel} for ${humanTime} (id: ${result.scheduled_message_id})`,
          );
        } else if (format === "detailed") {
          console.log(
            formatOutput(
              {
                scheduled_message_id: result.scheduled_message_id,
                channel: result.channel,
                post_at: postAt,
                post_at_human: new Date(postAt * 1000).toISOString(),
              },
              "detailed",
            ),
          );
        } else {
          console.log(formatOutput(result, "json"));
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
