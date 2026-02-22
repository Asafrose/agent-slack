import type { Command } from "commander";
import { getClient } from "../client";
import type { OutputFormat } from "../output";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";

interface UserProfile {
  email?: string;
  title?: string;
  display_name?: string;
  image_72?: string;
  image_192?: string;
}

interface SlackUser {
  id?: string;
  name?: string;
  real_name?: string;
  tz?: string;
  is_admin?: boolean;
  is_bot?: boolean;
  deleted?: boolean;
  profile?: UserProfile;
}

function formatUserConcise(u: SlackUser): string {
  const username = u.name ? `@${u.name}` : (u.id ?? "unknown");
  const displayName = u.real_name ?? u.profile?.display_name ?? "";
  const title = u.profile?.title ?? "";
  const parts = [`${username}${displayName ? ` (${displayName})` : ""}`];
  if (title) parts.push(title);
  return parts.join(" - ");
}

function formatUserDetailed(u: SlackUser): string {
  const lines: string[] = [];
  lines.push(`Username: ${u.name ? `@${u.name}` : (u.id ?? "unknown")}`);
  if (u.id) lines.push(`ID: ${u.id}`);
  if (u.real_name) lines.push(`Real Name: ${u.real_name}`);
  if (u.profile?.display_name) lines.push(`Display Name: ${u.profile.display_name}`);
  if (u.profile?.title) lines.push(`Title: ${u.profile.title}`);
  if (u.profile?.email) lines.push(`Email: ${u.profile.email}`);
  if (u.tz) lines.push(`Timezone: ${u.tz}`);
  if (u.profile?.image_192) lines.push(`Profile Pic: ${u.profile.image_192}`);
  if (u.is_admin !== undefined) lines.push(`Admin: ${u.is_admin ? "yes" : "no"}`);
  if (u.is_bot !== undefined) lines.push(`Bot: ${u.is_bot ? "yes" : "no"}`);
  return lines.join("\n");
}

function formatUsers(
  users: SlackUser[],
  nextCursor: string | undefined,
  format: OutputFormat,
): string {
  if (format === "json") {
    return JSON.stringify({ users, next_cursor: nextCursor ?? "" }, null, 2);
  }
  if (format === "detailed") {
    const out = users.map(formatUserDetailed).join("\n\n");
    return nextCursor ? `${out}\n\nNext cursor: ${nextCursor}` : out;
  }
  const out = users.map(formatUserConcise).join("\n");
  return nextCursor ? `${out}\n\nNext cursor: ${nextCursor}` : out;
}

function matchesQuery(u: SlackUser, query: string): boolean {
  const q = query.toLowerCase();
  return (
    (u.name?.toLowerCase().includes(q) ?? false) ||
    (u.real_name?.toLowerCase().includes(q) ?? false) ||
    (u.profile?.email?.toLowerCase().includes(q) ?? false) ||
    (u.profile?.title?.toLowerCase().includes(q) ?? false) ||
    (u.profile?.display_name?.toLowerCase().includes(q) ?? false)
  );
}

export function register(program: Command): void {
  program
    .command("search-users")
    .description("Search for Slack users")
    .requiredOption("--query <query>", "Search query")
    .option("--limit <limit>", "Maximum number of results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const mergedOpts = { ...(cmd.parent?.opts() ?? {}), ...opts };
        const client = await getClient();
        const result = await client.users.list({
          limit: parseInt(opts.limit, 10),
          cursor: opts.cursor,
        });
        const format = resolveFormat(mergedOpts);
        const allUsers: SlackUser[] = result.members ?? [];
        const users = allUsers.filter((u) => matchesQuery(u, opts.query));
        const nextCursor = result.response_metadata?.next_cursor;
        console.log(formatUsers(users, nextCursor, format));
      } catch (err) {
        handleSlackError(err);
      }
    });
}
