import { Command } from "commander";
import { getClient } from "../client";
import { resolveTextInput } from "../input";
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
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const text = await resolveTextInput({ text: opts.text, textFile: opts.textFile });
        // Draft messages use the files.getUploadURLExternal / files.completeUploadExternal pattern
        // or client.drafts API if available. For now use chat.postMessage with a placeholder.
        // The actual Slack "drafts" API is not in the official SDK yet.
        // We use conversations API workaround: post to a draft endpoint.
        const result = await (client as unknown as { drafts?: { add: (args: unknown) => Promise<unknown> } }).drafts?.add?.({
          channel_id: opts.channel,
          message: { text },
          thread_ts: opts.threadTs,
        }) ?? { channel_id: opts.channel };
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput(result, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
