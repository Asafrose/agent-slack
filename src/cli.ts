import { Command } from "commander";
import { register as registerSendMessage } from "./commands/send-message";
import { register as registerScheduleMessage } from "./commands/schedule-message";
import { register as registerDraftMessage } from "./commands/draft-message";
import { register as registerSearchChannels } from "./commands/search-channels";
import { register as registerReadChannel } from "./commands/read-channel";
import { register as registerSearchMessages } from "./commands/search-messages";
import { register as registerReadThread } from "./commands/read-thread";
import { register as registerSearchUsers } from "./commands/search-users";
import { register as registerReadUserProfile } from "./commands/read-user-profile";
import { register as registerSearchAll } from "./commands/search-all";
import { register as registerCreateCanvas } from "./commands/create-canvas";
import { register as registerReadCanvas } from "./commands/read-canvas";
import { register as registerLogin } from "./commands/login";
import { register as registerLogout } from "./commands/logout";

const program = new Command();

program
  .name("agent-slack")
  .description("Slack CLI tool for AI agents - replaces MCP Slack tools with a token-efficient CLI")
  .version("0.1.0")
  .option("--detailed", "Use detailed output format")
  .option("--json", "Use JSON output format");

registerSendMessage(program);
registerScheduleMessage(program);
registerDraftMessage(program);
registerSearchChannels(program);
registerReadChannel(program);
registerSearchMessages(program);
registerReadThread(program);
registerSearchUsers(program);
registerReadUserProfile(program);
registerSearchAll(program);
registerCreateCanvas(program);
registerReadCanvas(program);
registerLogin(program);
registerLogout(program);

export function run(): void {
  program.parse();
}
