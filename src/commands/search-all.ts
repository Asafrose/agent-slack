import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("search-all")
    .description("Search messages in all channels (including private, DMs)")
    .requiredOption("--query <query>", "Search query")
    .option("--sort <sort>", "Sort by score or timestamp")
    .option("--sort-dir <dir>", "Sort direction (asc or desc)")
    .option("--limit <limit>", "Maximum number of results")
    .option("--channel-types <types>", "Comma-separated channel types")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const params: Record<string, unknown> = {
          query: opts.query,
        };
        if (opts.sort) params.sort = opts.sort;
        if (opts.sortDir) params.sort_dir = opts.sortDir;
        if (opts.limit) params.count = parseInt(opts.limit, 10);
        if (opts.cursor) params.cursor = opts.cursor;
        const result = await client.search.messages(params as Parameters<typeof client.search.messages>[0]);
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput(result.messages, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
