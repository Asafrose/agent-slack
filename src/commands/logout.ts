import type { Command } from "commander";
import { deleteConfigKey } from "../config";

export function register(program: Command): void {
  program
    .command("logout")
    .description("Remove stored Slack token")
    .action(async () => {
      await deleteConfigKey("token");
      console.log("Logged out — token removed from ~/.agent-slack/config.json");
    });
}
