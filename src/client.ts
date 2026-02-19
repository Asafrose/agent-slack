import { WebClient } from "@slack/web-api";
import { getConfig } from "./config";

export interface ClientOptions {
  token?: string;
}

export async function getClient(opts?: ClientOptions): Promise<WebClient> {
  const config = await getConfig();
  const token = process.env.SLACK_TOKEN || opts?.token || config.token;

  if (!token) {
    console.error(
      "Error: No Slack token found. Set SLACK_TOKEN env var, use --token flag, or add token to ~/.agent-slack/config.json",
    );
    process.exit(1);
  }

  return new WebClient(token);
}
