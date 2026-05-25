import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import type { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("upload-file")
    .description("Upload a file to a Slack channel")
    .requiredOption("--channel <channel>", "Channel ID or name")
    .requiredOption("--file <path>", "Local file path to upload")
    .option("--comment <text>", "Initial comment to include with the upload")
    .option("--thread-ts <ts>", "Thread timestamp to upload into")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const mergedOpts = { ...(cmd.parent?.opts() ?? {}), ...opts };
        const client = await getClient();

        const filePath = opts.file as string;
        const fileStats = statSync(filePath);
        if (!fileStats.isFile()) {
          console.error(`Error: ${filePath} is not a file`);
          process.exit(1);
        }

        const fileContent = readFileSync(filePath);
        const filename = basename(filePath);

        const result = await client.filesUploadV2({
          channel_id: opts.channel,
          file: fileContent,
          filename,
          initial_comment: opts.comment,
          thread_ts: opts.threadTs,
        });

        const format = resolveFormat(mergedOpts);
        if (format === "concise") {
          console.log(`File "${filename}" uploaded to ${opts.channel}`);
        } else if (format === "detailed") {
          console.log(formatOutput(result, "detailed"));
        } else {
          console.log(formatOutput(result, "json"));
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
