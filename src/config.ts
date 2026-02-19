import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";

export interface Config {
  token?: string;
}

export async function getConfig(): Promise<Config> {
  const configPath = join(homedir(), ".agent-slack", "config.json");
  const file = Bun.file(configPath);

  if (!(await file.exists())) {
    return {};
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed.token === "string" ? parsed.token : undefined,
    };
  } catch {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const dir = join(homedir(), ".agent-slack");
  const configPath = join(dir, "config.json");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const existing = await getConfig();
  const merged = { ...existing, ...config };
  await Bun.write(configPath, JSON.stringify(merged, null, 2) + "\n");
}

export async function deleteConfigKey(key: keyof Config): Promise<void> {
  const configPath = join(homedir(), ".agent-slack", "config.json");
  const file = Bun.file(configPath);
  if (!(await file.exists())) return;
  const existing = await getConfig();
  delete existing[key];
  await Bun.write(configPath, JSON.stringify(existing, null, 2) + "\n");
}
