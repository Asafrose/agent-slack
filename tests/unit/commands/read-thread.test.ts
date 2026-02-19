import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";

const mockState = {
  repliesResult: {
    ok: true,
    messages: [
      {
        ts: "1234567890.000001",
        user: "U12345",
        text: "Parent message",
        thread_ts: "1234567890.000001",
      },
      { ts: "1234567890.000002", user: "U67890", text: "Reply 1", thread_ts: "1234567890.000001" },
    ],
    response_metadata: { next_cursor: "" },
  } as unknown,
  repliesError: null as Error | null,
  capturedArgs: null as unknown,
};

mock.module("../../../src/client", () => ({
  getClient: () => ({
    conversations: {
      replies: async (args: unknown) => {
        mockState.capturedArgs = args;
        if (mockState.repliesError) throw mockState.repliesError;
        return mockState.repliesResult;
      },
    },
  }),
}));

const { register } = await import("../../../src/commands/read-thread");

function createProgram() {
  const program = new Command();
  program
    .option("--detailed", "Use detailed output format")
    .option("--json", "Use JSON output format");
  register(program);
  return program;
}

describe("read-thread command", () => {
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
    mockState.repliesResult = {
      ok: true,
      messages: [
        {
          ts: "1234567890.000001",
          user: "U12345",
          text: "Parent message",
          thread_ts: "1234567890.000001",
        },
        {
          ts: "1234567890.000002",
          user: "U67890",
          text: "Reply 1",
          thread_ts: "1234567890.000001",
        },
      ],
      response_metadata: { next_cursor: "" },
    };
    mockState.repliesError = null;
    mockState.capturedArgs = null;
  });

  describe("concise output (default)", () => {
    it("outputs parent message without '>' prefix", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const lines = output.split("\n");
      expect(lines[0]).not.toMatch(/^>/);
      expect(lines[0]).toContain("U12345");
      expect(lines[0]).toContain("Parent message");
    });

    it("outputs replies with '>' prefix", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const lines = output.split("\n");
      expect(lines[1]).toMatch(/^>/);
      expect(lines[1]).toContain("U67890");
      expect(lines[1]).toContain("Reply 1");
    });

    it("shows 'No messages found.' for empty thread", async () => {
      mockState.repliesResult = {
        ok: true,
        messages: [],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toBe("No messages found.");
    });

    it("shows next cursor when pagination is available", async () => {
      mockState.repliesResult = {
        ok: true,
        messages: [
          {
            ts: "1234567890.000001",
            user: "U12345",
            text: "Parent",
            thread_ts: "1234567890.000001",
          },
        ],
        response_metadata: { next_cursor: "cursor123" },
      };

      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
      ]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("cursor123");
    });

    it("handles bot messages with bot_id as author", async () => {
      mockState.repliesResult = {
        ok: true,
        messages: [
          {
            ts: "1234567890.000001",
            bot_id: "B12345",
            text: "Bot reply",
            thread_ts: "1234567890.000001",
          },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("bot:B12345");
    });
  });

  describe("detailed output (--detailed)", () => {
    it("labels parent message as THREAD PARENT", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("THREAD PARENT");
    });

    it("labels replies as REPLY", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("REPLY");
    });

    it("includes ts, reactions, and files in detailed output", async () => {
      mockState.repliesResult = {
        ok: true,
        messages: [
          {
            ts: "1234567890.000001",
            user: "U12345",
            text: "Parent with reactions",
            thread_ts: "1234567890.000001",
            reactions: [{ name: "thumbsup", count: 1 }],
            files: [{ name: "image.png" }],
          },
        ],
        response_metadata: { next_cursor: "" },
      };

      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain(":thumbsup:");
      expect(output).toContain("image.png");
      expect(output).toContain("1234567890.000001");
    });
  });

  describe("JSON output (--json)", () => {
    it("outputs raw JSON with messages and response_metadata", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--json",
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("messages");
      expect(parsed).toHaveProperty("response_metadata");
      expect(parsed.messages).toHaveLength(2);
    });
  });

  describe("flag handling", () => {
    it("passes --channel and --ts to API", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C99999",
        "--ts",
        "9999999999.111111",
      ]);

      const args = mockState.capturedArgs as { channel: string; ts: string };
      expect(args.channel).toBe("C99999");
      expect(args.ts).toBe("9999999999.111111");
    });

    it("passes --limit to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--limit",
        "25",
      ]);

      expect((mockState.capturedArgs as { limit: number })?.limit).toBe(25);
    });

    it("defaults limit to 100", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
      ]);

      expect((mockState.capturedArgs as { limit: number })?.limit).toBe(100);
    });

    it("passes --oldest and --latest to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--oldest",
        "1234567890.000000",
        "--latest",
        "1234567890.999999",
      ]);

      const args = mockState.capturedArgs as { oldest: string; latest: string };
      expect(args.oldest).toBe("1234567890.000000");
      expect(args.latest).toBe("1234567890.999999");
    });

    it("passes --cursor to API call", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-thread",
        "--channel",
        "C12345",
        "--ts",
        "1234567890.000001",
        "--cursor",
        "xyz789",
      ]);

      expect((mockState.capturedArgs as { cursor: string })?.cursor).toBe("xyz789");
    });
  });

  describe("error handling", () => {
    it("handles thread_not_found error", async () => {
      const error = new Error("An API error occurred: thread_not_found") as Error & {
        code: string;
        data: { error: string };
      };
      error.code = "slack_webapi_platform_error";
      error.data = { error: "thread_not_found" };
      mockState.repliesError = error;

      const program = createProgram();
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "read-thread",
          "--channel",
          "C12345",
          "--ts",
          "1234567890.000001",
        ]),
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("handles generic errors", async () => {
      mockState.repliesError = new Error("Network error");

      const program = createProgram();
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "read-thread",
          "--channel",
          "C12345",
          "--ts",
          "1234567890.000001",
        ]),
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
