# agent-slack

A Bun CLI + Claude Code plugin that replaces the 12 Slack MCP server tools with a single, token-efficient CLI. Instead of spending ~18K tokens per session on MCP tool descriptions, Claude loads a lightweight skill file and calls `agent-slack` via Bash.

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- A Slack workspace you can authorize against

## Authentication

### Quick Start (end user)

If someone has already set up the Slack app and deployed the OAuth worker, just run:

```bash
agent-slack login
```

This opens your browser for Slack OAuth authorization. Click "Allow" and the token is saved to `~/.agent-slack/config.json`.

```bash
agent-slack read-user-profile   # verify it works
agent-slack logout               # remove stored token
```

### Setting Up the Slack App (first-time setup)

To use OAuth login, you need a Slack app and a deployed Cloudflare Worker.

#### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** → **From scratch**
2. Name it (e.g. "agent-slack") and select your workspace
3. Under **OAuth & Permissions** → **User Token Scopes**, add these 12 scopes:

   | Scope | Purpose |
   |-------|---------|
   | `search:read` | Search messages and files |
   | `chat:write` | Send messages, schedule messages, create drafts |
   | `channels:history` | Read public channel messages |
   | `groups:history` | Read private channel messages |
   | `im:history` | Read DM messages |
   | `mpim:history` | Read group DM messages |
   | `channels:read` | Search and list channels |
   | `groups:read` | Search and list private channels |
   | `users:read` | Search users and read profiles |
   | `users:read.email` | Include email in user profiles |
   | `canvases:write` | Create Canvas documents |
   | `canvases:read` | Read Canvas documents |

4. Under **OAuth & Permissions** → **Redirect URLs**, add:
   ```
   https://agent-slack.asafr1993.workers.dev/callback
   ```
5. Under **Manage Distribution**, click **Activate Public Distribution** (required for OAuth to work outside your own workspace)
6. Note your **Client ID** and **Client Secret** from the **Basic Information** page

#### 2. Deploy the Cloudflare Worker

The `worker/` directory contains a Cloudflare Worker that acts as a token exchange proxy. It keeps the `client_secret` safe server-side.

```bash
cd worker
npm install
npx wrangler secret put SLACK_CLIENT_SECRET   # paste your client secret when prompted
npx wrangler deploy
```

#### 3. Update Constants

Edit `src/constants.ts` with your Slack app's client ID and your deployed worker URL:

```ts
export const SLACK_CLIENT_ID = "your-client-id";
export const OAUTH_WORKER_URL = "https://your-worker.your-subdomain.workers.dev";
```

#### How OAuth Works

```
agent-slack login
  → Starts local HTTP server on a random port
  → Opens browser to Slack OAuth authorize URL
  → User clicks "Allow" in Slack
  → Slack redirects to Cloudflare Worker (HTTPS)
  → Worker redirects to http://localhost:PORT/callback
  → CLI sends auth code to Worker's /token-exchange endpoint
  → Worker exchanges code for token using client_secret
  → CLI saves token to ~/.agent-slack/config.json
```

The local port is encoded in the OAuth `state` parameter so the worker knows where to redirect back to.

## Installation

```bash
# Clone and install
git clone <repo-url>
cd agent-slack
bun install

# Make the CLI globally available
bun link
```

After `bun link`, the `agent-slack` command is available system-wide.

## Usage

```bash
agent-slack <command> [flags]
agent-slack --help
agent-slack <command> --help
```

### Commands

| Command             | Description                           | Replaces MCP Tool                 |
| ------------------- | ------------------------------------- | --------------------------------- |
| `send-message`      | Send a message to a channel           | `slack_send_message`              |
| `schedule-message`  | Schedule a message for later          | `slack_schedule_message`          |
| `draft-message`     | Create a draft message                | `slack_send_message_draft`        |
| `search-channels`   | Find channels by name/purpose         | `slack_search_channels`           |
| `read-channel`      | Read channel message history          | `slack_read_channel`              |
| `search-messages`   | Search public channel messages        | `slack_search_public`             |
| `read-thread`       | Read a thread's messages              | `slack_read_thread`               |
| `search-users`      | Find users by name/email/title        | `slack_search_users`              |
| `read-user-profile` | Get a user's profile                  | `slack_read_user_profile`         |
| `search-all`        | Search all channels incl. private/DMs | `slack_search_public_and_private` |
| `create-canvas`     | Create a Canvas document              | `slack_create_canvas`             |
| `read-canvas`       | Read a Canvas document                | `slack_read_canvas`               |
| `login`             | Authenticate with Slack via OAuth     | —                                 |
| `logout`            | Remove stored Slack token             | —                                 |

