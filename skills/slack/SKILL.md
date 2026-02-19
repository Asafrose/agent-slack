---
name: slack
description: Interact with Slack workspaces - send messages, search channels/messages/users, read threads, manage canvases
user-invocable: false
allowed-tools: Bash(agent-slack *)
---

# agent-slack

A token-efficient CLI that replaces the Slack MCP tools. Use `agent-slack` for all Slack operations.

## Authentication

Auth is resolved in this order:

1. `SLACK_TOKEN` environment variable
2. `--token <token>` global flag
3. `~/.agent-slack/config.json` → `{ "token": "xoxb-..." }`

## Global Flags

These flags work on every subcommand:

| Flag              | Description                                |
| ----------------- | ------------------------------------------ |
| `--token <token>` | Slack API token (overrides env and config) |
| `--detailed`      | Verbose output with all fields             |
| `--json`          | Raw JSON output (structured, parseable)    |

Default output is **concise** — minimal text optimized for token efficiency.

## Complex Content Input

Commands that accept message text or canvas content support 3 input methods:

```bash
# 1. Inline text (simple messages)
agent-slack send-message --channel C12345 --text "Hello team"

# 2. From a file (complex/long content)
agent-slack send-message --channel C12345 --text-file /tmp/message.md

# 3. From stdin (piped content)
echo "Hello team" | agent-slack send-message --channel C12345
cat message.md | agent-slack send-message --channel C12345
```

For `create-canvas`, use `--content` / `--content-file` instead of `--text` / `--text-file`.

**Tip:** Prefer `--text-file` for multi-line or complex messages to avoid shell escaping issues.

---

## Subcommands

### send-message

Send a message to a channel or thread.

```
agent-slack send-message --channel <id> [--text <text>] [--text-file <file>] [--thread-ts <ts>] [--reply-broadcast]
```

**Required:** `--channel`
**Content:** `--text`, `--text-file`, or stdin (required — one must be provided)

| Flag                 | Description                           |
| -------------------- | ------------------------------------- |
| `--channel <id>`     | Channel ID (e.g. C12345) or name      |
| `--text <text>`      | Inline message text                   |
| `--text-file <file>` | Path to file with message text        |
| `--thread-ts <ts>`   | Reply to this thread timestamp        |
| `--reply-broadcast`  | Also post thread reply to the channel |

**Output examples:**

```
# concise (default)
Message sent to C12345 (ts: 1234567890.123456)

# detailed
{
  "ts": "1234567890.123456",
  "channel": "C12345",
  "message": { ... }
}

# json (raw API response)
{ "ok": true, "ts": "...", "channel": "...", ... }
```

**Examples:**

```bash
agent-slack send-message --channel C12345 --text "Deploy complete"
agent-slack send-message --channel C12345 --text-file /tmp/update.md
agent-slack send-message --channel C12345 --text "Reply" --thread-ts 1234567890.000001
echo "Quick note" | agent-slack send-message --channel general
```

---

### schedule-message

Schedule a message to be sent at a future time.

```
agent-slack schedule-message --channel <id> --post-at <time> [--text <text>] [--text-file <file>] [--thread-ts <ts>] [--reply-broadcast]
```

**Required:** `--channel`, `--post-at`
**Content:** `--text`, `--text-file`, or stdin

| Flag                 | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| `--channel <id>`     | Channel ID or name                                                           |
| `--post-at <time>`   | Unix timestamp (e.g. `1700000000`) or ISO 8601 (e.g. `2025-11-15T09:00:00Z`) |
| `--text <text>`      | Inline message text                                                          |
| `--text-file <file>` | Path to file with message text                                               |
| `--thread-ts <ts>`   | Schedule as reply to this thread                                             |
| `--reply-broadcast`  | Also post thread reply to the channel                                        |

**Output examples:**

```
# concise
Message scheduled in C12345 for 2023-11-15T00:00:00.000Z (id: Q12345)

# detailed
{
  "scheduled_message_id": "Q12345",
  "channel": "C12345",
  "post_at": 1700000000,
  "post_at_human": "2023-11-15T00:00:00.000Z"
}
```

