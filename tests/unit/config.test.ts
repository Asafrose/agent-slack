import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Use a unique temp dir for each test run
let tempHome: string;

// Mock os.homedir to return our temp dir
mock.module("os", () => ({
  homedir: () => tempHome,
}));

// Re-export join since config.ts also imports from "path"
// (path doesn't need mocking)

describe("getConfig", () => {
  beforeEach(() => {
    tempHome = join(
      tmpdir(),
      `agent-slack-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempHome, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it("loads valid config with token", async () => {
    const configDir = join(tempHome, ".agent-slack");
    mkdirSync(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.json"), JSON.stringify({ token: "xoxb-test-token" }));

    const { getConfig } = await import("../../src/config");
    const config = await getConfig();

    expect(config.token).toBe("xoxb-test-token");
  });

  it("returns empty config when file does not exist", async () => {
    const { getConfig } = await import("../../src/config");
    const config = await getConfig();

    expect(config.token).toBeUndefined();
  });

  it("returns empty config on malformed JSON", async () => {
    const configDir = join(tempHome, ".agent-slack");
    mkdirSync(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.json"), "{ invalid json {{");

    const { getConfig } = await import("../../src/config");
    const config = await getConfig();

    expect(config.token).toBeUndefined();
  });

  it("returns empty config when token is not a string", async () => {
    const configDir = join(tempHome, ".agent-slack");
    mkdirSync(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.json"), JSON.stringify({ token: 12345 }));

    const { getConfig } = await import("../../src/config");
    const config = await getConfig();

    expect(config.token).toBeUndefined();
  });
});

describe("saveConfig", () => {
  beforeEach(() => {
    tempHome = join(
      tmpdir(),
      `agent-slack-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempHome, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it("creates directory and writes config when dir does not exist", async () => {
    const { saveConfig } = await import("../../src/config");
    await saveConfig({ token: "xoxp-new-token" });

    const configPath = join(tempHome, ".agent-slack", "config.json");
    const content = await Bun.file(configPath).text();
    const parsed = JSON.parse(content);
    expect(parsed.token).toBe("xoxp-new-token");
  });

  it("merges with existing config", async () => {
    const configDir = join(tempHome, ".agent-slack");
    mkdirSync(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.json"), JSON.stringify({ token: "old-token" }));

    const { saveConfig } = await import("../../src/config");
    await saveConfig({ token: "new-token" });

    const content = await Bun.file(join(configDir, "config.json")).text();
    const parsed = JSON.parse(content);
    expect(parsed.token).toBe("new-token");
  });
});

describe("deleteConfigKey", () => {
  beforeEach(() => {
    tempHome = join(
      tmpdir(),
      `agent-slack-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempHome, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it("removes the token key from config", async () => {
    const configDir = join(tempHome, ".agent-slack");
    mkdirSync(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.json"), JSON.stringify({ token: "xoxp-remove-me" }));

    const { deleteConfigKey } = await import("../../src/config");
    await deleteConfigKey("token");

    const content = await Bun.file(join(configDir, "config.json")).text();
    const parsed = JSON.parse(content);
    expect(parsed.token).toBeUndefined();
  });

  it("does nothing when config file does not exist", async () => {
    const { deleteConfigKey } = await import("../../src/config");
    await deleteConfigKey("token");

    // No error, no file created
    const configPath = join(tempHome, ".agent-slack", "config.json");
    expect(existsSync(configPath)).toBe(false);
  });
});
