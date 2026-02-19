import { WebClient } from "@slack/web-api";
import { getConfig } from "./config";

export async function getClient(): Promise<WebClient> {
  const config = await getConfig();
  const token = config.token;

  if (!token) {
    console.error("Error: Not logged in. Run `agent-slack login` to authenticate.");
    process.exit(1);
  }

  return new WebClient(token);
}
