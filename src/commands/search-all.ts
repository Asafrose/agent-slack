import type { Command } from "commander";
import { getClient } from "../client";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";
import type { MessagesResult } from "../formatters/messages";
import { formatMessages } from "../formatters/messages";

export function register(program: Command): void {
  program
    .command("search-all")
    .description("Search messages in all channels (including private, DMs)")
    .requiredOption("--query <query>", "Search query")
    .option("--sort <sort>", "Sort by score or timestamp", "score")
    .option("--sort-dir <dir>", "Sort direction (asc or desc)", "desc")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option(
      "--channel-types <types>",
      "Comma-separated channel types",
      "public_channel,private_channel,mpim,im",
    )
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = await getClient({ token: mergedOpts.token });
        const sort: "score" | "timestamp" = opts.sort === "timestamp" ? "timestamp" : "score";
        const sortDir: "asc" | "desc" = opts.sortDir === "asc" ? "asc" : "desc";
        const result = await client.search.messages({
          query: opts.query,
          sort,
          sort_dir: sortDir,
          count: parseInt(opts.limit, 10),
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);
        const messages: MessagesResult | undefined = result.messages;
        console.log(formatMessages(messages, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
