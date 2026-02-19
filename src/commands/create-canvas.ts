import { Command } from "commander";
import { getClient } from "../client";
import { resolveTextInput } from "../input";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("create-canvas")
    .description("Create a Slack Canvas document")
    .requiredOption("--title <title>", "Canvas title")
    .option("--content <content>", "Canvas content (Markdown)")
    .option("--content-file <file>", "File containing canvas content")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });

        // Resolve content from --content, --content-file, or stdin
        const content = await resolveTextInput({ text: opts.content, textFile: opts.contentFile });

        // canvases.create is not in the typed SDK; use apiCall directly.
        const result = await client.apiCall("canvases.create", {
          title: opts.title,
          document_content: { type: "markdown", markdown: content },
        }) as Record<string, unknown>;

        const format = resolveFormat(mergedOpts);
        if (format === "concise") {
          console.log(`Canvas created: ${opts.title} (id: ${result.canvas_id})`);
        } else if (format === "detailed") {
          console.log(formatOutput({ canvas_id: result.canvas_id, title: opts.title }, "detailed"));
        } else {
          console.log(formatOutput(result, "json"));
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
