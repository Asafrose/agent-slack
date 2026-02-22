import { describe, it, expect } from "bun:test";
import { spawnSync } from "child_process";
import { join } from "path";

const CLI = join(import.meta.dir, "../../bin/agent-slack.ts");

function run(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("bun", ["run", CLI, ...args], {
    encoding: "utf-8",
    env: { ...process.env, SLACK_TOKEN: undefined },
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

const ALL_COMMANDS = [
  "send-message",
  "schedule-message",
  "draft-message",
  "search-channels",
  "read-channel",
  "search-messages",
  "read-thread",
  "search-users",
  "read-user-profile",
  "search-all",
  "create-canvas",
  "read-canvas",
  "login",
  "logout",
];

describe("agent-slack CLI", () => {
  describe("top-level --help", () => {
    it("exits 0 and shows program description", () => {
      const { stdout, exitCode } = run(["--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("agent-slack");
      expect(stdout).toContain("Slack CLI tool for AI agents");
    });

    it("lists all 12 subcommands", () => {
      const { stdout, exitCode } = run(["--help"]);
      expect(exitCode).toBe(0);
      for (const cmd of ALL_COMMANDS) {
        expect(stdout).toContain(cmd);
      }
    });

    it("shows global --detailed, --json flags", () => {
      const { stdout } = run(["--help"]);
      expect(stdout).toContain("--detailed");
      expect(stdout).toContain("--json");
    });
  });

  describe("--version", () => {
    it("prints the version", () => {
      const { stdout, exitCode } = run(["--version"]);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("subcommand --help", () => {
    it("send-message --help shows required --channel and text input flags", () => {
      const { stdout, exitCode } = run(["send-message", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--channel");
      expect(stdout).toContain("--text");
      expect(stdout).toContain("--text-file");
      expect(stdout).toContain("--thread-ts");
      expect(stdout).toContain("--reply-broadcast");
    });

    it("schedule-message --help shows --post-at flag", () => {
      const { stdout, exitCode } = run(["schedule-message", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--channel");
      expect(stdout).toContain("--post-at");
      expect(stdout).toContain("--text");
      expect(stdout).toContain("--thread-ts");
    });

    it("draft-message --help shows required flags", () => {
      const { stdout, exitCode } = run(["draft-message", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--channel");
      expect(stdout).toContain("--text");
      expect(stdout).toContain("--thread-ts");
    });

    it("search-channels --help shows --query and --types flags", () => {
      const { stdout, exitCode } = run(["search-channels", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--query");
      expect(stdout).toContain("--types");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--include-archived");
      expect(stdout).toContain("--cursor");
    });

    it("read-channel --help shows pagination flags", () => {
      const { stdout, exitCode } = run(["read-channel", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--channel");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--oldest");
      expect(stdout).toContain("--latest");
      expect(stdout).toContain("--cursor");
    });

    it("search-messages --help shows sort flags", () => {
      const { stdout, exitCode } = run(["search-messages", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--query");
      expect(stdout).toContain("--sort");
      expect(stdout).toContain("--sort-dir");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--page");
    });

    it("read-thread --help shows --ts flag", () => {
      const { stdout, exitCode } = run(["read-thread", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--channel");
      expect(stdout).toContain("--ts");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--cursor");
    });

    it("search-users --help shows expected flags", () => {
      const { stdout, exitCode } = run(["search-users", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--query");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--cursor");
    });

    it("read-user-profile --help shows --user as optional", () => {
      const { stdout, exitCode } = run(["read-user-profile", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--user");
    });

    it("search-all --help shows expected flags", () => {
      const { stdout, exitCode } = run(["search-all", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--query");
      expect(stdout).toContain("--channel-types");
      expect(stdout).toContain("--sort");
      expect(stdout).toContain("--page");
    });

    it("create-canvas --help shows --title and content flags", () => {
      const { stdout, exitCode } = run(["create-canvas", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--title");
      expect(stdout).toContain("--content");
      expect(stdout).toContain("--content-file");
    });

    it("read-canvas --help shows --canvas flag", () => {
      const { stdout, exitCode } = run(["read-canvas", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--canvas");
    });
  });

  describe("missing required flags", () => {
    it("send-message without --channel exits non-zero", () => {
      const { exitCode, stderr } = run(["send-message", "--text", "hi"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("channel");
    });

    it("schedule-message without --post-at exits non-zero", () => {
      const { exitCode, stderr } = run(["schedule-message", "--channel", "C12345", "--text", "hi"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("post-at");
    });

    it("read-channel without --channel exits non-zero", () => {
      const { exitCode, stderr } = run(["read-channel"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("channel");
    });

    it("read-thread without --ts exits non-zero", () => {
      const { exitCode, stderr } = run(["read-thread", "--channel", "C12345"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("ts");
    });

    it("search-channels without --query exits non-zero", () => {
      const { exitCode, stderr } = run(["search-channels"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("query");
    });

    it("search-messages without --query exits non-zero", () => {
      const { exitCode, stderr } = run(["search-messages"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("query");
    });

    it("create-canvas without --title exits non-zero", () => {
      const { exitCode, stderr } = run(["create-canvas", "--content", "hello"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("title");
    });

    it("read-canvas without --canvas exits non-zero", () => {
      const { exitCode, stderr } = run(["read-canvas"]);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("canvas");
    });
  });

  describe("auth error", () => {
    it("exits non-zero with helpful message when no token configured", () => {
      // Ensure no token is available: no config file
      const result = spawnSync("bun", ["run", CLI, "read-user-profile"], {
        encoding: "utf-8",
        env: {
          PATH: process.env.PATH,
          HOME: "/tmp/no-home-dir-for-testing",
          // No SLACK_TOKEN
        },
      });
      expect(result.status).toBe(1);
      const output = (result.stdout ?? "") + (result.stderr ?? "");
      expect(output.toLowerCase()).toMatch(/login|token|auth/);
    });
  });
});