**Examples:**

```bash
agent-slack schedule-message --channel C12345 --text "Weekly reminder" --post-at 1700000000
agent-slack schedule-message --channel C12345 --text "Meeting" --post-at "2025-11-15T09:00:00Z"
```

---

### draft-message

Create a draft message in a channel (not sent immediately).

```
agent-slack draft-message --channel <id> [--text <text>] [--text-file <file>] [--thread-ts <ts>]
```

**Required:** `--channel`
**Content:** `--text`, `--text-file`, or stdin

| Flag                 | Description                    |
| -------------------- | ------------------------------ |
| `--channel <id>`     | Channel ID or name             |
| `--text <text>`      | Inline message text            |
| `--text-file <file>` | Path to file with message text |
| `--thread-ts <ts>`   | Create draft as thread reply   |

**Note:** Uses the undocumented Slack `draft.create` API endpoint.

**Output examples:**

```
# concise
Draft created in C12345

# detailed
{
  "channel": "C12345",
  "channel_link": "https://slack.com/app_redirect?channel=C12345",
  "draft": { ... }
}
```

**Examples:**

```bash
agent-slack draft-message --channel C12345 --text "Draft announcement"
cat announcement.md | agent-slack draft-message --channel general
```

---

### create-canvas

Create a Slack Canvas document with Markdown content.

```
agent-slack create-canvas --title <title> [--content <md>] [--content-file <file>]
```

**Required:** `--title`
**Content:** `--content`, `--content-file`, or stdin

| Flag                    | Description                        |
| ----------------------- | ---------------------------------- |
| `--title <title>`       | Canvas title                       |
| `--content <md>`        | Inline Markdown content            |
| `--content-file <file>` | Path to file with Markdown content |

**Output examples:**

```
# concise
Canvas created: My Canvas (id: F12345CANVAS)

# detailed
{
  "canvas_id": "F12345CANVAS",
  "title": "My Canvas"
}
```

**Examples:**

```bash
agent-slack create-canvas --title "Project Spec" --content "# Overview\n\nDetails here."
agent-slack create-canvas --title "Meeting Notes" --content-file /tmp/notes.md
cat spec.md | agent-slack create-canvas --title "API Design"
```

---

### read-channel

Read messages from a Slack channel in reverse chronological order.

```
agent-slack read-channel --channel <id> [--limit <n>] [--oldest <ts>] [--latest <ts>] [--cursor <cursor>]
```

**Required:** `--channel`

| Flag                | Default | Description                              |
| ------------------- | ------- | ---------------------------------------- |
| `--channel <id>`    | —       | Channel ID                               |
| `--limit <n>`       | 100     | Number of messages to fetch              |
| `--oldest <ts>`     | —       | Only messages after this Unix timestamp  |
| `--latest <ts>`     | —       | Only messages before this Unix timestamp |
| `--cursor <cursor>` | —       | Pagination cursor from previous response |

**Output examples:**

```
# concise (one line per message)
alice: Hello team [10:30 AM] [3 replies] [thumbsup(2)]
bob: Deploy is done [10:32 AM]

# detailed (per-message blocks)
=== Message (ts: 1234567890.123456) ===
From: alice
Time: 10:30 AM (1234567890.123456)
Text: Hello team
Replies: 3
Reactions: :thumbsup: (2)

--- Next cursor: dGVhbTpDMDY= ---
```

**Examples:**

```bash
agent-slack read-channel --channel C12345
agent-slack read-channel --channel C12345 --limit 20
agent-slack read-channel --channel C12345 --oldest 1700000000 --latest 1700086400
agent-slack read-channel --channel C12345 --cursor dGVhbTpDMDY=
```

---

### read-thread

Read all messages in a Slack thread.

```
agent-slack read-thread --channel <id> --ts <ts> [--limit <n>] [--oldest <ts>] [--latest <ts>] [--cursor <cursor>]
```

**Required:** `--channel`, `--ts`

