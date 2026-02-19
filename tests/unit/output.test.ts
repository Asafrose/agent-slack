import { describe, it, expect } from "bun:test";
import { formatOutput, resolveFormat } from "../../src/output";

describe("formatOutput", () => {
  const sampleData = { id: "C123", name: "general", count: 42 };

  it("formats as JSON with indentation", () => {
    const result = formatOutput(sampleData, "json");
    expect(result).toBe(JSON.stringify(sampleData, null, 2));
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(sampleData);
  });

  it("formats as detailed (pretty JSON)", () => {
    const result = formatOutput(sampleData, "detailed");
    expect(result).toContain("general");
    expect(result).toContain("C123");
  });

  it("formats as concise (compact)", () => {
    const result = formatOutput(sampleData, "concise");
    expect(result).toContain("general");
  });

  it("handles string data in concise format", () => {
    const result = formatOutput("hello world", "concise");
    expect(result).toBe("hello world");
  });

  it("handles string data in detailed format", () => {
    const result = formatOutput("hello world", "detailed");
    expect(result).toBe("hello world");
  });

  it("handles null data", () => {
    const result = formatOutput(null, "concise");
    expect(result).toBe("");
  });

  it("handles undefined data", () => {
    const result = formatOutput(undefined, "concise");
    expect(result).toBe("");
  });
});

describe("resolveFormat", () => {
  it("returns concise by default", () => {
    expect(resolveFormat({})).toBe("concise");
  });

  it("returns detailed when --detailed flag is set", () => {
    expect(resolveFormat({ detailed: true })).toBe("detailed");
  });

  it("returns json when --json flag is set", () => {
    expect(resolveFormat({ json: true })).toBe("json");
  });

  it("json takes precedence over detailed", () => {
    expect(resolveFormat({ json: true, detailed: true })).toBe("json");
  });
});
