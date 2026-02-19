import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { Command } from "commander";

const mockState = {
  canvasResult: {
    ok: true,
    sections: [
      { id: "section1", content: "# Title\n\nSome content here." },
    ],
  } as unknown,
  canvasError: null as Error | null,
  capturedArgs: null as unknown,
};

mock.module("../../../src/client", () => ({
  getClient: () => ({
    canvases: {
      sections: {
        lookup: async (args: unknown) => {
          mockState.capturedArgs = args;
          if (mockState.canvasError) throw mockState.canvasError;
          return mockState.canvasResult;
        },
      },
    },
  }),
}));

const { register } = await import("../../../src/commands/read-canvas");

function createProgram() {
  const program = new Command();
  program
    .option("--token <token>", "Slack API token")
    .option("--detailed", "Use detailed output format")
    .option("--json", "Use JSON output format");
  register(program);
  return program;
}

describe("read-canvas command", () => {
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
    mockState.canvasResult = {
      ok: true,
      sections: [
        { id: "section1", content: "# Title\n\nSome content here." },
      ],
    };
    mockState.canvasError = null;
    mockState.capturedArgs = null;
  });

  describe("concise output (default)", () => {
    it("outputs canvas section content", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-canvas", "--canvas", "F12345CANVAS"]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("# Title");
      expect(output).toContain("Some content here.");
    });

    it("joins multiple sections with double newlines", async () => {
      mockState.canvasResult = {
        ok: true,
        sections: [
          { id: "s1", content: "# Section 1\n\nFirst section" },
          { id: "s2", content: "# Section 2\n\nSecond section" },
        ],
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-canvas", "--canvas", "F12345CANVAS"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("Section 1");
      expect(output).toContain("Section 2");
    });

    it("shows 'Canvas is empty.' when no sections", async () => {
      mockState.canvasResult = {
        ok: true,
        sections: [],
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-canvas", "--canvas", "F12345CANVAS"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toBe("Canvas is empty.");
    });

    it("shows 'Canvas is empty.' when sections have no content", async () => {
      mockState.canvasResult = {
        ok: true,
        sections: [{ id: "s1", content: "" }],
      };

      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-canvas", "--canvas", "F12345CANVAS"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toBe("Canvas is empty.");
    });
  });

  describe("detailed output (--detailed)", () => {
    it("shows section IDs with content", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-canvas", "--canvas", "F12345CANVAS", "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("--- Section section1 ---");
      expect(output).toContain("# Title");
      expect(output).toContain("Some content here.");
    });

    it("shows all sections with their IDs in detailed format", async () => {
      mockState.canvasResult = {
        ok: true,
        sections: [
          { id: "intro", content: "Introduction content" },
          { id: "body", content: "Body content" },
        ],
      };

      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-canvas", "--canvas", "F12345CANVAS", "--detailed",
      ]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain("--- Section intro ---");
      expect(output).toContain("--- Section body ---");
      expect(output).toContain("Introduction content");
      expect(output).toContain("Body content");
    });
  });

  describe("JSON output (--json)", () => {
    it("outputs raw JSON response", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node", "cli", "read-canvas", "--canvas", "F12345CANVAS", "--json",
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("sections");
      expect(parsed.sections).toHaveLength(1);
      expect(parsed.sections[0]).toHaveProperty("content", "# Title\n\nSome content here.");
    });
  });

  describe("flag handling", () => {
    it("passes --canvas to API call as canvas_id", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-canvas", "--canvas", "FABCDEF"]);

      expect((mockState.capturedArgs as { canvas_id: string })?.canvas_id).toBe("FABCDEF");
    });

    it("passes criteria with section types to API call", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "cli", "read-canvas", "--canvas", "F12345CANVAS"]);

      const args = mockState.capturedArgs as { criteria: { section_types: string[] } };
      expect(args.criteria).toBeDefined();
      expect(Array.isArray(args.criteria.section_types)).toBe(true);
    });
  });

  describe("error handling", () => {
    it("handles canvas_not_found error", async () => {
      const error = new Error("An API error occurred: canvas_not_found") as Error & {
        code: string;
        data: { error: string };
      };
      error.code = "slack_webapi_platform_error";
      error.data = { error: "canvas_not_found" };
      mockState.canvasError = error;

      const program = createProgram();
      await expect(
        program.parseAsync(["node", "cli", "read-canvas", "--canvas", "INVALID"])
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("handles generic errors", async () => {
      mockState.canvasError = new Error("Network error");

      const program = createProgram();
      await expect(
        program.parseAsync(["node", "cli", "read-canvas", "--canvas", "F12345CANVAS"])
      ).rejects.toThrow("process.exit called");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
