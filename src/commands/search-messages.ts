import type { Command } from "commander";
import { getClient } from "../client";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";
import type { MessagesResult } from "../formatters/messages";
import { formatMessages } from "../formatters/messages";

export function register(program: Command): void {
  program
    .command("search-messages")
    .description("Search messages in public Slack channels")
    .requiredOption("--query <query>", "Search query")
    .option("--sort <sort>", "Sort by score or timestamp", "score")
    .option("--sort-dir <dir>", "Sort direction (asc or desc)", "desc")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--page <page>", "Page number for pagination")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const mergedOpts = { ...(cmd.parent?.opts() ?? {}), ...opts };
        const client = await getClient();
        const sort: "score" | "timestamp" = opts.sort === "timestamp" ? "timestamp" : "score";
        const sortDir: "asc" | "desc" = opts.sortDir === "asc" ? "asc" : "desc";
        const result = await client.search.messages({
          query: opts.query,
          sort,
          sort_dir: sortDir,
          count: parseInt(opts.limit, 10),
          page: opts.page ? parseInt(opts.page, 10) : undefined,
        });
        const format = resolveFormat(mergedOpts);
        const messages: MessagesResult | undefined = result.messages;
        console.log(formatMessages(messages, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
