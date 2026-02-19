import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";
import { createMockWebClient, mockSearchMessagesResponse } from "../../helpers/mock-slack";

const mockClient = createMockWebClient();
mock.module("../../../src/client", () => ({
  getClient: () => mockClient,
}));

async function runCommand(args: string[]): Promise<string> {
  const { register } = await import("../../../src/commands/search-messages");
  const program = new Command();
  program.exitOverride();
  program.option("--detailed", "Detailed output");
  program.option("--json", "JSON output");
  register(program);

  let output = "";
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    output = msg;
  });

  await program.parseAsync(["node", "agent-slack", "search-messages", ...args]);
  consoleSpy.mockRestore();
  return output;
}

describe("search-messages", () => {
  beforeEach(() => {
    mockClient.search.messages.mockImplementation(async () => mockSearchMessagesResponse);
  });

  describe("concise output (default)", () => {
    it("outputs message results", async () => {
      const output = await runCommand(["--query", "hello"]);
      expect(output).toContain("Found this message");
    });

    it("includes channel name in output", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: "1234567890.000001",
              channel: { id: "C12345", name: "general" },
              text: "Test message",
              username: "alice",
            },
          ],
        },
      }));
      const output = await runCommand(["--query", "test"]);
      expect(output).toContain("#general");
      expect(output).toContain("alice");
      expect(output).toContain("Test message");
    });

    it("uses channel ID when name is absent", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: "1234567890.000001",
              channel: { id: "C99999" },
              text: "Some message",
              username: "bob",
            },
          ],
        },
      }));
      const output = await runCommand(["--query", "some"]);
      expect(output).toContain("C99999");
    });

    it("includes date in output", async () => {
      const output = await runCommand(["--query", "hello"]);
      // ts "1234567890.000001" => should be formatted
      expect(output).toContain("2009");
    });

    it("truncates long messages at 80 chars", async () => {
      const longText = "x".repeat(100);
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: "1234567890.000001",
              channel: { id: "C1", name: "general" },
              text: longText,
              username: "testuser",
            },
          ],
        },
      }));
      const output = await runCommand(["--query", "x"]);
      // Should contain at most 80 x's (truncated), not 100
      const xCount = (output.match(/x/g) ?? []).length;
      expect(xCount).toBeLessThanOrEqual(80);
    });

    it("returns empty string when no matches", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: { matches: [] },
      }));
      const output = await runCommand(["--query", "nothing"]);
      expect(output).toBe("");
    });
  });

  describe("detailed output", () => {
    it("shows full message details with --detailed", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: "1234567890.000001",
              channel: { id: "C12345", name: "general" },
              text: "Full message text here",
              username: "alice",
              permalink: "https://slack.com/archives/C12345/p1234567890",
              previous: { text: "previous context" },
              next: { text: "next context" },
            },
          ],
        },
      }));
      const output = await runCommand(["--query", "test", "--detailed"]);
      expect(output).toContain("Channel: #general");
      expect(output).toContain("TS: 1234567890.000001");
      expect(output).toContain("Date:");
      expect(output).toContain("Author: alice");
      expect(output).toContain("Text: Full message text here");
      expect(output).toContain("Context before: previous context");
      expect(output).toContain("Context after: next context");
      expect(output).toContain("Permalink:");
    });
  });

  describe("JSON output", () => {
    it("outputs valid JSON with --json", async () => {
      const output = await runCommand(["--query", "hello", "--json"]);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("matches");
      expect(Array.isArray(parsed.matches)).toBe(true);
    });
  });

  describe("pagination cursor", () => {
    it("shows next cursor when present", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [{ ts: "1234567890.000001", channel: { id: "C1" }, text: "msg" }],
          next_cursor: "cursor123",
        },
      }));
      const output = await runCommand(["--query", "test"]);
      expect(output).toContain("cursor123");
    });

    it("passes cursor to API", async () => {
      await runCommand(["--query", "test", "--cursor", "page2cursor"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "page2cursor" }),
      );
    });
  });

  describe("API parameters", () => {
    it("passes sort to API", async () => {
      await runCommand(["--query", "test", "--sort", "timestamp"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "timestamp" }),
      );
    });

    it("passes sort-dir to API", async () => {
      await runCommand(["--query", "test", "--sort-dir", "asc"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ sort_dir: "asc" }),
      );
    });

    it("passes limit as count to API", async () => {
      await runCommand(["--query", "test", "--limit", "10"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ count: 10 }),
      );
    });

    it("defaults sort to score and sort-dir to desc", async () => {
      await runCommand(["--query", "test"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "score", sort_dir: "desc" }),
      );
    });
  });

  describe("error handling", () => {
    it("calls handleSlackError on API error", async () => {
      mockClient.search.messages.mockImplementation(async () => {
        throw new Error("search failed");
      });
      const exitSpy = spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit called");
      }) as never);
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      await expect(runCommand(["--query", "test"])).rejects.toThrow("process.exit called");
      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
