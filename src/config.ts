import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Config {
  token?: string;
}

export function getConfig(): Config {
  const configPath = join(homedir(), ".agent-slack", "config.json");

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed.token === "string" ? parsed.token : undefined,
    };
  } catch {
    return {};
  }
}
