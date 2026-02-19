import { describe, it, expect, mock, beforeEach, spyOn, afterEach } from "bun:test";
import { Command } from "commander";

const mockSaveConfig = mock(async () => {});
const mockDeleteConfigKey = mock(async () => {});
const mockGetConfig = mock(async () => ({}));

mock.module("../../../src/config", () => ({
  saveConfig: mockSaveConfig,
  deleteConfigKey: mockDeleteConfigKey,
  getConfig: mockGetConfig,
}));

mock.module("../../../src/constants", () => ({
  SLACK_CLIENT_ID: "test-client-id",
  OAUTH_WORKER_URL: "https://test-worker.example.com",
  OAUTH_CALLBACK_PORT: 0,
  OAUTH_USER_SCOPES: "search:read,chat:write",
}));

// Prevent browser from opening during tests
const mockSpawn = mock(() => ({ exitCode: 0 }));
const originalSpawn = Bun.spawn;

describe("login", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  const logs: string[] = [];
  const errors: string[] = [];

  beforeEach(() => {
    logs.length = 0;
    errors.length = 0;
    mockSaveConfig.mockReset();
    // @ts-expect-error -- mock Bun.spawn to prevent browser opening
    Bun.spawn = mockSpawn;
    consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });
    errorSpy = spyOn(console, "error").mockImplementation((msg: string) => {
      errors.push(msg);
    });
    exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    // @ts-expect-error -- restore original
    Bun.spawn = originalSpawn;
  });

  function getPortFromLogs(): number | null {
    for (const l of logs) {
      const match = l.match(/port (\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  }

  it("rejects callback with mismatched state", async () => {
    const { register } = await import("../../../src/commands/login");
    const program = new Command();
    program.option("--token <token>").option("--detailed").option("--json");
    register(program);

    const loginPromise = program.parseAsync(["node", "agent-slack", "login", "--port", "0"]);

    // Wait for server to start
    await new Promise((r) => setTimeout(r, 100));

    const port = getPortFromLogs();
    expect(port).not.toBeNull();
    expect(port).toBeGreaterThan(0);

    // Send callback with wrong state
    const res = await fetch(`http://localhost:${port}/callback?code=test-code&state=wrong-state`);
    const text = await res.text();
    expect(text).toContain("state mismatch");

    try {
      await loginPromise;
    } catch {
      // Expected — state mismatch
    }

    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it("handles Slack OAuth error parameter", async () => {
    const { register } = await import("../../../src/commands/login");
    const program = new Command();
    program.option("--token <token>").option("--detailed").option("--json");
    register(program);

    const loginPromise = program.parseAsync(["node", "agent-slack", "login", "--port", "0"]);

    await new Promise((r) => setTimeout(r, 100));

    const port = getPortFromLogs();
    expect(port).not.toBeNull();

    const res = await fetch(`http://localhost:${port}/callback?error=access_denied&state=test`);
    const text = await res.text();
    expect(text).toContain("Authorization failed");

    try {
      await loginPromise;
    } catch {
      // Expected
    }

    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it("returns 404 for non-callback paths", async () => {
    const { register } = await import("../../../src/commands/login");
    const program = new Command();
    program.option("--token <token>").option("--detailed").option("--json");
    register(program);

    const loginPromise = program.parseAsync(["node", "agent-slack", "login", "--port", "0"]);

    await new Promise((r) => setTimeout(r, 100));

    const port = getPortFromLogs();
    expect(port).not.toBeNull();

    const res = await fetch(`http://localhost:${port}/other-path`);
    expect(res.status).toBe(404);

    // Clean up by sending an error to stop the server
    await fetch(`http://localhost:${port}/callback?error=cancel`);

    try {
      await loginPromise;
    } catch {
      // Expected
    }
  });
});
