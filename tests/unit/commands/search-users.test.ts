import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";
import { createMockWebClient, mockUsersListResponse } from "../../helpers/mock-slack";

const mockClient = createMockWebClient();
mock.module("../../../src/client", () => ({
  getClient: () => mockClient,
}));

async function runCommand(args: string[]): Promise<string> {
  const { register } = await import("../../../src/commands/search-users");
  const program = new Command();
  program.exitOverride();
  program.option("--token <token>", "Slack API token");
  program.option("--detailed", "Detailed output");
  program.option("--json", "JSON output");
  register(program);

  let output = "";
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    output = msg;
  });

  await program.parseAsync(["node", "agent-slack", "search-users", ...args]);
  consoleSpy.mockRestore();
  return output;
}

describe("search-users", () => {
  beforeEach(() => {
    mockClient.users.list.mockImplementation(async () => mockUsersListResponse);
  });

  describe("concise output (default)", () => {
    it("outputs users matching query by name", async () => {
      const output = await runCommand(["--query", "alice"]);
      expect(output).toContain("@alice");
      expect(output).not.toContain("@bob");
    });

    it("outputs users matching query by real_name", async () => {
      const output = await runCommand(["--query", "Alice Smith"]);
      expect(output).toContain("@alice");
    });

    it("filters case-insensitively", async () => {
      const output = await runCommand(["--query", "ALICE"]);
      expect(output).toContain("@alice");
    });

    it("returns empty string when no users match", async () => {
      const output = await runCommand(["--query", "zzznomatch"]);
      expect(output).toBe("");
    });

    it("formats concise output as @username (Real Name) - Title", async () => {
      mockClient.users.list.mockImplementation(async () => ({
        ok: true,
        members: [
          {
            id: "U12345",
            name: "alice",
            real_name: "Alice Smith",
            profile: { email: "alice@example.com", title: "Engineer" },
          },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "alice"]);
      expect(output).toContain("@alice");
      expect(output).toContain("Alice Smith");
      expect(output).toContain("Engineer");
    });
  });

  describe("filtering by email and title", () => {
    it("filters by email", async () => {
      mockClient.users.list.mockImplementation(async () => ({
        ok: true,
        members: [
          { id: "U1", name: "carol", real_name: "Carol", profile: { email: "carol@acme.com" } },
          { id: "U2", name: "dave", real_name: "Dave", profile: { email: "dave@example.com" } },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "acme.com"]);
      expect(output).toContain("@carol");
      expect(output).not.toContain("@dave");
    });

    it("filters by title", async () => {
      mockClient.users.list.mockImplementation(async () => ({
        ok: true,
        members: [
          { id: "U1", name: "alice", real_name: "Alice", profile: { title: "Senior Engineer" } },
          { id: "U2", name: "bob", real_name: "Bob", profile: { title: "Designer" } },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "engineer"]);
      expect(output).toContain("@alice");
      expect(output).not.toContain("@bob");
    });

    it("filters by display_name", async () => {
      mockClient.users.list.mockImplementation(async () => ({
        ok: true,
        members: [
          {
            id: "U1",
            name: "user1",
            real_name: "User One",
            profile: { display_name: "the_wizard" },
          },
          {
            id: "U2",
            name: "user2",
            real_name: "User Two",
            profile: { display_name: "the_knight" },
          },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "wizard"]);
      expect(output).toContain("@user1");
      expect(output).not.toContain("@user2");
    });
  });

  describe("detailed output", () => {
    it("shows detailed user info with --detailed", async () => {
      mockClient.users.list.mockImplementation(async () => ({
        ok: true,
        members: [
          {
            id: "U12345",
            name: "alice",
            real_name: "Alice Smith",
            tz: "America/New_York",
            is_admin: true,
            is_bot: false,
            profile: {
              email: "alice@example.com",
              title: "Senior Engineer",
              display_name: "Alice",
              image_192: "https://example.com/alice.jpg",
            },
          },
        ],
        response_metadata: { next_cursor: "" },
      }));
      const output = await runCommand(["--query", "alice", "--detailed"]);
      expect(output).toContain("Username: @alice");
      expect(output).toContain("ID: U12345");
      expect(output).toContain("Real Name: Alice Smith");
      expect(output).toContain("Display Name: Alice");
      expect(output).toContain("Title: Senior Engineer");
      expect(output).toContain("Email: alice@example.com");
      expect(output).toContain("Timezone: America/New_York");
      expect(output).toContain("Profile Pic:");
      expect(output).toContain("Admin: yes");
      expect(output).toContain("Bot: no");
    });
  });

  describe("JSON output", () => {
    it("outputs valid JSON with --json", async () => {
      const output = await runCommand(["--query", "alice", "--json"]);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("users");
      expect(Array.isArray(parsed.users)).toBe(true);
    });

    it("JSON includes next_cursor", async () => {
      const output = await runCommand(["--query", "alice", "--json"]);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("next_cursor");
    });
  });

  describe("pagination cursor", () => {
    it("shows next cursor when present", async () => {
      mockClient.users.list.mockImplementation(async () => ({
        ok: true,
        members: [{ id: "U1", name: "alice", real_name: "Alice" }],
        response_metadata: { next_cursor: "usercursor789" },
      }));
      const output = await runCommand(["--query", "alice"]);
      expect(output).toContain("usercursor789");
    });

    it("passes cursor to API", async () => {
      await runCommand(["--query", "alice", "--cursor", "mycursor"]);
      expect(mockClient.users.list).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "mycursor" }),
      );
    });
  });

  describe("API parameters", () => {
    it("passes limit to API", async () => {
      await runCommand(["--query", "test", "--limit", "50"]);
      expect(mockClient.users.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    });
  });

  describe("error handling", () => {
    it("calls handleSlackError on API error", async () => {
      mockClient.users.list.mockImplementation(async () => {
        throw new Error("users list failed");
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
