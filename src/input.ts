import { readFileSync } from "fs";

export interface TextInputOptions {
  text?: string;
  textFile?: string;
}

export async function resolveTextInput(opts: TextInputOptions): Promise<string> {
  if (opts.text) {
    return opts.text;
  }

  if (opts.textFile) {
    return readFileSync(opts.textFile, "utf-8");
  }

  // Read from stdin
  if (process.stdin.isTTY) {
    throw new Error(
      "No text provided. Use --text, --text-file, or pipe input via stdin."
    );
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}