### Output Formats

Every command supports three output modes:

```bash
agent-slack read-channel --channel C12345              # concise (default, token-efficient)
agent-slack read-channel --channel C12345 --detailed   # verbose with all fields
agent-slack read-channel --channel C12345 --json       # raw JSON, pipe to jq
```

### Message Content Input

Commands that accept text (`send-message`, `schedule-message`, `draft-message`, `create-canvas`) support three input methods:

```bash
# Inline
agent-slack send-message --channel C12345 --text "Hello world"

# From file (recommended for complex content)
agent-slack send-message --channel C12345 --text-file /tmp/message.md

# From stdin
echo "Hello world" | agent-slack send-message --channel C12345
```

For `create-canvas`, use `--content` / `--content-file` instead of `--text` / `--text-file`.

### Examples

```bash
# Send a message
agent-slack send-message --channel C12345 --text "Deploy complete"

# Search for a channel, get its ID
agent-slack search-channels --query "engineering" --json | jq -r '.channels[0].id'

# Read last 20 messages from a channel
agent-slack read-channel --channel C12345 --limit 20

# Search messages with Slack search syntax
agent-slack search-messages --query "from:<@U12345> in:engineering bug after:2024-01-01"

# Read a thread
agent-slack read-thread --channel C12345 --ts 1234567890.123456

# Schedule a message
agent-slack schedule-message --channel C12345 --text "Reminder" --post-at "2025-03-01T09:00:00Z"

# Look up a user
agent-slack read-user-profile --user U12345
```

## Using as a Claude Code Plugin

This project is a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code). It includes a skill (`skills/slack/SKILL.md`) that teaches Claude how to use the CLI for all Slack operations.

### Setup

Point Claude Code at this directory as a plugin:

```bash
claude --plugin-dir /path/to/agent-slack
```

Or add it to your Claude Code settings. Once loaded, Claude will automatically use `agent-slack` via Bash whenever Slack tasks arise — no MCP server needed.

### How It Works

- The **skill file** (`skills/slack/SKILL.md`) contains complete documentation of all 12 commands, flags, search syntax, output formats, and error codes
- It declares `allowed-tools: Bash(agent-slack *)` so Claude can run the CLI without per-command approval
- It's marked `user-invocable: false` — Claude auto-activates it when Slack tasks are detected
- The **plugin manifest** (`.claude-plugin/plugin.json`) registers the plugin with Claude Code

### Token Savings

The 12 MCP Slack tools consume ~18K tokens per session from their tool descriptions alone. This plugin replaces all of them with a single skill file that Claude loads on demand, dramatically reducing per-session token overhead.

## Development

### Running Tests

```bash
bun test              # all tests (unit + integration)
bun test tests/unit   # unit tests only
bun test tests/integration  # integration tests only
```

### Project Structure

```
agent-slack/
├── .claude-plugin/plugin.json      # Claude Code plugin manifest
├── skills/slack/SKILL.md           # Skill: teaches Claude to use the CLI
├── bin/agent-slack.ts              # CLI entry point
├── src/
│   ├── cli.ts                      # Commander program, registers subcommands
│   ├── client.ts                   # Slack WebClient factory (auth via config)
│   ├── config.ts                   # Loads/saves ~/.agent-slack/config.json
│   ├── constants.ts                # OAuth config (client ID, worker URL, scopes)
│   ├── output.ts                   # Concise / detailed / JSON formatters
│   ├── errors.ts                   # Slack API error handling
│   ├── input.ts                    # Text input resolution (inline/file/stdin)
│   ├── formatters/messages.ts      # Shared message formatting
│   └── commands/                   # 14 subcommand implementations (incl. login/logout)
├── worker/                         # Cloudflare Worker (OAuth token exchange proxy)
│   ├── src/index.ts                # Worker entry point
│   ├── wrangler.toml               # Worker config
│   └── package.json
├── tests/
│   ├── unit/                       # Mocked unit tests per module
│   ├── integration/cli.test.ts     # End-to-end CLI invocation tests
│   └── helpers/mock-slack.ts       # Shared Slack API mock factory
├── package.json
└── tsconfig.json
```

## License

MIT
