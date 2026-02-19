import { ErrorCode } from "@slack/web-api";

interface CodedError extends Error {
  code: string;
  data?: { error?: string };
}

function isCodedError(err: unknown): err is CodedError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as CodedError).code === "string"
  );
}

export function handleSlackError(error: unknown): never {
  if (isCodedError(error)) {
    const code = error.code;
    if (
      code === ErrorCode.PlatformError ||
      code === ErrorCode.RequestError ||
      code === ErrorCode.HTTPError ||
      code === ErrorCode.RateLimitedError
    ) {
      const slackCode = error.data?.error ?? error.message ?? code;
      console.error(`Slack API error: ${error.message} (code: ${slackCode})`);
    } else {
      console.error(`Error: ${error.message}`);
    }
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error("An unknown error occurred");
  }
  process.exit(1);
}
