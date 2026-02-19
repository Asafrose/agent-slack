import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { Command } from "commander";
import { mockScheduleMessageResponse, createMockWebClient } from "../../helpers/mock-slack";

const mockClient = createMockWebClient();

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
        { type: "mrkdwn", text: "_Sent by <https://github.com/Asafrose/agent-slack|agent-slack>_" },
      ],
    },
  ],
}));

async function runCommand(args: string[]): Promise<string> {
  const logs: string[] = [];
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    logs.push(msg);
  });
  const { register } = await import("../../../src/commands/schedule-message");
  const program = new Command();
  program.option("--detailed").option("--json");
  register(program);
  await program.parseAsync(["node", "agent-slack", ...args]);
  consoleSpy.mockRestore();
  return logs.join("\n");
}

describe("schedule-message", () => {
  beforeEach(() => {
    mockClient.chat.scheduleMessage.mockReset();
    mockClient.chat.scheduleMessage.mockResolvedValue(mockScheduleMessageResponse);
  });

  it("schedules a message with unix timestamp and prints concise output", async () => {
    const output = await runCommand([
      "schedule-message",
      "--channel",
      "C12345",
      "--text",
      "Future message",
      "--post-at",
      "1700000000",
    ]);
    expect(mockClient.chat.scheduleMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "C12345",
        text: "Future message",
        post_at: 1700000000,
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: "section" }),
          expect.objectContaining({ type: "context" }),
        ]),
      }),
    );
    expect(output).toContain("Message scheduled in C12345");
    expect(output).toContain("Q12345");
  });

  it("accepts ISO 8601 datetime for --post-at", async () => {
    const iso = "2025-11-15T00:00:00Z";
    const expectedUnix = Math.floor(Date.parse(iso) / 1000);
    await runCommand([
      "schedule-message",
      "--channel",
      "C12345",
      "--text",
      "ISO test",
      "--post-at",
      iso,
    ]);
    expect(mockClient.chat.scheduleMessage).toHaveBeenCalledWith(
      expect.objectContaining({ post_at: expectedUnix }),
    );
  });

  it("outputs JSON format", async () => {
    const output = await runCommand([
      "schedule-message",
      "--channel",
      "C12345",
      "--text",
      "Future message",
      "--post-at",
      "1700000000",
      "--json",
    ]);
    const parsed = JSON.parse(output);
    expect(parsed.scheduled_message_id).toBe("Q12345");
    expect(parsed.channel).toBe("C12345");
  });

  it("outputs detailed format with human-readable time", async () => {
    const output = await runCommand([
      "schedule-message",
      "--channel",
      "C12345",
      "--text",
      "Future message",
      "--post-at",
      "1700000000",
      "--detailed",
    ]);
    const parsed = JSON.parse(output);
    expect(parsed.scheduled_message_id).toBe("Q12345");
    expect(parsed.post_at).toBe(1700000000);
    expect(parsed.post_at_human).toContain("2023");
  });

  it("schedules a thread reply", async () => {
    await runCommand([
      "schedule-message",
      "--channel",
      "C12345",
      "--text",
      "Thread reply",
      "--post-at",
      "1700000000",
      "--thread-ts",
      "9999999999.000001",
    ]);
    expect(mockClient.chat.scheduleMessage).toHaveBeenCalledWith(
      expect.objectContaining({ thread_ts: "9999999999.000001" }),
    );
  });

  it("throws on invalid --post-at value", async () => {
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);

    try {
      await runCommand([
        "schedule-message",
        "--channel",
        "C12345",
        "--text",
        "Bad date",
        "--post-at",
        "not-a-date",
      ]);
    } catch {
      // expected
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
