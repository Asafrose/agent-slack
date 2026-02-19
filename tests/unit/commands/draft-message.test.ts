import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { Command } from "commander";
import { createMockWebClient } from "../../helpers/mock-slack";

const mockDraftCreateResponse = { ok: true, draft_id: "D12345" };

const mockClient = {
  ...createMockWebClient(),
  apiCall: mock(async (_method: string, _args: unknown) => mockDraftCreateResponse),
};

mock.module("../../../src/client", () => ({
  getClient: () => mockClient,
}));

mock.module("../../../src/input", () => ({
  resolveTextInput: mock(async (opts: { text?: string; textFile?: string }) => {
    if (opts.text) return opts.text;
    return "stdin text";
  }),
}));

async function runCommand(args: string[]): Promise<string> {
  const logs: string[] = [];
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    logs.push(msg);
  });
  const { register } = await import("../../../src/commands/draft-message");
  const program = new Command();
  program.option("--detailed").option("--json");
  register(program);
  await program.parseAsync(["node", "agent-slack", ...args]);
  consoleSpy.mockRestore();
  return logs.join("\n");
}

describe("draft-message", () => {
  beforeEach(() => {
    mockClient.apiCall.mockReset();
    mockClient.apiCall.mockResolvedValue(mockDraftCreateResponse);
  });

  it("creates a draft and prints concise output", async () => {
    const output = await runCommand([
      "draft-message",
      "--channel",
      "C12345",
      "--text",
      "Draft content",
    ]);
    expect(mockClient.apiCall).toHaveBeenCalledWith(
      "draft.create",
      expect.objectContaining({ channel_id: "C12345", message: { text: "Draft content" } }),
    );
    expect(output).toContain("Draft created in C12345");
  });

  it("creates a draft with thread_ts when --thread-ts provided", async () => {
    await runCommand([
      "draft-message",
      "--channel",
      "C12345",
      "--text",
      "Thread draft",
      "--thread-ts",
      "1234567890.000001",
    ]);
    expect(mockClient.apiCall).toHaveBeenCalledWith(
      "draft.create",
      expect.objectContaining({
        channel_id: "C12345",
        thread_ts: "1234567890.000001",
      }),
    );
  });

  it("does NOT include thread_ts when not provided", async () => {
    await runCommand(["draft-message", "--channel", "C12345", "--text", "No thread"]);
    const callArgs = mockClient.apiCall.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.thread_ts).toBeUndefined();
  });

  it("outputs JSON format", async () => {
    const output = await runCommand([
      "draft-message",
      "--channel",
      "C12345",
      "--text",
      "Draft",
      "--json",
    ]);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.draft_id).toBe("D12345");
  });

  it("outputs detailed format with channel link", async () => {
    const output = await runCommand([
      "draft-message",
      "--channel",
      "C12345",
      "--text",
      "Draft",
      "--detailed",
    ]);
    const parsed = JSON.parse(output);
    expect(parsed.channel).toBe("C12345");
    expect(parsed.channel_link).toContain("C12345");
  });

  it("handles API errors", async () => {
    mockClient.apiCall.mockRejectedValue(new Error("draft_error"));
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);

    try {
      await runCommand(["draft-message", "--channel", "C12345", "--text", "Fail"]);
    } catch {
      // expected
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
