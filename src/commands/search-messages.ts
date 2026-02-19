import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("search-messages")
    .description("Search messages in public Slack channels")
    .requiredOption("--query <query>", "Search query")
    .option("--sort <sort>", "Sort by score or timestamp", "score")
    .option("--sort-dir <dir>", "Sort direction (asc or desc)", "desc")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await client.search.messages({
          query: opts.query,
          sort: opts.sort as "score" | "timestamp",
          sort_dir: opts.sortDir as "asc" | "desc",
          count: parseInt(opts.limit, 10),
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput(result.messages, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
