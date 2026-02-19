import { Command } from "commander";
import { getClient } from "../client";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";
import { formatMessages, MessagesResult } from "../formatters/messages";

export function register(program: Command): void {
  program
    .command("search-all")
    .description("Search messages in all channels (including private, DMs)")
    .requiredOption("--query <query>", "Search query")
    .option("--sort <sort>", "Sort by score or timestamp", "score")
    .option("--sort-dir <dir>", "Sort direction (asc or desc)", "desc")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--channel-types <types>", "Comma-separated channel types", "public_channel,private_channel,mpim,im")
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
          sort: opts.sort as "score" | "timestamp",
          sort_dir: opts.sortDir as "asc" | "desc",
          count: parseInt(opts.limit, 10),
        };
        if (opts.cursor) params.cursor = opts.cursor;
        const result = await client.search.messages(params as Parameters<typeof client.search.messages>[0]);
        const format = resolveFormat(mergedOpts);
        console.log(formatMessages(result.messages as MessagesResult | undefined, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
