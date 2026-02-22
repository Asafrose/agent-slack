import type { Command } from "commander";
import { getClient } from "../client";
import { resolveTextInput, buildMessageBlocks } from "../input";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("draft-message")
    .description("Create a draft message in a Slack channel")
    .requiredOption("--channel <channel>", "Channel ID or name")
    .option("--text <text>", "Message text")
    .option("--text-file <file>", "File containing message text")
    .option("--thread-ts <ts>", "Thread timestamp for draft reply")
    .option("--reply-broadcast", "Also post thread reply to the channel")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const mergedOpts = { ...(cmd.parent?.opts() ?? {}), ...opts };
        const client = await getClient();
        const text = await resolveTextInput({ text: opts.text, textFile: opts.textFile });

        // The Slack drafts API is undocumented and not in the typed SDK.
        // Use client.apiCall to hit the drafts.create endpoint directly.
        const result: Record<string, unknown> = await client.apiCall("drafts.create", {
          client_msg_id: crypto.randomUUID(),
          is_from_composer: false,
          file_ids: [],
          destinations: [
            {
              channel_id: opts.channel,
              thread_ts: opts.threadTs,
              broadcast: opts.replyBroadcast ?? false,
            },
          ],
          blocks: buildMessageBlocks(text),
        });

        const format = resolveFormat(mergedOpts);
        if (format === "concise") {
          console.log(`Draft created in ${opts.channel}`);
        } else if (format === "detailed") {
          const channelLink = `https://slack.com/app_redirect?channel=${opts.channel}`;
          console.log(
            formatOutput(
              { channel: opts.channel, channel_link: channelLink, draft: result },
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
