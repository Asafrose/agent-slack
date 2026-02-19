import { describe, it, expect, mock, beforeEach, spyOn, afterEach } from "bun:test";
import { Command } from "commander";

const mockDeleteConfigKey = mock(() => {});
const mockGetConfig = mock(() => ({}));
const mockSaveConfig = mock(() => {});

mock.module("../../../src/config", () => ({
  deleteConfigKey: mockDeleteConfigKey,
  getConfig: mockGetConfig,
  saveConfig: mockSaveConfig,
}));

describe("logout", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  const logs: string[] = [];

  beforeEach(() => {
    logs.length = 0;
    mockDeleteConfigKey.mockReset();
    consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls deleteConfigKey and prints confirmation", async () => {
    const { register } = await import("../../../src/commands/logout");
    const program = new Command();
    program.option("--token <token>").option("--detailed").option("--json");
    register(program);

    await program.parseAsync(["node", "agent-slack", "logout"]);

    expect(mockDeleteConfigKey).toHaveBeenCalledWith("token");
    expect(logs.some((l) => l.includes("Logged out"))).toBe(true);
  });
});
