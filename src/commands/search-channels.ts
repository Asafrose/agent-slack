import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

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
        const format = resolveFormat(mergedOpts);
        const channels = (result.channels ?? []).filter((ch) =>
          ch.name?.toLowerCase().includes(opts.query.toLowerCase())
        );
        console.log(formatOutput({ channels, response_metadata: result.response_metadata }, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
