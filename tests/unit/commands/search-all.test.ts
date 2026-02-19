import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";
import { createMockWebClient, mockSearchMessagesResponse } from "../../helpers/mock-slack";

const mockClient = createMockWebClient();
mock.module("../../../src/client", () => ({
  getClient: () => mockClient,
}));

async function runCommand(args: string[]): Promise<string> {
  const { register } = await import("../../../src/commands/search-all");
  const program = new Command();
  program.exitOverride();
  program.option("--detailed", "Detailed output");
  program.option("--json", "JSON output");
  register(program);

  let output = "";
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    output = msg;
  });

  await program.parseAsync(["node", "agent-slack", "search-all", ...args]);
  consoleSpy.mockRestore();
  return output;
}

describe("search-all", () => {
  beforeEach(() => {
    mockClient.search.messages.mockImplementation(async () => mockSearchMessagesResponse);
  });

  describe("concise output (default)", () => {
    it("outputs message results", async () => {
      const output = await runCommand(["--query", "hello"]);
      expect(output).toContain("Found this message");
    });

    it("includes channel info in output", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: "1234567890.000001",
              channel: { id: "C12345", name: "private-channel" },
              text: "Private message",
              username: "carol",
            },
          ],
        },
      }));
      const output = await runCommand(["--query", "private"]);
      expect(output).toContain("#private-channel");
      expect(output).toContain("carol");
      expect(output).toContain("Private message");
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
    it("shows detailed message info with --detailed", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: "1234567890.000001",
              channel: { id: "C12345", name: "dm-channel" },
              text: "DM message content",
              username: "dave",
              permalink: "https://slack.com/archives/D12345/p1234",
            },
          ],
        },
      }));
      const output = await runCommand(["--query", "dm", "--detailed"]);
      expect(output).toContain("Channel: #dm-channel");
      expect(output).toContain("Author: dave");
      expect(output).toContain("Text: DM message content");
      expect(output).toContain("Permalink:");
    });
  });

  describe("JSON output", () => {
    it("outputs valid JSON with --json", async () => {
      const output = await runCommand(["--query", "hello", "--json"]);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("matches");
    });
  });

  describe("pagination cursor", () => {
    it("shows next cursor when present", async () => {
      mockClient.search.messages.mockImplementation(async () => ({
        ok: true,
        messages: {
          matches: [{ ts: "1234567890.000001", channel: { id: "C1" }, text: "msg" }],
          next_cursor: "nextpage456",
        },
      }));
      const output = await runCommand(["--query", "test"]);
      expect(output).toContain("nextpage456");
    });

    it("passes cursor to API", async () => {
      await runCommand(["--query", "test", "--cursor", "somecursor"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "somecursor" }),
      );
    });

    it("does not pass cursor when not provided", async () => {
      await runCommand(["--query", "test"]);
      const callArgs = mockClient.search.messages.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.cursor).toBeUndefined();
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
      await runCommand(["--query", "test", "--limit", "5"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ count: 5 }),
      );
    });

    it("has default sort and sort-dir", async () => {
      await runCommand(["--query", "test"]);
      expect(mockClient.search.messages).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "score", sort_dir: "desc" }),
      );
    });
  });

  describe("error handling", () => {
    it("calls handleSlackError on API error", async () => {
      mockClient.search.messages.mockImplementation(async () => {
        throw new Error("search all failed");
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
