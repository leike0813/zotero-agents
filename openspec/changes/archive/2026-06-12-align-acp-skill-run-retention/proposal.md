# Change: Align ACP Skill Run Retention

## Why

ACP Skills run workspaces are stored under `runtime/acp/skill-runs`, but the
current cleanup model only supports manually deleting the whole category. The
existing governance spec says ACP task workspaces should follow task history
retention, which defaults to 30 days. Without a bounded retention cleanup,
terminal ACP Skills run records and workspace files can accumulate indefinitely.

## What Changes

- Add a retention cleanup path for ACP Skills run records and their persisted
  workspace directories.
- Reuse the existing task dashboard history retention policy as the default
  retention window.
- Delete only terminal/removed ACP Skills runs that are older than the retention
  threshold.
- Keep active, waiting, permission-required, and otherwise recoverable runs even
  if their timestamps are old.
- Preserve the existing manual `acp-skill-runs` category cleanup for explicit
  full cleanup.

## Impact

No user-facing configuration changes are required. The change affects runtime
persistence cleanup, ACP Skills run-store internals, and focused retention
tests.
