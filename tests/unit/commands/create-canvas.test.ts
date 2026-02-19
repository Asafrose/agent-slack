import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { Command } from "commander";
import { createMockWebClient } from "../../helpers/mock-slack";

const mockCanvasCreateResponse = { ok: true, canvas_id: "F12345CANVAS" };

const mockClient = {
  ...createMockWebClient(),
  apiCall: mock(async (_method: string, _args: unknown) => mockCanvasCreateResponse),
};

mock.module("../../../src/client", () => ({
  getClient: () => mockClient,
}));

mock.module("../../../src/input", () => ({
  resolveTextInput: mock(async (opts: { text?: string; textFile?: string }) => {
    if (opts.text) return opts.text;
    return "# Stdin Content\n\nSome content.";
  }),
}));

async function runCommand(args: string[]): Promise<string> {
  const logs: string[] = [];
  const consoleSpy = spyOn(console, "log").mockImplementation((msg: string) => {
    logs.push(msg);
  });
  const { register } = await import("../../../src/commands/create-canvas");
  const program = new Command();
  program.option("--detailed").option("--json");
  register(program);
  await program.parseAsync(["node", "agent-slack", ...args]);
  consoleSpy.mockRestore();
  return logs.join("\n");
}

describe("create-canvas", () => {
  beforeEach(() => {
    mockClient.apiCall.mockReset();
    mockClient.apiCall.mockResolvedValue(mockCanvasCreateResponse);
  });

  it("creates a canvas and prints concise output", async () => {
    const output = await runCommand([
      "create-canvas",
      "--title",
      "My Canvas",
      "--content",
      "# Hello\n\nWorld",
    ]);
    expect(mockClient.apiCall).toHaveBeenCalledWith(
      "canvases.create",
      expect.objectContaining({
        title: "My Canvas",
        document_content: { type: "markdown", markdown: "# Hello\n\nWorld" },
      }),
    );
    expect(output).toContain("Canvas created: My Canvas");
    expect(output).toContain("F12345CANVAS");
  });

  it("outputs JSON format", async () => {
    const output = await runCommand([
      "create-canvas",
      "--title",
      "JSON Canvas",
      "--content",
      "Content",
      "--json",
    ]);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.canvas_id).toBe("F12345CANVAS");
  });

  it("outputs detailed format with title and canvas_id", async () => {
    const output = await runCommand([
      "create-canvas",
      "--title",
      "Detailed Canvas",
      "--content",
      "Content",
      "--detailed",
    ]);
    const parsed = JSON.parse(output);
    expect(parsed.canvas_id).toBe("F12345CANVAS");
    expect(parsed.title).toBe("Detailed Canvas");
  });

  it("reads content from stdin when no --content or --content-file given", async () => {
    await runCommand(["create-canvas", "--title", "Stdin Canvas"]);
    expect(mockClient.apiCall).toHaveBeenCalledWith(
      "canvases.create",
      expect.objectContaining({
        document_content: expect.objectContaining({
          markdown: "# Stdin Content\n\nSome content.",
        }),
      }),
    );
  });

  it("handles API errors", async () => {
    mockClient.apiCall.mockRejectedValue(new Error("canvas_error"));
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);

    try {
      await runCommand(["create-canvas", "--title", "Fail Canvas", "--content", "x"]);
    } catch {
      // expected
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
