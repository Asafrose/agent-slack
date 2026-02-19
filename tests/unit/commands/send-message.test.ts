import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { Command } from "commander";
import { mockPostMessageResponse, createMockWebClient } from "../../helpers/mock-slack";

const mockClient = createMockWebClient();

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
  const { register } = await import("../../../src/commands/send-message");
  const program = new Command();
  program.option("--token <token>").option("--detailed").option("--json");
  register(program);
  await program.parseAsync(["node", "agent-slack", ...args]);
  consoleSpy.mockRestore();
  return logs.join("\n");
}

describe("send-message", () => {
  beforeEach(() => {
    mockClient.chat.postMessage.mockReset();
    mockClient.chat.postMessage.mockResolvedValue(mockPostMessageResponse);
  });

  it("sends a message and prints concise output", async () => {
    const output = await runCommand(["send-message", "--channel", "C12345", "--text", "Hello!"]);
    expect(mockClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "C12345", text: "Hello!" })
    );
    expect(output).toContain("Message sent to C12345");
    expect(output).toContain("1234567890.123456");
  });

  it("sends a message with --json output", async () => {
    const output = await runCommand(["send-message", "--channel", "C12345", "--text", "Hello!", "--json"]);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.ts).toBe("1234567890.123456");
  });

  it("sends a message with --detailed output", async () => {
    const output = await runCommand(["send-message", "--channel", "C12345", "--text", "Hello!", "--detailed"]);
    const parsed = JSON.parse(output);
    expect(parsed.ts).toBe("1234567890.123456");
    expect(parsed.channel).toBe("C12345");
  });

  it("sends a reply to a thread", async () => {
    await runCommand([
      "send-message",
      "--channel", "C12345",
      "--text", "Reply!",
      "--thread-ts", "9999999999.000001",
    ]);
    expect(mockClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_ts: "9999999999.000001",
        text: "Reply!",
      })
    );
  });

  it("sends with reply-broadcast flag", async () => {
    await runCommand([
      "send-message",
      "--channel", "C12345",
      "--text", "Broadcast!",
      "--reply-broadcast",
    ]);
    expect(mockClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reply_broadcast: true })
    );
  });

  it("calls handleSlackError on API failure", async () => {
    const { handleSlackError } = await import("../../../src/errors");
    const errorSpy = spyOn({ handleSlackError }, "handleSlackError");
    mockClient.chat.postMessage.mockRejectedValue(new Error("api_error"));

    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);

    try {
      await runCommand(["send-message", "--channel", "C12345", "--text", "Hello!"]);
    } catch {
      // expected
    }

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
