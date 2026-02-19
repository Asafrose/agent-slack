import { describe, it, expect, spyOn, beforeEach } from "bun:test";
import { ErrorCode } from "@slack/web-api";
import type { CodedError } from "@slack/web-api/dist/errors";

function makeSlackError(message: string, code: string, slackErrorCode?: string): CodedError {
  const err = new Error(message) as CodedError;
  err.code = code;
  if (slackErrorCode) {
    (err as unknown as { data: { error: string } }).data = { error: slackErrorCode };
  }
  return err;
}

describe("handleSlackError", () => {
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let processExitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
  });

  it("formats Slack PlatformError nicely", async () => {
    const { handleSlackError } = await import("../../src/errors");

    const slackError = makeSlackError(
      "An API error occurred: channel_not_found",
      ErrorCode.PlatformError,
      "channel_not_found"
    );

    expect(() => handleSlackError(slackError)).toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("channel_not_found")
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("formats generic Error nicely", async () => {
    const { handleSlackError } = await import("../../src/errors");

    const genericError = new Error("Something went wrong");

    expect(() => handleSlackError(genericError)).toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Something went wrong")
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("handles unknown errors", async () => {
    const { handleSlackError } = await import("../../src/errors");

    expect(() => handleSlackError("some string error")).toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknown error")
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("formats Slack RateLimitedError nicely", async () => {
    const { handleSlackError } = await import("../../src/errors");

    const rateLimitError = makeSlackError(
      "You are sending too many requests. Please relax.",
      ErrorCode.RateLimitedError
    );

    expect(() => handleSlackError(rateLimitError)).toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
