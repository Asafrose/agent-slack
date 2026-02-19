import type { Command } from "commander";
import { getClient } from "../client";
import { resolveFormat } from "../output";
import { handleSlackError } from "../errors";

interface UserProfile {
  title?: string;
  email?: string;
  phone?: string;
  status_text?: string;
  status_emoji?: string;
  display_name?: string;
  real_name?: string;
}

interface SlackUser {
  id?: string;
  name?: string;
  real_name?: string;
  is_admin?: boolean;
  is_owner?: boolean;
  is_bot?: boolean;
  tz?: string;
  tz_label?: string;
  profile?: UserProfile;
}

function formatConciseUser(user: SlackUser): string {
  const lines: string[] = [];
  const displayName = user.profile?.display_name || user.real_name || user.name || "unknown";
  const username = user.name ?? "unknown";
  lines.push(`@${username} (${displayName})`);

  if (user.profile?.title) {
    lines.push(user.profile.title);
  }

  if (user.profile?.email) {
    lines.push(user.profile.email);
  }

  if (user.profile?.status_text || user.profile?.status_emoji) {
    const emoji = user.profile.status_emoji ? `${user.profile.status_emoji} ` : "";
    const text = user.profile.status_text ?? "";
    lines.push(`Status: ${emoji}${text}`);
  }

  return lines.join("\n");
}

function formatDetailedUser(user: SlackUser): string {
  const lines: string[] = [];
  lines.push(`User ID: ${user.id ?? "unknown"}`);
  lines.push(`Username: @${user.name ?? "unknown"}`);

  const displayName = user.profile?.display_name || user.real_name || "";
  if (displayName) lines.push(`Display Name: ${displayName}`);

  if (user.real_name) lines.push(`Real Name: ${user.real_name}`);
  if (user.profile?.title) lines.push(`Title: ${user.profile.title}`);
  if (user.profile?.email) lines.push(`Email: ${user.profile.email}`);
  if (user.profile?.phone) lines.push(`Phone: ${user.profile.phone}`);

  if (user.profile?.status_text || user.profile?.status_emoji) {
    const emoji = user.profile?.status_emoji ? `${user.profile.status_emoji} ` : "";
    const text = user.profile?.status_text ?? "";
    lines.push(`Status: ${emoji}${text}`);
  }

  if (user.tz) lines.push(`Time Zone: ${user.tz}`);
  if (user.tz_label) lines.push(`Time Zone Label: ${user.tz_label}`);
  lines.push(`Admin: ${user.is_admin ? "Yes" : "No"}`);
  lines.push(`Owner: ${user.is_owner ? "Yes" : "No"}`);
  lines.push(`Bot: ${user.is_bot ? "Yes" : "No"}`);

  return lines.join("\n");
}

export function register(program: Command): void {
  program
    .command("read-user-profile")
    .description("Get profile information for a Slack user")
    .option("--user <user>", "User ID (defaults to authenticated user)")
    .option("--detailed", "Detailed output")
    .option("--json", "JSON output")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.parent?.opts() ?? {};
        const mergedOpts = { ...globalOpts, ...opts };
        const client = getClient({ token: mergedOpts.token });

        let userId = opts.user;
        if (!userId) {
          const authResult = await client.auth.test();
          userId = authResult.user_id ?? "";
        }

        const result = await client.users.info({ user: userId });
        const format = resolveFormat(mergedOpts);

        if (format === "json") {
          console.log(JSON.stringify(result.user, null, 2));
          return;
        }

        const user: SlackUser | undefined = result.user;
        if (!user) {
          console.log("User not found.");
          return;
        }

        if (format === "detailed") {
          console.log(formatDetailedUser(user));
        } else {
          console.log(formatConciseUser(user));
        }
      } catch (err) {
        handleSlackError(err);
      }
    });
}
