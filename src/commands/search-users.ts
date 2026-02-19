import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("search-users")
    .description("Search for Slack users")
    .requiredOption("--query <query>", "Search query")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await client.users.list({
          limit: parseInt(opts.limit, 10),
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);
        const users = (result.members ?? []).filter((u) =>
          u.name?.toLowerCase().includes(opts.query.toLowerCase()) ||
          u.real_name?.toLowerCase().includes(opts.query.toLowerCase())
        );
        console.log(formatOutput({ users, response_metadata: result.response_metadata }, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