| Flag                | Default | Description                                   |
| ------------------- | ------- | --------------------------------------------- |
| `--channel <id>`    | —       | Channel ID containing the thread              |
| `--ts <ts>`         | —       | Timestamp of the parent (thread root) message |
| `--limit <n>`       | 100     | Number of messages to fetch                   |
| `--oldest <ts>`     | —       | Only messages after this timestamp            |
| `--latest <ts>`     | —       | Only messages before this timestamp           |
| `--cursor <cursor>` | —       | Pagination cursor                             |

**Output examples:**

```
# concise (parent + replies with > prefix)
alice: What do you think about the new design? [02:00 PM]
> bob: Looks great, ship it [02:05 PM]
> carol: +1 from me [02:07 PM]

# detailed
=== THREAD PARENT (ts: 1234567890.123456) ===
From: alice
Text: What do you think about the new design?
```

**Examples:**

```bash
agent-slack read-thread --channel C12345 --ts 1234567890.123456
agent-slack read-thread --channel C12345 --ts 1234567890.123456 --limit 50
```

---

### read-user-profile

Get profile information for a Slack user.

```
agent-slack read-user-profile [--user <id>]
```

| Flag          | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `--user <id>` | User ID (omit to get the authenticated user's own profile) |

**Output examples:**

```
# concise
@alice (Alice Smith)
Software Engineer
alice@example.com
Status: Working from home

# detailed
User ID: U12345
Username: @alice
Display Name: Alice Smith
Real Name: Alice Smith
Title: Software Engineer
Email: alice@example.com
Status: Working from home
Time Zone: America/New_York
Admin: No
Owner: No
Bot: No
```

**Examples:**

```bash
agent-slack read-user-profile                    # authenticated user
agent-slack read-user-profile --user U12345
agent-slack read-user-profile --user U12345 --json
```

---

### read-canvas

Read the content of a Slack Canvas document.

```
agent-slack read-canvas --canvas <id>
```

**Required:** `--canvas`

| Flag            | Description               |
| --------------- | ------------------------- |
| `--canvas <id>` | Canvas ID (starts with F) |

**Output examples:**

```
# concise (section content joined)
# Project Overview

This document describes...

## Goals

- Ship by Q4
- Reduce latency

# detailed (with section IDs)
--- Section section1 ---
# Project Overview

This document describes...
```

**Examples:**

```bash
agent-slack read-canvas --canvas F12345CANVAS
agent-slack read-canvas --canvas F12345CANVAS --json
```

---

### search-channels

Search for Slack channels by name, purpose, or topic. Uses client-side filtering against `conversations.list`.

```
agent-slack search-channels --query <query> [--types <types>] [--limit <n>] [--include-archived] [--cursor <cursor>]
```

**Required:** `--query`

| Flag                 | Default          | Description                                             |
| -------------------- | ---------------- | ------------------------------------------------------- |
| `--query <query>`    | —                | Search term (matched against name, purpose, topic)      |
| `--types <types>`    | `public_channel` | Comma-separated channel types (see Channel Types below) |
| `--limit <n>`        | 20               | Max results to fetch from API before filtering          |
| `--include-archived` | false            | Include archived channels                               |
| `--cursor <cursor>`  | —                | Pagination cursor                                       |

**Output examples:**

```
# concise
#general - Company-wide announcements [142 members]
#engineering - Engineering team [38 members]

# detailed
Name: #general
ID: C12345
Creator: U67890
Created: 2020-01-15T00:00:00.000Z
Purpose: Company-wide announcements
Members: 142
Archived: no
```

**Examples:**

```bash
agent-slack search-channels --query "engineering"
agent-slack search-channels --query "project" --types "public_channel,private_channel"
agent-slack search-channels --query "old" --include-archived
```

---

### search-messages

Search messages in public Slack channels.

```
agent-slack search-messages --query <query> [--sort <sort>] [--sort-dir <dir>] [--limit <n>] [--cursor <cursor>]
```

**Required:** `--query`

| Flag                | Default | Description                                              |
| ------------------- | ------- | -------------------------------------------------------- |
| `--query <query>`   | —       | Search query with optional modifiers (see Search Syntax) |
| `--sort <sort>`     | `score` | Sort order: `score` or `timestamp`                       |
| `--sort-dir <dir>`  | `desc`  | Sort direction: `asc` or `desc`                          |
| `--limit <n>`       | 20      | Max results                                              |
| `--cursor <cursor>` | —       | Pagination cursor                                        |

**Output examples:**

```
# concise
#general [alice, 10:30 AM]: Deploy is complete
#engineering [bob, 09:15 AM]: PR is ready for review

# detailed
=== Result 1 of 5 ===
Channel: #general (C12345)
From: alice (U12345)
Time: 2024-01-15 10:30:45 UTC (1705316445.123456)
Text: Deploy is complete
```

**Examples:**

```bash
agent-slack search-messages --query "deploy complete"
agent-slack search-messages --query "from:<@U12345> in:engineering PR"
agent-slack search-messages --query "bug after:2024-01-08" --sort timestamp
agent-slack search-messages --query "incident has:pin"
```

---

### search-all

Search messages across all channels including private channels, group DMs, and DMs.

```
agent-slack search-all --query <query> [--sort <sort>] [--sort-dir <dir>] [--limit <n>] [--channel-types <types>] [--cursor <cursor>]
```

**Required:** `--query`

| Flag                      | Default                                  | Description                          |
| ------------------------- | ---------------------------------------- | ------------------------------------ |
| `--query <query>`         | —                                        | Search query with optional modifiers |
| `--sort <sort>`           | `score`                                  | Sort order: `score` or `timestamp`   |
| `--sort-dir <dir>`        | `desc`                                   | Direction: `asc` or `desc`           |
| `--limit <n>`             | 20                                       | Max results                          |
| `--channel-types <types>` | `public_channel,private_channel,mpim,im` | Channel types to search              |
| `--cursor <cursor>`       | —                                        | Pagination cursor                    |

Same output format as `search-messages`.

**Examples:**

```bash
agent-slack search-all --query "budget approval"
agent-slack search-all --query "from:<@U12345> action item" --channel-types "im,mpim"
agent-slack search-all --query "secret project" --sort timestamp --sort-dir asc
```

---

### search-users

Search for Slack users by name, username, email, or title. Uses client-side filtering against `users.list`.

```
agent-slack search-users --query <query> [--limit <n>] [--cursor <cursor>]
```

**Required:** `--query`

| Flag                | Default | Description                                                |
| ------------------- | ------- | ---------------------------------------------------------- |
| `--query <query>`   | —       | Search term (matched against username, name, email, title) |
| `--limit <n>`       | 20      | Max users to fetch from API before filtering               |
| `--cursor <cursor>` | —       | Pagination cursor                                          |

**Output examples:**

```
# concise
@alice (Alice Smith) - Software Engineer
@alice.jones (Alice Jones) - Product Manager

# detailed
Username: @alice
ID: U12345
Real Name: Alice Smith
Display Name: Alice
Title: Software Engineer
Email: alice@example.com
Timezone: America/New_York
Admin: no
Bot: no
```

**Examples:**

```bash
agent-slack search-users --query "alice"
agent-slack search-users --query "engineer" --limit 50
agent-slack search-users --query "alice@example.com"
```

---

## Search Syntax

The `search-messages` and `search-all` commands support Slack's full search modifier syntax in the `--query` value.

### Location Filters

```
in:channel-name        Search in a specific channel
in:<#C123456>          Search in channel by ID
-in:channel            Exclude a channel
in:@username           Search in DMs with a user
```

### User Filters

```
from:<@U123456>        Messages from a specific user (by ID)
from:username          Messages from a user (by username)
to:<@U123456>          Messages sent to a user
```

### Content Filters

```
is:thread              Only threaded messages
has:pin                Pinned messages only
has:link               Messages containing links
has:file               Messages with attachments
has::emoji:            Messages with a specific reaction emoji
"exact phrase"         Search for an exact phrase
-word                  Exclude results containing a word
```

### Date Filters

```
before:YYYY-MM-DD      Messages before a date
after:YYYY-MM-DD       Messages after a date
on:YYYY-MM-DD          Messages on a specific date
during:month           e.g. during:january
during:year            e.g. during:2024
```

### Combined Examples

```bash
# Messages from alice in engineering channel about bugs
agent-slack search-messages --query "from:<@U12345> in:engineering bug"

# Pinned messages about the incident after a date
agent-slack search-messages --query "incident has:pin after:2024-01-01"

# Exact phrase search
agent-slack search-messages --query "\"production outage\""

# Messages with files in a channel
agent-slack search-messages --query "in:general has:file"
```

---

## Channel Types

Used with `--types` in `search-channels` and `--channel-types` in `search-all`:

| Type              | Description                             |
| ----------------- | --------------------------------------- |
| `public_channel`  | Public channels (default)               |
| `private_channel` | Private channels                        |
| `mpim`            | Group direct messages (multi-party DMs) |
| `im`              | Direct messages (1:1 DMs)               |

Combine with commas: `--channel-types "public_channel,private_channel"`

---

## Output Formats

Every command supports three output modes controlled by global flags:

| Mode              | Flag         | Use when                                   |
| ----------------- | ------------ | ------------------------------------------ |
| Concise (default) | _(none)_     | Reading output in context, token-efficient |
| Detailed          | `--detailed` | Need full field information                |
| JSON              | `--json`     | Programmatic processing, piping to `jq`    |

```bash
# Concise (default) - minimal output
agent-slack read-channel --channel C12345

# Detailed - verbose human-readable
agent-slack read-channel --channel C12345 --detailed

# JSON - structured, pipe-friendly
agent-slack read-channel --channel C12345 --json | jq '.messages[0].text'
```

---

## Pagination

Commands that return lists support `--cursor` for pagination. The cursor value appears at the end of output when more results are available:

```
--- Next cursor: dGVhbTpDMDYxRkE1UEI= ---
```

Use it in the next call:

```bash
agent-slack read-channel --channel C12345 --cursor dGVhbTpDMDYxRkE1UEI=
```

---

## Error Handling

On error, `agent-slack` prints a friendly message to stderr and exits with code 1.

| Slack Error Code       | Meaning                                |
| ---------------------- | -------------------------------------- |
| `channel_not_found`    | Invalid channel ID or no access        |
| `not_in_channel`       | Bot is not a member of the channel     |
| `invalid_auth`         | Token is invalid or expired            |
| `missing_scope`        | Token lacks required OAuth scope       |
| `ratelimited`          | Too many requests — back off and retry |
| `user_not_found`       | Invalid user ID                        |
| `channel_not_archived` | Operation requires an archived channel |

```bash
# Example error output (stderr)
Error: No Slack token found. Set SLACK_TOKEN env var, use --token flag, or add token to ~/.agent-slack/config.json

# Slack API error
Slack API error: An API error occurred: channel_not_found (code: channel_not_found)
```

---

## Tips for AI Agents

1. **Use concise output by default** — it's the most token-efficient. Only use `--detailed` or `--json` when you need specific fields.

2. **Prefer `--text-file` for long content** — avoids shell escaping issues with multi-line strings, special characters, or Markdown.

3. **Use `--json` when parsing output** — pipe to `jq` for reliable field extraction:

   ```bash
   agent-slack send-message --channel C12345 --text "hi" --json | jq -r '.ts'
   ```

4. **Get channel IDs first** — commands require channel IDs (e.g. `C12345`), not names. Use `search-channels` to find IDs:

   ```bash
   agent-slack search-channels --query "engineering" --json | jq -r '.channels[0].id'
   ```

5. **For thread replies, capture `ts` from `send-message`** — the timestamp returned is what you need for `--thread-ts` on subsequent messages.

6. **Paginate large results** — `read-channel` defaults to 100 messages. Use `--limit` and `--cursor` for large channels.

7. **`search-all` vs `search-messages`** — `search-messages` searches public channels only. Use `search-all` when you need to search private channels, DMs, or group DMs.
