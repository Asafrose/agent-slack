import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";

const mockState = {
  usersInfoResult: {
    ok: true,
    user: {
      id: "U12345",
      name: "alice",
      real_name: "Alice Smith",
      is_admin: false,
      is_owner: false,
      is_bot: false,
      profile: { email: "alice@example.com", title: "Engineer" },
    },
  } as unknown,
  usersInfoError: null as Error | null,
  authTestResult: {
    ok: true,
    user_id: "U12345",
    team_id: "T12345",
    user: "alice",
    team: "My Team",
  } as unknown,
  authTestError: null as Error | null,
  capturedUsersInfoArgs: null as unknown,
  authTestCalled: false,
};

mock.module("../../../src/client", () => ({
  getClient: () => ({
    users: {
      info: async (args: unknown) => {
        mockState.capturedUsersInfoArgs = args;
        if (mockState.usersInfoError) throw mockState.usersInfoError;
        return mockState.usersInfoResult;
      },
    },
    auth: {
      test: async () => {
        mockState.authTestCalled = true;
        if (mockState.authTestError) throw mockState.authTestError;
        return mockState.authTestResult;
      },
    },
  }),
}));

const { register } = await import("../../../src/commands/read-user-profile");

function createProgram() {
  const program = new Command();
  program
    .option("--detailed", "Use detailed output format")
    .option("--json", "Use JSON output format");
  register(program);
  return program;
}

describe("read-user-profile command", () => {
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
    mockState.usersInfoResult = {
      ok: true,
      user: {
        id: "U12345",
        name: "alice",
        real_name: "Alice Smith",
        is_admin: false,
        is_owner: false,
        is_bot: false,
        profile: { email: "alice@example.com", title: "Engineer" },
      },
    };
    mockState.usersInfoError = null;
    mockState.authTestResult = {
      ok: true,
      user_id: "U12345",
      team_id: "T12345",
      user: "alice",
      team: "My Team",
    };
    mockState.authTestError = null;
    mockState.capturedUsersInfoArgs = null;
    mockState.authTestCalled = false;
  });

  describe("concise output (default)", () => {
    it("shows @username and display name", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("@alice");
      expect(output).toContain("Alice Smith");
    });

    it("shows job title when present", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("Engineer");
    });

    it("shows email when present", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("alice@example.com");
    });

    it("shows status when present", async () => {
      mockState.usersInfoResult = {
        ok: true,
        user: {
          id: "U12345",
          name: "alice",
          real_name: "Alice Smith",
          profile: {
            email: "alice@example.com",
            title: "Engineer",
            status_emoji: ":house:",
            status_text: "Working from home",
          },
        },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("Status:");
      expect(output).toContain("Working from home");
    });

    it("does not show status line when status is empty", async () => {
      mockState.usersInfoResult = {
        ok: true,
        user: {
          id: "U12345",
          name: "alice",
          real_name: "Alice Smith",
          profile: {
            email: "alice@example.com",
            title: "Engineer",
            status_emoji: "",
            status_text: "",
          },
        },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).not.toContain("Status:");
    });

    it("uses real_name when display_name is absent", async () => {
      mockState.usersInfoResult = {
        ok: true,
        user: {
          id: "U12345",
          name: "alice",
          real_name: "Alice Smith",
          profile: { title: "Engineer", display_name: "" },
        },
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("Alice Smith");
    });
  });

  describe("detailed output (--detailed)", () => {
    it("shows all profile fields", async () => {
      mockState.usersInfoResult = {
        ok: true,
        user: {
          id: "U12345",
          name: "alice",
          real_name: "Alice Smith",
          is_admin: false,
          is_owner: false,
          is_bot: false,
          tz: "America/New_York",
          tz_label: "Eastern Standard Time",
          profile: {
            email: "alice@example.com",
            title: "Senior Engineer",
            phone: "+1-555-123-4567",
            status_text: "Available",
            status_emoji: ":green_circle:",
            display_name: "Alice",
          },
        },
      };

      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-user-profile",
        "--user",
        "U12345",
        "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("User ID: U12345");
      expect(output).toContain("Username: @alice");
      expect(output).toContain("Real Name: Alice Smith");
      expect(output).toContain("Title: Senior Engineer");
      expect(output).toContain("Email: alice@example.com");
      expect(output).toContain("Phone: +1-555-123-4567");
      expect(output).toContain("Time Zone: America/New_York");
      expect(output).toContain("Admin: No");
      expect(output).toContain("Owner: No");
      expect(output).toContain("Bot: No");
    });

    it("shows admin and owner status correctly", async () => {
      mockState.usersInfoResult = {
        ok: true,
        user: {
          id: "U99999",
          name: "admin",
          real_name: "Admin User",
          is_admin: true,
          is_owner: true,
          is_bot: false,
          profile: {},
        },
      };

      const program = createProgram();
      await program.parseAsync([
        "node",
        "cli",
        "read-user-profile",
        "--user",
        "U99999",
        "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("Admin: Yes");
      expect(output).toContain("Owner: Yes");
      expect(output).toContain("Bot: No");
    });
  });

  describe("JSON output (--json)", () => {
    it("outputs raw user JSON", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("id", "U12345");
      expect(parsed).toHaveProperty("name", "alice");
    });
  });

  describe("default to current user", () => {
    it("calls auth.test when --user is not provided", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile"]);

      expect(mockState.authTestCalled).toBe(true);
      expect((mockState.capturedUsersInfoArgs as { user: string })?.user).toBe("U12345");
    });

    it("uses --user flag when provided (skips auth.test)", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U67890"]);

      expect(mockState.authTestCalled).toBe(false);
      expect((mockState.capturedUsersInfoArgs as { user: string })?.user).toBe("U67890");
    });
  });

  describe("edge cases", () => {
    it("shows 'User not found.' when user is undefined", async () => {
      mockState.usersInfoResult = {
        ok: true,
        user: undefined,
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("User not found.");
    });
  });

  describe("error handling", () => {
    it("handles user_not_found error", async () => {
      const error = new Error("An API error occurred: user_not_found") as Error & {
        code: string;
        data: { error: string };
      };
      error.code = "slack_webapi_platform_error";
      error.data = { error: "user_not_found" };
      mockState.usersInfoError = error;

      const program = createProgram();
      await expect(
        program.parseAsync(["node", "cli", "read-user-profile", "--user", "INVALID"]),
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("handles generic errors", async () => {
      mockState.usersInfoError = new Error("Network error");

      const program = createProgram();
      await expect(
        program.parseAsync(["node", "cli", "read-user-profile", "--user", "U12345"]),
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
