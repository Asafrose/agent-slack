import { Command } from "commander";
import { getClient } from "../client";
import { resolveTextInput } from "../input";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("schedule-message")
    .description("Schedule a message to be sent to a Slack channel")
    .requiredOption("--channel <channel>", "Channel ID or name")
    .requiredOption("--post-at <timestamp>", "Unix timestamp when message should be sent")
    .option("--text <text>", "Message text")
    .option("--text-file <file>", "File containing message text")
    .option("--thread-ts <ts>", "Thread timestamp to reply to")
    .option("--reply-broadcast", "Also post reply to channel")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const text = await resolveTextInput({ text: opts.text, textFile: opts.textFile });
        const result = await client.chat.scheduleMessage({
          channel: opts.channel,
          text,
          post_at: parseInt(opts.postAt, 10),
          thread_ts: opts.threadTs,
          reply_broadcast: opts.replyBroadcast,
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput({ scheduled_message_id: result.scheduled_message_id, channel: result.channel }, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
