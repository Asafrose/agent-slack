import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";

// Mutable state for controlling mock responses
const mockState = {
  historyResult: {
    ok: true,
    messages: [
      { ts: "1234567890.000001", user: "U12345", text: "Hello there" },
      { ts: "1234567890.000002", user: "U67890", text: "How are you?" },
    ],
    response_metadata: { next_cursor: "" },
  } as unknown,
  historyError: null as Error | null,
  capturedArgs: null as unknown,
};

mock.module("../../../src/client", () => ({
  getClient: () => ({
    conversations: {
      history: async (args: unknown) => {
        mockState.capturedArgs = args;
        if (mockState.historyError) throw mockState.historyError;
        return mockState.historyResult;
      },
    },
  }),
}));

const { register } = await import("../../../src/commands/read-channel");

function createProgram() {
  const program = new Command();
  program
    .option("--token <token>", "Slack API token")
    .option("--detailed", "Use detailed output format")
    .option("--json", "Use JSON output format");
  register(program);
  return program;
}

describe("read-channel command", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let processExitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleLogSpy.mockClear();
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    consoleErrorSpy.mockClear();
    processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    processExitSpy.mockClear();
    // Reset to default state
    mockState.historyResult = {
      ok: true,
      messages: [
        { ts: "1234567890.000001", user: "U12345", text: "Hello there" },
        { ts: "1234567890.000002", user: "U67890", text: "How are you?" },
      ],
      response_metadata: { next_cursor: "" },
    };
    mockState.historyError = null;
    mockState.capturedArgs = null;
  });

  describe("concise output (default)", () => {
    it("outputs messages in concise format", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("U12345");
      expect(output).toContain("Hello there");
    });

    it("shows reply count when messages have threads", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [
          { ts: "1234567890.000001", user: "U12345", text: "Has replies", reply_count: 3 },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("3 replies");
    });

    it("shows reactions when present", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [
          {
            ts: "1234567890.000001",
            user: "U12345",
            text: "With reactions",
            reactions: [{ name: "thumbsup", count: 2 }],
          },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("thumbsup");
      expect(output).toContain("2");
    });

    it("shows next cursor when pagination is available", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [{ ts: "1234567890.000001", user: "U12345", text: "Message" }],
        response_metadata: { next_cursor: "dGVhbTpDMDY=" },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("dGVhbTpDMDY=");
    });

    it("shows 'No messages found.' when channel is empty", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toBe("No messages found.");
    });

    it("uses bot_id as author for bot messages", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [
          { ts: "1234567890.000001", bot_id: "B12345", text: "Bot message" },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("bot:B12345");
    });

    it("uses username when available", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [
          { ts: "1234567890.000001", user: "U12345", username: "alice", text: "From alice" },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("alice");
    });
  });

  describe("detailed output (--detailed)", () => {
    it("outputs messages in detailed format", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--detailed",
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("=== Message");
      expect(output).toContain("From:");
      expect(output).toContain("Text:");
    });

    it("includes timestamp and ts in detailed output", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("1234567890.000001");
    });

    it("includes reactions in detailed format", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [
          {
            ts: "1234567890.000001",
            user: "U12345",
            text: "With reactions",
            reactions: [{ name: "heart", count: 5 }],
          },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain(":heart:");
      expect(output).toContain("5");
    });

    it("includes files in detailed format", async () => {
      mockState.historyResult = {
        ok: true,
        messages: [
          {
            ts: "1234567890.000001",
            user: "U12345",
            text: "Has file",
            files: [{ name: "report.pdf" }],
          },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("report.pdf");
    });
  });

  describe("JSON output (--json)", () => {
    it("outputs raw JSON response", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--json",
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("messages");
      expect(parsed.messages).toHaveLength(2);
    });

    it("includes response_metadata in JSON output", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--json",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("response_metadata");
    });
  });

  describe("flag handling", () => {
    it("passes --limit to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--limit", "50",
      ]);

      expect((mockState.capturedArgs as { limit: number })?.limit).toBe(50);
    });

    it("passes --oldest to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--oldest", "1234567890.000000",
      ]);

      expect((mockState.capturedArgs as { oldest: string })?.oldest).toBe("1234567890.000000");
    });

    it("passes --latest to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--latest", "1234567890.999999",
      ]);

      expect((mockState.capturedArgs as { latest: string })?.latest).toBe("1234567890.999999");
    });

    it("passes --cursor to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-channel", "--channel", "C12345", "--cursor", "abc123",
      ]);

      expect((mockState.capturedArgs as { cursor: string })?.cursor).toBe("abc123");
    });

    it("defaults limit to 100", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"]);

      expect((mockState.capturedArgs as { limit: number })?.limit).toBe(100);
    });
  });

  describe("error handling", () => {
    it("handles channel_not_found error", async () => {
      const error = new Error("An API error occurred: channel_not_found") as Error & {
        code: string;
        data: { error: string };
      };
      error.code = "slack_webapi_platform_error";
      error.data = { error: "channel_not_found" };
      mockState.historyError = error;

      const program = createProgram();
      await expect(
        program.parseAsync(["node", "cli", "read-channel", "--channel", "INVALID"])
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("handles generic errors", async () => {
      mockState.historyError = new Error("Network error");

      const program = createProgram();
      await expect(
        program.parseAsync(["node", "cli", "read-channel", "--channel", "C12345"])
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
