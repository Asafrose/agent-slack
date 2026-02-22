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
  buildMessageBlocks: (text: string) => [
    { type: "section", text: { type: "mrkdwn", text } },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "_Sent by <https://github.com/Asafrose/agent-slack|agent-slack>_",
        },
      ],
    },
  ],
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
      "drafts.create",
      expect.objectContaining({
        client_msg_id: expect.any(String),
        is_from_composer: false,
        file_ids: [],
        destinations: [
          expect.objectContaining({
            channel_id: "C12345",
            broadcast: false,
          }),
        ],
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: "section" }),
          expect.objectContaining({ type: "context" }),
        ]),
      }),
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
    const callArgs = mockClient.apiCall.mock.calls[0][1] as Record<string, unknown>;
    const destinations = callArgs.destinations as Array<Record<string, unknown>>;
    expect(destinations[0].thread_ts).toBe("1234567890.000001");
  });

  it("does NOT include thread_ts when not provided", async () => {
    await runCommand(["draft-message", "--channel", "C12345", "--text", "No thread"]);
    const callArgs = mockClient.apiCall.mock.calls[0][1] as Record<string, unknown>;
    const destinations = callArgs.destinations as Array<Record<string, unknown>>;
    expect(destinations[0].thread_ts).toBeUndefined();
  });

  it("passes reply-broadcast to destinations", async () => {
    await runCommand([
      "draft-message",
      "--channel",
      "C12345",
      "--text",
      "Broadcast draft",
      "--thread-ts",
      "1234567890.000001",
      "--reply-broadcast",
    ]);
    const callArgs = mockClient.apiCall.mock.calls[0][1] as Record<string, unknown>;
    const destinations = callArgs.destinations as Array<Record<string, unknown>>;
    expect(destinations[0].broadcast).toBe(true);
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
