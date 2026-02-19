# agent-slack

A Bun CLI + Claude Code plugin that replaces the 12 Slack MCP server tools with a single, token-efficient CLI. Instead of spending ~18K tokens per session on MCP tool descriptions, Claude loads a lightweight skill file and calls `agent-slack` via Bash.

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- A Slack workspace you can authorize against

## Quick Start — OAuth Login

The easiest way to authenticate:

```bash
agent-slack login
```

This opens your browser for Slack OAuth authorization. Once you click "Allow", the token is saved automatically to `~/.agent-slack/config.json`.

To remove the stored token:

```bash
agent-slack logout
```

## Alternative: Manual Token Setup

If you prefer manual token configuration (e.g. for bot tokens or CI environments):

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**
2. Choose **From scratch**, give it a name (e.g. "Agent Slack"), and select your workspace
3. You'll land on the app's **Basic Information** page

### 2. Choose Token Type

agent-slack supports both **User Tokens** and **Bot Tokens**. Choose based on your use case:

| | User Token (`xoxp-...`) | Bot Token (`xoxb-...`) |
| --- | --- | --- |
| **Messages sent as** | You (your Slack identity) | The bot app |
| **Access to DMs** | Yes, your own DMs | Only if invited |
| **Drafts** | Appear in your Slack drafts | Not supported |
| **Channel access** | All channels you're in | Only channels bot is invited to |
| **Search private/DMs** | Yes (`search-all`) | Limited |
| **Best for** | Personal AI assistant (like MCP) | Shared team automation |

**Recommended: User Token** if you want the same experience as the Slack MCP tools (read/write as yourself).

### 3. Add Token Scopes

Navigate to **OAuth & Permissions** in the sidebar, scroll to **Scopes**.

**For a User Token**, add these **User Token Scopes**:

| Scope              | Required By                                         | Purpose                           |
| ------------------ | --------------------------------------------------- | --------------------------------- |
| `search:read`      | `search-messages`, `search-all`                     | Search messages across channels   |
| `chat:write`       | `send-message`, `schedule-message`, `draft-message` | Post and schedule messages        |
| `channels:history` | `read-channel`, `read-thread`                       | Read messages in public channels  |
| `groups:history`   | `read-channel`, `read-thread`                       | Read messages in private channels |
| `im:history`       | `read-channel`, `read-thread`                       | Read direct messages              |
| `mpim:history`     | `read-channel`, `read-thread`                       | Read group DMs                    |
| `channels:read`    | `search-channels`                                   | List and search public channels   |
| `groups:read`      | `search-channels`                                   | List and search private channels  |
| `users:read`       | `search-users`, `read-user-profile`                 | Look up user profiles             |
| `users:read.email` | `search-users`, `read-user-profile`                 | Access user email addresses       |
| `canvases:write`   | `create-canvas`                                     | Create Canvas documents           |
| `canvases:read`    | `read-canvas`                                       | Read Canvas content               |

**For a Bot Token**, add the same scopes under **Bot Token Scopes** instead. Note that the bot will need to be invited to each channel (`/invite @YourBotName`), and `draft-message` only works with user tokens.

**Minimal scope set** — if you only need read operations, skip `chat:write` and `canvases:write`.

### 4. Install the App to Your Workspace

1. Still on **OAuth & Permissions**, scroll up and click **Install to Workspace**
2. Review the permissions and click **Allow**
3. Copy the token:
   - **User Token**: copy the **User OAuth Token** (`xoxp-...`)
   - **Bot Token**: copy the **Bot User OAuth Token** (`xoxb-...`)

### 5. Configure the Token

Pick one of the three auth methods:

```bash
# Option A: Environment variable (recommended)
export SLACK_TOKEN=xoxp-your-token-here

# Option B: Config file
mkdir -p ~/.agent-slack
echo '{ "token": "xoxp-your-token-here" }' > ~/.agent-slack/config.json

# Option C: Pass per-command
agent-slack read-channel --channel C12345 --token xoxp-your-token
```

### 6. Verify It Works

```bash
# Should print your profile info
agent-slack read-user-profile

# Should list channels matching the query
agent-slack search-channels --query "general"
```

If you see `Slack API error: missing_scope`, go back to step 3 and add the required scope for that command.

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

## Authentication

The CLI resolves auth in this order (first match wins):

1. `SLACK_TOKEN` environment variable
2. `--token` flag on any command
3. `~/.agent-slack/config.json` file (set by `agent-slack login` or manually)

The fastest way to authenticate is `agent-slack login` — see [Quick Start](#quick-start--oauth-login) above.

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
│   ├── client.ts                   # Slack WebClient factory (auth resolution)
│   ├── config.ts                   # Loads ~/.agent-slack/config.json
│   ├── output.ts                   # Concise / detailed / JSON formatters
│   ├── errors.ts                   # Slack API error handling
│   ├── input.ts                    # Text input resolution (inline/file/stdin)
│   ├── formatters/messages.ts      # Shared message formatting
│   └── commands/                   # 12 subcommand implementations
├── tests/
│   ├── unit/                       # Mocked unit tests per module
│   ├── integration/cli.test.ts     # End-to-end CLI invocation tests
│   └── helpers/mock-slack.ts       # Shared Slack API mock factory
├── package.json
└── tsconfig.json
```

## License

MIT
