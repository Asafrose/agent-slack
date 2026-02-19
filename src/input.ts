export interface TextInputOptions {
  text?: string;
  textFile?: string;
}

export function buildMessageBlocks(text: string): Record<string, unknown>[] {
  return [
    { type: "section", text: { type: "mrkdwn", text } },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "_Sent by <https://github.com/Asafrose/agent-slack|agent-slack>_",
        },
      ],
    },
  ];
}

export async function resolveTextInput(opts: TextInputOptions): Promise<string> {
  if (opts.text) {
    return opts.text;
  }

  if (opts.textFile) {
    return await Bun.file(opts.textFile).text();
  }

  // Read from stdin
  if (process.stdin.isTTY) {
    throw new Error("No text provided. Use --text, --text-file, or pipe input via stdin.");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}
