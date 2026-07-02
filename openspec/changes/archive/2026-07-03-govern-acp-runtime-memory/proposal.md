## Why

ACP runtime surfaces can retain large runtime graphs after real-world runs:
ACP Skills live controllers keep adapter and orchestration closures alive, and
ACP Chat session slots keep growing conversation transcript arrays. In long
Zotero sessions this can grow without a practical bound, especially when
transcripts, candidates, result JSON, and prompt context are duplicated across
controllers, session slots, database rows, and UI snapshots.

## What Changes

- Replace long-lived ACP Skill controllers with thin live session handles that
  own only active connection resources.
- Move ACP Skill transcripts, output revision candidates, and run continuation
  context out of database payloads into files under the run runtime directory.
- Move ACP Chat transcripts out of session snapshots and `plugin_task_rows`
  into JSONL files under each conversation storage directory.
- Keep run store persistence, hydration, panel snapshots, and selected run
  detail metadata-only, with bounded previews for UI summaries.
- Load ACP Skill and ACP Chat transcripts through explicit asynchronous page
  requests from the UI instead of embedding transcript items in snapshots.
- Deliver live transcript chunks through ephemeral deltas for the currently
  selected run/conversation so realtime rendering does not depend on rereading
  JSONL after each append.
- Detach successful ACP Skills runs after workflow apply while preserving
  recoverability through `sessionId`.
- Bound `waiting_user` live handles to 30 minutes before local detach.
- Cap live ACP Chat adapters at three connections, evicting the least recently
  active idle connection when possible.
- Ensure archived ACP Skill runtime files follow the existing task history
  retention lifecycle.

## Capabilities

### New Capabilities

- `acp-skill-run-file-backed-runtime-state`: ACP Skill transcripts, output
  revisions, and continuation context are file-backed and lazily loaded.
- `acp-chat-file-backed-transcript-state`: ACP Chat transcripts are
  file-backed, paged, and rendered through live deltas.

### Modified Capabilities

- `acp-skills-interactive-execution`: Success no longer keeps a live local
  controller; follow-up is recoverable through the existing session id.
- `acp-skills-session-recovery`: Recovered replies use file-backed continuation
  state rather than controller closure state.
- `acp-engine-session-workspace-governance`: Runtime files for ACP Skill runs
  are governed by run workspace retention.
- `acp-chat-session-management`: ACP Chat live adapter count is bounded and
  live session slots do not own complete transcript payloads.

## Impact

- Affected modules: shared transcript store, ACP Skill run store, ACP Skill
  runner orchestrator, ACP Chat conversation store/session manager, runtime
  persistence, ACP panel snapshot models, and Assistant Workspace sidebar
  bridges.
- Affected data: local ACP Skill and ACP Chat test history in the configured
  Zotero data directory is reset after taking a database backup; old embedded
  transcript payloads are not migrated for compatibility.
- No new external dependency is required.
