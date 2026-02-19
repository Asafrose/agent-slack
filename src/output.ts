export type OutputFormat = "concise" | "detailed" | "json";

export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "detailed":
      return formatDetailed(data);
    case "concise":
    default:
      return formatConcise(data);
  }
}

function formatConcise(data: unknown): string {
  if (typeof data === "string") return data;
  if (data === null || data === undefined) return "";
  if (typeof data === "object") {
    return JSON.stringify(data);
  }
  return String(data);
}

function formatDetailed(data: unknown): string {
  if (typeof data === "string") return data;
  if (data === null || data === undefined) return "";
  if (typeof data === "object") {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

export interface FormatOptions {
  detailed?: boolean;
  json?: boolean;
}

export function resolveFormat(opts: FormatOptions): OutputFormat {
  if (opts.json) return "json";
  if (opts.detailed) return "detailed";
  return "concise";
}
