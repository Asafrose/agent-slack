import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";
import { createMockWebClient, mockConversationsListResponse } from "../../helpers/mock-slack";

// Mock the client module
const mockClient = createMockWebClient();
mock.module("../../../src/client", () => ({
  getClient: () => mockClient,
}));

async function runCommand(args: string[]): Promise<string> {
  const { register } = await import("../../../src/commands/search-channels");
  const program = new Command();
  program.exitOverride();
  program.option("--detailed", "Detailed output");
  program.option("--json", "JSON output");
  register(program);

  let output = "";
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    output = msg;
  });

  await program.parseAsync(["node", "agent-slack", "search-channels", ...args]);
  consoleSpy.mockRestore();
  return output;
}

describe("search-channels", () => {
  beforeEach(() => {
    mockClient.conversations.list.mockImplementation(async () => mockConversationsListResponse);
  });

  describe("concise output (default)", () => {
    it("outputs channels matching query", async () => {
      const output = await runCommand(["--query", "general"]);
      expect(output).toContain("#general");
    });

    it("filters channels client-side by name", async () => {
      const output = await runCommand(["--query", "general"]);
      expect(output).toContain("#general");
      expect(output).not.toContain("#engineering");
    });

    it("returns empty string when no channels match", async () => {
      const output = await runCommand(["--query", "zzznomatch"]);
      expect(output).toBe("");
    });

    it("matches query case-insensitively", async () => {
      const output = await runCommand(["--query", "GENERAL"]);
      expect(output).toContain("#general");
    });
  });

  describe("filtering by purpose and topic", () => {
    it("filters by purpose", async () => {
      mockClient.conversations.list.mockImplementation(async () => ({
        ok: true,
        channels: [
          { id: "C1", name: "alpha", purpose: { value: "engineering team" } },
          { id: "C2", name: "beta", purpose: { value: "marketing team" } },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "engineering"]);
      expect(output).toContain("#alpha");
      expect(output).not.toContain("#beta");
    });

    it("filters by topic", async () => {
      mockClient.conversations.list.mockImplementation(async () => ({
        ok: true,
        channels: [
          { id: "C1", name: "alpha", topic: { value: "devops work" } },
          { id: "C2", name: "beta", topic: { value: "design reviews" } },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "devops"]);
      expect(output).toContain("#alpha");
      expect(output).not.toContain("#beta");
    });
  });

  describe("detailed output", () => {
    it("shows detailed channel info with --detailed", async () => {
      mockClient.conversations.list.mockImplementation(async () => ({
        ok: true,
        channels: [
          {
            id: "C12345",
            name: "general",
            creator: "U99999",
            created: 1700000000,
            purpose: { value: "General discussion" },
            topic: { value: "Welcome!" },
            num_members: 42,
            is_archived: false,
          },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "general", "--detailed"]);
      expect(output).toContain("Name: #general");
      expect(output).toContain("ID: C12345");
      expect(output).toContain("Creator: U99999");
      expect(output).toContain("Purpose: General discussion");
      expect(output).toContain("Topic: Welcome!");
      expect(output).toContain("Members: 42");
      expect(output).toContain("Archived: no");
    });

    it("shows archived: yes for archived channels", async () => {
      mockClient.conversations.list.mockImplementation(async () => ({
        ok: true,
        channels: [{ id: "C1", name: "old-channel", is_archived: true }],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "old", "--detailed"]);
      expect(output).toContain("Archived: yes");
    });
  });

  describe("JSON output", () => {
    it("outputs valid JSON with --json", async () => {
      const output = await runCommand(["--query", "general", "--json"]);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("channels");
      expect(Array.isArray(parsed.channels)).toBe(true);
      expect(parsed.channels[0].name).toBe("general");
    });

    it("JSON includes next_cursor", async () => {
      const output = await runCommand(["--query", "general", "--json"]);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("next_cursor");
    });
  });

  describe("pagination cursor", () => {
    it("shows next cursor when present", async () => {
      mockClient.conversations.list.mockImplementation(async () => ({
        ok: true,
        channels: [{ id: "C1", name: "general" }],
        response_metadata: { next_cursor: "abc123cursor" },
      }));
      const output = await runCommand(["--query", "general"]);
      expect(output).toContain("abc123cursor");
    });

    it("passes cursor param to API", async () => {
      await runCommand(["--query", "general", "--cursor", "mycursor"]);
      expect(mockClient.conversations.list).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "mycursor" }),
      );
    });
  });

  describe("API parameters", () => {
    it("passes types to API", async () => {
      await runCommand(["--query", "test", "--types", "public_channel,private_channel"]);
      expect(mockClient.conversations.list).toHaveBeenCalledWith(
        expect.objectContaining({ types: "public_channel,private_channel" }),
      );
    });

    it("passes limit to API", async () => {
      await runCommand(["--query", "test", "--limit", "50"]);
      expect(mockClient.conversations.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    it("excludes archived by default", async () => {
      await runCommand(["--query", "test"]);
      expect(mockClient.conversations.list).toHaveBeenCalledWith(
        expect.objectContaining({ exclude_archived: true }),
      );
    });

    it("includes archived when --include-archived flag is set", async () => {
      await runCommand(["--query", "test", "--include-archived"]);
      expect(mockClient.conversations.list).toHaveBeenCalledWith(
        expect.objectContaining({ exclude_archived: false }),
      );
    });
  });

  describe("error handling", () => {
    it("calls handleSlackError on API error", async () => {
      mockClient.conversations.list.mockImplementation(async () => {
        throw new Error("API error");
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
