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

        // The Slack drafts API is undocumented and not in the typed SDK.
        // Use client.apiCall to hit the draft.create endpoint directly.
        const apiArgs: Record<string, unknown> = {
          channel_id: opts.channel,
          message: { text },
        };
        if (opts.threadTs) {
          apiArgs.thread_ts = opts.threadTs;
        }
        const result = await client.apiCall("draft.create", apiArgs) as Record<string, unknown>;

        const format = resolveFormat(mergedOpts);
        if (format === "concise") {
          console.log(`Draft created in ${opts.channel}`);
        } else if (format === "detailed") {
          const channelLink = `https://slack.com/app_redirect?channel=${opts.channel}`;
          console.log(formatOutput({ channel: opts.channel, channel_link: channelLink, draft: result }, "detailed"));
        } else {
          console.log(formatOutput(result, "json"));
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
