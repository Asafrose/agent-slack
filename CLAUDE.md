# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

agent-slack is a Bun CLI + Claude Code plugin that replaces the 12 Slack MCP server tools with a single CLI binary. It reduces ~18K tokens of MCP tool descriptions to a lightweight skill file. The CLI is used by Claude via `Bash(agent-slack ...)` calls.

## Commands

```bash
bun install            # install dependencies
bun test               # run all tests (unit + integration, 192 tests)
bun test tests/unit    # unit tests only
bun test tests/integration  # integration tests only
bun test tests/unit/commands/send-message.test.ts  # single test file
bun run lint           # eslint + prettier (must pass with 0 errors)
bun run lint:fix       # auto-fix lint issues
bun run format         # format all files with prettier
bun run format:check   # check formatting without writing
bun link               # make agent-slack globally available
bun run bin/agent-slack.ts --help  # run CLI directly without linking
```

There is no build step — Bun runs TypeScript directly.

## Architecture

```
bin/agent-slack.ts → src/cli.ts → src/commands/*.ts
                                       ↓
                          ┌─────────────┼─────────────┐
                     src/client.ts  src/input.ts  src/output.ts
                          ↓                           ↓
                     src/config.ts         src/formatters/messages.ts
                                      src/errors.ts (used by all commands)
```

- **cli.ts** — Creates the Commander program, imports all 12 command files, calls each `register(program)`, exports `run()`
- **client.ts** — `getClient()` factory returns a `@slack/web-api` WebClient. Auth resolves: `SLACK_TOKEN` env → `--token` flag → `~/.agent-slack/config.json`
- **input.ts** — `resolveTextInput({ text?, textFile? })` handles the 3 input methods: inline flag, file read, or stdin
- **output.ts** — `formatOutput(data, format)` and `resolveFormat(opts)` handle concise/detailed/json formatting
- **errors.ts** — `handleSlackError(error)` categorizes Slack `ErrorCode` types, prints friendly message, exits with code 1. Also exports `CodedError` interface (avoids importing from `@slack/web-api` internals)
- **formatters/messages.ts** — Shared message formatting (`formatMessages`, `formatMessageConcise`, `formatMessageDetailed`, `formatDate`) used by search-messages and search-all

## Command Pattern

Every command file in `src/commands/` exports a single `register(program: Command)` function. Inside the action handler:

1. Merge global opts (`cmd.parent?.opts()`) with command opts
2. Get client via `getClient({ token: mergedOpts.token })`
3. Resolve text input via `resolveTextInput()` (for write commands)
4. Call Slack API
5. Format output via `resolveFormat(mergedOpts)` + `formatOutput()` or specialized formatters
6. `console.log()` the result
7. Catch errors with `handleSlackError(err)`

Global flags (`--token`, `--detailed`, `--json`) are defined on the parent program in cli.ts and merged into each command's options.

## Testing Patterns

**Unit tests** mock `@slack/web-api` via `mock.module()` from `bun:test`. The pattern:

- Mock `src/client` to return a mock WebClient with spied methods
- Mock `src/input` when testing stdin behavior
- Create a fresh `Command`, register the command, call `program.parseAsync()`
- Spy on `console.log`/`console.error`/`process.exit` to capture output
- Call `.mockReset()` in `beforeEach`

**Integration tests** use `spawnSync` from `child_process` to invoke `bun run bin/agent-slack.ts` as a subprocess and assert on stdout/stderr/exit code.

**Mock helpers** in `tests/helpers/mock-slack.ts` provide `createMockWebClient()` and realistic Slack API response fixtures.

## Plugin System

- `.claude-plugin/plugin.json` — Plugin manifest (name, version, description)
- `skills/slack/SKILL.md` — The skill Claude loads on demand. Contains full documentation of all 12 commands, search syntax, output format examples, error codes, and AI agent tips. Frontmatter declares `allowed-tools: Bash(agent-slack *)` and `user-invocable: false`

## PR Title Convention

PR titles must follow conventional commits format: `<type>[optional scope]: <description>`

Allowed types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `test`, `perf`, `style`, `build`, `revert`

Examples: `feat: add new search command`, `fix(auth): handle expired tokens`

CI enforces this via the `check-title` workflow.

## Undocumented APIs

`draft-message` and `create-canvas` use `client.apiCall()` instead of typed SDK methods because these Slack APIs are not in the official `@slack/web-api` types.
