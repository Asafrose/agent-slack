import type { Command } from "commander";
import { getClient } from "../client";
import { resolveTextInput, buildMessageBlocks } from "../input";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("send-message")
    .description("Send a message to a Slack channel")
    .requiredOption("--channel <channel>", "Channel ID or name")
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
        const result = await client.chat.postMessage({
          channel: opts.channel,
          text,
          blocks: buildMessageBlocks(text),
          thread_ts: opts.threadTs,
          reply_broadcast: opts.replyBroadcast,
        });
        const format = resolveFormat(mergedOpts);
        if (format === "concise") {
          console.log(`Message sent to ${opts.channel} (ts: ${result.ts})`);
        } else if (format === "detailed") {
          console.log(
            formatOutput(
              {
                ts: result.ts,
                channel: result.channel,
                message: result.message,
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
