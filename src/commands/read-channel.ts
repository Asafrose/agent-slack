import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("read-channel")
    .description("Read messages from a Slack channel")
    .requiredOption("--channel <channel>", "Channel ID")
    .option("--limit <limit>", "Maximum number of messages", "100")
    .option("--oldest <ts>", "Only messages after this timestamp")
    .option("--latest <ts>", "Only messages before this timestamp")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await client.conversations.history({
          channel: opts.channel,
          limit: parseInt(opts.limit, 10),
          oldest: opts.oldest,
          latest: opts.latest,
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput({ messages: result.messages, response_metadata: result.response_metadata }, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
