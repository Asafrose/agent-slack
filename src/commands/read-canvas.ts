import { Command } from "commander";
import { getClient } from "../client";
import { formatOutput, resolveFormat } from "../output";
import { handleSlackError } from "../errors";

export function register(program: Command): void {
  program
    .command("read-canvas")
    .description("Read content from a Slack Canvas document")
    .requiredOption("--canvas <canvas>", "Canvas ID")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });
        const result = await (client as unknown as {
          canvases: {
            sections: {
              lookup: (args: { canvas_id: string; criteria: { section_types: string[] } }) => Promise<unknown>;
            };
          };
        }).canvases.sections.lookup({
          canvas_id: opts.canvas,
          criteria: { section_types: ["any_header", "paragraph"] },
        });
        const format = resolveFormat(mergedOpts);
        console.log(formatOutput(result, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
