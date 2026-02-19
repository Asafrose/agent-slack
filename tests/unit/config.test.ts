import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { existsSync, readFileSync } from "fs";

// Mock fs module
const mockExistsSync = mock(existsSync);
const mockReadFileSync = mock(readFileSync);

mock.module("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

describe("config", () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
  });

  afterEach(() => {
    mockExistsSync.mockRestore();
    mockReadFileSync.mockRestore();
  });

  it("loads valid config with token", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ token: "xoxb-test-token" }));

    const { getConfig } = await import("../../src/config");
    const config = getConfig();

    expect(config.token).toBe("xoxb-test-token");
  });

  it("returns empty config when file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const { getConfig } = await import("../../src/config");
    const config = getConfig();

    expect(config.token).toBeUndefined();
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it("returns empty config on malformed JSON", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{ invalid json {{");

    const { getConfig } = await import("../../src/config");
    const config = getConfig();

    expect(config.token).toBeUndefined();
  });

  it("returns empty config when token is not a string", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ token: 12345 }));

    const { getConfig } = await import("../../src/config");
    const config = getConfig();

    expect(config.token).toBeUndefined();
  });
});
