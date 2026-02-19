import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";

describe("getClient auth resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean up env vars between tests
    delete process.env.SLACK_TOKEN;
  });

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
  });

  it("uses SLACK_TOKEN env var when set", async () => {
    process.env.SLACK_TOKEN = "xoxb-env-token";

    const { getClient } = await import("../../src/client");
    const client = getClient();

    // WebClient stores token internally
    expect((client as unknown as { token: string }).token).toBe("xoxb-env-token");
  });

  it("uses --token flag when SLACK_TOKEN env is not set", async () => {
    delete process.env.SLACK_TOKEN;

    const { getClient } = await import("../../src/client");
    const client = getClient({ token: "xoxb-flag-token" });

    expect((client as unknown as { token: string }).token).toBe("xoxb-flag-token");
  });

  it("falls back to config file when no env or flag token", async () => {
    delete process.env.SLACK_TOKEN;

    mock.module("../../src/config", () => ({
      getConfig: () => ({ token: "xoxb-config-token" }),
    }));

    const { getClient } = await import("../../src/client");
    const client = getClient();

    expect((client as unknown as { token: string }).token).toBe("xoxb-config-token");
  });

  it("exits with error when no token is available", async () => {
    delete process.env.SLACK_TOKEN;

    mock.module("../../src/config", () => ({
      getConfig: () => ({}),
    }));

    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);

    const { getClient } = await import("../../src/client");

    expect(() => getClient()).toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
