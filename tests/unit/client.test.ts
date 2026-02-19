import { describe, it, expect, spyOn, mock } from "bun:test";

describe("getClient", () => {
  it("uses token from config file", async () => {
    mock.module("../../src/config", () => ({
      getConfig: async () => ({ token: "xoxp-config-token" }),
    }));

    const { getClient } = await import("../../src/client");
    const client = await getClient();

    expect((client as unknown as { token: string }).token).toBe("xoxp-config-token");
  });

  it("exits with error when no token is available", async () => {
    mock.module("../../src/config", () => ({
      getConfig: async () => ({}),
    }));

    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);

    const { getClient } = await import("../../src/client");

    await expect(getClient()).rejects.toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
