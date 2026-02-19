import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("read-user-profile")
    .description("Get profile information for a Slack user")
    .option("--user <user>", "User ID (defaults to authenticated user)")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await client.users.info({
          user: opts.user ?? (await client.auth.test()).user_id ?? "",
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput(result.user, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
