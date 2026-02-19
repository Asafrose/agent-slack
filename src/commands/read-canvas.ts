import { Command } from "commander";
import { getClient } from "../client";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";

interface CanvasSection {
  id?: string;
  content?: string;
}

interface CanvasSectionsLookupResult {
  sections?: CanvasSection[];
}

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
              lookup: (args: { canvas_id: string; criteria: { section_types: string[] } }) => Promise<CanvasSectionsLookupResult>;
            };
          };
        }).canvases.sections.lookup({
          canvas_id: opts.canvas,
          criteria: { section_types: ["any_header", "paragraph"] },
        });

        const format = resolveFormat(mergedOpts);

        if (format === "json") {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const sections = result.sections ?? [];

        if (sections.length === 0) {
          console.log("Canvas is empty.");
          return;
        }

        if (format === "detailed") {
          const parts = sections.map((section) => {
            const lines: string[] = [];
            if (section.id) lines.push(`--- Section ${section.id} ---`);
            lines.push(section.content ?? "");
            return lines.join("\n");
          });
          console.log(parts.join("\n\n"));
        } else {
          const content = sections
            .map((s) => s.content ?? "")
            .filter(Boolean)
            .join("\n\n");
          console.log(content || "Canvas is empty.");
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
