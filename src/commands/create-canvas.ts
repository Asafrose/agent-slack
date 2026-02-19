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
        const content = await resolveTextInput({ text: opts.content, textFile: opts.contentFile });
        const result = await (client as unknown as {
          canvases: {
            create: (args: { title: string; document_content: { type: string; markdown: string } }) => Promise<unknown>;
          };
        }).canvases.create({
          title: opts.title,
          document_content: { type: "markdown", markdown: content },
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput(result, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
